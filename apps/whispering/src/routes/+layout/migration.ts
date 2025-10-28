/**
 * One-time migration utilities for path structure changes.
 *
 * TODO: Remove this entire file after v7.7.0 release (most users will have migrated by then)
 */

import { tryAsync, Ok } from 'wellcrafted/result';

/**
 * Migrates model files from old redundant path structure to new simplified structure.
 *
 * Old paths:
 * - {appDataDir}/whispering/models -> {appDataDir}/models
 * - {appDataDir}/whisper-models -> {appDataDir}/models/whisper
 * - {appDataDir}/parakeet-models -> {appDataDir}/models/parakeet
 *
 * This migration is needed because appDataDir() already returns a path containing
 * the app identifier (com.bradenwong.whispering), so redundant nesting should be removed.
 *
 * Call this early in app initialization, before any file operations.
 *
 * TODO: Remove this function in v7.7.0 or later
 */
export async function migrateModelPaths(): Promise<void> {
	const { appDataDir, join } = await import('@tauri-apps/api/path');
	const { exists, rename, readDir, mkdir } = await import('@tauri-apps/plugin-fs');

	console.log('[Migration] Running one-time migrations...');

	const appDir = await appDataDir();

	// Migration 1: Move {appDataDir}/whispering/models -> {appDataDir}/models
	await tryAsync({
		try: async () => {
			const oldPath = await join(appDir, 'whispering', 'models');
			const newPath = await join(appDir, 'models');

			if (!(await exists(oldPath))) {
				console.log('[Migration] Legacy whispering/models path not found, skipping');
				return;
			}

			if (await exists(newPath)) {
				const oldContents = await readDir(oldPath);
				if (oldContents.length === 0) {
					console.log('[Migration] Legacy whispering/models is empty, already migrated');
					return;
				}
				console.warn('[Migration] Both whispering/models and models exist, manual intervention needed');
				return;
			}

			console.log('[Migration] Moving whispering/models -> models');
			await rename(oldPath, newPath);
			console.log('[Migration] Successfully migrated whispering/models');
		},
		catch: (error) => {
			console.error('[Migration] Failed to migrate whispering/models (non-fatal):', error);
			return Ok(undefined);
		},
	});

	// Migration 2: Move {appDataDir}/whisper-models -> {appDataDir}/models/whisper
	await tryAsync({
		try: async () => {
			const oldPath = await join(appDir, 'whisper-models');
			const newPath = await join(appDir, 'models', 'whisper');

			if (!(await exists(oldPath))) {
				console.log('[Migration] Legacy whisper-models path not found, skipping');
				return;
			}

			if (await exists(newPath)) {
				const oldContents = await readDir(oldPath);
				if (oldContents.length === 0) {
					console.log('[Migration] Legacy whisper-models is empty, already migrated');
					return;
				}
				console.warn('[Migration] Both whisper-models and models/whisper exist, manual intervention needed');
				return;
			}

			// Ensure parent directory exists
			const modelsDir = await join(appDir, 'models');
			if (!(await exists(modelsDir))) {
				await mkdir(modelsDir, { recursive: true });
			}

			console.log('[Migration] Moving whisper-models -> models/whisper');
			await rename(oldPath, newPath);
			console.log('[Migration] Successfully migrated whisper-models');
		},
		catch: (error) => {
			console.error('[Migration] Failed to migrate whisper-models (non-fatal):', error);
			return Ok(undefined);
		},
	});

	// Migration 3: Move {appDataDir}/parakeet-models -> {appDataDir}/models/parakeet
	await tryAsync({
		try: async () => {
			const oldPath = await join(appDir, 'parakeet-models');
			const newPath = await join(appDir, 'models', 'parakeet');

			if (!(await exists(oldPath))) {
				console.log('[Migration] Legacy parakeet-models path not found, skipping');
				return;
			}

			if (await exists(newPath)) {
				const oldContents = await readDir(oldPath);
				if (oldContents.length === 0) {
					console.log('[Migration] Legacy parakeet-models is empty, already migrated');
					return;
				}
				console.warn('[Migration] Both parakeet-models and models/parakeet exist, manual intervention needed');
				return;
			}

			// Ensure parent directory exists
			const modelsDir = await join(appDir, 'models');
			if (!(await exists(modelsDir))) {
				await mkdir(modelsDir, { recursive: true });
			}

			console.log('[Migration] Moving parakeet-models -> models/parakeet');
			await rename(oldPath, newPath);
			console.log('[Migration] Successfully migrated parakeet-models');
		},
		catch: (error) => {
			console.error('[Migration] Failed to migrate parakeet-models (non-fatal):', error);
			return Ok(undefined);
		},
	});

	console.log('[Migration] Migrations complete');
}
