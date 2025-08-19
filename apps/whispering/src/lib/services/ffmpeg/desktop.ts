import { tryAsync, Ok, type Result } from 'wellcrafted/result';
import { WhisperingErr, type WhisperingError } from '$lib/result';
import type { FfmpegService } from './types';
import { extractErrorMessage } from 'wellcrafted/error';
import { IS_WINDOWS } from '$lib/constants/platform';

export function createFfmpegService(): FfmpegService {
	return {
		async checkInstalled(): Promise<Result<boolean, WhisperingError>> {
			const result = await tryAsync({
				try: async () => {
					const { Command } = await import('@tauri-apps/plugin-shell');
					const directCommand = await Command.create('ffmpeg', [
						'-version',
					]).execute();
					if (directCommand.code === 0) return directCommand;
					const output = await (IS_WINDOWS
						? Command.create('cmd', ['/c', 'ffmpeg -version'])
						: Command.create('sh', ['-c', 'ffmpeg -version'])
					).execute();
					return output;
				},
				mapErr: (error) =>
					WhisperingErr({
						title: '❌ Failed to check FFmpeg',
						description: `Unable to determine if FFmpeg is installed. ${extractErrorMessage(error)}`,
						action: { type: 'more-details', error },
					}),
			});

			if (result.error) return result;

			return Ok(result.data.code === 0);
		},
	};
}
