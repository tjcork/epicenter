import { WhisperingErr, type WhisperingError } from '$lib/result';
import type { Settings } from '$lib/settings';
import { Ok, tryAsync, type Result } from 'wellcrafted/result';
import { invoke } from '@tauri-apps/api/core';
import { exists } from '@tauri-apps/plugin-fs';

export function createWhisperCppTranscriptionService() {
	return {
		async transcribe(
			audioBlob: Blob,
			options: {
				prompt: string;
				temperature: string;
				outputLanguage: Settings['transcription.outputLanguage'];
				modelPath: string;
				useGpu: boolean;
			},
		): Promise<Result<string, WhisperingError>> {
			// Pre-validation
			if (!options.modelPath) {
				return WhisperingErr({
					title: '📁 Model File Required',
					description: 'Please select a Whisper model file in settings.',
					action: {
						type: 'link',
						label: 'Configure model',
						href: '/settings/transcription',
					},
				});
			}

			// Check if model file exists
			const isExists = await tryAsync({
				try: () => exists(options.modelPath),
				mapErr: () => Ok(false),
			});

			if (!isExists) {
				return WhisperingErr({
					title: '❌ Model File Not Found',
					description: `The model file "${options.modelPath}" does not exist.`,
					action: {
						type: 'link',
						label: 'Select model',
						href: '/settings/transcription',
					},
				});
			}

			try {
				// Convert audio blob to byte array (like Handy's approach)
				const arrayBuffer = await audioBlob.arrayBuffer();
				const audioData = Array.from(new Uint8Array(arrayBuffer));

				// Call Tauri command to transcribe with whisper-cpp
				const transcribedText = await invoke<string>(
					'transcribe_with_whisper_cpp',
					{
						audioData: audioData,
						modelPath: options.modelPath,
						language:
							options.outputLanguage === 'auto' ? null : options.outputLanguage,
						useGpu: options.useGpu,
						prompt: options.prompt,
						temperature: Number.parseFloat(options.temperature),
					},
				);

				return Ok(transcribedText);
			} catch (error) {
				console.error('Whisper C++ transcription error:', error);

				// Parse error message for better user feedback
				const errorMessage =
					error instanceof Error ? error.message : String(error);

				if (errorMessage.includes('model') || errorMessage.includes('load')) {
					return WhisperingErr({
						title: '🤖 Model Loading Error',
						description:
							'Failed to load the Whisper model. The file may be corrupted or incompatible.',
						action: { type: 'more-details', error: error as Error },
					});
				}

				if (
					errorMessage.includes('GPU') ||
					errorMessage.includes('CUDA') ||
					errorMessage.includes('Metal')
				) {
					return WhisperingErr({
						title: '🎮 GPU Error',
						description:
							'GPU acceleration failed. Try disabling GPU in settings.',
						action: {
							type: 'link',
							label: 'Configure settings',
							href: '/settings/transcription',
						},
					});
				}

				return WhisperingErr({
					title: '❌ Whisper C++ Error',
					description:
						'An error occurred while processing your audio with Whisper C++.',
					action: { type: 'more-details', error: error as Error },
				});
			}
		},
	};
}

export type WhisperCppTranscriptionService = ReturnType<
	typeof createWhisperCppTranscriptionService
>;

export const WhisperCppTranscriptionServiceLive =
	createWhisperCppTranscriptionService();
