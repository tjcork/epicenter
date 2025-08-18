import { tryAsync } from 'wellcrafted/result';
import { Err } from 'wellcrafted/result';
import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';

/**
 * Checks if FFmpeg is installed on the system.
 * Returns true if installed, false if not, null if unable to check.
 */
async function checkFfmpegInstalled(): Promise<boolean | null> {
	if (!window.__TAURI_INTERNALS__) return null;

	const { data } = await tryAsync({
		try: async () => {
			const { Command } = await import('@tauri-apps/plugin-shell');
			const result = await Command.create('exec-sh', [
				'-c',
				'ffmpeg -version',
			]).execute();
			return result;
		},
		mapErr: () => Err(undefined),
	});

	return data?.code === 0;
}

/**
 * Checks for FFmpeg installation and shows an info toast if not installed.
 * This is separate from onboarding to keep concerns separated.
 */
export async function checkFfmpeg() {
	const ffmpegInstalled = await checkFfmpegInstalled();

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
