import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';
import { rpc } from '$lib/query';
import { settings } from '$lib/stores/settings.svelte';

/**
 * Checks for FFmpeg installation and shows an appropriate toast based on current settings.
 *
 * FFmpeg is REQUIRED when:
 * - Using Whisper C++ with browser recording backend
 * - Using Whisper C++ with native recording backend at any sample rate other than 16kHz
 *
 * FFmpeg is RECOMMENDED when:
 * - Using native recording backend with cloud transcription services (for compression)
 */
export async function checkFfmpeg() {
	// Only check in Tauri desktop app
	if (!window.__TAURI_INTERNALS__) return;

	const result = await rpc.ffmpeg.checkFfmpegInstalled.ensure();

	// If we couldn't check (error), don't show any toast
	if (result.error) return;

	const ffmpegInstalled = result.data;
	if (ffmpegInstalled === true) return; // FFmpeg is installed, all good

	const isUsingWhisperCpp =
		settings.value['transcription.selectedTranscriptionService'] ===
		'whispercpp';
	const isUsingNativeBackend = settings.value['recording.backend'] === 'native';
	const isUsing16kHz =
		settings.value['recording.desktop.sampleRate'] === '16000';

	// Case 1: Whisper C++ with browser backend - REQUIRED
	if (isUsingWhisperCpp && !isUsingNativeBackend) {
		toast.error('FFmpeg Required for Current Settings', {
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

	// Case 2: Whisper C++ with native backend at non-16kHz - REQUIRED
	if (isUsingWhisperCpp && isUsingNativeBackend && !isUsing16kHz) {
		toast.error('FFmpeg Required for Current Settings', {
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

	// Case 3: Native backend with cloud services - RECOMMENDED
	if (isUsingNativeBackend && !isUsingWhisperCpp) {
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
