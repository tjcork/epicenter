import type { CancelRecordingResult } from '$lib/constants/audio';
import {
	IS_WINDOWS,
	IS_MACOS,
	IS_LINUX,
	PLATFORM_TYPE,
} from '$lib/constants/platform';
import { Ok, Err, type Result, tryAsync } from 'wellcrafted/result';
import type { Device, DeviceAcquisitionOutcome } from '../types';
import { asDeviceIdentifier } from '../types';
import type {
	RecorderService,
	RecorderServiceError,
	StartRecordingParams,
} from './types';
import { RecorderServiceErr } from './types';
import { Command, type Child } from '@tauri-apps/plugin-shell';
import { extractErrorMessage } from 'wellcrafted/error';
import { remove, exists } from '@tauri-apps/plugin-fs';
import { join, appDataDir } from '@tauri-apps/api/path';
import { settings } from '$lib/stores/settings.svelte';
import * as services from '$lib/services';

/**
 * Get the platform-specific FFmpeg audio input format
 */
function getAudioInputFormat() {
	if (IS_MACOS) return 'avfoundation';
	if (IS_WINDOWS) return 'dshow';
	if (IS_LINUX) return 'alsa';
	return 'pulse';
}

/**
 * Format device name for FFmpeg based on platform
 */
function formatDeviceForFFmpeg(deviceName: string): string {
	if (IS_MACOS) {
		// macOS uses ":deviceName" for audio input
		return `:${deviceName}`;
	}
	if (IS_WINDOWS) {
		// Windows uses "audio=deviceName"
		return `audio="${deviceName}"`;
	}
	// Linux uses device name directly
	return deviceName;
}

/**
 * Parse FFmpeg device enumeration output based on platform
 */
function parseDevices(output: string): Device[] {
	const devices: Device[] = [];

	if (IS_MACOS) {
		// macOS format: [AVFoundation input device @ 0x...] AVFoundation audio devices:
		// [AVFoundation input device @ 0x...] [0] Built-in Microphone
		const lines = output.split('\n');
		const audioDeviceRegex = /\[AVFoundation.*?\]\s+\[(\d+)\]\s+(.+)/;

		for (const line of lines) {
			const match = line.match(audioDeviceRegex);
			if (match) {
				const [, index, name] = match;
				// Skip screen capture devices
				if (!name.includes('Capture screen')) {
					devices.push({
						id: asDeviceIdentifier(name.trim()),
						label: name.trim(),
					});
				}
			}
		}
	} else if (IS_WINDOWS) {
		// Windows DirectShow format
		const lines = output.split('\n');
		const audioDeviceRegex = /^\s*"(.+?)"\s+\(audio\)/;

		for (const line of lines) {
			const match = line.match(audioDeviceRegex);
			if (match) {
				const [, name] = match;
				devices.push({
					id: asDeviceIdentifier(name),
					label: name,
				});
			}
		}
	} else {
		// Linux ALSA format
		const lines = output.split('\n');
		const deviceRegex = /^(hw:\d+,\d+)\s+(.+)/;

		for (const line of lines) {
			const match = line.match(deviceRegex);
			if (match) {
				const [, id, name] = match;
				devices.push({
					id: asDeviceIdentifier(id),
					label: name.trim(),
				});
			}
		}
	}

	return devices;
}

/**
 * Interpolate variables in FFmpeg command template
 */
function interpolateCommand(
	template: string,
	variables: Record<string, string>,
): string {
	let command = template;

	// Replace all {{variable}} patterns
	for (const [key, value] of Object.entries(variables)) {
		const pattern = new RegExp(`{{${key}}}`, 'g');
		command = command.replace(pattern, value);
	}

	return command;
}

