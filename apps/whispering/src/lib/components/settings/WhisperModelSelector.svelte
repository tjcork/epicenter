<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { Paperclip, X } from '@lucide/svelte';
	import { Button } from '@repo/ui/button';
	import * as Card from '@repo/ui/card';
	import { Input } from '@repo/ui/input';
	import { Link } from '@repo/ui/link';
	import * as Tabs from '@repo/ui/tabs';
	import { createQuery } from '@tanstack/svelte-query';
	import { exists } from '@tauri-apps/plugin-fs';
	import { toast } from 'svelte-sonner';
	import ModelDownloadCard from './ModelDownloadCard.svelte';

	// Pre-built models configuration
	const WHISPER_MODELS = [
		{
			id: 'tiny',
			name: 'Tiny',
			description: 'Fastest, basic accuracy',
			size: '78 MB',
			sizeBytes: 77_700_000,
			url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.bin',
			filename: 'ggml-tiny.bin',
		},
		{
			id: 'small',
			name: 'Small',
			description: 'Fast, good accuracy',
			size: '488 MB',
			sizeBytes: 488_000_000,
			url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin',
			filename: 'ggml-small.bin',
		},
		{
			id: 'medium',
			name: 'Medium',
			description: 'Balanced speed & accuracy',
			size: '1.5 GB',
			sizeBytes: 1_530_000_000,
			url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin',
			filename: 'ggml-medium.bin',
		},
		{
			id: 'large-v3-turbo',
			name: 'Large v3 Turbo',
			description: 'Best accuracy, slower',
			size: '1.6 GB',
			sizeBytes: 1_620_000_000,
			url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo.bin',
			filename: 'ggml-large-v3-turbo.bin',
		},
	] as const;

	// Handle manual file selection
	async function selectManualModel() {
		if (!window.__TAURI_INTERNALS__) return;

		const { open } = await import('@tauri-apps/plugin-dialog');
		const selected = await open({
			multiple: false,
			filters: [
				{
					name: 'Whisper Models',
					extensions: ['bin', 'gguf', 'ggml'],
				},
			],
			title: 'Select Whisper Model File',
		});

		if (selected) {
			settings.updateKey('transcription.whispercpp.modelPath', selected);
			toast.success('Model selected');
			await modelFileQuery.refetch();
		}
	}

	// Get current active model - properly reactive to settings changes
	const activeModelId = $derived.by(() => {
		const currentModelPath =
			settings.value['transcription.whispercpp.modelPath'];
		if (!currentModelPath) return null;

		for (const model of WHISPER_MODELS) {
			if (currentModelPath.endsWith(model.filename)) {
				return model.id;
			}
		}
		return 'custom';
	});

	// Query to check if the manual model file exists
	const modelFileQuery = createQuery(() => ({
		queryKey: [
			'modelFileExists',
			settings.value['transcription.whispercpp.modelPath'],
		],
		queryFn: async () => {
			const modelPath = settings.value['transcription.whispercpp.modelPath'];
			if (!modelPath || !window.__TAURI_INTERNALS__) return null;
			return await exists(modelPath);
		},
		enabled:
			!!settings.value['transcription.whispercpp.modelPath'] &&
			!!window.__TAURI_INTERNALS__,
		staleTime: 5000,
	}));
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Whisper Model</Card.Title>
		<Card.Description>
			Select a pre-built model or browse for your own. Models run locally for
			private, offline transcription.
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<Tabs.Root value="prebuilt">
			<Tabs.List class="grid w-full grid-cols-2">
				<Tabs.Trigger value="prebuilt">Pre-built Models</Tabs.Trigger>
				<Tabs.Trigger value="manual">Manual Selection</Tabs.Trigger>
			</Tabs.List>

			<Tabs.Content value="prebuilt" class="space-y-4">
				<div class="grid gap-3">
					{#each WHISPER_MODELS as model}
						{@const isActive = activeModelId === model.id}
						<ModelDownloadCard {model} {isActive} />
					{/each}
				</div>
			</Tabs.Content>

			<Tabs.Content value="manual" class="space-y-4">
				<div class="space-y-4">
					<!-- Instructions -->
					<div>
						<p class="text-sm font-medium mb-2">
							<span class="text-muted-foreground">Step 1:</span> Download a Whisper
							model
						</p>
						<ul class="ml-6 mt-2 space-y-2 text-sm text-muted-foreground">
							<li class="list-disc">
								Visit the <Link
									href="https://huggingface.co/ggerganov/whisper.cpp/tree/main"
									target="_blank"
									rel="noopener noreferrer"
									class="underline"
								>
									model repository
								</Link>
							</li>
							<li class="list-disc">
								Download any model file (e.g., ggml-base.en.bin for
								English-only)
							</li>
							<li class="list-disc">
								Quantized models (q5_0, q8_0) offer smaller sizes with minimal
								quality loss
							</li>
						</ul>
					</div>

					<!-- Step 2: Select model -->
					<div>
						<p class="text-sm font-medium mb-2">
							<span class="text-muted-foreground">Step 2:</span> Select the model
							file
						</p>
						<div class="flex items-center gap-2">
							<Input
								id="whispercpp-model-path"
								type="text"
								value={settings.value['transcription.whispercpp.modelPath'] ||
									''}
								readonly
								placeholder="No model selected"
								class="flex-1"
							/>
							{#if settings.value['transcription.whispercpp.modelPath']}
								<Button
									variant="outline"
									size="icon"
									onclick={() => {
										settings.updateKey(
											'transcription.whispercpp.modelPath',
											'',
										);
										toast.success('Model path cleared');
									}}
									title="Clear model path"
								>
									<X class="size-4" />
								</Button>
							{/if}
							<Button
								variant="outline"
								size="icon"
								onclick={selectManualModel}
								title="Browse for model file"
							>
								<Paperclip class="size-4" />
							</Button>
						</div>
						{#if settings.value['transcription.whispercpp.modelPath']}
							{#if modelFileQuery.isPending}
								<p class="text-xs text-muted-foreground mt-1">
									Checking model file...
								</p>
							{:else if modelFileQuery.data === false}
								<p class="text-xs text-destructive mt-1">
									⚠️ Model file not found: {settings.value[
										'transcription.whispercpp.modelPath'
									]
										.split('/')
										.pop()}
								</p>
							{:else if modelFileQuery.data === true}
								<p class="text-xs text-green-600 dark:text-green-400 mt-1">
									✓ Model: {settings.value['transcription.whispercpp.modelPath']
										.split('/')
										.pop()}
								</p>
							{:else}
								<p class="text-xs text-muted-foreground mt-1">
									Model: {settings.value['transcription.whispercpp.modelPath']
										.split('/')
										.pop()}
								</p>
							{/if}
						{/if}
					</div>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</Card.Content>
</Card.Root>
