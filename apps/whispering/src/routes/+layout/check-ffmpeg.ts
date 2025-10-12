import { toast } from 'svelte-sonner';
import { goto } from '$app/navigation';
import { rpc } from '$lib/query';
import { settings } from '$lib/stores/settings.svelte';

export const RECORDING_COMPATIBILITY_MESSAGE =
	'Unable to convert audio for local transcription. Most recordings work without FFmpeg, but compressed formats (MP3, M4A) require FFmpeg installation.';

export const COMPRESSION_RECOMMENDED_MESSAGE =
	"Since you're using CPAL recording with cloud transcription, we recommend enabling audio compression to reduce file sizes and upload times.";

/**
 * Switches recording settings to CPAL at 16kHz to resolve Whisper C++ compatibility
 */
export function switchToCpalAt16kHz() {
	settings.update({
		'recording.method': 'cpal',
		'recording.cpal.sampleRate': '16000',
	});
	toast.success('Recording settings updated', {
		description:
			'Switched to CPAL recording at 16kHz for Whisper C++ compatibility',
	});
}

function isUsingLocalTranscription(): boolean {
	const service = settings.value['transcription.selectedTranscriptionService'];
	return service === 'whispercpp' || service === 'parakeet';
}

function isUsing16kHz(): boolean {
	return settings.value['recording.cpal.sampleRate'] === '16000';
}

/**
 * Checks if there's a compatibility issue between current recording settings
 * and local transcription models (Whisper C++ and Parakeet).
 *
 * Local models require audio in 16kHz mono WAV format. With the pure Rust audio
 * conversion fallback, most recordings work without FFmpeg. FFmpeg is only required
 * for compressed formats (MP3, M4A, OGG, etc.).
 *
 * NOTE: This function now returns false for most cases since pure Rust conversion
 * handles uncompressed WAV files. It's kept for backwards compatibility and to
 * warn users about compressed formats that require FFmpeg.
 *
 * Why FFmpeg status is a parameter instead of checked internally:
 * - Checking FFmpeg requires an async RPC call (rpc.ffmpeg.checkFfmpegInstalled)
 * - This function must remain synchronous for use in Svelte template conditionals
 * - By accepting FFmpeg status as a parameter, we invert control - callers fetch
 *   the async data in their appropriate context (data loader or async function body)
 *   then pass it to this pure synchronous function
 *
 * @param isFFmpegInstalled - Whether FFmpeg is installed on the system. When true,
 *                            FFmpeg can convert audio formats, resolving compatibility issues.
 *                            Callers should fetch this via rpc.ffmpeg.checkFfmpegInstalled.ensure()
 * @returns true when current settings might have compatibility issues (always false now with Rust fallback)
 */
export function hasLocalTranscriptionCompatibilityIssue({
	isFFmpegInstalled,
}: { isFFmpegInstalled: boolean }): boolean {
	// With pure Rust audio conversion, most recordings work without FFmpeg
	// Pure Rust handles: different sample rates, stereo/mono, various bit depths
	// Only compressed formats (MP3, M4A, OGG) require FFmpeg

	// No issue if not using local transcription
	if (!isUsingLocalTranscription()) return false;

	// With Rust fallback, there are no compatibility issues for normal recordings
	// This function is now mainly for backwards compatibility
	return false;
}

/**
 * Compression is RECOMMENDED when using CPAL + cloud transcription AND compression is not enabled
 * @returns true when compression should be recommended to the user
 */
export function isCompressionRecommended(): boolean {
	return (
		settings.value['recording.method'] === 'cpal' &&
		!isUsingLocalTranscription() &&
		!settings.value['transcription.compressionEnabled']
	);
}

/**
 * Checks if FFmpeg recording method is selected but FFmpeg is not installed.
 * Shows a warning toast prompting the user to install FFmpeg when this incompatibility is detected.
 *
 * This function is specifically for validating the FFmpeg recording method selection.
 * It ensures users who have explicitly chosen FFmpeg as their recording method have it installed.
 *
 * @returns Promise<void> - Shows toast notification if FFmpeg method is selected but not installed
 */
export async function checkFfmpegRecordingMethodCompatibility() {
	if (!window.__TAURI_INTERNALS__) return;

	// Only check if FFmpeg recording method is selected
	if (settings.value['recording.method'] !== 'ffmpeg') return;

	const { data: ffmpegInstalled } =
		await rpc.ffmpeg.checkFfmpegInstalled.ensure();
	if (ffmpegInstalled) return; // FFmpeg is installed, all good

	// FFmpeg recording method selected but not installed
	toast.warning('FFmpeg Required for FFmpeg Recording Method', {
		description:
			'You have selected FFmpeg as your recording method, but FFmpeg is not installed.',
		action: {
			label: 'Install FFmpeg',
			onClick: () => goto('/install-ffmpeg'),
		},
		duration: 15000,
	});
}

/**
 * Checks for compatibility issues between local transcription models and current recording settings.
 * Shows a warning toast with resolution options when incompatible settings are detected.
 *
 * Local transcription models (Whisper C++ and Parakeet) require audio in 16kHz mono WAV format.
 * This function detects when current recording settings won't produce compatible audio and offers
 * two solutions: installing FFmpeg for automatic conversion or switching to CPAL at 16kHz.
 *
 * @returns Promise<void> - Shows toast notification if local transcription has compatibility issues
 */
export async function checkLocalTranscriptionCompatibility() {
	if (!window.__TAURI_INTERNALS__) return;

	const { data: ffmpegInstalled } =
		await rpc.ffmpeg.checkFfmpegInstalled.ensure();

	// Check if there are compatibility issues with local transcription
	if (
		!hasLocalTranscriptionCompatibilityIssue({
			isFFmpegInstalled: ffmpegInstalled ?? false,
		})
	)
		return;

	// Recording compatibility issue with local transcription models
	toast.warning('Recording Settings Incompatible', {
		description: RECORDING_COMPATIBILITY_MESSAGE,
		action: {
			label: 'Go to Recording Settings',
			onClick: () => goto('/settings/recording'),
		},
		duration: 15000,
	});
}

/**
 * Checks if audio compression should be recommended for optimal cloud transcription performance.
 * Shows an info toast suggesting compression when using CPAL recording with cloud services.
 *
 * Compression is recommended when:
 * - Using CPAL recording method (which produces uncompressed WAV files)
 * - Using cloud transcription services (not local models)
 * - Compression is not already enabled
 *
 * This helps reduce file sizes and upload times for cloud transcription services.
 *
 * @returns Promise<void> - Shows toast notification if compression is recommended
 */
export async function checkCompressionRecommendation() {
	if (!window.__TAURI_INTERNALS__) return;

	// Check if compression should be recommended
	if (!isCompressionRecommended()) return;

	const { data: ffmpegInstalled } =
		await rpc.ffmpeg.checkFfmpegInstalled.ensure();
	if (ffmpegInstalled) return; // FFmpeg is required for compression

	// FFmpeg is RECOMMENDED for compression
	toast.info('Enable Compression for Faster Uploads', {
		description: COMPRESSION_RECOMMENDED_MESSAGE,
		action: {
			label: 'Go to Transcription Settings',
			onClick: () => goto('/settings/transcription'),
		},
		duration: 10000,
	});
}
