<script lang="ts">
	import LabeledInput from '$lib/components/labeled/LabeledInput.svelte';
	import WhisperingButton from '$lib/components/WhisperingButton.svelte';
	import { Badge } from '@repo/ui/badge';
	import { Checkbox } from '@repo/ui/checkbox';
	import { FFMPEG_DEFAULT_COMPRESSION_OPTIONS } from '$lib/services/recorder/ffmpeg';
	import { settings } from '$lib/stores/settings.svelte';
	import { cn } from '@repo/ui/utils';
	import { RotateCcw } from '@lucide/svelte';
	import { isUsingCpalMethodWithoutWhisperCpp } from '../../../routes/+layout/check-ffmpeg';
	import { createQuery } from '@tanstack/svelte-query';
	import { rpc } from '$lib/query';

	// Compression preset definitions (UI only - not stored in settings)
	const COMPRESSION_PRESETS = {
		recommended: {
			label: 'Recommended',
			icon: '🎯',
			description: 'Best balance for speech',
			options: '-c:a libopus -b:a 32k -ar 16000 -ac 1 -compression_level 10',
			size: '~240KB/min',
		},
		tiny: {
			label: 'Smallest',
			icon: '🗜️',
			description: 'Maximum compression',
			options: '-c:a libopus -b:a 16k -ar 16000 -ac 1 -compression_level 10',
			size: '~120KB/min',
		},
		compatible: {
			label: 'Compatible',
			icon: '✅',
			description: 'Universal MP3',
			options: '-c:a libmp3lame -b:a 32k -ar 16000 -ac 1 -q:a 9',
			size: '~240KB/min',
		},
		quality: {
			label: 'High Quality',
			icon: '🎵',
			description: 'Less compression',
			options: '-c:a libmp3lame -b:a 64k -ar 16000 -ac 1 -q:a 2',
			size: '~480KB/min',
		},
	} as const;

	type CompressionPresetKey = keyof typeof COMPRESSION_PRESETS;

	/**
	 * Checks if a compression preset is currently active
	 * @param presetKey The preset key to check
	 * @returns true if the preset's options match current settings
	 */
	function isPresetActive(presetKey: CompressionPresetKey): boolean {
		return (
			settings.value['transcription.compressionOptions'] ===
			COMPRESSION_PRESETS[presetKey].options
		);
	}

	// Check if FFmpeg is installed
	const ffmpegQuery = createQuery(rpc.ffmpeg.checkFfmpegInstalled.options);

	const isFfmpegInstalled = $derived(ffmpegQuery.data ?? false);
	const isFfmpegCheckLoading = $derived(ffmpegQuery.isPending);

	// Check if we should show "Recommended" badge
	const shouldShowRecommendedBadge = $derived(
		isUsingCpalMethodWithoutWhisperCpp() &&
			!settings.value['transcription.compressionEnabled'],
	);
</script>

