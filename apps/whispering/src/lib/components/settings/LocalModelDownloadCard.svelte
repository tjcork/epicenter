<script lang="ts">
	import { Button } from '@repo/ui/button';
	import { Badge } from '@repo/ui/badge';
	import { Progress } from '@repo/ui/progress';
	import {
		Download,
		CheckIcon,
		LoaderCircle,
		Archive,
		X,
	} from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import {
		exists,
		mkdir,
		writeFile,
		remove,
		stat,
	} from '@tauri-apps/plugin-fs';
	import { fetch } from '@tauri-apps/plugin-http';
	import { invoke } from '@tauri-apps/api/core';
	import { extractErrorMessage } from 'wellcrafted/error';
	import { tryAsync, Ok } from 'wellcrafted/result';
	import { appDataDir, join, dirname } from '@tauri-apps/api/path';
	import { settings } from '$lib/stores/settings.svelte';
	import type { LocalModelConfig } from '$lib/services/transcription/local/types';

	let {
		model,
		isActive = false,
	}: {
		model: LocalModelConfig;
		isActive?: boolean;
	} = $props();

	type ModelState =
		| { type: 'not-downloaded' }
		| { type: 'downloading'; progress: number }
		| { type: 'extracting' }
		| { type: 'ready' };

	let modelState = $state<ModelState>({ type: 'not-downloaded' });

	// Get destination path for this model
	async function getDestinationPath(): Promise<string> {
		const appDir = await appDataDir();
		const modelsDir = await join(appDir, 'whisper-models');
		return await join(modelsDir, model.filename);
	}

	/**
	 * Extracts the filename from a URL (last segment after /)
	 */
	function getArchiveNameFromUrl(url: string): string {
		const segments = url.split('/');
		return segments[segments.length - 1];
	}

	/**
	 * Checks if a model is properly installed at the given path.
	 * For multi-file models: verifies the path is a directory
	 * For single-file models: verifies the file exists
	 */
	async function checkModelStatus(
		path: string,
		needsExtraction: boolean,
	): Promise<boolean> {
		if (!(await exists(path))) return false;

		if (needsExtraction) {
			// For multi-file models, path must be a directory
			const { data: stats } = await tryAsync({
				try: () => stat(path),
				catch: () => Ok(null),
			});
			return stats?.isDirectory ?? false;
		}

		// For non-extraction models, file existence is sufficient
		return true;
	}

	/**
	 * Gets the path where the archive file will be temporarily saved
	 * before extraction (for multi-file models only)
	 */
	async function getArchivePath(): Promise<string> {
		if (!model.needsExtraction) {
			throw new Error('Archive path only applies to multi-file models');
		}
		const modelPath = await getDestinationPath();
		const dir = await dirname(modelPath);
		const archiveName = getArchiveNameFromUrl(model.url);
		return await join(dir, archiveName);
	}

	// Check model status on mount and when path changes
	$effect(() => {
		refreshStatus();
	});

	async function refreshStatus() {
		await tryAsync({
			try: async () => {
				const path = await getDestinationPath();
				const isReady = await checkModelStatus(
					path,
					model.needsExtraction ?? false,
				);
				modelState = isReady ? { type: 'ready' } : { type: 'not-downloaded' };
			},
			catch: () => {
				modelState = { type: 'not-downloaded' };
				return Ok(undefined);
			},
		});
	}

	async function downloadModel() {
		if (modelState.type === 'downloading' || modelState.type === 'extracting')
			return;

		modelState = { type: 'downloading', progress: 0 };

		await tryAsync({
			try: async () => {
				const ensureDirectory = async (path: string) => {
					const dir = await dirname(path);
					const dirExists = await exists(dir);
					if (!dirExists) {
						await mkdir(dir, { recursive: true });
					}
				};

				const downloadFileContent = async (
					url: string,
					onProgress: (progress: number) => void,
				): Promise<Uint8Array> => {
					const response = await fetch(url);
					if (!response.ok) {
						throw new Error(`Failed to download: ${response.status}`);
					}

					const contentLength = response.headers.get('content-length');
					const totalBytes = contentLength
						? Number.parseInt(contentLength, 10)
						: model.sizeBytes;

					const reader = response.body?.getReader();
					if (!reader) {
						throw new Error('Failed to read response body');
					}

					const chunks: Uint8Array[] = [];
					let downloadedBytes = 0;

					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						chunks.push(value);
						downloadedBytes += value.length;
						const progress = Math.round((downloadedBytes / totalBytes) * 100);
						onProgress(progress);
					}

					// Combine chunks into single array
					const totalLength = chunks.reduce(
						(acc, chunk) => acc + chunk.length,
						0,
					);
					const fileContent = new Uint8Array(totalLength);
					let position = 0;
					for (const chunk of chunks) {
						fileContent.set(chunk, position);
						position += chunk.length;
					}

					return fileContent;
				};

				const path = await getDestinationPath();
				await ensureDirectory(path);

				// Check if already exists
				await refreshStatus();
				if (modelState.type === 'ready') {
					await activateModel();
					toast.success('Model already downloaded and activated');
					return;
				}

				// Download the file content
				const fileContent = await downloadFileContent(model.url, (progress) => {
					modelState = { type: 'downloading', progress };
				});

				// Handle extraction if needed
				if (model.needsExtraction) {
					const archivePath = await getArchivePath();

					// Write archive file
					await writeFile(archivePath, fileContent);

					// Extract
					modelState = { type: 'extracting' };
					toast.info('Extracting model archive...');

					// Clean up any existing directory
					if (await exists(path)) {
						await remove(path, { recursive: true });
					}

					// Extract based on file type
					const archiveName = getArchiveNameFromUrl(model.url);
					if (archiveName.endsWith('.tar.gz')) {
						await invoke('extract_tar_gz_archive', {
							archivePath: archivePath,
							targetDir: await dirname(path),
						});
					}

					// Clean up archive after successful extraction
					await remove(archivePath);
				} else {
					// Direct file download (no extraction needed)
					await writeFile(path, fileContent);
				}

				modelState = { type: 'ready' };
				await activateModel();
				toast.success('Model downloaded and activated successfully');
			},
			catch: (error) => {
				console.error('Download failed:', error);
				toast.error('Failed to download model', {
					description: extractErrorMessage(error),
				});
				modelState = { type: 'not-downloaded' };
				return Ok(undefined);
			},
		});
	}

	async function activateModel() {
		const path = await getDestinationPath();
		const settingsKey = model.needsExtraction
			? 'transcription.parakeet.modelPath'
			: 'transcription.whispercpp.modelPath';

		settings.updateKey(settingsKey, path);
		toast.success('Model activated');
	}

	async function deleteModel() {
		await tryAsync({
			try: async () => {
				const path = await getDestinationPath();
				if (await exists(path)) {
					await remove(path, { recursive: model.needsExtraction });
				}

				// Clean up any partial downloads or archives
				if (model.needsExtraction) {
					const archivePath = await getArchivePath();
					if (await exists(archivePath)) {
						await remove(archivePath);
					}
				}

				// Clear settings if this was the active model
				const settingsKey = model.needsExtraction
					? 'transcription.parakeet.modelPath'
					: 'transcription.whispercpp.modelPath';

				if (settings.value[settingsKey] === path) {
					settings.updateKey(settingsKey, '');
				}

				modelState = { type: 'not-downloaded' };
				toast.success('Model deleted');
			},
			catch: (error) => {
				toast.error('Failed to delete model', {
					description: extractErrorMessage(error),
				});
				return Ok(undefined);
			},
		});
	}
