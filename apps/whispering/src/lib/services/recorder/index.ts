import { createDesktopRecorderService } from './desktop';
import { createWebRecorderService } from './web';

/**
 * Native recorder service that uses the Rust backend when available.
 * Falls back to browser recording when not in Tauri environment.
 */
export const NativeRecorderServiceLive = window.__TAURI_INTERNALS__
	? createDesktopRecorderService()
	: createWebRecorderService();

/**
 * Browser recorder service that always uses the MediaRecorder API,
 * even when running in the desktop app.
 */
export const BrowserRecorderServiceLive = createWebRecorderService();

// Re-export types for convenience
export type { RecorderService, RecorderServiceError } from './types';