export function createFfmpegRecorderService(): RecorderService {
	let currentProcess: Child | null = null;
	let currentRecordingId: string | null = null;

	// Helper function to construct output path from recording ID
	async function getOutputPath(recordingId: string): Promise<string> {
		const outputDir =
			settings.value['recording.desktop.outputFolder'] ?? (await appDataDir());
		return join(outputDir, `${recordingId}.wav`);
	}

	const enumerateDevices = async (): Promise<
		Result<Device[], RecorderServiceError>
	> => {
		const format = getAudioInputFormat();

		const { data: output, error } = await tryAsync({
			try: async () => {
				const cmd = {
					macos: Command.create('ffmpeg', [
						'-f',
						format,
						'-list_devices',
						'true',
						'-i',
						'',
					]),
					windows: Command.create('ffmpeg', [
						'-list_devices',
						'true',
						'-f',
						'dshow',
						'-i',
						'dummy',
					]),
					linux: Command.create('sh', ['-c', 'arecord -l']),
				}[PLATFORM_TYPE];
				const result = await cmd.execute();
				// FFmpeg lists devices to stderr, not stdout
				return result.stderr;
			},
			mapErr: (error) =>
				RecorderServiceErr({
					message: 'Failed to enumerate recording devices',
					cause: error,
				}),
		});

		if (error) return Err(error);

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
			return Ok(currentRecordingId);
		},

		enumerateDevices,

		startRecording: async (
			params: StartRecordingParams,
			{ sendStatus },
		): Promise<Result<DeviceAcquisitionOutcome, RecorderServiceError>> => {
			// FFmpeg implementation only handles FFmpeg params
			if (params.platform !== 'ffmpeg') {
				return RecorderServiceErr({
					message: 'FFmpeg recorder received non-FFmpeg parameters',
					context: { params },
					cause: undefined,
				});
			}

			const { selectedDeviceId, recordingId, outputFolder, commandTemplate } =
				params;

			// Stop any existing recording
			if (currentProcess) {
				try {
					await currentProcess.kill();
				} catch (e) {
					console.error('Failed to kill existing FFmpeg process:', e);
				}
				currentProcess = null;
			}

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
						fallbackDeviceId,
					});
				}

				const deviceExists = deviceIds.includes(selectedDeviceId);

				if (deviceExists) return Ok({ outcome: 'success' });

				sendStatus({
					title: '⚠️ Finding a New Microphone',
					description:
						"That microphone isn't available. Let's try finding another one...",
				});

				return Ok({
					outcome: 'fallback',
					reason: 'preferred-device-unavailable',
					fallbackDeviceId,
				});
			};

			const { data: deviceOutcome, error: acquireDeviceError } =
				acquireDevice();
			if (acquireDeviceError) return Err(acquireDeviceError);

			// Determine which device to use
			const deviceIdentifier =
				deviceOutcome.outcome === 'success'
					? selectedDeviceId
					: deviceOutcome.fallbackDeviceId;

			if (!deviceIdentifier) {
				return RecorderServiceErr({
					message: 'No device identifier available',
					context: { deviceOutcome },
					cause: undefined,
				});
			}

			// Set up output path - default to .wav extension
			const outputDir = outputFolder ?? (await appDataDir());
			const outputFileName = `${recordingId}.wav`;
			const outputPath = await join(outputDir, outputFileName);

			// Prepare variables for interpolation
			const variables = {
				device: deviceIdentifier,
				outputPath,
				recordingId,
				outputFolder: outputDir,
				format: getAudioInputFormat(),
				formattedDevice: formatDeviceForFFmpeg(deviceIdentifier),
			};

			// Use default template if none provided
			const defaultTemplate = (
				{
					macos:
						'ffmpeg -f {{format}} -i {{formattedDevice}} -acodec pcm_s16le -ar 16000 {{outputPath}}',
					windows:
						'ffmpeg -f dshow -i {{formattedDevice}} -acodec pcm_s16le -ar 16000 {{outputPath}}',
					linux:
						'ffmpeg -f alsa -i {{device}} -acodec pcm_s16le -ar 16000 {{outputPath}}',
				} as const
			)[PLATFORM_TYPE];

			const template = commandTemplate ?? defaultTemplate;
			const command = interpolateCommand(template, variables);

			sendStatus({
				title: '🎤 Setting Up',
				description: 'Initializing FFmpeg recording session...',
			});

			// Parse command into executable and args
			const parts = command.split(' ');
			const [executable, ...args] = parts;

			const { data: process, error: startError } = await tryAsync({
				try: async () => {
					const cmd = Command.create(executable, args);
					const child = await cmd.spawn();
					return child;
				},
				mapErr: (error) =>
					RecorderServiceErr({
						message: `Failed to start FFmpeg recording: ${extractErrorMessage(error)}`,
						context: { command, deviceIdentifier },
						cause: error,
					}),
			});

			if (startError) return Err(startError);

			currentProcess = process;
			currentRecordingId = recordingId;

			sendStatus({
				title: '🎙️ Recording',
				description: 'FFmpeg is now recording audio...',
			});

			return Ok(deviceOutcome);
		},

		stopRecording: async ({
			sendStatus,
		}): Promise<Result<Blob, RecorderServiceError>> => {
			if (!currentProcess || !currentRecordingId) {
				return RecorderServiceErr({
					message: 'No active recording to stop',
					cause: undefined,
				});
			}

			const outputPath = await getOutputPath(currentRecordingId);

			sendStatus({
				title: '⏹️ Stopping',
				description: 'Stopping FFmpeg recording...',
			});

			// Send quit signal to FFmpeg (graceful shutdown)
			const { error: killError } = await tryAsync({
				try: async () => {
					// Write 'q' to stdin to quit FFmpeg gracefully
					await currentProcess.write(new TextEncoder().encode('q'));
					// Wait a bit for graceful shutdown
					await new Promise((resolve) => setTimeout(resolve, 500));
					// Force kill if still running
					await currentProcess.kill();
				},
				mapErr: (error) =>
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

			currentProcess = null;
			currentRecordingId = null;

			// Wait a moment for file to be written
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Check if file exists
			const { data: fileExists, error: existsError } = await tryAsync({
				try: () => exists(outputPath),
				mapErr: (error) =>
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

			const { data: blob, error: readError } = await services.fs.pathToBlob(outputPath);

			if (readError) {
				return RecorderServiceErr({
					message: 'Unable to read recording file',
					context: { path: outputPath },
					cause: readError,
				});
			}

			return Ok(blob);
		},

		cancelRecording: async ({
			sendStatus,
		}): Promise<Result<CancelRecordingResult, RecorderServiceError>> => {
			if (!currentRecordingId) {
				return Ok({ status: 'no-recording' });
			}

			sendStatus({
				title: '🛑 Cancelling',
				description: 'Stopping FFmpeg recording and cleaning up...',
			});

			// Get the output path using helper function for cleanup
			const outputPath = await getOutputPath(currentRecordingId);

			// Kill the FFmpeg process
			if (currentProcess) {
				try {
					await currentProcess.kill();
				} catch (e) {
					console.error('Failed to kill FFmpeg process:', e);
				}
				currentProcess = null;
			}

			currentRecordingId = null;

			// Delete the output file if it exists
			if (outputPath) {
				const { error: removeError } = await tryAsync({
					try: async () => {
						const fileExists = await exists(outputPath);
						if (fileExists) await remove(outputPath);
					},
					mapErr: (error) =>
						RecorderServiceErr({
							message: 'Failed to delete recording file',
							context: { path: outputPath },
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
