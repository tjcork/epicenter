<script lang="ts">
	import WhisperingButton from '$lib/components/WhisperingButton.svelte';
	import * as Command from '@repo/ui/command';
	import * as Popover from '@repo/ui/popover';
	import { useCombobox } from '@repo/ui/hooks';
	import { rpc } from '$lib/query';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '@repo/ui/utils';
	import { createQuery } from '@tanstack/svelte-query';
	import { CheckIcon, MicIcon, RefreshCwIcon } from '@lucide/svelte';

	const combobox = useCombobox();

	// Setting key for manual mode
	const settingKey = 'recording.manual.selectedDeviceId';

	// Determine which backend to use for device enumeration
	// Manual mode uses the configured backend
	const isUsingBrowserBackend = $derived(
		!window.__TAURI_INTERNALS__ ||
			settings.value['recording.backend'] === 'navigator',
	);

	const selectedDeviceId = $derived(settings.value[settingKey]);

	const isDeviceSelected = $derived(!!selectedDeviceId);

	const getDevicesQuery = createQuery(() => ({
		...(isUsingBrowserBackend
			? rpc.vadRecorder.enumerateDevices.options()
			: rpc.recorder.enumerateDevices.options()),
		enabled: combobox.open,
	}));

	$effect(() => {
		if (getDevicesQuery.isError) {
			rpc.notify.warning.execute(getDevicesQuery.error);
		}
	});
</script>

<Popover.Root bind:open={combobox.open}>
	<Popover.Trigger bind:ref={combobox.triggerRef}>
		{#snippet child({ props })}
			<WhisperingButton
				{...props}
				tooltipContent={isDeviceSelected
					? 'Change recording device'
					: 'Select a recording device'}
				role="combobox"
				aria-expanded={combobox.open}
				variant="ghost"
				size="icon"
			>
				{#if isDeviceSelected}
					<MicIcon class="size-4 text-green-500" />
				{:else}
					<MicIcon class="size-4 text-amber-500" />
				{/if}
			</WhisperingButton>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-80 max-w-xl p-0">
		<Command.Root loop>
			<Command.Input placeholder="Select recording device..." />
			<Command.Empty>No recording devices found.</Command.Empty>
			<Command.Group class="overflow-y-auto max-h-[400px]">
				{#if getDevicesQuery.isPending}
					<div class="p-4 text-center text-sm text-muted-foreground">
						Loading devices...
					</div>
				{:else if getDevicesQuery.isError}
					<div class="p-4 text-center text-sm text-destructive">
						{getDevicesQuery.error.title}
					</div>
				{:else}
					{#each getDevicesQuery.data as device (device.id)}
						<Command.Item
							value={device.id}
							onSelect={() => {
								const currentDeviceId = selectedDeviceId;
								settings.updateKey(
									settingKey,
									currentDeviceId === device.id ? null : device.id,
								);
								combobox.closeAndFocusTrigger();
							}}
						>
							<CheckIcon
								class={cn(
									'mr-2 size-4',
									selectedDeviceId === device.id ? 'opacity-100' : 'opacity-0',
								)}
							/>
							{device.label}
						</Command.Item>
					{/each}
				{/if}
			</Command.Group>
			<Command.Separator />
			<Command.Group>
				<Command.Item
					onSelect={() => {
						getDevicesQuery.refetch();
					}}
				>
					<RefreshCwIcon
						class={cn(
							'mr-2 size-4',
							getDevicesQuery.isRefetching && 'animate-spin',
						)}
					/>
					Refresh devices
				</Command.Item>
			</Command.Group>
		</Command.Root>
	</Popover.Content>
</Popover.Root>
