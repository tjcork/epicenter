<script lang="ts">
	import CopyToClipboardButton from '$lib/components/copyable/CopyToClipboardButton.svelte';
	import CopyablePre from '$lib/components/copyable/CopyablePre.svelte';
	import {
		LabeledInput,
		LabeledSelect,
		LabeledTextarea,
	} from '$lib/components/labeled/index.js';
	import {
		ElevenLabsApiKeyInput,
		GroqApiKeyInput,
		OpenAiApiKeyInput,
		DeepgramApiKeyInput,
	} from '$lib/components/settings';
	import { Badge } from '@repo/ui/badge';
	import { Button } from '@repo/ui/button';
	import * as Card from '@repo/ui/card';
	import { Checkbox } from '@repo/ui/checkbox';
	import { Input } from '@repo/ui/input';
	import { Separator } from '@repo/ui/separator';
	import * as Alert from '@repo/ui/alert';
	import { Link } from '@repo/ui/link';
	import * as Collapsible from '@repo/ui/collapsible';
	import * as Select from '@repo/ui/select';
	import { SUPPORTED_LANGUAGES_OPTIONS } from '$lib/constants/languages';
	import {
		ELEVENLABS_TRANSCRIPTION_MODELS,
		GROQ_MODELS,
		OPENAI_TRANSCRIPTION_MODELS,
		TRANSCRIPTION_SERVICE_OPTIONS,
		DEEPGRAM_TRANSCRIPTION_MODELS,
	} from '$lib/constants/transcription';
	import { settings } from '$lib/stores/settings.svelte';
	import {
		TriangleAlert,
		InfoIcon,
		CheckIcon,
		RotateCcw,
	} from '@lucide/svelte';
	import WhisperModelSelector from '$lib/components/settings/WhisperModelSelector.svelte';
	import WhisperingButton from '$lib/components/WhisperingButton.svelte';
	import {
		isUsingWhisperCppWithBrowserMethod,
		isUsingCpalMethodAtWrongSampleRate,
	} from '../../../+layout/check-ffmpeg';
	import { FFMPEG_DEFAULT_COMPRESSION_OPTIONS } from '$lib/services/recorder/ffmpeg';
	import { cn } from '@repo/ui/utils';

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

	// Derive which preset is active based on current options
	function isPresetActive(
		presetKey: keyof typeof COMPRESSION_PRESETS,
	): boolean {
		return (
			settings.value['transcription.compressionOptions'] ===
			COMPRESSION_PRESETS[presetKey].options
		);
	}

	// Set compression options directly
	function setCompressionOptions(options: string) {
		settings.updateKey('transcription.compressionOptions', options);
	}
</script>

