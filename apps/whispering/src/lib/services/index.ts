import { AnalyticsServiceLive } from './analytics';
import { ClipboardServiceLive } from './clipboard';
import * as completions from './completion';
import { DbServiceLive } from './db';
import { DownloadServiceLive } from './download';
import { FfmpegServiceLive } from './ffmpeg';
import { GlobalShortcutManagerLive } from './global-shortcut-manager';
import { LocalShortcutManagerLive } from './local-shortcut-manager';
import { NotificationServiceLive } from './notifications';
import { OsServiceLive } from './os';
import {
	NativeRecorderServiceLive,
	BrowserRecorderServiceLive,
} from './recorder';
import { PlaySoundServiceLive } from './sound';
import { ToastServiceLive } from './toast';
import * as transcriptions from './transcription';
import { TrayIconServiceLive } from './tray';
import { VadServiceLive } from './vad-recorder';
import { asDeviceIdentifier } from './types';

/**
 * Unified services object providing consistent access to all services.
 */
export {
	AnalyticsServiceLive as analytics,
	asDeviceIdentifier,
	ClipboardServiceLive as clipboard,
	completions,
	TrayIconServiceLive as tray,
	DbServiceLive as db,
	DownloadServiceLive as download,
	FfmpegServiceLive as ffmpeg,
	GlobalShortcutManagerLive as globalShortcutManager,
	LocalShortcutManagerLive as localShortcutManager,
	NotificationServiceLive as notification,
	NativeRecorderServiceLive as nativeRecorder,
	BrowserRecorderServiceLive as browserRecorder,
	ToastServiceLive as toast,
	OsServiceLive as os,
	PlaySoundServiceLive as sound,
	transcriptions,
	VadServiceLive as vad,
};
