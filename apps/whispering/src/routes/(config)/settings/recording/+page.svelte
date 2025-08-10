<script lang="ts">
	import { LabeledSelect } from '$lib/components/labeled/index.js';
	import { Separator } from '@repo/ui/separator';
	import { Button } from '@repo/ui/button';
	import { FolderOpen, ExternalLink } from 'lucide-svelte';
	import {
		BITRATE_OPTIONS,
		RECORDING_MODE_OPTIONS,
	} from '$lib/constants/audio';
	import { settings } from '$lib/stores/settings.svelte';
	import SelectRecordingDevice from './SelectRecordingDevice.svelte';
	import { asDeviceIdentifier } from '$lib/services/types';

	const SAMPLE_RATE_OPTIONS = [
		{ value: '16000', label: 'Voice Quality (16kHz): Optimized for speech' },
		{ value: '44100', label: 'Standard Quality (44.1kHz): CD quality' },
		{ value: '48000', label: 'High Quality (48kHz): Professional audio' },
	] as const;

	async function selectOutputFolder() {
		if (!window.__TAURI_INTERNALS__) return;
		
		const { open } = await import('@tauri-apps/plugin-dialog');
		const selected = await open({
			directory: true,
			multiple: false,
			title: 'Select Recording Output Folder',
		});
		
		if (selected) settings.updateKey('recording.desktop.outputFolder', selected);
	}

	async function openOutputFolder() {
		if (!window.__TAURI_INTERNALS__) return;
		const { openPath } = await import('@tauri-apps/plugin-opener');
		
		const folderPath = settings.value['recording.desktop.outputFolder'];
		if (!folderPath) {
			// If no custom folder is set, get the app data directory
			const { appDataDir } = await import('@tauri-apps/api/path');
			const defaultPath = await appDataDir();
			await openPath(defaultPath);
		} else {
			await openPath(folderPath);
		}
	}
</script>

<svelte:head>
	<title>Recording Settings - Whispering</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h3 class="text-lg font-medium">Recording</h3>
		<p class="text-muted-foreground text-sm">
			Configure your Whispering recording preferences.
		</p>
	</div>
	<Separator />

	<LabeledSelect
		id="recording-mode"
		label="Recording Mode"
		items={RECORDING_MODE_OPTIONS}
		selected={settings.value['recording.mode']}
		onSelectedChange={(selected) => {
			settings.updateKey('recording.mode', selected);
		}}
		placeholder="Select a recording mode"
		description={`Choose how you want to activate recording: ${RECORDING_MODE_OPTIONS.map(
			(option) => option.label.toLowerCase(),
		).join(', ')}`}
	/>

	{#if settings.value['recording.mode'] === 'manual' || settings.value['recording.mode'] === 'vad'}
		<div class="pl-4 border-l-2 border-muted space-y-6">
			<div>
				<h4 class="text-md font-medium">Recording Settings</h4>
				<p class="text-muted-foreground text-sm">
					Configure your audio recording preferences.
				</p>
			</div>

			<SelectRecordingDevice
				selected={settings.value['recording.selectedDeviceId'] ?? asDeviceIdentifier('')}
				onSelectedChange={(selected) => {
					settings.updateKey('recording.selectedDeviceId', selected);
				}}
			></SelectRecordingDevice>

			{#if !window.__TAURI_INTERNALS__}
				<!-- Web-specific settings -->
				<LabeledSelect
					id="bit-rate"
					label="Bitrate"
					items={BITRATE_OPTIONS.map((option) => ({
						value: option.value,
						label: option.label,
					}))}
					selected={settings.value['recording.navigator.bitrateKbps']}
					onSelectedChange={(selected) => {
						settings.updateKey('recording.navigator.bitrateKbps', selected);
					}}
					placeholder="Select a bitrate"
					description="The bitrate of the recording. Higher values mean better quality but larger file sizes."
				/>
			{:else}
				<!-- Desktop-specific settings -->
				<LabeledSelect
					id="sample-rate"
					label="Sample Rate"
					items={SAMPLE_RATE_OPTIONS}
					selected={settings.value['recording.desktop.sampleRate']}
					onSelectedChange={(selected) => {
						settings.updateKey('recording.desktop.sampleRate', selected as typeof SAMPLE_RATE_OPTIONS[number]['value']);
					}}
					placeholder="Select sample rate"
					description="Higher sample rates provide better quality but create larger files"
				/>

				<div class="space-y-2">
					<label for="output-folder" class="text-sm font-medium">
						Recording Output Folder
					</label>
					<div class="flex gap-2">
						<div class="flex-1 px-3 py-2 text-sm border rounded-md bg-muted">
							{settings.value['recording.desktop.outputFolder'] ?? 'Default (App Data Folder)'}
						</div>
						<Button
							variant="outline"
							size="sm"
							onclick={selectOutputFolder}
						>
							<FolderOpen class="w-4 h-4 mr-2" />
							Browse
						</Button>
						<Button
							variant="outline"
							size="sm"
							onclick={openOutputFolder}
						>
							<ExternalLink class="w-4 h-4 mr-2" />
							Open
						</Button>
						{#if settings.value['recording.desktop.outputFolder']}
							<Button
								variant="outline"
								size="sm"
								onclick={() => {
									settings.updateKey('recording.desktop.outputFolder', null);
								}}
							>
								Reset
							</Button>
						{/if}
					</div>
					<p class="text-xs text-muted-foreground">
						Choose where to save your recordings. Default location is secure and managed by the app.
					</p>
				</div>
			{/if}
		</div>
	{/if}
</div>
