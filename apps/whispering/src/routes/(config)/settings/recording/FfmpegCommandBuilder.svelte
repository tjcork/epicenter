<script lang="ts">
	import { LabeledSelect } from '$lib/components/labeled/index.js';
	import { Input } from '@repo/ui/input';
	import { Label } from '@repo/ui/label';
	import { IS_MACOS, IS_WINDOWS, IS_LINUX, PLATFORM_TYPE } from '$lib/constants/platform';
	import { settings } from '$lib/stores/settings.svelte';
	import { appDataDir } from '@tauri-apps/api/path';
	import { rpc } from '$lib/query';
	import { createQuery } from '@tanstack/svelte-query';
	import { interpolateTemplate, asTemplateString } from '$lib/utils/template';

	// Props - only bind the command template
	let { commandTemplate = $bindable() }: { commandTemplate: string | null } = $props();

	// Get devices for the current backend
	const isUsingBrowserBackend = $derived(
		!window.__TAURI_INTERNALS__ || settings.value['recording.backend'] === 'browser'
	);

	const getDevicesQuery = createQuery(
		() => isUsingBrowserBackend 
			? rpc.vadRecorder.enumerateDevices.options()
			: rpc.recorder.enumerateDevices.options()
	);

	// Get the actual selected device or use the first available
	const selectedDevice = $derived(
		getDevicesQuery.data?.find(d => d.id === settings.value['recording.manual.selectedDeviceId']) ??
		getDevicesQuery.data?.[0]
	);

	// Get the actual output folder from settings
	let defaultOutputFolder = $state('');

	// Get platform-specific format
	function getAudioInputFormat() {
		if (IS_MACOS) return 'avfoundation';
		if (IS_WINDOWS) return 'dshow';
		if (IS_LINUX) return 'alsa';
		return 'pulse';
	}

	const FFMPEG_FORMAT_OPTIONS = [
		{ value: 'wav', label: 'WAV (Uncompressed)', codec: 'pcm_s16le' },
		{ value: 'mp3', label: 'MP3 (Compressed)', codec: 'libmp3lame' },
		{ value: 'aac', label: 'AAC (Compressed)', codec: 'aac' },
		{ value: 'ogg', label: 'OGG Vorbis', codec: 'libvorbis' },
		{ value: 'opus', label: 'Opus (Modern)', codec: 'libopus' },
	] as const;

	const FFMPEG_SAMPLE_RATE_OPTIONS = [
		{ value: '16000', label: '16 kHz (Voice)' },
		{ value: '22050', label: '22.05 kHz (Low)' },
		{ value: '44100', label: '44.1 kHz (CD Quality)' },
		{ value: '48000', label: '48 kHz (Professional)' },
	] as const;

	const FFMPEG_BITRATE_OPTIONS = [
		{ value: '64', label: '64 kbps (Low)' },
		{ value: '128', label: '128 kbps (Standard)' },
		{ value: '192', label: '192 kbps (Good)' },
		{ value: '256', label: '256 kbps (High)' },
		{ value: '320', label: '320 kbps (Best)' },
	] as const;

	// Initialize local state from existing commandTemplate. Will automatically update when commandTemplate changes
	let ffmpegFormat = $derived.by(() => {
		if (commandTemplate?.includes('libmp3lame')) return 'mp3';
		if (commandTemplate?.includes('aac')) return 'aac';
		if (commandTemplate?.includes('libvorbis')) return 'ogg';
		if (commandTemplate?.includes('libopus')) return 'opus';
		return 'wav';
	})
	let ffmpegSampleRate = $derived(commandTemplate?.match(/-ar\s+(\d+)/)?.[1] ?? '16000');
	let ffmpegBitrate = $derived(commandTemplate?.match(/-b:a\s+(\d+)k?/)?.[1] ?? '128');

	// Build command from current selections
	function buildCommand(): string {
		const formatOption = FFMPEG_FORMAT_OPTIONS.find(opt => opt.value === ffmpegFormat);
		const codec = formatOption?.codec || 'pcm_s16le';
		const ext = formatOption?.value || 'wav';
		
		// Platform-specific device input format
		const deviceInput =  {
			'macos': '":{{device}}"', // macOS uses :deviceName
			'windows': '"audio={{device}}"', // Windows uses audio=deviceName
			'linux': '"{{device}}"', // Linux uses device directly
		}[PLATFORM_TYPE]
		
		const format = getAudioInputFormat();
		
		let command = `ffmpeg -f ${format} -i ${deviceInput}`;
		command += ` -acodec ${codec}`;
		command += ` -ar ${ffmpegSampleRate}`;
		
		if (ffmpegFormat !== 'wav') command += ` -b:a ${ffmpegBitrate}k`;
		
		command += ` "{{outputFolder}}/{{recordingId}}.${ext}"`;
		
		return command;
	}

	// Update parent's commandTemplate whenever selections change
	$effect(() => {
		commandTemplate = buildCommand();
	});

	// Generate example command with real values
	const exampleCommand = $derived.by(async () => {
		if (!commandTemplate) return '';
		
		// Use actual values from settings/device selection
		const exampleVars = {
			device: selectedDevice?.id || 'default',
			outputFolder: settings.value['recording.desktop.outputFolder'] ?? await appDataDir(),
			recordingId: 'abc123xyz',
		};
		
		// Use the template interpolation helper
		return interpolateTemplate(asTemplateString(commandTemplate), exampleVars);
	}
);
	
