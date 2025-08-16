use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum WhisperCppError {
    #[error("Audio format not supported. WhisperCpp requires WAV files. Use Voice Activated recording mode or upload a WAV file instead of manual recording.")]
    #[serde(rename = "audioFormatNotSupported")]
    AudioFormatNotSupported,
    
    #[error("Failed to read audio: {message}")]
    #[serde(rename = "audioReadError")]
    AudioReadError { message: String },
    
    #[error("Failed to load model: {message}")]
    #[serde(rename = "modelLoadError")]
    ModelLoadError { message: String },
    
    #[error("GPU acceleration failed: {message}")]
    #[serde(rename = "gpuError")]
    GpuError { message: String },
    
    #[error("Transcription failed: {message}")]
    #[serde(rename = "transcriptionError")]
    TranscriptionError { message: String },
    
    #[error("Failed to create state: {message}")]
    #[serde(rename = "stateCreationError")]
    StateCreationError { message: String },
    
    #[error("Failed to get segments: {message}")]
    #[serde(rename = "segmentError")]
    SegmentError { message: String },
}

// Simplified constructor methods
impl WhisperCppError {
    pub fn audio_format_not_supported() -> Self {
        Self::AudioFormatNotSupported
    }

    pub fn audio_read_error(err: impl std::fmt::Display) -> Self {
        Self::AudioReadError { message: err.to_string() }
    }

    pub fn model_load_error(err: impl std::fmt::Display) -> Self {
        Self::ModelLoadError { message: err.to_string() }
    }

    pub fn gpu_error(err: impl std::fmt::Display) -> Self {
        Self::GpuError { message: err.to_string() }
    }

    pub fn transcription_error(err: impl std::fmt::Display) -> Self {
        Self::TranscriptionError { message: err.to_string() }
    }

    pub fn state_creation_error(err: impl std::fmt::Display) -> Self {
        Self::StateCreationError { message: err.to_string() }
    }

    pub fn segment_error(err: impl std::fmt::Display) -> Self {
        Self::SegmentError { message: err.to_string() }
    }
}