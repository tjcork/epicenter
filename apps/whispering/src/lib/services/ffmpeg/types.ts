import { createTaggedError } from 'wellcrafted/error';
import type { Result } from 'wellcrafted/result';
export const { FfmpegServiceErr, FfmpegServiceError } =
	createTaggedError('FfmpegServiceError');

type FfmpegServiceError = ReturnType<typeof FfmpegServiceError>;

export type FfmpegService = {
	/**
	 * Checks if FFmpeg is installed on the system.
	 * Returns Ok(true) if installed, Ok(false) if not installed.
	 */
	checkInstalled(): Promise<Result<boolean, FfmpegServiceError>>;
};