</script>

<div
	class="flex items-center gap-3 p-3 rounded-lg border {isActive
		? 'border-primary bg-primary/5'
		: ''}"
>
	<div class="flex-1">
		<div class="flex items-center gap-2">
			<span class="font-medium">{model.name}</span>
			{#if isActive}
				<Badge variant="default" class="text-xs">Active</Badge>
			{:else if modelState.type === 'ready'}
				<Badge variant="secondary" class="text-xs">Downloaded</Badge>
			{/if}
		</div>
		<div class="text-sm text-muted-foreground">
			{model.description}
		</div>
		<div class="text-xs text-muted-foreground mt-1">
			{model.size}
		</div>
	</div>

	<div class="flex items-center gap-2">
		{#if modelState.type === 'downloading'}
			<div class="flex items-center gap-2 min-w-[120px]">
				<LoaderCircle class="size-4 animate-spin" />
				<span class="text-sm font-medium">{modelState.progress}%</span>
			</div>
		{:else if modelState.type === 'extracting'}
			<div class="flex items-center gap-2 min-w-[120px]">
				<Archive class="size-4 animate-pulse" />
				<span class="text-sm">Extracting...</span>
			</div>
		{:else if modelState.type === 'ready'}
			{#if !isActive}
				<Button size="sm" variant="outline" onclick={activateModel}>
					Activate
				</Button>
			{:else}
				<Button size="sm" variant="default" disabled>
					<CheckIcon class="size-4 mr-1" />
					Activated
				</Button>
			{/if}
			<Button size="sm" variant="ghost" onclick={deleteModel}>
				<X class="size-4" />
			</Button>
		{:else}
			<Button size="sm" variant="outline" onclick={downloadModel}>
				<Download class="size-4 mr-2" />
				Download
			</Button>
		{/if}
	</div>
</div>

{#if modelState.type === 'downloading' && modelState.progress > 0}
	<Progress value={modelState.progress} class="mt-2 h-2" />
{/if}
