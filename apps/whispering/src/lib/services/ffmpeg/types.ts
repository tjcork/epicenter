import type { Result } from 'wellcrafted/result';
import type { WhisperingError } from '$lib/result';

export type FfmpegService = {
	/**
	 * Checks if FFmpeg is installed on the system.
	 * Returns Ok(true) if installed, Ok(false) if not installed.
	 */
	checkInstalled(): Promise<Result<boolean, WhisperingError>>;
};