<script lang="ts">
	import { LabeledSelect } from '$lib/components/labeled/index.js';
	import { rpc } from '$lib/query';
	import { createQuery } from '@tanstack/svelte-query';
	import type { DeviceIdentifier } from '$lib/services/types';
	import { asDeviceIdentifier } from '$lib/services/types';

	let {
		selected,
		onSelectedChange,
		strategy = 'cpal',
	}: {
		selected: DeviceIdentifier | null;
		onSelectedChange: (selected: DeviceIdentifier | null) => void;
		strategy?: 'cpal' | 'navigator';
	} = $props();

	const getDevicesQuery = createQuery(
		strategy === 'navigator' 
			? rpc.vadRecorder.enumerateDevices.options
			: rpc.recorder.enumerateDevices.options
	);

	$effect(() => {
		if (getDevicesQuery.isError) {
			rpc.notify.warning.execute(
				getDevicesQuery.error
			);
		}
	});
</script>

{#if getDevicesQuery.isPending}
	<LabeledSelect
		id="recording-device"
		label="Recording Device"
		placeholder="Loading devices..."
		items={[{ value: '', label: 'Loading devices...' }]}
		selected={''}
		onSelectedChange={() => {}}
		disabled
	/>
{:else if getDevicesQuery.isError}
	<p class="text-sm text-red-500">
		{getDevicesQuery.error.title}
	</p>
{:else}
	{@const items = getDevicesQuery.data.map((device) => ({
		value: device.id,
		label: device.label,
	}))}
	<LabeledSelect
		id="recording-device"
		label="Recording Device"
		{items}
		selected={selected ?? asDeviceIdentifier('')}
		onSelectedChange={(value) => onSelectedChange(value ? asDeviceIdentifier(value) : null)}
		placeholder="Select a device"
	/>
{/if}
