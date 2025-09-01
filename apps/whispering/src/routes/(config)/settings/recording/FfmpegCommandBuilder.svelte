<script lang="ts">
	import { LabeledSelect } from '$lib/components/labeled/index.js';
	import { Input } from '@repo/ui/input';
	import { Label } from '@repo/ui/label';
	import { IS_MACOS, IS_WINDOWS, IS_LINUX, PLATFORM_TYPE } from '$lib/constants/platform';
	import { settings } from '$lib/stores/settings.svelte';
	import { rpc } from '$lib/query';
	import { createQuery } from '@tanstack/svelte-query';
	import { getDefaultRecordingsFolder } from '$lib/services/recorder';
	import { join } from '@tauri-apps/api/path';
	import { nanoid } from 'nanoid/non-secure';

	// Props - bind the three option fields
	let {
		globalOptions = $bindable(),
		inputOptions = $bindable(),
		outputOptions = $bindable()
	}: {
		globalOptions: string;
		inputOptions: string;
		outputOptions: string;
	} = $props();

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

	const FFMPEG_FORMAT_OPTIONS = [
		{ value: 'wav', label: 'WAV (Uncompressed)', codec: 'pcm_s16le' },
		{ value: 'mp3', label: 'MP3 (Compressed)', codec: 'libmp3lame' },
		{ value: 'aac', label: 'AAC (Compressed)', codec: 'aac' },
		{ value: 'ogg', label: 'OGG Vorbis', codec: 'libvorbis' },
		{ value: 'opus', label: 'Opus (Modern)', codec: 'libopus' },
	] as const;


	/**
		* UI state for the FFmpeg command builder.
		*
		* These variables (`selectedFormat`, `selectedSampleRate`, `selectedBitrate`) are temporary
		* UI state that provide a user-friendly way to construct the output options string
		* via dropdown selectors. The output options are persisted.
		*
		* To ensure the UI and the options remain in sync, these values are derived by parsing
		* the output options. When the user changes a selection in the UI, the output options
		* are rebuilt from scratch using the new values.
		*/
	let selectedFormat = $derived.by(() => {
		if (outputOptions?.includes('libmp3lame')) return 'mp3';
		if (outputOptions?.includes('aac')) return 'aac';
		if (outputOptions?.includes('libvorbis')) return 'ogg';
		if (outputOptions?.includes('libopus')) return 'opus';
		return 'wav';
	});
	let selectedSampleRate = $derived(outputOptions?.match(/-ar\s+(\d+)/)?.[1] ?? '16000');
	let selectedBitrate = $derived(outputOptions?.match(/-b:a\s+(\d+)k?/)?.[1] ?? '128');

	// Get platform-specific defaults for input
	const platformDefaults = $derived({
		macos: { format: 'avfoundation', deviceFormat: ':"Built-in Microphone"' },
		windows: { format: 'dshow', deviceFormat: 'audio="Microphone Array"' },
		linux: { format: 'alsa', deviceFormat: 'hw:0' },
	}[PLATFORM_TYPE]);

	// Build the preview command
	const previewCommand = $derived.by(async () => {
		const outputFolder = settings.value['recording.cpal.outputFolder'] ?? (await getDefaultRecordingsFolder());
		const recordingId = nanoid(); // Generate realistic recording ID for preview
		const ext = FFMPEG_FORMAT_OPTIONS.find(opt => opt.value === selectedFormat)?.value ?? 'wav';
		
		// Use Tauri's join for cross-platform path handling
		const outputPath = await join(outputFolder, `${recordingId}.${ext}`);
		
		// Build command with all parts, filtering empty strings
		const commandParts = [
			'ffmpeg',
			globalOptions.trim(),
			inputOptions.trim(), // Can be empty - FFmpeg will auto-detect
			'-i',
			platformDefaults.deviceFormat,
			outputOptions.trim(),
			`"${outputPath}"`
		].filter(part => part); // Remove empty strings
		
		return commandParts.join(' ');
	});

	// Update output options whenever UI selections change
	$effect(() => {
		outputOptions = buildOutputOptionsFromSelections();
	});

	// Get the default input options for the platform
	const defaultInputOptions = $derived(`-f ${platformDefaults.format}`);

	function buildOutputOptionsFromSelections(): string {
		// Retrieve codec for the currently selected audio format
		const { codec } = FFMPEG_FORMAT_OPTIONS.find(opt => opt.value === selectedFormat) ?? FFMPEG_FORMAT_OPTIONS[0];

		let options = `-acodec ${codec}`;
		options += ` -ar ${selectedSampleRate}`;
		
		if (selectedFormat !== 'wav') options += ` -b:a ${selectedBitrate}k`;
		
		return options;
	}
</script>

