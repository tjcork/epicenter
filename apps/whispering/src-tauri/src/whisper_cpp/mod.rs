mod error;

use error::WhisperCppError;
use whisper_rs::{FullParams, SamplingStrategy, WhisperContext, WhisperContextParameters};
use std::process::Command;
use std::io::Write;

fn check_ffmpeg_installed() -> bool {
    Command::new("ffmpeg")
        .arg("-version")
        .output()
        .is_ok()
}

fn is_valid_wav_format(audio_data: &[u8]) -> bool {
    // Use hound to check WAV format efficiently
    let cursor = std::io::Cursor::new(audio_data);
    
    match hound::WavReader::new(cursor) {
        Ok(reader) => {
            let spec = reader.spec();
            // Check if it's 16-bit PCM, mono, 16kHz
            spec.sample_format == hound::SampleFormat::Int &&
            spec.channels == 1 &&
            spec.sample_rate == 16000 &&
            spec.bits_per_sample == 16
        }
        Err(_) => false,
    }
}

#[tauri::command]
pub async fn transcribe_with_whisper_cpp(
    audio_data: Vec<u8>,
    model_path: String,
    language: Option<String>,
    use_gpu: bool,
    prompt: String,
    temperature: f32,
) -> Result<String, WhisperCppError> {
    // Check if conversion is needed
    let needs_conversion = !is_valid_wav_format(&audio_data);
    
    let wav_data = if needs_conversion {
        // Check if ffmpeg is installed
        if !check_ffmpeg_installed() {
            return Err(WhisperCppError::FfmpegNotInstalled {
                message: "FFmpeg is required for enhanced audio format support. Please install FFmpeg to transcribe non-WAV audio files with Whisper C++.".to_string(),
            });
        }
        
        // Write input audio to temp file
        let mut input_file = tempfile::Builder::new()
            .suffix(".audio")
            .tempfile()
            .map_err(|e| WhisperCppError::AudioReadError {
                message: format!("Failed to create temp input file: {}", e),
            })?;
        
        input_file.write_all(&audio_data).map_err(|e| {
            WhisperCppError::AudioReadError {
                message: format!("Failed to write audio data to temp file: {}", e),
            }
        })?;
        
        // Create temp file for converted audio
        let output_file = tempfile::Builder::new()
            .suffix(".wav")
            .tempfile()
            .map_err(|e| WhisperCppError::AudioReadError {
                message: format!("Failed to create temp output file: {}", e),
            })?;
        
        let input_path = input_file.path().to_string_lossy().to_string();
        let output_path = output_file.path().to_string_lossy().to_string();
        
        // Use FFmpeg to convert to 16kHz mono PCM
        let output = Command::new("ffmpeg")
            .args(&[
                "-i", &input_path,
                "-ar", "16000",        // 16kHz sample rate
                "-ac", "1",            // Mono
                "-c:a", "pcm_s16le",   // 16-bit PCM
                "-y",                  // Overwrite output
                &output_path,
            ])
            .output()
            .map_err(|e| WhisperCppError::AudioReadError {
                message: format!("Failed to run ffmpeg: {}", e),
            })?;
        
        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(WhisperCppError::AudioReadError {
                message: format!("FFmpeg conversion failed: {}", stderr),
            });
        }
        
        // Read the converted file
        std::fs::read(&output_path).map_err(|e| {
            WhisperCppError::AudioReadError {
                message: format!("Failed to read converted audio file: {}", e),
            }
        })?
    } else {
        // Audio is already in correct format
        audio_data
    };
    
    // Parse WAV with hound
    let cursor = std::io::Cursor::new(wav_data);
    let mut reader = hound::WavReader::new(cursor).map_err(|e| {
        WhisperCppError::AudioReadError {
            message: format!("Failed to parse WAV data: {}", e),
        }
    })?;
    
    // Read samples as f32
    let samples: Vec<f32> = reader
        .samples::<i16>()
        .map(|s| s.map(|sample| sample as f32 / 32768.0))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| WhisperCppError::AudioReadError {
            message: format!("Failed to read samples: {}", e),
        })?;
    
    // Return early if audio is empty
    if samples.is_empty() {
        return Ok(String::new());
    }
    
    // Load model
    let mut params = WhisperContextParameters::default();
    params.use_gpu = use_gpu;
    
    let context = WhisperContext::new_with_params(&model_path, params).map_err(|e| {
        let error_str = e.to_string();
        if error_str.contains("GPU") || error_str.contains("CUDA") || error_str.contains("Metal") {
            WhisperCppError::GpuError {
                message: e.to_string(),
            }
        } else {
            WhisperCppError::ModelLoadError {
                message: e.to_string(),
            }
        }
    })?;
    
    let mut state = context
        .create_state()
        .map_err(|e| WhisperCppError::TranscriptionError {
            message: format!("Failed to create whisper state: {}", e),
        })?;
    
    // Configure transcription params with hallucination prevention
    let mut full_params = FullParams::new(SamplingStrategy::Greedy { best_of: 1 });
    full_params.set_translate(false);
    full_params.set_no_timestamps(true);
    full_params.set_temperature(temperature);
    
    // Hallucination prevention parameters
    full_params.set_no_speech_thold(0.2);  // Lower threshold for better silence detection
    full_params.set_suppress_non_speech_tokens(true);  // Suppress non-speech tokens
    
    if let Some(ref lang) = language {
        if !lang.is_empty() && lang != "auto" {
            full_params.set_language(Some(lang));
        }
    }
    
    if !prompt.trim().is_empty() {
        full_params.set_initial_prompt(&prompt);
    }
    
    // Transcribe
    state
        .full(full_params, &samples)
        .map_err(|e| WhisperCppError::TranscriptionError {
            message: e.to_string(),
        })?;
    
    // Get text
    let num_segments = state
        .full_n_segments()
        .map_err(|e| WhisperCppError::TranscriptionError {
            message: format!("Failed to get number of segments: {}", e),
        })?;
    
    let mut text = String::new();
    for i in 0..num_segments {
        text.push_str(&state.full_get_segment_text(i).map_err(|e| {
            WhisperCppError::TranscriptionError {
                message: format!("Failed to get segment {} text: {}", i, e),
            }
        })?);
    }
    
    Ok(text.trim().to_string())
}