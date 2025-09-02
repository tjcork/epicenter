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
		const recordingId = nanoid(); // Generate realistic recording ID for preview
		const ext = AUDIO_FORMATS[selected.format].extension;
		const outputPath = await join(outputFolder, `${recordingId}.${ext}`);

		// Build command with all parts, filtering empty strings
		const commandParts = [
			'ffmpeg',
			globalOptions.trim(),
			inputOptions.trim(), // Can be empty - FFmpeg will auto-detect
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

<div class="space-y-4">
	<div class="space-y-4 rounded-lg border p-4">
		<h4 class="text-sm font-medium">FFmpeg Command Builder</h4>

		<!-- FFmpeg Options Section (in logical order) -->
		<div class="space-y-4">
			<!-- 1. Global Options -->
			<div>
				<Label for="ffmpeg-global" class="text-sm font-medium mb-2"
					>Global Options</Label
				>
				<div class="flex items-center gap-2">
					<Input
						id="ffmpeg-global"
						type="text"
						placeholder="e.g., -hide_banner -loglevel warning"
						bind:value={globalOptions}
						class="font-mono text-sm flex-1"
					/>
					{#if globalOptions !== FFMPEG_DEFAULT_GLOBAL_OPTIONS}
						<WhisperingButton
							tooltipContent="Reset to default"
							variant="outline"
							size="icon"
							onclick={() => (globalOptions = FFMPEG_DEFAULT_GLOBAL_OPTIONS)}
						>
							<RotateCcw class="h-4 w-4" />
						</WhisperingButton>
					{/if}
				</div>
				<p class="text-xs text-muted-foreground mt-1">
					General FFmpeg behavior: logging level, progress display, error
					handling
				</p>
			</div>

			<!-- 2. Input Options -->
			<div>
				<Label for="ffmpeg-input" class="text-sm font-medium mb-2"
					>Input Options</Label
				>
				<div class="flex items-center gap-2">
					<Input
						id="ffmpeg-input"
						type="text"
						placeholder={FFMPEG_DEFAULT_INPUT_OPTIONS}
						bind:value={inputOptions}
						class="font-mono text-sm flex-1"
					/>
					{#if inputOptions !== FFMPEG_DEFAULT_INPUT_OPTIONS}
						<WhisperingButton
							tooltipContent="Reset to platform default"
							variant="outline"
							size="icon"
							onclick={() => (inputOptions = FFMPEG_DEFAULT_INPUT_OPTIONS)}
						>
							<RotateCcw class="h-4 w-4" />
						</WhisperingButton>
					{/if}
				</div>
				<div class="text-xs text-muted-foreground mt-1 space-y-1">
					<p>
						How to capture audio from your device. Leave empty for
						auto-detection.
					</p>
					<details class="mt-2">
						<summary class="cursor-pointer hover:text-foreground"
							>Common options (click to expand)</summary
						>
						<div class="mt-2 space-y-1 ml-2">
							<p>
								<code class="px-1 py-0.5 rounded bg-muted">-ac 1</code> - Record
								in mono (single channel)
							</p>
							<p>
								<code class="px-1 py-0.5 rounded bg-muted">-ac 2</code> - Record
								in stereo (two channels)
							</p>
							<p>
								<code class="px-1 py-0.5 rounded bg-muted">-t 60</code> - Limit recording
								to 60 seconds
							</p>
							{#if PLATFORM_TYPE === 'windows'}
								<p>
									<code class="px-1 py-0.5 rounded bg-muted"
										>-audio_buffer_size 20</code
									> - Reduce latency (Windows)
								</p>
							{/if}
						</div>
					</details>
				</div>
			</div>

			<!-- 3. Output Options -->
			<div class="border-t pt-4">
				<h5 class="text-sm font-medium mb-3">Output Options</h5>

				<!-- Format & Quality Dropdowns (these affect output options) -->
				<div class="space-y-3 mb-4">
					<div class="flex items-center gap-2">
						<LabeledSelect
							id="ffmpeg-format"
							label="Audio Format"
							items={audioFormatOptions}
							selected={selected.format}
							onSelectedChange={(value) => {
								selected = { ...selected, format: value as AudioFormat };
								rebuildOutputOptionsFromSelections();
							}}
							placeholder="Select audio format"
							description="Choose the output audio format and codec"
							class="flex-1"
						/>
						{#if selected.format !== DEFAULT.format}
							<WhisperingButton
								tooltipContent="Reset to default"
								variant="outline"
								size="icon"
								onclick={() => {
									selected = { ...selected, format: DEFAULT.format };
									rebuildOutputOptionsFromSelections();
								}}
								class="mt-6"
							>
								<RotateCcw class="h-4 w-4" />
							</WhisperingButton>
						{/if}
					</div>

					<div class="flex items-center gap-2">
						<LabeledSelect
							id="ffmpeg-sample-rate"
							label="Sample Rate"
							items={[
								{ value: '16000', label: '16 kHz (Voice)' },
								{ value: '22050', label: '22.05 kHz (Low)' },
								{ value: '44100', label: '44.1 kHz (CD Quality)' },
								{ value: '48000', label: '48 kHz (Professional)' },
							]}
							selected={selected.sampleRate}
							onSelectedChange={(value) => {
								selected = { ...selected, sampleRate: value };
								rebuildOutputOptionsFromSelections();
							}}
							placeholder="Select sample rate"
							description="Higher sample rates provide better quality"
							class="flex-1"
						/>
						{#if selected.sampleRate !== DEFAULT.sampleRate}
							<WhisperingButton
								tooltipContent="Reset to default"
								variant="outline"
								size="icon"
								onclick={() => {
									selected = { ...selected, sampleRate: DEFAULT.sampleRate };
									rebuildOutputOptionsFromSelections();
								}}
								class="mt-6"
							>
								<RotateCcw class="h-4 w-4" />
							</WhisperingButton>
						{/if}
					</div>

					{#if selected.format !== 'wav'}
						<div class="flex items-center gap-2">
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
								selected={selected.bitrate}
								onSelectedChange={(value) => {
									selected = { ...selected, bitrate: value };
									rebuildOutputOptionsFromSelections();
								}}
								placeholder="Select bitrate"
								description="Higher bitrates mean better quality but larger files"
								class="flex-1"
							/>
							{#if selected.bitrate !== DEFAULT.bitrate}
								<WhisperingButton
									tooltipContent="Reset to default"
									variant="outline"
									size="icon"
									onclick={() => {
										selected = { ...selected, bitrate: DEFAULT.bitrate };
										rebuildOutputOptionsFromSelections();
									}}
									class="mt-6"
								>
									<RotateCcw class="h-4 w-4" />
								</WhisperingButton>
							{/if}
						</div>
					{/if}
				</div>

				<!-- Raw Output Options Field -->
				<div>
					<Label for="ffmpeg-output" class="text-sm font-medium mb-2">
						Raw Output Options
					</Label>
					<div class="flex items-center gap-2">
						<Input
							id="ffmpeg-output"
							type="text"
							placeholder="e.g., -acodec libmp3lame -ar 44100 -b:a 192k"
							bind:value={outputOptions}
							class="font-mono text-sm flex-1"
						/>
						{#if outputOptions !== FFMPEG_DEFAULT_OUTPUT_OPTIONS}
							<WhisperingButton
								tooltipContent="Reset to default"
								variant="outline"
								size="icon"
								onclick={() => {
									outputOptions = FFMPEG_DEFAULT_OUTPUT_OPTIONS;
									// Reset dropdowns to match default values
									selected = DEFAULT;
								}}
							>
								<RotateCcw class="h-4 w-4" />
							</WhisperingButton>
						{/if}
					</div>
					<p class="text-xs text-muted-foreground mt-1">
						Direct FFmpeg output options. Modified by the dropdowns above, or
						edit manually for full control.
					</p>
				</div>
			</div>

			<!-- Preview Section -->
			<div class="rounded-md bg-muted/50 p-3">
				<p class="text-xs font-medium text-muted-foreground mb-1">
					Command Preview:
				</p>
				<code class="text-xs break-all">{previewCommand}</code>
			</div>
		</div>
	</div>
</div>