<div class="space-y-4">
	<div class="space-y-4 rounded-lg border p-4">
		<h4 class="text-sm font-medium">FFmpeg Command Builder</h4>
		
		<LabeledSelect
			id="ffmpeg-format"
			label="Audio Format"
			items={FFMPEG_FORMAT_OPTIONS}
			selected={selectedFormat}
			onSelectedChange={(selected) => {
				selectedFormat = selected;
			}}
			placeholder="Select audio format"
			description="Choose the output audio format and codec"
		/>
		
		<LabeledSelect
			id="ffmpeg-sample-rate"
			label="Sample Rate"
			items={[
				{ value: '16000', label: '16 kHz (Voice)' },
				{ value: '22050', label: '22.05 kHz (Low)' },
				{ value: '44100', label: '44.1 kHz (CD Quality)' },
				{ value: '48000', label: '48 kHz (Professional)' },
			]}
			selected={selectedSampleRate}
			onSelectedChange={(selected) => {
				selectedSampleRate = selected;
			}}
			placeholder="Select sample rate"
			description="Higher sample rates provide better quality"
		/>
		
		{#if selectedFormat !== 'wav'}
			<LabeledSelect
				id="ffmpeg-bitrate"
				label="Bitrate"
				items={[
					{ value: '64', label: '64 kbps (Low)' },
					{ value: '128', label: '128 kbps (Standard)' },
					{ value: '192', label: '192 kbps (Good)' },
					{ value: '256', label: '256 kbps (High)' },
					{ value: '320', label: '320 kbps (Best)' },
				]}
				selected={selectedBitrate}
				onSelectedChange={(selected) => {
					selectedBitrate = selected;
				}}
				placeholder="Select bitrate"
				description="Higher bitrates mean better quality but larger files"
			/>
		{/if}
		
		<!-- FFmpeg Options Section -->
		<div class="border-t pt-4 mt-4 space-y-4">
			<div>
				<Label for="ffmpeg-global" class="text-sm font-medium mb-2 block">Global Options</Label>
				<Input
					id="ffmpeg-global"
					type="text"
					placeholder="e.g., -hide_banner -loglevel warning"
					bind:value={globalOptions}
					class="font-mono text-sm"
				/>
				<p class="text-xs text-muted-foreground mt-1">General FFmpeg behavior: logging level, progress display, error handling</p>
			</div>
			
			<div>
				<div class="flex items-center justify-between mb-2">
					<Label for="ffmpeg-input" class="text-sm font-medium">Input Options</Label>
					<div class="flex gap-2">
						{#if inputOptions.trim()}
							<button
								type="button"
								onclick={() => inputOptions = ''}
								class="text-xs text-muted-foreground hover:text-foreground"
							>
								Clear
							</button>
						{/if}
						{#if inputOptions !== defaultInputOptions}
							<button
								type="button"
								onclick={() => inputOptions = defaultInputOptions}
								class="text-xs text-muted-foreground hover:text-foreground"
							>
								Use platform default
							</button>
						{/if}
					</div>
				</div>
				<Input
					id="ffmpeg-input"
					type="text"
					placeholder="Optional (e.g., -f avfoundation -ac 1)"
					bind:value={inputOptions}
					class="font-mono text-sm"
				/>
				<div class="text-xs text-muted-foreground mt-1 space-y-1">
					<p>How to capture audio from your device. Can be left empty for auto-detection.</p>
					<p>Platform default: <code class="px-1 py-0.5 rounded bg-muted">{defaultInputOptions}</code></p>
					<details class="mt-2">
						<summary class="cursor-pointer hover:text-foreground">Common additions (click to expand)</summary>
						<div class="mt-2 space-y-1 ml-2">
							<p><code class="px-1 py-0.5 rounded bg-muted">-ac 1</code> - Record in mono (single channel)</p>
							<p><code class="px-1 py-0.5 rounded bg-muted">-ac 2</code> - Record in stereo (two channels)</p>
							<p><code class="px-1 py-0.5 rounded bg-muted">-t 60</code> - Limit recording to 60 seconds</p>
							{#if PLATFORM_TYPE === 'windows'}
								<p><code class="px-1 py-0.5 rounded bg-muted">-audio_buffer_size 20</code> - Reduce latency (Windows)</p>
							{/if}
						</div>
					</details>
				</div>
			</div>
			
			<div>
				<Label for="ffmpeg-output" class="text-sm font-medium mb-2 block">Output Options</Label>
				<Input
					id="ffmpeg-output"
					type="text"
					placeholder="e.g., -acodec libmp3lame -ar 44100 -b:a 192k"
					bind:value={outputOptions}
					class="font-mono text-sm"
				/>
				<p class="text-xs text-muted-foreground mt-1">
					How to encode and save the recording (codec, quality, compression). 
					Modified by the dropdowns above.
				</p>
			</div>
			
			<!-- Preview Section -->
			{#await previewCommand then cmd}
				{#if cmd}
					<div class="rounded-md bg-muted/50 p-3">
						<p class="text-xs font-medium text-muted-foreground mb-1">Command Preview:</p>
						<code class="text-xs break-all">{cmd}</code>
					</div>
				{/if}
			{/await}
		</div>
	</div>
</div>