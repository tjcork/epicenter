import type { CancelRecordingResult, WhisperingRecordingState } from '$lib/constants/audio';
import { createTaggedError } from 'wellcrafted/error';
import type { Result } from 'wellcrafted/result';
import type {
	Device,
	DeviceIdentifier,
	DeviceAcquisitionOutcome,
	UpdateStatusMessageFn,
} from '../types';

/**
 * Base error type for recorder services
 */
export const { RecorderServiceError, RecorderServiceErr } = createTaggedError(
	'RecorderServiceError',
);
export type RecorderServiceError = ReturnType<typeof RecorderServiceError>;

/**
 * Base parameters shared across all implementations
 */
type BaseRecordingParams = {
	selectedDeviceId: DeviceIdentifier | null;
	recordingId: string;
};

/**
 * CPAL (native Rust) recording parameters
 */
export type CpalRecordingParams = BaseRecordingParams & {
	implementation: 'cpal';
	outputFolder: string;
	sampleRate: string;
};

/**
 * Navigator (MediaRecorder) recording parameters
 */
export type NavigatorRecordingParams = BaseRecordingParams & {
	implementation: 'navigator';
	bitrateKbps: string;
};

/**
 * FFmpeg recording parameters
 */
export type FfmpegRecordingParams = BaseRecordingParams & {
	implementation: 'ffmpeg';
	globalOptions: string;
	inputOptions: string;
	outputOptions: string;
	outputFolder: string;
};

/**
 * Discriminated union for recording parameters based on implementation
 */
export type StartRecordingParams =
	| CpalRecordingParams
	| NavigatorRecordingParams
	| FfmpegRecordingParams;

/**
 * Base recorder service interface shared by all implementations
 */
export type BaseRecorderService = {
	/**
	 * Get the current recorder state
	 * Returns 'IDLE' if no recording is active, 'RECORDING' if recording is in progress
	 */
	getRecorderState(): Promise<Result<WhisperingRecordingState, RecorderServiceError>>;

	/**
	 * Enumerate available recording devices with their labels and identifiers
	 */
	enumerateDevices(): Promise<Result<Device[], RecorderServiceError>>;

	/**
	 * Start a new recording session
	 */
	startRecording(
		params: StartRecordingParams,
		callbacks: {
			sendStatus: UpdateStatusMessageFn;
		},
	): Promise<Result<DeviceAcquisitionOutcome, RecorderServiceError>>;

	/**
	 * Stop the current recording and return the audio blob
	 */
	stopRecording(callbacks: {
		sendStatus: UpdateStatusMessageFn;
	}): Promise<Result<Blob, RecorderServiceError>>;

	/**
	 * Cancel the current recording without saving
	 */
	cancelRecording(callbacks: {
		sendStatus: UpdateStatusMessageFn;
	}): Promise<Result<CancelRecordingResult, RecorderServiceError>>;
};

/**
 * Navigator (MediaRecorder) recorder service
 */
export type NavigatorRecorderService = BaseRecorderService & {
	type: 'navigator';
};

/**
 * CPAL (native Rust) recorder service
 */
export type CpalRecorderService = BaseRecorderService & {
	type: 'cpal';
};

/**
 * FFmpeg recorder service with additional platform-specific formatting
 */
export type FfmpegRecorderService = BaseRecorderService & {
	type: 'ffmpeg';
	/**
	 * Format a device identifier for FFmpeg command based on the current platform
	 * @param deviceId The device identifier to format
	 * @returns The formatted device string for FFmpeg -i parameter
	 */
	formatDeviceForPlatform(deviceId: string): string;
	/**
	 * Get the default output options optimized for Whisper
	 * @returns The default FFmpeg output options string
	 */
	getDefaultOutputOptions(): string;
};

/**
 * Discriminated union of all recorder service implementations
 */
export type RecorderService =
	| NavigatorRecorderService
	| CpalRecorderService
	| FfmpegRecorderService;
