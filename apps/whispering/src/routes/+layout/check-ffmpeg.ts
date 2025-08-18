import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';
import { rpc } from '$lib/query';

/**
 * Checks for FFmpeg installation and shows an info toast if not installed.
 * This is separate from onboarding to keep concerns separated.
 */
export async function checkFfmpeg() {
	const result = await rpc.ffmpeg.checkFfmpegInstalled.ensure();

	// If we couldn't check (error), don't show any toast
	if (result.error) return;

	const ffmpegInstalled = result.data;
	if (ffmpegInstalled === false) {
		// Only show if we're in Tauri and FFmpeg is definitely not installed
		toast.info('Install FFmpeg for Enhanced Audio Support', {
			description:
				'Whispering uses FFmpeg for transcription of more audio formats.',
			action: {
				label: 'Install FFmpeg',
				onClick: () => goto('/install-ffmpeg'),
			},
			duration: 10000, // Show for 10 seconds since it's important but optional
		});
	}
}
