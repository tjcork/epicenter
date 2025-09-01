import type { CancelRecordingResult } from '$lib/constants/audio';
import { PLATFORM_TYPE } from '$lib/constants/platform';
import * as services from '$lib/services';
import { asShellCommand } from '$lib/services/command';
import { interpolateTemplate } from '$lib/utils/template';
import { basename, join } from '@tauri-apps/api/path';
import { exists, remove } from '@tauri-apps/plugin-fs';
import { Child } from '@tauri-apps/plugin-shell';
import { createPersistedState } from '@repo/svelte-utils';
import { type } from 'arktype';
import { Err, Ok, type Result, tryAsync } from 'wellcrafted/result';
import type { Device, DeviceAcquisitionOutcome } from '../types';
import { asDeviceIdentifier } from '../types';
import type {
	FfmpegRecordingParams,
	RecorderService,
	RecorderServiceError,
} from './types';
import { RecorderServiceErr } from './types';
import { getDefaultRecordingsFolder } from './utils';
import { extractErrorMessage } from 'wellcrafted/error';

// Schema for persisted FFmpeg session state
// Either a complete session object or null - no individual nullable fields
const FfmpegSession = type({
	pid: 'number',
	outputPath: 'string',
}).or('null');

export function createFfmpegRecorderService(): RecorderService {
	// Persisted state - single source of truth
	const sessionState = createPersistedState({
		key: 'whispering-ffmpeg-recording-session',
		schema: FfmpegSession,
		onParseError: () => null,
	});

	// Helper to get current Child instance lazily from PID
	// Returns null if no session is active
	const getCurrentChild = (): Child | null => {
		const session = sessionState.value;
		return session ? new Child(session.pid) : null;
	};

	// Helper to clear session and kill any running process
	const clearSession = async (): Promise<void> => {
		const session = sessionState.value;
		if (!session) return;

		// Try to kill the process if it exists
		await tryAsync({
			try: async () => {
				const child = new Child(session.pid);
				await child.kill();
				console.log(`Killed FFmpeg process (PID: ${session.pid})`);
			},
			catch: (e) => {
				// Process might already be dead, that's okay
				console.log(
					`Error terminating FFmpeg process (PID: ${session.pid}): ${extractErrorMessage(e)}`,
				);
				return Ok(undefined);
			},
		});

		// Clear the session state
		sessionState.value = null;
	};

	// Clear any orphaned process on initialization
	if (sessionState.value) {
		console.log('Found orphaned FFmpeg session, cleaning up...');
		clearSession();
	}

	const enumerateDevices = async (): Promise<
		Result<Device[], RecorderServiceError>
	> => {
		// Build platform-specific commands
		const command = asShellCommand(
			{
				macos: 'ffmpeg -f avfoundation -list_devices true -i ""',
				windows: 'ffmpeg -list_devices true -f dshow -i dummy',
				linux: 'arecord -l',
			}[PLATFORM_TYPE],
		);

		const { data: result, error: executeError } =
			await services.command.execute(command);
		if (executeError) {
			return RecorderServiceErr({
				message: 'Failed to enumerate recording devices',
				cause: executeError,
			});
		}

		// FFmpeg lists devices to stderr, not stdout
		const output = result.stderr;

		const devices = parseDevices(output);

		if (devices.length === 0) {
			return RecorderServiceErr({
				message: 'No recording devices found',
				context: { output },
				cause: undefined,
			});
		}

		return Ok(devices);
	};

	return {
		getCurrentRecordingId: async (): Promise<
			Result<string | null, RecorderServiceError>
		> => {
			// Derive recording ID from the output path if available
			const session = sessionState.value;
			if (!session) return Ok(null);

			// Use Tauri's basename to reliably extract filename
			const filename = await basename(session.outputPath);
			// Remove extension to get recording ID
			const recordingId = filename.replace(/\.[^.]+$/, '');

			return Ok(recordingId);
		},

		enumerateDevices,

		startRecording: async (
			{
				selectedDeviceId,
				recordingId,
				outputFolder,
				commandTemplate,
			}: FfmpegRecordingParams,
			{ sendStatus },
		): Promise<Result<DeviceAcquisitionOutcome, RecorderServiceError>> => {
			// Stop any existing recording
			await clearSession();

			// Enumerate devices to validate selection
			const { data: devices, error: enumerateError } = await enumerateDevices();
			if (enumerateError) return Err(enumerateError);

			const acquireDevice = (): Result<
				DeviceAcquisitionOutcome,
				RecorderServiceError
			> => {
				const deviceIds = devices.map((d) => d.id);
				const fallbackDeviceId = deviceIds.at(0);

				if (!fallbackDeviceId) {
					return RecorderServiceErr({
						message: selectedDeviceId
							? "We couldn't find the selected microphone. Make sure it's connected and try again!"
							: "We couldn't find any microphones. Make sure they're connected and try again!",
						context: { selectedDeviceId, deviceIds },
						cause: undefined,
					});
				}

				if (!selectedDeviceId) {
					sendStatus({
						title: '🔍 No Device Selected',
						description:
							"No worries! We'll find the best microphone for you automatically...",
					});
					return Ok({
						outcome: 'fallback',
						reason: 'no-device-selected',
						deviceId: fallbackDeviceId,
					});
				}

				const deviceExists = deviceIds.includes(selectedDeviceId);

				if (deviceExists)
					return Ok({ outcome: 'success', deviceId: selectedDeviceId });

				sendStatus({
					title: '⚠️ Finding a New Microphone',
					description:
						"That microphone isn't available. Let's try finding another one...",
				});

				return Ok({
					outcome: 'fallback',
					reason: 'preferred-device-unavailable',
					deviceId: fallbackDeviceId,
				});
			};

			const { data: deviceOutcome, error: acquireDeviceError } =
				acquireDevice();
			if (acquireDeviceError) return Err(acquireDeviceError);

			// Use the device from the outcome
			const deviceIdentifier = deviceOutcome.deviceId;

			// Construct the output path directly from the parameters
			// We need to determine the file extension from the command template
			const extensionMatch = commandTemplate.match(/{{recordingId}}\.(\w+)/);
			const fileExtension = extensionMatch ? extensionMatch[1] : 'wav';

			// Construct the output path
			const outputPath = await join(
				outputFolder,
				`${recordingId}.${fileExtension}`,
			);

			/**
			 * IMPORTANT: Template Interpolation
			 *
			 * The command template arrives with THREE required placeholder variables:
			 * - {{device}} - Will be replaced with the actual device identifier (determined above)
			 * - {{outputFolder}} - Will be replaced with the output folder path (passed as param)
			 * - {{recordingId}} - Will be replaced with the unique recording ID (passed as param)
			 *
			 * Example template before interpolation:
			 * "ffmpeg -f avfoundation -i \":{{device}}\" -acodec pcm_s16le -ar 16000 \"{{outputFolder}}/{{recordingId}}.wav\""
			 *
			 * Example after interpolation:
			 * "ffmpeg -f avfoundation -i \":Built-in Microphone\" -acodec pcm_s16le -ar 16000 \"/Users/jane/Recordings/abc123xyz.wav\""
			 */
			const command = interpolateTemplate(commandTemplate, {
				outputFolder, // e.g., "/Users/jane/Recordings"
				device: deviceIdentifier, // e.g., "Built-in Microphone"
				recordingId, // e.g., "abc123xyz"
			});

			sendStatus({
				title: '🎤 Setting Up',
				description: 'Initializing FFmpeg recording session...',
			});

			// Use command service to spawn FFmpeg process
			const { data: process, error: startError } = await services.command.spawn(
				asShellCommand(command),
			);

			if (startError) {
				return RecorderServiceErr({
					message: 'Failed to start FFmpeg process',
					cause: startError,
				});
			}

			// Store the PID and session info for recovery after refresh
			sessionState.value = {
				pid: process.pid,
				outputPath,
			};

			sendStatus({
				title: '🎙️ Recording',
				description: 'FFmpeg is now recording audio...',
			});

			return Ok(deviceOutcome);
		},

		stopRecording: async ({
			sendStatus,
		}): Promise<Result<Blob, RecorderServiceError>> => {
			const child = getCurrentChild();
			const session = sessionState.value;
			if (!child || !session) {
				return RecorderServiceErr({
					message: 'No active recording to stop',
					cause: undefined,
				});
			}

			sendStatus({
				title: '⏹️ Stopping',
				description: 'Stopping FFmpeg recording...',
			});

			// Send quit signal to FFmpeg (graceful shutdown)
			const { error: killError } = await tryAsync({
				try: async () => {
					// Write 'q' to stdin to quit FFmpeg gracefully
					await child.write(new TextEncoder().encode('q'));
					// Wait a bit for graceful shutdown
					await new Promise((resolve) => setTimeout(resolve, 500));
					// Force kill if still running
					await child.kill();
				},
				catch: (error) =>
					RecorderServiceErr({
						message: 'Failed to stop FFmpeg process',
						cause: error,
					}),
			});

			if (killError) {
				sendStatus({
					title: '❌ Error Stopping Recording',
					description:
						"We couldn't stop the recording properly. Attempting to recover your audio...",
				});
			}

			const outputPath = session.outputPath;

			// Clear the session
			sessionState.value = null;

			// Wait a moment for file to be written
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Check if file exists
			const { data: fileExists, error: existsError } = await tryAsync({
				try: () => exists(outputPath),
				catch: (error) =>
					RecorderServiceErr({
						message: 'Failed to check if recording file exists',
						context: { path: outputPath },
						cause: error,
					}),
			});

			if (existsError) return Err(existsError);

			if (!fileExists) {
				return RecorderServiceErr({
					message: 'Recording file was not created',
					context: { path: outputPath },
					cause: undefined,
				});
			}

			// Read the recorded file
			sendStatus({
				title: '📁 Reading Recording',
				description: 'Loading your recording from disk...',
			});

			const { data: blob, error: readError } =
				await services.fs.pathToBlob(outputPath);

			if (readError) {
				return RecorderServiceErr({
					message: 'Unable to read recording file',
					cause: readError,
				});
			}

			return Ok(blob);
		},

		cancelRecording: async ({
			sendStatus,
		}): Promise<Result<CancelRecordingResult, RecorderServiceError>> => {
			const session = sessionState.value;
			if (!session) {
				return Ok({ status: 'no-recording' });
			}

			sendStatus({
				title: '🛑 Cancelling',
				description: 'Stopping FFmpeg recording and cleaning up...',
			});

			// Store the path before clearing the session
			const pathToCleanup = session.outputPath;

			// Clear the session and kill the process
			await clearSession();

			// Delete the output file if it exists
			if (pathToCleanup) {
				const { error: removeError } = await tryAsync({
					try: async () => {
						const fileExists = await exists(pathToCleanup);
						if (fileExists) await remove(pathToCleanup);
					},
					catch: (error) =>
						RecorderServiceErr({
							message: 'Failed to delete recording file',
							context: { path: pathToCleanup },
							cause: error,
						}),
				});

				if (removeError) {
					sendStatus({
						title: '❌ Error Deleting Recording File',
						description:
							"We couldn't delete the recording file. Continuing with the cancellation process...",
					});
				}
			}

			return Ok({ status: 'cancelled' });
		},
	};
}

