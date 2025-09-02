<script lang="ts">
	import { LabeledSelect } from '$lib/components/labeled/index.js';
	import { Input } from '@repo/ui/input';
	import { Label } from '@repo/ui/label';
	import { PLATFORM_TYPE } from '$lib/constants/platform';
	import { settings } from '$lib/stores/settings.svelte';
	import { rpc } from '$lib/query';
	import { createQuery } from '@tanstack/svelte-query';
	import { getDefaultRecordingsFolder } from '$lib/services/recorder';
	import { join } from '@tauri-apps/api/path';
	import { nanoid } from 'nanoid/non-secure';
	import WhisperingButton from '$lib/components/WhisperingButton.svelte';
	import { RotateCcw } from '@lucide/svelte';
	import {
		formatDeviceForPlatform,
		FFMPEG_DEFAULT_DEVICE_IDENTIFIER,
		FFMPEG_DEFAULT_GLOBAL_OPTIONS,
		FFMPEG_DEFAULT_INPUT_OPTIONS,
		FFMPEG_DEFAULT_OUTPUT_OPTIONS,
	} from '$lib/services/recorder/ffmpeg';

	// Generate realistic recording ID for preview
	const SAMPLE_RECORDING_ID = nanoid();

	// Props - bind the three option fields
	let {
		globalOptions = $bindable(),
		inputOptions = $bindable(),
		outputOptions = $bindable(),
	}: {
		globalOptions: string;
		inputOptions: string;
		outputOptions: string;
	} = $props();

	const getDevicesQuery = createQuery(rpc.recorder.enumerateDevices.options);

	// Get the selected device identifier with proper fallback chain
	const selectedDeviceId = $derived(
		// First, try to find the user's selected device
		getDevicesQuery.data?.find(
			(d) => d.id === settings.value['recording.manual.selectedDeviceId'],
		)?.id ??
			// Then fall back to the first available device
			getDevicesQuery.data?.[0]?.id ??
			// Finally, return null if no devices are available
			null,
	);

	// Source of truth: Clean data structure optimized for lookups
	const AUDIO_FORMATS = {
		wav: { label: 'WAV (Uncompressed)', codec: 'pcm_s16le', extension: 'wav' },
		mp3: { label: 'MP3 (Compressed)', codec: 'libmp3lame', extension: 'mp3' },
		aac: { label: 'AAC (Compressed)', codec: 'aac', extension: 'm4a' },
		ogg: { label: 'OGG Vorbis', codec: 'libvorbis', extension: 'ogg' },
		opus: { label: 'Opus (Modern)', codec: 'libopus', extension: 'opus' },
	} as const;

	type AudioFormat = keyof typeof AUDIO_FORMATS;

	// Derived array for UI components (Select needs array of {label, value})
	const audioFormatOptions = Object.entries(AUDIO_FORMATS).map(
		([value, config]) => ({
			label: config.label,
			value,
		}),
	);

	/**
	 * Parse all audio settings from FFmpeg output options string
	 */
	function parseAudioSettingsFromOptions(options: string): {
		format: AudioFormat;
		sampleRate: string;
		bitrate: string;
	} {
		const format = (() => {
			if (options?.includes('libmp3lame')) return 'mp3';
			if (options?.includes('aac')) return 'aac';
			if (options?.includes('libvorbis')) return 'ogg';
			if (options?.includes('libopus')) return 'opus';
			if (options?.includes('pcm_s16le')) return 'wav';
			return 'ogg'; // Default to OGG for Whisper optimization
		})();

		const sampleRate = options?.match(/-ar\s+(\d+)/)?.[1] ?? '16000';
		const bitrate = options?.match(/-b:a\s+(\d+)k?/)?.[1] ?? '64';

		return { format, sampleRate, bitrate };
	}

	/**
	 * Default audio settings parsed from FFMPEG_DEFAULT_OUTPUT_OPTIONS.
	 *
	 * This constant represents the baseline configuration for FFmpeg audio output
	 * by parsing the platform's default output options string. It serves as the
	 * reference point for reset buttons, allowing users to restore individual
	 * settings to their default values.
	 *
	 * The values are derived at compile time from the same parsing logic used
	 * for the dynamic output options, ensuring consistency between defaults
	 * and user selections.
	 */
	const DEFAULT = parseAudioSettingsFromOptions(FFMPEG_DEFAULT_OUTPUT_OPTIONS);

	/**
	 * UI state for the FFmpeg command builder.
	 *
	 * These variables are temporary UI state that provide a user-friendly way to construct
	 * the output options string via dropdown selectors. The output options are persisted.
	 *
	 * To ensure the UI and the options remain in sync, these values are derived by parsing
	 * the output options. When the user changes a selection in the UI, the output options
	 * are rebuilt from scratch using the new values.
	 */
	let selected = $derived(parseAudioSettingsFromOptions(outputOptions));

	// State variable to hold the preview command
	let previewCommand = $state('Loading...');

	// Function to update the preview command
	async function updatePreviewCommand() {
		const formattedDevice = formatDeviceForPlatform(
			selectedDeviceId ?? FFMPEG_DEFAULT_DEVICE_IDENTIFIER,
		);

		const outputFolder =
			settings.value['recording.cpal.outputFolder'] ??
			(await getDefaultRecordingsFolder());
		const ext = AUDIO_FORMATS[selected.format].extension;
		const outputPath = await join(
			outputFolder,
			`${SAMPLE_RECORDING_ID}.${ext}`,
		);

		// Build command with all parts, filtering empty strings
		const commandParts = [
			'ffmpeg',
			globalOptions.trim(),
			inputOptions.trim(), // Will use the platform default from settings
			'-i',
			formattedDevice,
			outputOptions.trim(),
			`"${outputPath}"`,
		].filter((part) => part); // Remove empty strings

		previewCommand = commandParts.join(' ');
	}

	// Update preview command whenever dependencies change
	$effect(() => {
		// Track all reactive dependencies
		globalOptions;
		inputOptions;
		outputOptions;
		selectedDeviceId;
		selected.format;

		// Update the preview command asynchronously
		updatePreviewCommand();
	});

	function rebuildOutputOptionsFromSelections() {
		// Retrieve codec for the currently selected audio format
		const codec = AUDIO_FORMATS[selected.format].codec;

		let options = `-acodec ${codec}`;
		options += ` -ar ${selected.sampleRate}`;
		options += ' -ac 1'; // Always mono for Whisper optimization

		if (selected.format !== 'wav') options += ` -b:a ${selected.bitrate}k`;

		outputOptions = options;
	}