<div class="space-y-4">
	<!-- Enable/Disable Toggle -->
	<div class="flex items-center gap-3">
		<Checkbox
			id="compression-enabled-{Math.random().toString(36).substr(2, 9)}"
			checked={settings.value['transcription.compressionEnabled']}
			onCheckedChange={(checked) => {
				settings.updateKey('transcription.compressionEnabled', checked);
			}}
			disabled={!isFfmpegInstalled || isFfmpegCheckLoading}
		/>
		<div class="flex-1">
			<div class="flex items-center gap-2">
				<label
					for="compression-enabled"
					class={cn(
						'text-sm font-medium',
						(!isFfmpegInstalled || isFfmpegCheckLoading) &&
							'text-muted-foreground',
					)}
				>
					Compress audio before transcription
				</label>
				{#if shouldShowRecommendedBadge && isFfmpegInstalled}
					<Badge variant="secondary" class="text-xs">Recommended</Badge>
				{/if}
				{#if !isFfmpegInstalled && !isFfmpegCheckLoading}
					<Badge variant="destructive" class="text-xs">FFmpeg Required</Badge>
				{/if}
			</div>
			<p
				class={cn(
					'text-xs mt-1',
					!isFfmpegInstalled || isFfmpegCheckLoading
						? 'text-muted-foreground/50'
						: 'text-muted-foreground',
				)}
			>
				{#if !isFfmpegInstalled && !isFfmpegCheckLoading}
					FFmpeg is required for audio compression.
					<a
						href="/install-ffmpeg"
						class="text-primary underline-offset-4 hover:underline"
					>
						Install FFmpeg
					</a>
					to enable this feature.
				{:else if isFfmpegCheckLoading}
					Checking FFmpeg installation...
				{:else}
					Reduce file sizes and trim silence for faster uploads and lower API costs
				{/if}
			</p>
		</div>
	</div>

	{#if isUsingCpalMethodWithoutWhisperCpp() && !settings.value['transcription.compressionEnabled'] && isFfmpegInstalled}
		<p class="text-muted-foreground text-sm ml-6">
			Recommended because you're using CPAL recording with cloud transcription.
			Compression reduces file sizes for faster uploads and lower API costs.
		</p>
	{/if}

	{#if settings.value['transcription.compressionEnabled']}
		<!-- Preset Selection Badges -->
		<div class="space-y-3">
			<p class="text-base font-medium">Compression Presets</p>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(COMPRESSION_PRESETS) as [presetKey, preset]}
					<Badge
						variant={isPresetActive(presetKey as CompressionPresetKey)
							? 'default'
							: 'outline'}
						class={cn(
							'cursor-pointer transition-colors',
							isPresetActive(presetKey as CompressionPresetKey)
								? 'hover:bg-primary/90'
								: 'hover:bg-accent hover:text-accent-foreground',
						)}
						onclick={() =>
							settings.updateKey(
								'transcription.compressionOptions',
								preset.options,
							)}
					>
						<div class="flex items-center gap-1">
							<span class="mr-1">{preset.icon}</span>
							<span>{preset.label}</span>
						</div>
						<span class="text-xs ml-1 opacity-75">
							{preset.size}
						</span>
					</Badge>
				{/each}
			</div>
			<p class="text-muted-foreground text-xs">
				Choose a preset to automatically set FFmpeg compression options, or
				customize below.
			</p>
		</div>

		<!-- Custom Options Input -->
		<LabeledInput
			id="compression-options-{Math.random().toString(36).substr(2, 9)}"
			label="Custom Options"
			value={settings.value['transcription.compressionOptions']}
			oninput={({ currentTarget: { value } }) => {
				settings.updateKey('transcription.compressionOptions', value);
			}}
			placeholder={FFMPEG_DEFAULT_COMPRESSION_OPTIONS}
			description="FFmpeg compression options. Changes here will be reflected in real-time during transcription."
		>
			{#snippet actionSlot()}
				{#if settings.value['transcription.compressionOptions'] !== FFMPEG_DEFAULT_COMPRESSION_OPTIONS}
					<WhisperingButton
						tooltipContent="Reset to default"
						variant="ghost"
						size="icon"
						class="h-6 w-6"
						onclick={() => {
							settings.updateKey(
								'transcription.compressionOptions',
								FFMPEG_DEFAULT_COMPRESSION_OPTIONS,
							);
						}}
					>
						<RotateCcw class="h-3 w-3" />
					</WhisperingButton>
				{/if}
			{/snippet}
		</LabeledInput>

		<!-- Command Preview -->
		<div class="text-xs text-muted-foreground">
			<p class="font-medium mb-1">Command Preview:</p>
			<code class="bg-muted rounded px-2 py-1 text-xs break-all block">
				ffmpeg -i input.wav {settings.value['transcription.compressionOptions']}
				output.opus
			</code>
		</div>
	{/if}
</div>
