import { tryAsync, Ok, type Result } from 'wellcrafted/result';
import { WhisperingErr, type WhisperingError } from '$lib/result';
import type { FfmpegService } from './types';
import { extractErrorMessage } from 'wellcrafted/error';
import { IS_WINDOWS } from '$lib/constants/platform';

export function createFfmpegService(): FfmpegService {
	return {
		async checkInstalled(): Promise<Result<boolean, WhisperingError>> {
			// Try direct FFmpeg command first
			const directFfmpegResult = await tryAsync({
				try: async () => {
					const { Command } = await import('@tauri-apps/plugin-shell');
					const directCommand = await Command.create('ffmpeg', [
						'-version',
					]).execute();
					return directCommand;
				},
				mapErr: (error) =>
					WhisperingErr({
						title: '❌ Failed to check FFmpeg',
						description: `Unable to determine if FFmpeg is installed. ${extractErrorMessage(error)}`,
						action: { type: 'more-details', error },
					}),
			});

			if (directFfmpegResult.error) return directFfmpegResult;

			// If direct command succeeded, return success
			if (directFfmpegResult.data.code === 0) return Ok(true);

			// Otherwise, try shell-wrapped command as fallback
			const shellFfmpegResult = await tryAsync({
				try: async () => {
					const { Command } = await import('@tauri-apps/plugin-shell');
					const output = await (IS_WINDOWS
						? Command.create('cmd', ['/c', 'ffmpeg -version'])
						: Command.create('sh', ['-c', 'ffmpeg -version'])
					).execute();
					return output;
				},
				mapErr: (error) =>
					WhisperingErr({
						title: '❌ Failed to check FFmpeg via shell',
						description: `Unable to determine if FFmpeg is installed through shell. ${extractErrorMessage(error)}`,
						action: { type: 'more-details', error },
					}),
			});

			if (shellFfmpegResult.error) return shellFfmpegResult;

			return Ok(shellFfmpegResult.data.code === 0);
		},
	};
}