</script>

<!-- Split-pane layout: Settings on left, preview on right -->
<div class="grid lg:grid-cols-[1fr,1fr] gap-4">
	<!-- Left Panel: Settings -->
	<div class="space-y-4">
		<div class="flex items-center justify-between">
			<h4 class="text-sm font-semibold">FFmpeg Settings</h4>
			<button
				onclick={() => {
					globalOptions = FFMPEG_DEFAULT_GLOBAL_OPTIONS;
					inputOptions = FFMPEG_DEFAULT_INPUT_OPTIONS;
					outputOptions = FFMPEG_DEFAULT_OUTPUT_OPTIONS;
				}}
				class="text-xs text-muted-foreground hover:text-foreground transition-colors"
			>
				Reset all
			</button>
		</div>

		<!-- Output Options (Primary) -->
		<div class="rounded-lg border p-4 space-y-3">
			<div class="flex items-center justify-between">
				<h5 class="text-sm font-medium">
					<span class="text-primary">Output</span>
					<span class="text-xs text-muted-foreground font-normal ml-2"
						>Primary settings</span
					>
				</h5>
				{#if selected.format !== DEFAULT.format || selected.sampleRate !== DEFAULT.sampleRate || selected.bitrate !== DEFAULT.bitrate || outputOptions !== FFMPEG_DEFAULT_OUTPUT_OPTIONS}
					<WhisperingButton
						tooltipContent="Reset output settings"
						variant="ghost"
						size="icon"
						class="h-6 w-6"
						onclick={() => {
							outputOptions = FFMPEG_DEFAULT_OUTPUT_OPTIONS;
						}}
					>
						<RotateCcw class="h-3 w-3" />
					</WhisperingButton>
				{/if}
			</div>

			<!-- Flexible layout that adapts to number of controls -->
			<div class="flex flex-col sm:flex-row gap-3">
				<div class="flex-1">
					<LabeledSelect
						id="ffmpeg-format"
						label="Format"
						items={audioFormatOptions}
						selected={selected.format}
						onSelectedChange={(value) => {
							selected = { ...selected, format: value as AudioFormat };
							rebuildOutputOptionsFromSelections();
						}}
						placeholder="Select format"
					/>
				</div>

				<div class="flex-1">
					<LabeledSelect
						id="ffmpeg-sample-rate"
						label="Sample Rate"
						items={[
							{ value: '16000', label: '16 kHz' },
							{ value: '22050', label: '22 kHz' },
							{ value: '44100', label: '44.1 kHz' },
							{ value: '48000', label: '48 kHz' },
						]}
						selected={selected.sampleRate}
						onSelectedChange={(value) => {
							selected = { ...selected, sampleRate: value };
							rebuildOutputOptionsFromSelections();
						}}
						placeholder="Sample rate"
					/>
				</div>

				{#if selected.format !== 'wav'}
					<div class="flex-1">
						<LabeledSelect
							id="ffmpeg-bitrate"
							label="Bitrate"
							items={[
								{ value: '64', label: '64 kbps' },
								{ value: '128', label: '128 kbps' },
								{ value: '192', label: '192 kbps' },
								{ value: '256', label: '256 kbps' },
								{ value: '320', label: '320 kbps' },
							]}
							selected={selected.bitrate}
							onSelectedChange={(value) => {
								selected = { ...selected, bitrate: value };
								rebuildOutputOptionsFromSelections();
							}}
							placeholder="Bitrate"
						/>
					</div>
				{/if}
			</div>
		</div>

		<!-- Advanced Options (Collapsible) -->
		<details class="group">
			<summary
				class="cursor-pointer select-none rounded-lg border px-4 py-3 hover:bg-muted/50 transition-colors"
			>
				<span class="text-sm font-medium">Advanced Options</span>
				<span class="text-xs text-muted-foreground ml-2"
					>Raw FFmpeg parameters</span
				>
			</summary>

			<div class="mt-3 space-y-3 rounded-lg border p-4">
				<!-- Global Options -->
				<div>
					<Label for="ffmpeg-global" class="text-xs font-medium mb-1.5">
						Global Options
					</Label>
					<div class="flex items-center gap-2">
						<Input
							id="ffmpeg-global"
							type="text"
							placeholder="-hide_banner -loglevel warning"
							bind:value={globalOptions}
							class="font-mono text-xs flex-1 h-8"
						/>
						{#if globalOptions !== FFMPEG_DEFAULT_GLOBAL_OPTIONS}
							<WhisperingButton
								tooltipContent="Reset"
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								onclick={() => (globalOptions = FFMPEG_DEFAULT_GLOBAL_OPTIONS)}
							>
								<RotateCcw class="h-3 w-3" />
							</WhisperingButton>
						{/if}
					</div>
				</div>

				<!-- Input Options -->
				<div>
					<Label for="ffmpeg-input" class="text-xs font-medium mb-1.5">
						Input Options
					</Label>
					<div class="flex items-center gap-2">
						<Input
							id="ffmpeg-input"
							type="text"
							placeholder={FFMPEG_DEFAULT_INPUT_OPTIONS || 'Auto-detect'}
							bind:value={inputOptions}
							class="font-mono text-xs flex-1 h-8"
						/>
						{#if inputOptions !== FFMPEG_DEFAULT_INPUT_OPTIONS}
							<WhisperingButton
								tooltipContent="Reset to platform default"
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								onclick={() => (inputOptions = FFMPEG_DEFAULT_INPUT_OPTIONS)}
							>
								<RotateCcw class="h-3 w-3" />
							</WhisperingButton>
						{/if}
					</div>

					<!-- Common options hint -->
					<div class="mt-2 text-xs text-muted-foreground">
						Common: <code class="px-1 rounded bg-muted">-ac 1</code> (mono),
						<code class="px-1 rounded bg-muted">-t 60</code> (60s limit)
						{#if PLATFORM_TYPE === 'windows'}
							, <code class="px-1 rounded bg-muted">-audio_buffer_size 20</code>
							(low latency)
						{/if}
					</div>
				</div>

				<!-- Output Options -->
				<div>
					<Label for="ffmpeg-output" class="text-xs font-medium mb-1.5">
						Output Options
						<span class="text-muted-foreground font-normal ml-1"
							>(generated from settings above)</span
						>
					</Label>
					<div class="flex items-center gap-2">
						<Input
							id="ffmpeg-output"
							type="text"
							placeholder="Raw output options"
							bind:value={outputOptions}
							class="font-mono text-xs flex-1 h-8"
						/>
						{#if outputOptions !== FFMPEG_DEFAULT_OUTPUT_OPTIONS}
							<WhisperingButton
								tooltipContent="Reset to default"
								variant="ghost"
								size="icon"
								class="h-8 w-8"
								onclick={() => {
									outputOptions = FFMPEG_DEFAULT_OUTPUT_OPTIONS;
								}}
							>
								<RotateCcw class="h-3 w-3" />
							</WhisperingButton>
						{/if}
					</div>
				</div>
			</div>
		</details>
	</div>

	<!-- Right Panel: Live Preview -->
	<div class="flex flex-col h-full">
		<div class="rounded-lg border bg-muted/30 flex-1 flex flex-col">
			<div class="p-4 border-b bg-background/50">
				<h5 class="text-sm font-medium">Command Preview</h5>
				<p class="text-xs text-muted-foreground mt-0.5">
					Live updates as you modify settings
				</p>
			</div>

			<div class="flex-1 p-4 overflow-auto">
				<div
					class="font-mono text-sm whitespace-pre-wrap break-all bg-background rounded-md p-3 border"
				>
					{previewCommand}
				</div>

				<!-- Visual breakdown of command parts -->
				<div class="mt-4 space-y-2 text-xs">
					<div class="flex items-start gap-2">
						<span class="text-muted-foreground shrink-0">Input:</span>
						<code class="text-primary">
							{formatDeviceForPlatform(
								selectedDeviceId ?? FFMPEG_DEFAULT_DEVICE_IDENTIFIER,
							)}
						</code>
					</div>
					<div class="flex items-start gap-2">
						<span class="text-muted-foreground shrink-0">Output:</span>
						<code class="text-primary">
							{AUDIO_FORMATS[selected.format].extension} • {selected.sampleRate}Hz{selected.format !==
							'wav'
								? ` • ${selected.bitrate}kbps`
								: ''}</code
						>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
