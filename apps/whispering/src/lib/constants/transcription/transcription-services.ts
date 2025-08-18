/**
 * Transcription service configurations
 */
import type { Settings } from '$lib/settings';
import {
	CloudIcon,
	HexagonIcon,
	PauseIcon,
	ServerIcon,
	CpuIcon,
} from '@lucide/svelte';
import {
	ELEVENLABS_TRANSCRIPTION_MODELS,
	type ElevenLabsModel,
} from '$lib/services/transcription/elevenlabs';
import { GROQ_MODELS, type GroqModel } from '$lib/services/transcription/groq';
import {
	OPENAI_TRANSCRIPTION_MODELS,
	type OpenAIModel,
} from '$lib/services/transcription/openai';
import {
	DEEPGRAM_TRANSCRIPTION_MODELS,
	type DeepgramModel,
} from '$lib/services/transcription/deepgram';

type TranscriptionModel =
	| OpenAIModel
	| GroqModel
	| ElevenLabsModel
	| DeepgramModel;

export const TRANSCRIPTION_SERVICE_IDS = [
	'whispercpp',
	'Groq',
	'OpenAI',
	'ElevenLabs',
	'Deepgram',
	'speaches',
	// 'owhisper',
] as const;

type TranscriptionServiceId = (typeof TRANSCRIPTION_SERVICE_IDS)[number];

type BaseTranscriptionService = {
	id: TranscriptionServiceId;
	name: string;
	icon: unknown;
};

type CloudTranscriptionService = BaseTranscriptionService & {
	location: 'cloud';
	models: readonly TranscriptionModel[];
	defaultModel: TranscriptionModel;
	modelSettingKey: string;
	apiKeyField: keyof Settings;
};

type SelfHostedTranscriptionService = BaseTranscriptionService & {
	location: 'self-hosted';
	serverUrlField: keyof Settings;
};

type LocalTranscriptionService = BaseTranscriptionService & {
	location: 'local';
	modelPathField: keyof Settings;
};

type SatisfiedTranscriptionService =
	| CloudTranscriptionService
	| SelfHostedTranscriptionService
	| LocalTranscriptionService;

export const TRANSCRIPTION_SERVICES = [
	// Local services first (truly offline)
	{
		id: 'whispercpp',
		name: 'Whisper C++',
		icon: CpuIcon,
		modelPathField: 'transcription.whispercpp.modelPath',
		location: 'local',
	},
	// Cloud services (API-based)
	{
		id: 'Groq',
		name: 'Groq Whisper',
		icon: CloudIcon,
		models: GROQ_MODELS,
		defaultModel: GROQ_MODELS[2],
		modelSettingKey: 'transcription.groq.model',
		apiKeyField: 'apiKeys.groq',
		location: 'cloud',
	},
	{
		id: 'OpenAI',
		name: 'OpenAI Whisper',
		icon: HexagonIcon,
		models: OPENAI_TRANSCRIPTION_MODELS,
		defaultModel: OPENAI_TRANSCRIPTION_MODELS[0],
		modelSettingKey: 'transcription.openai.model',
		apiKeyField: 'apiKeys.openai',
		location: 'cloud',
	},
	{
		id: 'ElevenLabs',
		name: 'ElevenLabs',
		icon: PauseIcon,
		models: ELEVENLABS_TRANSCRIPTION_MODELS,
		defaultModel: ELEVENLABS_TRANSCRIPTION_MODELS[0],
		modelSettingKey: 'transcription.elevenlabs.model',
		apiKeyField: 'apiKeys.elevenlabs',
		location: 'cloud',
	},
	{
		id: 'Deepgram',
		name: 'Deepgram',
		icon: ServerIcon,
		models: DEEPGRAM_TRANSCRIPTION_MODELS,
		defaultModel: DEEPGRAM_TRANSCRIPTION_MODELS[0],
		modelSettingKey: 'transcription.deepgram.model',
		apiKeyField: 'apiKeys.deepgram',
		location: 'cloud',
	},
	// Self-hosted services
	{
		id: 'speaches',
		name: 'Speaches',
		icon: ServerIcon,
		serverUrlField: 'transcription.speaches.baseUrl',
		location: 'self-hosted',
	},
	// {
	// 	id: 'owhisper',
	// 	name: 'Owhisper',
	// 	icon: ServerIcon,
	// 	serverUrlField: 'transcription.owhisper.baseUrl',
	// 	location: 'self-hosted',
	// },
] as const satisfies SatisfiedTranscriptionService[];

export const TRANSCRIPTION_SERVICE_OPTIONS = TRANSCRIPTION_SERVICES.map(
	(service) => ({
		label: service.name,
		value: service.id,
	}),
);

export type TranscriptionService = (typeof TRANSCRIPTION_SERVICES)[number];
