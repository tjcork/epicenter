import type { WhisperingRecordingState } from '$lib/constants/audio';
import { fromTaggedErr } from '$lib/result';
import * as services from '$lib/services';
import { settings } from '$lib/stores/settings.svelte';
import { Ok } from 'wellcrafted/result';
import { defineMutation, defineQuery, queryClient } from './_client';
import { notify } from './notify';
import type { DeviceIdentifier } from '$lib/services/types';

const recorderKeys = {
	currentRecordingId: ['cpalRecorder', 'currentRecordingId'] as const,
	startRecording: ['cpalRecorder', 'startRecording'] as const,
	stopRecording: ['cpalRecorder', 'stopRecording'] as const,
	cancelRecording: ['cpalRecorder', 'cancelRecording'] as const,
} as const;

const invalidateRecorderState = () =>
	queryClient.invalidateQueries({ queryKey: recorderKeys.currentRecordingId });

export const cpalRecorder = {
	// Query that returns the raw recording ID (null if not recording)
	getCurrentRecordingId: defineQuery({
		queryKey: recorderKeys.currentRecordingId,
		resultQueryFn: async () => {
			const { data: recordingId, error: getRecordingIdError } =
				await services.cpalRecorder.getCurrentRecordingId();
			if (getRecordingIdError) {
				return fromTaggedErr(getRecordingIdError, {
					title: '❌ Failed to get current recording',
					action: { type: 'more-details', error: getRecordingIdError },
				});
			}
			return Ok(recordingId);
		},
		initialData: null as string | null,
	}),

	// Query that transforms recording ID to state (RECORDING or IDLE)
	getRecorderState: defineQuery({
		queryKey: recorderKeys.currentRecordingId, // Same key as getCurrentRecordingId!
		resultQueryFn: async () => {
			const { data: recordingId, error: getRecordingIdError } =
				await services.cpalRecorder.getCurrentRecordingId();
			if (getRecordingIdError) {
				return fromTaggedErr(getRecordingIdError, {
					title: '❌ Failed to get recorder state',
					action: { type: 'more-details', error: getRecordingIdError },
				});
			}
			return Ok(recordingId);
		},
		select: (data) => {
			// Transform recording ID to state
			const state: WhisperingRecordingState = data ? 'RECORDING' : 'IDLE';
			return state;
		},
		initialData: null as string | null,
	}),

	startRecording: defineMutation({
		mutationKey: recorderKeys.startRecording,
		resultMutationFn: async ({
			toastId,
			selectedDeviceId,
		}: {
			toastId: string;
			selectedDeviceId: DeviceIdentifier | null;
		}) => {
			if (settings.value['recording.mode'] !== 'cpal') {
				settings.value = { ...settings.value, 'recording.mode': 'cpal' };
			}
			// Generate a unique recording ID
			const recordingId = `recording_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

			// Get user's recording settings
			const outputFolder = settings.value['recording.cpal.outputFolder'];
			const sampleRate = settings.value['recording.cpal.sampleRate'];

			const { data: deviceAcquisitionOutcome, error: startRecordingError } =
				await services.cpalRecorder.startRecording(
					{
						selectedDeviceId: selectedDeviceId,
						recordingId,
						outputFolder,
						sampleRate,
					},
					{
						sendStatus: (options) =>
							notify.loading.execute({ id: toastId, ...options }),
					},
				);

			if (startRecordingError) {
				return fromTaggedErr(startRecordingError, {
					title: '❌ Failed to start CPAL recording',
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
				await services.cpalRecorder.stopRecording({
					sendStatus: (options) =>
						notify.loading.execute({ id: toastId, ...options }),
				});

			if (stopRecordingError) {
				return fromTaggedErr(stopRecordingError, {
					title: '❌ Failed to stop CPAL recording',
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
				await services.cpalRecorder.cancelRecording({
					sendStatus: (options) =>
						notify.loading.execute({ id: toastId, ...options }),
				});

			if (cancelRecordingError) {
				return fromTaggedErr(cancelRecordingError, {
					title: '❌ Failed to cancel CPAL recording',
					action: { type: 'more-details', error: cancelRecordingError },
				});
			}
			return Ok(cancelResult);
		},
		onSettled: invalidateRecorderState,
	}),
};
