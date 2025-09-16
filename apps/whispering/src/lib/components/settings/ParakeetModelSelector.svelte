<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { Button } from '@repo/ui/button';
	import * as Card from '@repo/ui/card';
	import { open } from '@tauri-apps/plugin-dialog';
	import { FolderOpenIcon } from '@lucide/svelte';

	const modelPath = $derived(
		settings.value['transcription.parakeet.modelPath'],
	);

	async function selectModelDirectory() {
		const selected = await open({
			directory: true,
			multiple: false,
			title: 'Select Parakeet Model Directory',
		});

		if (selected) {
			settings.updateKey('transcription.parakeet.modelPath', selected);
		}
	}
</script>

<div class="space-y-4">
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-lg">Parakeet Model</Card.Title>
			<Card.Description>
				Parakeet is an NVIDIA NeMo model optimized for fast local transcription.
				It automatically detects the language and doesn't support manual
				language selection.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="space-y-2">
				<p class="text-sm font-medium">Model Directory</p>
				{#if modelPath}
					<div
						class="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2"
					>
						<span class="truncate text-sm font-mono">{modelPath}</span>
						<Button
							variant="ghost"
							size="sm"
							onclick={selectModelDirectory}
							class="ml-2 shrink-0"
						>
							<FolderOpenIcon class="mr-2 size-4" />
							Change
						</Button>
					</div>
				{:else}
					<Button onclick={selectModelDirectory} variant="outline">
						<FolderOpenIcon class="mr-2 size-4" />
						Select Model Directory
					</Button>
				{/if}
			</div>

			<div class="rounded-md bg-muted/50 p-3">
				<p class="text-sm text-muted-foreground">
					<strong>Available Model:</strong> parakeet-tdt-0.6b-v3
				</p>
				<p class="text-sm text-muted-foreground mt-1">
					<strong>Size:</strong> ~1.2GB (directory with ONNX files)
				</p>
				<p class="text-sm text-muted-foreground mt-1">
					<strong>Performance:</strong> Int8 quantization for faster inference
				</p>
			</div>

			{#if !modelPath}
				<div class="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
					<p class="text-sm text-amber-600 dark:text-amber-400">
						To use Parakeet, you need to download the model files first. Visit
						the Handy project for instructions on obtaining the model.
					</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