</script>

<div class="space-y-4">
	<div class="space-y-4 rounded-lg border p-4">
		<h4 class="text-sm font-medium">FFmpeg Command Builder</h4>
		
		<LabeledSelect
			id="ffmpeg-format"
			label="Audio Format"
			items={FFMPEG_FORMAT_OPTIONS}
			selected={ffmpegFormat}
			onSelectedChange={(selected) => {
				ffmpegFormat = selected;
			}}
			placeholder="Select audio format"
			description="Choose the output audio format and codec"
		/>
		
		<LabeledSelect
			id="ffmpeg-sample-rate"
			label="Sample Rate"
			items={FFMPEG_SAMPLE_RATE_OPTIONS}
			selected={ffmpegSampleRate}
			onSelectedChange={(selected) => {
				ffmpegSampleRate = selected;
			}}
			placeholder="Select sample rate"
			description="Higher sample rates provide better quality"
		/>
		
		{#if ffmpegFormat !== 'wav'}
			<LabeledSelect
				id="ffmpeg-bitrate"
				label="Bitrate"
				items={FFMPEG_BITRATE_OPTIONS}
				selected={ffmpegBitrate}
				onSelectedChange={(selected) => {
					ffmpegBitrate = selected;
				}}
				placeholder="Select bitrate"
				description="Higher bitrates mean better quality but larger files"
			/>
		{/if}
	</div>

	<!-- Command output that can be edited directly -->
	<div class="space-y-2">
		<Label for="ffmpeg-command">FFmpeg Command Template</Label>
		<Input
			id="ffmpeg-command"
			type="text"
			placeholder="FFmpeg command template"
			bind:value={commandTemplate}
		/>
		{#if exampleCommand}
			<div class="rounded-md bg-muted/50 p-3">
				<p class="text-xs font-medium text-muted-foreground mb-1">Preview with example values:</p>
				<code class="text-xs break-all">{exampleCommand}</code>
			</div>
		{/if}
		<p class="text-xs text-muted-foreground">
			<strong>Runtime variables (will be replaced when recording starts):</strong><br/>
			<code class="mx-1 rounded bg-muted px-1 py-0.5">{'{{device}}'}</code> - Device name (selected in Recording Device dropdown)<br/>
			<code class="mx-1 rounded bg-muted px-1 py-0.5">{'{{outputFolder}}'}</code> - Output directory from settings<br/>
			<code class="mx-1 rounded bg-muted px-1 py-0.5">{'{{recordingId}}'}</code> - Unique ID for each recording<br/>
			<br/>
			<strong>Note:</strong> Format and codec settings are injected directly into the command template.
		</p>
	</div>
</div>