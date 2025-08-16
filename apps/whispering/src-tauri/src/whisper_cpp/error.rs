use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum WhisperCppError {
    #[error("Audio format not supported. WhisperCpp requires WAV files. Use Voice Activated recording mode or upload a WAV file instead of manual recording.")]
    AudioFormatNotSupported,
    
    #[error("Failed to read audio: {0}")]
    AudioReadError(String),
    
    #[error("Failed to load model: {0}")]
    ModelLoadError(String),
    
    #[error("GPU acceleration failed: {0}")]
    GpuError(String),
    
    #[error("Transcription failed: {0}")]
    TranscriptionError(String),
    
    #[error("Failed to create state: {0}")]
    StateCreationError(String),
    
    #[error("Failed to get segments: {0}")]
    SegmentError(String),
}

// Custom serialization for frontend
#[derive(Serialize)]
#[serde(tag = "kind", rename = "message")]
#[serde(rename_all = "camelCase")]
enum SerializedError {
    AudioFormatNotSupported { message: String },
    AudioReadError { message: String },
    ModelLoadError { message: String },
    GpuError { message: String },
    TranscriptionError { message: String },
    StateCreationError { message: String },
    SegmentError { message: String },
}

impl Serialize for WhisperCppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        let message = self.to_string();
        let serialized = match self {
            WhisperCppError::AudioFormatNotSupported => {
                SerializedError::AudioFormatNotSupported { message }
            }
            WhisperCppError::AudioReadError(_) => {
                SerializedError::AudioReadError { message }
            }
            WhisperCppError::ModelLoadError(_) => {
                SerializedError::ModelLoadError { message }
            }
            WhisperCppError::GpuError(_) => {
                SerializedError::GpuError { message }
            }
            WhisperCppError::TranscriptionError(_) => {
                SerializedError::TranscriptionError { message }
            }
            WhisperCppError::StateCreationError(_) => {
                SerializedError::StateCreationError { message }
            }
            WhisperCppError::SegmentError(_) => {
                SerializedError::SegmentError { message }
            }
        };
        serialized.serialize(serializer)
    }
}

// Simplified constructor methods
impl WhisperCppError {
    pub fn audio_format_not_supported() -> Self {
        Self::AudioFormatNotSupported
    }

    pub fn audio_read_error(err: impl std::fmt::Display) -> Self {
        Self::AudioReadError(err.to_string())
    }

    pub fn model_load_error(err: impl std::fmt::Display) -> Self {
        Self::ModelLoadError(err.to_string())
    }

    pub fn gpu_error(err: impl std::fmt::Display) -> Self {
        Self::GpuError(err.to_string())
    }

    pub fn transcription_error(err: impl std::fmt::Display) -> Self {
        Self::TranscriptionError(err.to_string())
    }

    pub fn state_creation_error(err: impl std::fmt::Display) -> Self {
        Self::StateCreationError(err.to_string())
    }

    pub fn segment_error(err: impl std::fmt::Display) -> Self {
        Self::SegmentError(err.to_string())
    }
}