<script module lang="ts">
	export const transformationPickerDialog = (() => {
		let isOpen = $state(false);
		let clipboardText = $state<string | null>(null);

		return {
			get isOpen() {
				return isOpen;
			},
			set isOpen(value: boolean) {
				isOpen = value;
			},
			get clipboardText() {
				return clipboardText;
			},
			open(text: string) {
				clipboardText = text;
				isOpen = true;
			},
			close() {
				isOpen = false;
				clipboardText = null;
			},
		};
	})();
</script>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { rpc } from '$lib/query';
	import * as Dialog from '@repo/ui/dialog';
	import { Label } from '@repo/ui/label';
	import { Textarea } from '@repo/ui/textarea';
	import { nanoid } from 'nanoid/non-secure';
	import TransformationPickerBody from './TransformationPickerBody.svelte';
</script>

{#if transformationPickerDialog.clipboardText}
	<Dialog.Root bind:open={transformationPickerDialog.isOpen}>
		<Dialog.Content class="max-w-2xl">
			<Dialog.Header>
				<Dialog.Title>Transform Clipboard</Dialog.Title>
				<Dialog.Description>
					Select a transformation to apply to your clipboard text
				</Dialog.Description>
			</Dialog.Header>
			<div class="space-y-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="clipboardText" class="text-right">Clipboard Text</Label>
					<Textarea
						id="clipboardText"
						value={transformationPickerDialog.clipboardText}
						readonly
						class="col-span-3"
					/>
				</div>
				<TransformationPickerBody
					onSelect={async (transformation) => {
						transformationPickerDialog.close();

						if (!transformationPickerDialog.clipboardText) return;

						const toastId = nanoid();
						rpc.notify.loading.execute({
							id: toastId,
							title: '🔄 Running transformation...',
							description: 'Transforming your clipboard text...',
						});

						const { data: output, error: transformError } =
							await rpc.transformer.transformInput.execute({
								input: transformationPickerDialog.clipboardText,
								transformation,
							});

						if (transformError) {
							rpc.notify.error.execute({ id: toastId, ...transformError });
							return;
						}

						rpc.sound.playSoundIfEnabled.execute('transformationComplete');

						await rpc.delivery.deliverTransformationResult.execute({
							text: output,
							toastId,
						});
					}}
					onSelectManageTransformations={() => {
						transformationPickerDialog.close();
						goto('/transformations');
					}}
					placeholder="Search transformations..."
				/>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}
