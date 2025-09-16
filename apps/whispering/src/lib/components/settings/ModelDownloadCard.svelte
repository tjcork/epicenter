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
	import { appDataDir, join, dirname } from '@tauri-apps/api/path';
	import { settings } from '$lib/stores/settings.svelte';

	let {
		model,
		isActive = false,
	}: {
		model: {
			id: string;
			name: string;
			description: string;
			size: string;
			sizeBytes: number;
			url: string;
			filename: string;
			needsExtraction?: boolean;
			archiveName?: string;
		};
		isActive?: boolean;
	} = $props();

	type ModelState =
		| { type: 'not-downloaded' }
		| { type: 'downloading'; progress: number }
		| { type: 'extracting' } // Optional: only for models with needsExtraction=true
		| { type: 'ready' };

	let modelState = $state<ModelState>({ type: 'not-downloaded' });

	// Get destination path for this model
	const destinationPath = $derived.by(async () => {
		const appDir = await appDataDir();
		const modelsDir = await join(appDir, 'whisper-models');
		return await join(modelsDir, model.filename);
	});

	// Check if model is already downloaded on mount
	$effect(() => {
		refreshStatus();
	});

	async function refreshStatus() {
		try {
			const path = await destinationPath;
			if (await exists(path)) {
				if (!model.needsExtraction) {
					modelState = { type: 'ready' };
				} else {
					try {
						const stats = await stat(path);
						modelState = stats.isDirectory
							? { type: 'ready' }
							: { type: 'not-downloaded' };
					} catch {
						modelState = { type: 'not-downloaded' };
					}
				}
			} else {
				modelState = { type: 'not-downloaded' };
			}
		} catch {
			modelState = { type: 'not-downloaded' };
		}
	}

	async function ensureDirectory(path: string) {
		const dir = await dirname(path);
		const dirExists = await exists(dir);
		if (!dirExists) {
			await mkdir(dir, { recursive: true });
		}
	}

	async function downloadModel() {
		if (modelState.type === 'downloading' || modelState.type === 'extracting')
			return;

		modelState = { type: 'downloading', progress: 0 };

		try {
			const path = await destinationPath;
			await ensureDirectory(path);

			// Check if already exists
			await refreshStatus();
			if (modelState.type === 'ready') {
				activateModel();
				toast.success('Model already downloaded and activated');
				return;
			}

			// Download the file
			const response = await fetch(model.url);
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
				modelState = { type: 'downloading', progress };
			}

			// Combine chunks
			const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
			const fileContent = new Uint8Array(totalLength);
			let position = 0;
			for (const chunk of chunks) {
				fileContent.set(chunk, position);
				position += chunk.length;
			}

			const path = await destinationPath;

			// Handle extraction if needed
			if (model.needsExtraction && model.archiveName) {
				const archivePath = path.replace(
					path.split('/').pop() || '',
					model.archiveName,
				);

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
				if (model.archiveName.endsWith('.tar.gz')) {
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
			activateModel();
			toast.success('Model downloaded and activated successfully');
		} catch (error) {
			console.error('Download failed:', error);
			toast.error('Failed to download model', {
				description: extractErrorMessage(error),
			});
			modelState = { type: 'not-downloaded' };
		}
	}

	function activateModel() {
		(async () => {
			const path = await destinationPath;
			// Determine settings key based on whether model needs extraction
			const settingsKey = model.needsExtraction
				? 'transcription.parakeet.modelPath'
				: 'transcription.whispercpp.modelPath';

			settings.updateKey(settingsKey, path);
			toast.success('Model activated');
		})();
	}

	async function deleteModel() {
		try {
			const path = await destinationPath;
			if (await exists(path)) {
				await remove(path, { recursive: model.needsExtraction });
			}

			// Clean up any partial downloads or archives
			if (model.needsExtraction && model.archiveName) {
				const archivePath = path.replace(
					path.split('/').pop() || '',
					model.archiveName,
				);
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
		} catch (error) {
			toast.error('Failed to delete model', {
				description: extractErrorMessage(error),
			});
		}
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
