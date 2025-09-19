<script lang="ts">
	import { Button } from '@repo/ui/button';
	import { Badge } from '@repo/ui/badge';
	import { Progress } from '@repo/ui/progress';
	import { Download, CheckIcon, LoaderCircle, X } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import {
		exists,
		mkdir,
		writeFile,
		remove,
		stat,
	} from '@tauri-apps/plugin-fs';
	import { fetch } from '@tauri-apps/plugin-http';
	import { extractErrorMessage } from 'wellcrafted/error';
	import { tryAsync, Ok } from 'wellcrafted/result';
	import { appDataDir, join } from '@tauri-apps/api/path';
	import { settings } from '$lib/stores/settings.svelte';
	import type {
		LocalModelConfig,
		WhisperModelConfig,
		ParakeetModelConfig,
	} from '$lib/services/transcription/local/types';

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
		| { type: 'ready' };

	let modelState = $state<ModelState>({ type: 'not-downloaded' });

	/**
	 * Calculates the destination path where this model will be downloaded and stored,
	 * and ensures that the parent directory structure exists.
	 *
	 * @returns The full path where the model should be stored:
	 * - For Whisper models: `{appDataDir}/whisper-models/{filename}` (a single file)
	 * - For Parakeet models: `{appDataDir}/parakeet-models/{directoryName}/` (a directory containing multiple files)
	 */
	async function ensureModelDestinationPath(): Promise<string> {
		const appDir = await appDataDir();

		switch (model.engine) {
			case 'whisper': {
				const modelsDir = await join(appDir, 'whisper-models');
				// Ensure directory exists
				if (!(await exists(modelsDir))) {
					await mkdir(modelsDir, { recursive: true });
				}
				return await join(modelsDir, model.file.filename);
			}
			case 'parakeet': {
				// Parakeet models are stored in a directory
				const parakeetModelsDir = await join(appDir, 'parakeet-models');
				// Ensure directory exists
				if (!(await exists(parakeetModelsDir))) {
					await mkdir(parakeetModelsDir, { recursive: true });
				}
				return await join(parakeetModelsDir, model.directoryName);
			}
		}
	}

	/**
	 * Checks if a model is properly installed at the given path.
	 */
	async function checkModelStatus(path: string): Promise<boolean> {
		switch (model.engine) {
			case 'whisper': {
				// For Whisper models, file existence is sufficient
				return await exists(path);
			}
			case 'parakeet': {
				if (!(await exists(path))) return false;
				// For Parakeet models, path must be a directory containing all files
				const { data: stats } = await tryAsync({
					try: () => stat(path),
					catch: () => Ok(null),
				});
				if (!stats?.isDirectory) return false;

				// Check that all required files exist
				for (const file of model.files) {
					const filePath = await join(path, file.filename);
					if (!(await exists(filePath))) return false;
				}
				return true;
			}
		}
	}

	// Check model status on mount and when path changes
	$effect(() => {
		refreshStatus();
	});

	async function refreshStatus() {
		await tryAsync({
			try: async () => {
				const path = await ensureModelDestinationPath();
				const isReady = await checkModelStatus(path);
				modelState = isReady ? { type: 'ready' } : { type: 'not-downloaded' };
			},
			catch: () => {
				modelState = { type: 'not-downloaded' };
				return Ok(undefined);
			},
		});
	}

	async function downloadModel() {
		if (modelState.type === 'downloading') return;

		modelState = { type: 'downloading', progress: 0 };

		await tryAsync({
			try: async () => {
				const downloadFileContent = async (
					url: string,
					sizeBytes: number,
					onProgress: (progress: number) => void,
				): Promise<Uint8Array> => {
					const response = await fetch(url);
					if (!response.ok) {
						throw new Error(`Failed to download: ${response.status}`);
					}

					const contentLength = response.headers.get('content-length');
					const totalBytes = contentLength
						? Number.parseInt(contentLength, 10)
						: sizeBytes;

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

				const path = await ensureModelDestinationPath();

				// Check if already exists
				await refreshStatus();
				if (modelState.type === 'ready') {
					await activateModel();
					toast.success('Model already downloaded and activated');
					return;
				}

				if (model.engine === 'whisper') {
					// Single file download for Whisper
					const fileContent = await downloadFileContent(
						model.file.url,
						model.sizeBytes,
						(progress) => {
							modelState = { type: 'downloading', progress };
						},
					);
					await writeFile(path, fileContent);
				} else {
					// Multiple file downloads for Parakeet
					const totalBytes = model.sizeBytes;
					let downloadedBytes = 0;

					// Create directory for model files
					await mkdir(path, { recursive: true });

					for (const file of model.files) {
						const filePath = await join(path, file.filename);
						const fileContent = await downloadFileContent(
							file.url,
							file.sizeBytes,
							(fileProgress) => {
								const overallProgress = Math.round(
									((downloadedBytes + (file.sizeBytes * fileProgress) / 100) /
										totalBytes) *
										100,
								);
								modelState = { type: 'downloading', progress: overallProgress };
							},
						);
						await writeFile(filePath, fileContent);
						downloadedBytes += file.sizeBytes;
					}
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
		const path = await ensureModelDestinationPath();
		const settingsKey =
			model.engine === 'parakeet'
				? 'transcription.parakeet.modelPath'
				: 'transcription.whispercpp.modelPath';

		settings.updateKey(settingsKey, path);
		toast.success('Model activated');
	}

	async function deleteModel() {
		await tryAsync({
			try: async () => {
				const path = await ensureModelDestinationPath();
				if (await exists(path)) {
					await remove(path, { recursive: model.engine === 'parakeet' });
				}

				// Clear settings if this was the active model
				const settingsKey =
					model.engine === 'parakeet'
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
