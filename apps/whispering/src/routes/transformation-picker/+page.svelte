<script lang="ts">
	import { goto } from '$app/navigation';
	import TransformationPickerBody from '$lib/components/TransformationPickerBody.svelte';
	import { rpc } from '$lib/query';
	import { hideTransformationPicker } from '$lib/tauri/transformationPickerWindow';
	import { Textarea } from '@repo/ui/textarea';
	import { createQuery } from '@tanstack/svelte-query';
	import { nanoid } from 'nanoid/non-secure';

	const clipboardQuery = createQuery(() => ({
		...rpc.text.readFromClipboard.options(),
		refetchInterval: 1000,
	}));

	const clipboardText = $derived(clipboardQuery.data ?? '');

	$effect(() => {
		if (!window.__TAURI_INTERNALS__) return;

		if (clipboardQuery.error) {
			rpc.notify.error.execute({
				title: '❌ Failed to read clipboard',
				description: clipboardQuery.error.message,
				action: { type: 'more-details', error: clipboardQuery.error },
			});
			void hideTransformationPicker();
		}

		if (clipboardQuery.isSuccess && !clipboardQuery.data?.trim()) {
			rpc.notify.info.execute({
				title: 'Empty clipboard',
				description: 'Please copy some text before running a transformation.',
			});
			void hideTransformationPicker();
		}
	});
</script>

<div class="flex h-screen flex-col items-center bg-background">
	<div class="w-full max-w-2xl flex flex-col h-full">
		<div class="space-y-1 px-6 pt-4 pb-3">
			<div class="flex items-baseline justify-between">
				<h2 class="text-lg font-medium text-foreground/90">Transform Clipboard</h2>
				<div class="flex items-center gap-2 text-xs text-muted-foreground/60">
					<kbd class="px-1.5 py-0.5 rounded bg-muted text-[10px]">↵</kbd>
					<span>select</span>
					<kbd class="px-1.5 py-0.5 rounded bg-muted text-[10px] ml-2">Esc</kbd>
					<span>close</span>
				</div>
			</div>
			<p class="text-xs text-muted-foreground/80">
				Select a transformation to apply to your clipboard text
			</p>
		</div>

	{#if clipboardQuery.isPending}
		<div class="flex h-20 items-center justify-center px-6">
			<p class="text-xs text-muted-foreground">Reading clipboard...</p>
		</div>
	{:else}
		<div class="px-6 pb-3">
			<div class="relative">
				<Textarea
					value={clipboardText}
					readonly
					class="max-h-20 resize-none font-mono text-xs leading-relaxed border-muted-foreground/20 bg-muted/30"
					placeholder="Your clipboard content will appear here..."
				/>
				<div class="absolute bottom-2 right-3 text-[10px] text-muted-foreground/50 pointer-events-none font-mono">
					{clipboardText.length} chars
				</div>
			</div>
		</div>
	{/if}

	<TransformationPickerBody
		class="flex-1 rounded-none border-t"
		onSelect={async (transformation) => {
			if (!clipboardText) return;

			const toastId = nanoid();
			rpc.notify.loading.execute({
				id: toastId,
				title: '🔄 Running transformation...',
				description: 'Transforming your clipboard text...',
			});

			const { data: output, error: transformError } =
				await rpc.transformer.transformInput.execute({
					input: clipboardText,
					transformation,
				});

			if (transformError) {
				rpc.notify.error.execute({ id: toastId, ...transformError });
				// Hide window even on error
				await hideTransformationPicker();
				return;
			}

			rpc.sound.playSoundIfEnabled.execute('transformationComplete');

			await rpc.delivery.deliverTransformationResult.execute({
				text: output,
				toastId,
			});

			// Hide window after everything is complete
			await hideTransformationPicker();
		}}
		onSelectManageTransformations={async () => {
			await hideTransformationPicker();
			goto('/transformations');
		}}
		placeholder="Search transformations..."
	/>
	</div>
</div>
