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

<div class="flex h-screen flex-col gap-4 p-6">
	<div class="space-y-2">
		<h2 class="text-2xl font-semibold">Transform Clipboard</h2>
		<p class="text-sm text-muted-foreground">
			Select a transformation to apply to your clipboard text
		</p>
	</div>

	{#if clipboardQuery.isPending}
		<div class="flex min-h-32 items-center justify-center">
			<p class="text-sm text-muted-foreground">Reading clipboard...</p>
		</div>
	{:else}
		<Textarea
			value={clipboardText}
			readonly
			class="min-h-32 resize-none font-mono text-sm"
		/>
	{/if}

	<TransformationPickerBody
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