<svelte:head>
	<title>Transcription Settings - Whispering</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h3 class="text-lg font-medium">Transcription</h3>
		<p class="text-muted-foreground text-sm">
			Configure your Whispering transcription preferences.
		</p>
	</div>
	<Separator />

	<LabeledSelect
		id="selected-transcription-service"
		label="Transcription Service"
		items={TRANSCRIPTION_SERVICE_OPTIONS}
		selected={settings.value['transcription.selectedTranscriptionService']}
		onSelectedChange={(selected) => {
			settings.updateKey(
				'transcription.selectedTranscriptionService',
				selected,
			);
		}}
		placeholder="Select a transcription service"
	/>

	{#if settings.value['transcription.selectedTranscriptionService'] === 'OpenAI'}
		<LabeledSelect
			id="openai-model"
			label="OpenAI Model"
			items={OPENAI_TRANSCRIPTION_MODELS.map((model) => ({
				value: model.name,
				label: model.name,
				...model,
			}))}
			selected={settings.value['transcription.openai.model']}
			onSelectedChange={(selected) => {
				settings.updateKey('transcription.openai.model', selected);
			}}
			renderOption={renderModelOption}
		>
			{#snippet description()}
				You can find more details about the models in the <Button
					variant="link"
					class="px-0.3 py-0.2 h-fit"
					href="https://platform.openai.com/docs/guides/speech-to-text"
					target="_blank"
					rel="noopener noreferrer"
				>
					OpenAI docs
				</Button>.
			{/snippet}
		</LabeledSelect>
		<OpenAiApiKeyInput />
	{:else if settings.value['transcription.selectedTranscriptionService'] === 'Groq'}
		<LabeledSelect
			id="groq-model"
			label="Groq Model"
			items={GROQ_MODELS.map((model) => ({
				value: model.name,
				label: model.name,
				...model,
			}))}
			selected={settings.value['transcription.groq.model']}
			onSelectedChange={(selected) => {
				settings.updateKey('transcription.groq.model', selected);
			}}
			renderOption={renderModelOption}
		>
			{#snippet description()}
				You can find more details about the models in the <Button
					variant="link"
					class="px-0.3 py-0.2 h-fit"
					href="https://console.groq.com/docs/speech-to-text"
					target="_blank"
					rel="noopener noreferrer"
				>
					Groq docs
				</Button>.
			{/snippet}
		</LabeledSelect>
		<GroqApiKeyInput />
	{:else if settings.value['transcription.selectedTranscriptionService'] === 'Deepgram'}
		<LabeledSelect
			id="deepgram-model"
			label="Deepgram Model"
			items={DEEPGRAM_TRANSCRIPTION_MODELS.map((model) => ({
				value: model.name,
				label: model.name,
				...model,
			}))}
			selected={settings.value['transcription.deepgram.model']}
			onSelectedChange={(selected) => {
				settings.updateKey('transcription.deepgram.model', selected);
			}}
			renderOption={renderModelOption}
		/>
		<DeepgramApiKeyInput />
	{:else if settings.value['transcription.selectedTranscriptionService'] === 'ElevenLabs'}
		<LabeledSelect
			id="elevenlabs-model"
			label="ElevenLabs Model"
			items={ELEVENLABS_TRANSCRIPTION_MODELS.map((model) => ({
				value: model.name,
				label: model.name,
				...model,
			}))}
			selected={settings.value['transcription.elevenlabs.model']}
			onSelectedChange={(selected) => {
				settings.updateKey('transcription.elevenlabs.model', selected);
			}}
			renderOption={renderModelOption}
		>
			{#snippet description()}
				You can find more details about the models in the <Button
					variant="link"
					class="px-0.3 py-0.2 h-fit"
					href="https://elevenlabs.io/docs/capabilities/speech-to-text"
					target="_blank"
					rel="noopener noreferrer"
				>
					ElevenLabs docs
				</Button>.
			{/snippet}
		</LabeledSelect>
		<ElevenLabsApiKeyInput />
	{:else if settings.value['transcription.selectedTranscriptionService'] === 'speaches'}
		<div class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title class="text-lg">Speaches Setup</Card.Title>
					<Card.Description>
						Install Speaches server and configure Whispering. Speaches is the
						successor to faster-whisper-server with improved features and active
						development.
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-6">
					<div class="flex gap-3">
						<Button
							href="https://speaches.ai/installation/"
							target="_blank"
							rel="noopener noreferrer"
						>
							Installation Guide
						</Button>
						<Button
							variant="outline"
							href="https://speaches.ai/usage/speech-to-text/"
							target="_blank"
							rel="noopener noreferrer"
						>
							Speech-to-Text Setup
						</Button>
					</div>

					<div class="space-y-4">
						<div>
							<p class="text-sm font-medium">
								<span class="text-muted-foreground">Step 1:</span> Install Speaches
								server
							</p>
							<ul class="ml-6 mt-2 space-y-2 text-sm text-muted-foreground">
								<li class="list-disc">
									Download the necessary docker compose files from the <Button
										variant="link"
										size="sm"
										class="px-0 h-auto underline"
										href="https://speaches.ai/installation/"
										target="_blank"
										rel="noopener noreferrer"
									>
										installation guide
									</Button>
								</li>
								<li class="list-disc">
									Choose CUDA, CUDA with CDI, or CPU variant depending on your
									system
								</li>
							</ul>
						</div>

						<div>
							<p class="text-sm font-medium mb-2">
								<span class="text-muted-foreground">Step 2:</span> Start Speaches
								container
							</p>
							<CopyablePre
								copyableText="docker compose up --detach"
								variant="code"
							/>
						</div>

						<div>
							<p class="text-sm font-medium">
								<span class="text-muted-foreground">Step 3:</span> Download a speech
								recognition model
							</p>
							<ul class="ml-6 mt-2 space-y-2 text-sm text-muted-foreground">
								<li class="list-disc">
									View available models in the <Button
										variant="link"
										size="sm"
										class="px-0 h-auto underline"
										href="https://speaches.ai/usage/speech-to-text/"
										target="_blank"
										rel="noopener noreferrer"
									>
										speech-to-text guide
									</Button>
								</li>
								<li class="list-disc">
									Run the following command to download a model:
								</li>
							</ul>
							<div class="mt-2">
								<CopyablePre
									copyableText="uvx speaches-cli model download Systran/faster-distil-whisper-small.en"
									variant="code"
								/>
							</div>
						</div>

						<div>
							<p class="text-sm font-medium">
								<span class="text-muted-foreground">Step 4:</span> Configure the
								settings below
							</p>
							<ul class="ml-6 mt-2 space-y-1 text-sm text-muted-foreground">
								<li class="list-disc">Enter your Speaches server URL</li>
								<li class="list-disc">Enter the model ID you downloaded</li>
							</ul>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<LabeledInput
			id="speaches-base-url"
			label="Base URL"
			placeholder="http://localhost:8000"
			value={settings.value['transcription.speaches.baseUrl']}
			oninput={({ currentTarget: { value } }) => {
				settings.updateKey('transcription.speaches.baseUrl', value);
			}}
		>
			{#snippet description()}
				<p class="text-muted-foreground text-sm">
					The URL where your Speaches server is running (<code>
						SPEACHES_BASE_URL
					</code>), typically
					<CopyToClipboardButton
						contentDescription="speaches base url"
						textToCopy="http://localhost:8000"
						class="bg-muted rounded px-[0.3rem] py-[0.15rem] font-mono text-sm hover:bg-muted/80"
						variant="ghost"
						size="sm"
					>
						http://localhost:8000
						{#snippet copiedContent()}
							http://localhost:8000
							<CheckIcon class="size-4" />
						{/snippet}
					</CopyToClipboardButton>
				</p>
			{/snippet}
		</LabeledInput>

		<LabeledInput
			id="speaches-model-id"
			label="Model ID"
			placeholder="Systran/faster-distil-whisper-small.en"
			value={settings.value['transcription.speaches.modelId']}
			oninput={({ currentTarget: { value } }) => {
				settings.updateKey('transcription.speaches.modelId', value);
			}}
		>
			{#snippet description()}
				<p class="text-muted-foreground text-sm">
					The model you downloaded in step 3 (<code>MODEL_ID</code>), e.g.
					<CopyToClipboardButton
						contentDescription="speaches model id"
						textToCopy="Systran/faster-distil-whisper-small.en"
						class="bg-muted rounded px-[0.3rem] py-[0.15rem] font-mono text-sm hover:bg-muted/80"
						variant="ghost"
						size="sm"
					>
						Systran/faster-distil-whisper-small.en
						{#snippet copiedContent()}
							Systran/faster-distil-whisper-small.en
							<CheckIcon class="size-4" />
						{/snippet}
					</CopyToClipboardButton>
				</p>
			{/snippet}
		</LabeledInput>
	{:else if settings.value['transcription.selectedTranscriptionService'] === 'whispercpp'}
		<div class="space-y-4">
			<!-- Whisper Model Selector Component -->
			{#if window.__TAURI_INTERNALS__}
				<WhisperModelSelector />
			{/if}

			{#if isUsingWhisperCppWithBrowserMethod()}
				<Alert.Root class="border-amber-500/20 bg-amber-500/5">
					<InfoIcon class="size-4 text-amber-600 dark:text-amber-400" />
					<Alert.Title class="text-amber-600 dark:text-amber-400">
						FFmpeg Required
					</Alert.Title>
					<Alert.Description>
						Whisper C++ requires FFmpeg to convert audio to 16kHz WAV format
						when using browser recording.
						<Link
							href="/install-ffmpeg"
							class="font-medium underline underline-offset-4 hover:text-amber-700 dark:hover:text-amber-300"
						>
							Install FFmpeg →
						</Link>
					</Alert.Description>
				</Alert.Root>
			{:else if isUsingCpalMethodAtWrongSampleRate()}
				<Alert.Root class="border-amber-500/20 bg-amber-500/5">
					<InfoIcon class="size-4 text-amber-600 dark:text-amber-400" />
					<Alert.Title class="text-amber-600 dark:text-amber-400">
						FFmpeg Required
					</Alert.Title>
					<Alert.Description>
						Whisper C++ requires 16kHz audio. FFmpeg is needed to convert from
						your current {settings.value['recording.cpal.sampleRate']}Hz sample
						rate.
						<Link
							href="/install-ffmpeg"
							class="font-medium underline underline-offset-4 hover:text-amber-700 dark:hover:text-amber-300"
						>
							Install FFmpeg →
						</Link>
					</Alert.Description>
				</Alert.Root>
			{/if}
		</div>

		<div class="flex items-center space-x-2">
			<Checkbox
				id="whispercpp-use-gpu"
				checked={settings.value['transcription.whispercpp.useGpu']}
				onCheckedChange={(checked) => {
					settings.updateKey('transcription.whispercpp.useGpu', checked);
				}}
			/>
			<label for="whispercpp-use-gpu" class="text-sm font-medium">
				Use GPU acceleration (if available)
			</label>
		</div>
	{/if}

	<!-- Audio Compression Settings -->
	<div class="flex items-center space-x-2">
		<Checkbox
			id="compression-enabled"
			checked={settings.value['transcription.compressionEnabled']}
			onCheckedChange={(checked) => {
				settings.updateKey('transcription.compressionEnabled', checked);
			}}
		/>
		<label for="compression-enabled" class="text-sm font-medium">
			Compress audio before transcription
		</label>
	</div>

	{#if settings.value['transcription.compressionEnabled']}
		<div class="space-y-4">
			<!-- Preset Selection Badges -->
			<div class="space-y-2">
				<p class="text-sm font-medium">Compression Presets</p>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(COMPRESSION_PRESETS) as [presetKey, preset]}
						<Badge
							variant={isPresetActive(presetKey) ? 'default' : 'outline'}
							class={cn(
								'cursor-pointer transition-colors',
								isPresetActive(presetKey)
									? 'hover:bg-primary/90'
									: 'hover:bg-accent hover:text-accent-foreground',
							)}
							onclick={() => setCompressionOptions(preset.options)}
						>
							<span class="mr-1">{preset.icon}</span>
							{preset.label}
							<span class="text-xs ml-1 opacity-75">{preset.size}</span>
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
				id="compression-options"
				label="Compression Options"
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
			<div class="text-sm text-muted-foreground">
				<p class="font-medium mb-1">Command Preview:</p>
				<code class="bg-muted rounded px-2 py-1 text-xs break-all">
					ffmpeg -i input.wav {settings.value[
						'transcription.compressionOptions'
					]} output.opus
				</code>
			</div>
		</div>
	{/if}

	<LabeledSelect
		id="output-language"
		label="Output Language"
		items={SUPPORTED_LANGUAGES_OPTIONS}
		selected={settings.value['transcription.outputLanguage']}
		onSelectedChange={(selected) => {
			settings.updateKey('transcription.outputLanguage', selected);
		}}
		placeholder="Select a language"
	/>

	<LabeledInput
		id="temperature"
		label="Temperature"
		type="number"
		min="0"
		max="1"
		step="0.1"
		placeholder="0"
		value={settings.value['transcription.temperature']}
		oninput={({ currentTarget: { value } }) => {
			settings.updateKey('transcription.temperature', value);
		}}
		description="Controls randomness in the model's output. 0 is focused and deterministic, 1 is more creative."
	/>

	<LabeledTextarea
		id="transcription-prompt"
		label="System Prompt"
		placeholder="e.g., This is an academic lecture about quantum physics with technical terms like 'eigenvalue' and 'Schrödinger'"
		value={settings.value['transcription.prompt']}
		oninput={({ currentTarget: { value } }) => {
			settings.updateKey('transcription.prompt', value);
		}}
		description="Helps transcription service (e.g., Whisper) better recognize specific terms, names, or context during initial transcription. Not for text transformations - use the Transformations tab for post-processing rules."
	/>
</div>

{#snippet renderModelOption({
	item,
}: {
	item: {
		name: string;
		description: string;
		cost: string;
	};
})}
	<div class="flex flex-col gap-1 py-1">
		<div class="font-medium">{item.name}</div>
		<div class="text-sm text-muted-foreground">
			{item.description}
		</div>
		<Badge variant="outline" class="text-xs">{item.cost}</Badge>
	</div>
{/snippet}
