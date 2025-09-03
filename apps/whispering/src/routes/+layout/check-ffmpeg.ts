import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';
import { rpc } from '$lib/query';
import { settings } from '$lib/stores/settings.svelte';

function isUsingWhisperCpp(): boolean {
	return (
		settings.value['transcription.selectedTranscriptionService'] ===
		'whispercpp'
	);
}

function isUsing16kHz(): boolean {
	return settings.value['recording.cpal.sampleRate'] === '16000';
}

/**
 * FFmpeg is REQUIRED when using Whisper C++ with any recording method except CPAL at 16kHz
 * @returns true when using Whisper C++ + (not CPAL at 16kHz)
 */
export function isFfmpegRequired(): boolean {
	if (!isUsingWhisperCpp()) return false;

	if (settings.value['recording.method'] === 'cpal' && isUsing16kHz()) {
		return false; // CPAL at 16kHz with Whisper C++ doesn't need FFmpeg
	}

	return true; // All other Whisper C++ combinations need FFmpeg
}

/**
 * Compression is RECOMMENDED when using CPAL + cloud transcription AND compression is not enabled
 * @returns true when compression should be recommended to the user
 */
export function isCompressionRecommended(): boolean {
	return settings.value['recording.method'] === 'cpal' && !isUsingWhisperCpp() && !settings.value['transcription.compressionEnabled'];
}

/**
 * Checks for FFmpeg installation and shows an appropriate toast based on current settings.
 *
 * REQUIRED: Whisper C++ + any method except CPAL at 16kHz
 * RECOMMENDED: When compression is recommended (CPAL + cloud transcription + compression not enabled)
 */
export async function checkFfmpeg() {
	if (!window.__TAURI_INTERNALS__) return;

	const { data: ffmpegInstalled } =
		await rpc.ffmpeg.checkFfmpegInstalled.ensure();
	if (ffmpegInstalled) return; // FFmpeg is installed, all good

	// FFmpeg recording method selected but not installed
	if (settings.value['recording.method'] === 'ffmpeg') {
		toast.warning('FFmpeg Required for FFmpeg Recording Method', {
			description:
				'You have selected FFmpeg as your recording method, but FFmpeg is not installed.',
			action: {
				label: 'Install FFmpeg',
				onClick: () => goto('/install-ffmpeg'),
			},
			duration: 15000,
		});
		return;
	}

	// FFmpeg is REQUIRED for Whisper C++ (except CPAL at 16kHz)
	if (isFfmpegRequired()) {
		toast.warning('FFmpeg Required for Current Settings', {
			description:
				'Whisper C++ requires audio in 16kHz WAV format. Only CPAL recording at 16kHz produces this natively; all other recording methods and sample rates need FFmpeg to convert the audio.',
			action: {
				label: 'Go to Recording Settings',
				onClick: () => goto('/settings/recording'),
			},
			duration: 15000,
		});
		return;
	}

	// FFmpeg is RECOMMENDED for compression (CPAL + cloud transcription + compression not enabled)
	if (isCompressionRecommended()) {
		toast.info('Enable Compression for Faster Uploads', {
			description:
				'Since you\'re using CPAL recording with cloud transcription, we recommend enabling audio compression to reduce file sizes and upload times. First, install FFmpeg.',
			action: {
				label: 'Install FFmpeg',
				onClick: () => goto('/install-ffmpeg'),
			},
			duration: 10000,
		});
		return;
	}
}
