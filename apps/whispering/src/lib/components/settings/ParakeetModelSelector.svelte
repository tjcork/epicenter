<script lang="ts">
	import { Button } from '@repo/ui/button';
	import * as Card from '@repo/ui/card';
	import * as Tabs from '@repo/ui/tabs';
	import { Input } from '@repo/ui/input';
	import { Link } from '@repo/ui/link';
	import { FolderOpen } from '@lucide/svelte';
	import ModelDownloadCard from './ModelDownloadCard.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { toast } from 'svelte-sonner';
	import { settings } from '$lib/stores/settings.svelte';
	import { appDataDir, join } from '@tauri-apps/api/path';
	import { exists, readDir, stat, mkdir } from '@tauri-apps/plugin-fs';
	import { extractErrorMessage } from 'wellcrafted/error';
	import { open } from '@tauri-apps/plugin-dialog';

	// Pre-built Parakeet models configuration (using Handy blob storage)
	const PARAKEET_MODELS = [
		{
			id: 'parakeet-tdt-0.6b-v3-int8',
			name: 'Parakeet TDT 0.6B v3 (INT8)',
			description: 'Fast and accurate NVIDIA NeMo model',
			size: '~850 MB',
			sizeBytes: 892_000_000, // Approximate size of tar.gz
			url: 'https://blob.handy.computer/parakeet-v3-int8.tar.gz',
			filename: 'parakeet-tdt-0.6b-v3-int8', // Directory name after extraction
			needsExtraction: true,
			archiveName: 'parakeet-v3-int8.tar.gz',
		},
	] as const;

	// Component state
	let customModelPath = $state(
		settings.value['transcription.parakeet.modelPath'] || '',
	);

	// Update customModelPath when settings change
	$effect(() => {
		customModelPath = settings.value['transcription.parakeet.modelPath'] || '';
	});

	/**
	 * Gets the default directory where the app downloads models.
	 * This is shared with Whisper models for consistency.
	 */
	async function getDefaultModelsDownloadDirectory(): Promise<string> {
		const appDir = await appDataDir();
		return await join(appDir, 'whisper-models'); // Use same directory as Whisper
	}

	/**
	 * Creates the default models download directory if it doesn't exist.
	 */
	async function ensureDefaultModelsDirectory(): Promise<void> {
		const modelsDir = await getDefaultModelsDownloadDirectory();
		const dirExists = await exists(modelsDir);
		if (!dirExists) {
			await mkdir(modelsDir, { recursive: true });
		}
	}

	/**
	 * Constructs the full path to a model directory within the default download directory.
	 */
	async function getDefaultModelPath(dirname: string): Promise<string> {
		const modelsDir = await getDefaultModelsDownloadDirectory();
		return await join(modelsDir, dirname);
	}

	/**
	 * Constructs the path to the archive file.
	 */
	async function getArchivePath(archiveName: string): Promise<string> {
		const modelsDir = await getDefaultModelsDownloadDirectory();
		return await join(modelsDir, archiveName);
	}

	// Query to check which models are downloaded
	const downloadedModelsQuery = createQuery(() => ({
		queryKey: ['parakeetModels', 'downloaded'],
		queryFn: async () => {
			if (!window.__TAURI_INTERNALS__) return [];

			const downloaded: string[] = [];
			for (const model of PARAKEET_MODELS) {
				const modelPath = await getDefaultModelPath(model.filename);
				if (await exists(modelPath)) {
					// Verify it's a directory with expected files
					try {
						const stats = await stat(modelPath);
						if (stats.isDirectory) {
							downloaded.push(model.id);
						}
					} catch {
						// Directory doesn't exist or isn't accessible
					}
				}
			}
			return downloaded;
		},
		staleTime: 5000,
		enabled: !!window.__TAURI_INTERNALS__,
	}));


	// Handle model download complete
	async function handleModelDownloaded(modelPath: string) {
		settings.updateKey('transcription.parakeet.modelPath', modelPath);
		await downloadedModelsQuery.refetch();
	}

	// Activate an already downloaded model
	async function activateModel(modelPath: string) {
		settings.updateKey('transcription.parakeet.modelPath', modelPath);
		toast.success('Model activated');
	}

	// Delete a model
	async function deleteModel(modelPath: string) {
		// Clear settings if this was the active model
		if (settings.value['transcription.parakeet.modelPath'] === modelPath) {
			settings.updateKey('transcription.parakeet.modelPath', '');
		}
		await downloadedModelsQuery.refetch();
	}

	// Browse for custom model directory
	async function browseForModel() {
		try {
			const selected = await open({
				directory: true,
				multiple: false,
				title: 'Select Parakeet Model Directory',
			});

			if (selected) {
				// Verify it's a valid Parakeet model directory
				const modelFiles = await readDir(selected);
				const hasOnnxFiles = modelFiles.some((entry) =>
					entry.name?.endsWith('.onnx'),
				);

				if (!hasOnnxFiles) {
					toast.error('Invalid model directory', {
						description: 'Selected directory does not contain ONNX model files',
					});
					return;
				}

				settings.updateKey('transcription.parakeet.modelPath', selected);
				customModelPath = selected;
				toast.success('Model directory selected');
			}
		} catch (error) {
			toast.error('Failed to select model', {
				description: extractErrorMessage(error),
			});
		}
	}

	// Check if a model is currently active
	const isModelActive = (modelId: string) => {
		const model = PARAKEET_MODELS.find((m) => m.id === modelId);
		if (!model) return false;

		// Check if the current path ends with the model's filename
		return customModelPath.endsWith(model.filename);
	};

	// Get model directory info
	const modelDirInfo = $derived.by(() => {
		if (!customModelPath) return null;

		// Extract just the directory name for display
		const parts = customModelPath.split(/[/\\]/);
		const dirName = parts[parts.length - 1];

		// Check if it's a pre-built model
		const prebuiltModel = PARAKEET_MODELS.find((m) =>
			customModelPath.endsWith(m.filename),
		);

		return {
			path: customModelPath,
			name: dirName,
			isPrebuilt: !!prebuiltModel,
			modelInfo: prebuiltModel,
		};
	});
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-lg">Parakeet Model</Card.Title>
		<Card.Description>
			Parakeet is an NVIDIA NeMo model optimized for fast local transcription.
			It automatically detects the language and doesn't support manual language
			selection.
		</Card.Description>
	</Card.Header>
	<Card.Content class="space-y-6">
		<Tabs.Root value="prebuilt" class="w-full">
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="prebuilt">Pre-built Models</Tabs.Trigger>
				<Tabs.Trigger value="manual">Manual Selection</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="prebuilt" class="mt-4 space-y-3">
				{#each PARAKEET_MODELS as model}
					{@const isActive = isModelActive(model.id)}
					<ModelDownloadCard
						{model}
						{isActive}
					/>
				{/each}

				<div class="rounded-lg border bg-muted/50 p-4">
					<p class="text-sm text-muted-foreground">
						Models are downloaded from{' '}
						<Link
							href="https://blob.handy.computer/"
							target="_blank"
							rel="noopener noreferrer"
						>
							Handy's blob storage
						</Link>
						{' '}and stored in your app data directory. The archive is extracted
						automatically after download.
					</p>
				</div>
			</Tabs.Content>

			<Tabs.Content value="manual" class="mt-4 space-y-4">
				<div class="space-y-2">
					<label for="model-path" class="text-sm font-medium">
						Model Directory
					</label>
					<div class="flex gap-2">
						<Input
							id="model-path"
							value={customModelPath}
							placeholder="/path/to/parakeet-model-directory"
							readonly
							class="flex-1"
						/>
						<Button onclick={browseForModel} variant="outline" size="icon">
							<FolderOpen class="size-4" />
						</Button>
					</div>
					{#if modelDirInfo}
						<div class="mt-2 space-y-1">
							<p class="text-sm text-muted-foreground">
								<span class="font-medium">Available Model:</span>{' '}
								{modelDirInfo.name}
							</p>
							{#if modelDirInfo.isPrebuilt && modelDirInfo.modelInfo}
								<p class="text-sm text-muted-foreground">
									<span class="font-medium">Size:</span>{' '}
									{modelDirInfo.modelInfo.size} (directory with ONNX files)
								</p>
								<p class="text-sm text-muted-foreground">
									<span class="font-medium">Performance:</span> Int8 quantization
									for faster inference
								</p>
							{/if}
						</div>
					{/if}
				</div>

				<Card.Root class="bg-muted/50">
					<Card.Content class="p-4">
						<h4 class="mb-2 text-sm font-medium">Getting Parakeet Models</h4>
						<ul class="space-y-2 text-sm text-muted-foreground">
							<li class="flex items-start gap-2">
								<span
									class="mt-0.5 block size-1.5 rounded-full bg-muted-foreground/50"
								/>
								<span>
									Download pre-built models from the "Pre-built Models" tab
								</span>
							</li>
							<li class="flex items-start gap-2">
								<span
									class="mt-0.5 block size-1.5 rounded-full bg-muted-foreground/50"
								/>
								<span>
									Or download from{' '}
									<Link
										href="https://github.com/NVIDIA/NeMo"
										target="_blank"
										rel="noopener noreferrer"
									>
										NVIDIA NeMo
									</Link>
								</span>
							</li>
							<li class="flex items-start gap-2">
								<span
									class="mt-0.5 block size-1.5 rounded-full bg-muted-foreground/50"
								/>
								<span>
									Parakeet models are directories containing ONNX files
								</span>
							</li>
						</ul>
					</Card.Content>
				</Card.Root>
			</Tabs.Content>
		</Tabs.Root>
	</Card.Content>
</Card.Root>
