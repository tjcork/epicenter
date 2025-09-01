import type { WhisperingRecordingState } from '$lib/constants/audio';
import { PLATFORM_TYPE } from '$lib/constants/platform';
import { fromTaggedErr } from '$lib/result';
import * as services from '$lib/services';
import { getDefaultRecordingsFolder } from '$lib/services/recorder';
import { settings } from '$lib/stores/settings.svelte';
import { asTemplateString } from '$lib/utils/template';
import { Ok } from 'wellcrafted/result';
import { defineMutation, defineQuery, queryClient } from './_client';
import { notify } from './notify';
import { nanoid } from 'nanoid/non-secure';

const recorderKeys = {
	recorderState: ['recorder', 'recorderState'] as const,
	devices: ['recorder', 'devices'] as const,
	startRecording: ['recorder', 'startRecording'] as const,
	stopRecording: ['recorder', 'stopRecording'] as const,
	cancelRecording: ['recorder', 'cancelRecording'] as const,
} as const;

const invalidateRecorderState = () =>
	queryClient.invalidateQueries({ queryKey: recorderKeys.recorderState });

export const recorder = {
	// Query that enumerates available recording devices with labels
	enumerateDevices: defineQuery({
		queryKey: recorderKeys.devices,
		resultQueryFn: async () => {
			const { data, error } = await recorderService().enumerateDevices();
			if (error) {
				return fromTaggedErr(error, {
					title: '❌ Failed to enumerate devices',
					action: { type: 'more-details', error },
				});
			}
			return Ok(data);
		},
	}),

	// Query that returns the recorder state (IDLE or RECORDING)
	getRecorderState: defineQuery({
		queryKey: recorderKeys.recorderState,
		resultQueryFn: async () => {
			const { data: state, error: getStateError } =
				await recorderService().getRecorderState();
			if (getStateError) {
				return fromTaggedErr(getStateError, {
					title: '❌ Failed to get recorder state',
					action: { type: 'more-details', error: getStateError },
				});
			}
			return Ok(state);
		},
		initialData: 'IDLE' as WhisperingRecordingState,
	}),

	startRecording: defineMutation({
		mutationKey: recorderKeys.startRecording,
		resultMutationFn: async ({ toastId }: { toastId: string }) => {
			// Generate a unique recording ID that will serve as the file name
			const recordingId = nanoid();

			const backend = !window.__TAURI_INTERNALS__
				? 'browser'
				: settings.value['recording.backend'];

			// Prepare recording parameters based on which backend we're using
			const baseParams = {
				selectedDeviceId: settings.value['recording.manual.selectedDeviceId'],
				recordingId,
			};

			// Resolve the output folder - use default if null
			const outputFolder = window.__TAURI_INTERNALS__
				? settings.value['recording.cpal.outputFolder'] ?? await getDefaultRecordingsFolder()
				: '';

			// Build default FFmpeg command if not provided
			const getDefaultFfmpegCommand = () => {
				const deviceInput = {
					'macos': '":{{device}}"',
					'windows': '"audio={{device}}"',
					'linux': '"{{device}}"',
				}[PLATFORM_TYPE];
				
				const format = {
					'macos': 'avfoundation',
					'windows': 'dshow',
					'linux': 'alsa',
				}[PLATFORM_TYPE];
				
				return asTemplateString(
					`ffmpeg -f ${format} -i ${deviceInput} -acodec pcm_s16le -ar 16000 "{{outputFolder}}/{{recordingId}}.wav"`
				);
			};

			const params =
				backend === 'browser'
					? {
							...baseParams,
							implementation: 'navigator' as const,
							bitrateKbps: settings.value['recording.navigator.bitrateKbps'],
						}
					: backend === 'ffmpeg'
						? {
								...baseParams,
								implementation: 'ffmpeg' as const,
								// The command template from settings contains {{device}}, {{outputFolder}}, {{recordingId}}
								// Example: "ffmpeg -f avfoundation -i \":{{device}}\" ... \"{{outputFolder}}/{{recordingId}}.wav\""
								commandTemplate:
									settings.value['recording.ffmpeg.commandTemplate'] ?? getDefaultFfmpegCommand(),
								outputFolder,
							}
						: {
								...baseParams,
								implementation: 'cpal' as const,
								outputFolder,
								sampleRate: settings.value['recording.cpal.sampleRate'],
							};

			const { data: deviceAcquisitionOutcome, error: startRecordingError } =
				await recorderService().startRecording(params, {
					sendStatus: (options) =>
						notify.loading.execute({ id: toastId, ...options }),
				});

			if (startRecordingError) {
				return fromTaggedErr(startRecordingError, {
					title: '❌ Failed to start recording',
					action: { type: 'more-details', error: startRecordingError },
				});
			}
			return Ok(deviceAcquisitionOutcome);
		},
		onSettled: invalidateRecorderState,
	}),

	stopRecording: defineMutation({
		mutationKey: recorderKeys.stopRecording,
		resultMutationFn: async ({ toastId }: { toastId: string }) => {
			const { data: blob, error: stopRecordingError } =
				await recorderService().stopRecording({
					sendStatus: (options) =>
						notify.loading.execute({ id: toastId, ...options }),
				});

			if (stopRecordingError) {
				return fromTaggedErr(stopRecordingError, {
					title: '❌ Failed to stop recording',
					action: { type: 'more-details', error: stopRecordingError },
				});
			}

			return Ok(blob);
		},
		onSettled: invalidateRecorderState,
	}),

	cancelRecording: defineMutation({
		mutationKey: recorderKeys.cancelRecording,
		resultMutationFn: async ({ toastId }: { toastId: string }) => {
			const { data: cancelResult, error: cancelRecordingError } =
				await recorderService().cancelRecording({
					sendStatus: (options) =>
						notify.loading.execute({ id: toastId, ...options }),
				});

			if (cancelRecordingError) {
				return fromTaggedErr(cancelRecordingError, {
					title: '❌ Failed to cancel recording',
					action: { type: 'more-details', error: cancelRecordingError },
				});
			}

			return Ok(cancelResult);
		},
		onSettled: invalidateRecorderState,
	}),
};

/**
 * Get the appropriate recorder service based on settings and environment
 */
export function recorderService() {
	// In browser, always use browser recorder
	if (!window.__TAURI_INTERNALS__) return services.browserRecorder;

	// In desktop, check user preference
	const backend = settings.value['recording.backend'];

	return {
		browser: services.browserRecorder,
		ffmpeg: services.ffmpegRecorder,
		native: services.nativeRecorder,
	}[backend];
}
