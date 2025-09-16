<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { FolderOpen } from '@lucide/svelte';
	import { Button } from '@repo/ui/button';
	import * as Card from '@repo/ui/card';
	import { Input } from '@repo/ui/input';
	import { Link } from '@repo/ui/link';
	import * as Tabs from '@repo/ui/tabs';
	import { open } from '@tauri-apps/plugin-dialog';
	import { readDir } from '@tauri-apps/plugin-fs';
	import { toast } from 'svelte-sonner';
	import { extractErrorMessage } from 'wellcrafted/error';
	import { tryAsync, Ok } from 'wellcrafted/result';
	import { basename } from '@tauri-apps/api/path';
	import ModelDownloadCard from './ModelDownloadCard.svelte';

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
			isMultiFileModel: true,
		},
	] as const;

	// Browse for custom model directory
	async function browseForModel() {
		await tryAsync({
			try: async () => {
				const selected = await open({
					directory: true,
					multiple: false,
					title: 'Select Parakeet Model Directory',
				});
				if (!selected) return;

				// Verify it's a valid Parakeet model directory
				const modelFiles = await readDir(selected);
				const hasOnnxFiles = modelFiles.some((entry) =>
					entry.name.endsWith('.onnx'),
				);

				if (!hasOnnxFiles) {
					toast.error('Invalid model directory', {
						description: 'Selected directory does not contain ONNX model files',
					});
					return;
				}

				settings.updateKey('transcription.parakeet.modelPath', selected);
				toast.success('Model directory selected');
			},
			catch: (error) => {
				toast.error('Failed to select model', {
					description: extractErrorMessage(error),
				});
				return Ok(undefined);
			},
		});
	}

	// Check if a model is currently active
	const isModelActive = (modelId: string) => {
		const model = PARAKEET_MODELS.find((m) => m.id === modelId);
		if (!model) return false;

		return settings.value['transcription.parakeet.modelPath'].endsWith(
			model.filename,
		);
	};

	// Extract directory name from path
	const modelDirName = $derived.by(async () => {
		return await basename(settings.value['transcription.parakeet.modelPath']);
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
					<ModelDownloadCard {model} {isActive} />
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
							value={settings.value['transcription.parakeet.modelPath']}
							placeholder="/path/to/parakeet-model-directory"
							readonly
							class="flex-1"
						/>
						<Button onclick={browseForModel} variant="outline" size="icon">
							<FolderOpen class="size-4" />
						</Button>
					</div>
					{#if settings.value['transcription.parakeet.modelPath']}
						<div class="mt-2">
							<p class="text-sm text-muted-foreground">
								<span class="font-medium">Selected Model:</span>{' '}
								{modelDirName}
							</p>
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
