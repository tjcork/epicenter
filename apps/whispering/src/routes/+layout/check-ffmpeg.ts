import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';
import { rpc } from '$lib/query';
import { settings } from '$lib/stores/settings.svelte';
import type { TranscriptionServiceId } from '$lib/constants/transcription/transcription-services';

/**
 * Checks if Whisper C++ is selected as the transcription service
 * @returns true if using Whisper C++ for transcription
 */
function isUsingWhisperCpp(): boolean {
	return (
		settings.value['transcription.selectedTranscriptionService'] ===
		'whispercpp'
	);
}

/**
 * Checks if the CPAL (Rust) recording method is selected
 * @returns true if using CPAL method for recording
 */
function isUsingCpalMethod(): boolean {
	return settings.value['recording.manual.method'] === 'cpal';
}

/**
 * Checks if the navigator (MediaRecorder) recording method is selected
 * @returns true if using navigator method for recording
 */
function isUsingNavigatorMethod(): boolean {
	return settings.value['recording.manual.method'] === 'navigator';
}

/**
 * Checks if the sample rate is set to 16kHz
 * Note: Whisper C++ requires 16kHz audio input
 * @returns true if sample rate is 16000Hz
 */
function isUsing16kHz(): boolean {
	return settings.value['recording.cpal.sampleRate'] === '16000';
}

/**
 * Checks if FFmpeg is REQUIRED for Whisper C++ with browser recording
 * Browser method cannot produce 16kHz WAV directly, so FFmpeg is required
 * @returns true if using Whisper C++ with browser method
 */
export function isUsingWhisperCppWithBrowserMethod(): boolean {
	return isUsingWhisperCpp() && isUsingNavigatorMethod();
}

/**
 * Checks if FFmpeg is REQUIRED for Whisper C++ with wrong sample rate
 * CPAL method with non-16kHz audio needs FFmpeg to convert for Whisper C++
 * @returns true if using Whisper C++ with CPAL method at non-16kHz
 */
export function isUsingCpalMethodAtWrongSampleRate(): boolean {
	return isUsingWhisperCpp() && isUsingCpalMethod() && !isUsing16kHz();
}

/**
 * Checks if FFmpeg would benefit cloud transcription with CPAL method
 * FFmpeg enables audio compression for faster uploads to cloud services
 * Only relevant when using CPAL method with cloud providers (not Whisper C++)
 * @returns true if using CPAL method with any cloud transcription service
 */
export function isUsingCpalMethodWithoutWhisperCpp(): boolean {
	return isUsingCpalMethod() && !isUsingWhisperCpp();
}

/**
 * Checks if user is using a cloud transcription service
 * @returns true if using any cloud provider (OpenAI, Groq, etc.)
 */
function isUsingCloudTranscription(): boolean {
	return (
		[
			'OpenAI',
			'Groq',
			'ElevenLabs',
			'Deepgram',
		] satisfies TranscriptionServiceId[] as TranscriptionServiceId[]
	).includes(settings.value['transcription.selectedTranscriptionService']);
}

/**
 * Checks for FFmpeg installation and shows an appropriate toast based on current settings.
 *
 * FFmpeg is REQUIRED when:
 * - Using Whisper C++ with browser recording method
 * - Using Whisper C++ with CPAL recording method at any sample rate other than 16kHz
 *
 * FFmpeg is RECOMMENDED when:
 * - Using CPAL recording method with cloud transcription services (for compression)
 */
export async function checkFfmpeg() {
	// Only check in Tauri desktop app
	if (!window.__TAURI_INTERNALS__) return;

	const { data: ffmpegInstalled } =
		await rpc.ffmpeg.checkFfmpegInstalled.ensure();

	if (ffmpegInstalled === true) return; // FFmpeg is installed, all good

	// Case 1: Whisper C++ with browser method - always requires FFmpeg
	if (isUsingWhisperCppWithBrowserMethod()) {
		toast.warning('FFmpeg Required for Current Settings', {
			description:
				'Whisper C++ requires FFmpeg to convert audio to 16kHz WAV format when using browser recording.',
			action: {
				label: 'Install FFmpeg',
				onClick: () => goto('/install-ffmpeg'),
			},
			duration: 15000,
		});
		return;
	}

	// Case 2: Whisper C++ with CPAL method at wrong sample rate
	if (isUsingCpalMethodAtWrongSampleRate()) {
		toast.warning('FFmpeg Required for Current Settings', {
			description:
				'Whisper C++ requires 16kHz audio. FFmpeg is needed to convert your current sample rate.',
			action: {
				label: 'Install FFmpeg',
				onClick: () => goto('/install-ffmpeg'),
			},
			duration: 15000,
		});
		return;
	}

	// Case 3: CPAL method with cloud services - recommended for compression
	if (isUsingCpalMethodWithoutWhisperCpp()) {
		toast.info('Install FFmpeg for Enhanced Audio Support', {
			description:
				'FFmpeg enables audio compression for faster uploads to transcription services.',
			action: {
				label: 'Install FFmpeg',
				onClick: () => goto('/install-ffmpeg'),
			},
			duration: 10000,
		});
		return;
	}
}