/**
 * Parse FFmpeg device enumeration output based on platform
 */
function parseDevices(output: string): Device[] {
	// Platform-specific parsing configuration
	const platformConfig = {
		macos: {
			// macOS format: [AVFoundation input device @ 0x...] [0] Built-in Microphone
			regex: /\[AVFoundation.*?\]\s+\[(\d+)\]\s+(.+)/,
			extractDevice: (match) => ({
				id: asDeviceIdentifier(match[2].trim()),
				label: match[2].trim(),
			}),
		},
		windows: {
			// Windows DirectShow format: "Microphone Name" (audio)
			regex: /^\s*"(.+?)"\s+\(audio\)/,
			extractDevice: (match) => ({
				id: asDeviceIdentifier(match[1]),
				label: match[1],
			}),
		},
		linux: {
			// Linux ALSA format: hw:0,0 Device Name
			regex: /^(hw:\d+,\d+)\s+(.+)/,
			extractDevice: (match) => ({
				id: asDeviceIdentifier(match[1]),
				label: match[2].trim(),
			}),
		},
	} satisfies Record<
		string,
		{ regex: RegExp; extractDevice: (match: RegExpMatchArray) => Device }
	>;

	// Select configuration based on platform
	const config = platformConfig[PLATFORM_TYPE];

	// Parse lines using reduce for functional approach
	return output.split('\n').reduce<Device[]>((devices, line) => {
		const match = line.match(config.regex);
		if (match) devices.push(config.extractDevice(match));
		return devices;
	}, []);
}
