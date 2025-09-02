<script lang="ts">
	import { LabeledSelect } from '$lib/components/labeled/index.js';
	import { rpc } from '$lib/query';
	import type { DeviceIdentifier } from '$lib/services/types';
	import { asDeviceIdentifier } from '$lib/services/types';
	import { createQuery } from '@tanstack/svelte-query';

	let {
		selected,
		onSelectedChange,
	}: {
		selected: DeviceIdentifier | null;
		onSelectedChange: (selected: DeviceIdentifier | null) => void;
	} = $props();

	// Use vadRecorder.enumerateDevices for VAD (navigator devices only)
	const getDevicesQuery = createQuery(rpc.vadRecorder.enumerateDevices.options);

	$effect(() => {
		if (getDevicesQuery.isError) {
			rpc.notify.warning.execute(getDevicesQuery.error);
		}
	});
</script>

{#if getDevicesQuery.isPending}
	<LabeledSelect
		id="vad-recording-device"
		label="VAD Recording Device"
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
		id="vad-recording-device"
		label="VAD Recording Device"
		{items}
		selected={selected ?? asDeviceIdentifier('')}
		onSelectedChange={(value) =>
			onSelectedChange(value ? asDeviceIdentifier(value) : null)}
		placeholder="Select a device"
	/>
{/if}