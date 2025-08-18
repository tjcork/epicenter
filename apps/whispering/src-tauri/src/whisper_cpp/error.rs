use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "name", rename_all = "PascalCase")]
pub enum WhisperCppError {
    #[error("{message}")]
    FfmpegNotInstalled { message: String },

    #[error("Failed to read audio: {message}")]
    AudioReadError { message: String },

    #[error("Failed to load model: {message}")]
    ModelLoadError { message: String },

    #[error("GPU acceleration failed: {message}")]
    GpuError { message: String },

    #[error("Transcription failed: {message}")]
    TranscriptionError { message: String },
}