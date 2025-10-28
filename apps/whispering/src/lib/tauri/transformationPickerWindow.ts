import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

const WINDOW_LABEL = 'transformation-picker';

let windowInstance: WebviewWindow | null = null;

/**
 * Toggles the transformation picker window (show if hidden, hide if shown).
 * Creates window on first call, then toggles visibility for instant toggling.
 * Window reads clipboard directly when shown.
 */
export async function toggleTransformationPicker(): Promise<void> {
	// Check if window already exists
	const existingWindow = await WebviewWindow.getByLabel(WINDOW_LABEL);

	if (existingWindow) {
		// Window exists, check if it's visible
		const isVisible = await existingWindow.isVisible();

		if (isVisible) {
			// Hide it
			await existingWindow.hide();
		} else {
			// Show and focus it
			await existingWindow.show();
			await existingWindow.setFocus();
		}
		windowInstance = existingWindow;
	} else {
		// Create new window (only happens once)
		windowInstance = new WebviewWindow(WINDOW_LABEL, {
			url: '/transformation-picker',
			title: 'Transform Clipboard',
			width: 700,
			height: 600,
			center: true,
			alwaysOnTop: true,
			decorations: true,
			resizable: true,
			focus: true,
			visible: true,
		});

		// Handle window creation events
		windowInstance.once('tauri://created', () => {
			console.log('Transformation picker window created successfully');
		});

		windowInstance.once('tauri://error', (error) => {
			console.error('Failed to create transformation picker window:', error);
			windowInstance = null;
		});
	}
}

/**
 * Hides the transformation picker window (doesn't destroy it for fast re-opening)
 */
export async function hideTransformationPicker(): Promise<void> {
	const existingWindow = await await WebviewWindow.getByLabel(WINDOW_LABEL);
	if (existingWindow) {
		try {
			await existingWindow.hide();
		} catch (error) {
			console.error('Error hiding transformation picker window:', error);
		}
	}
}
