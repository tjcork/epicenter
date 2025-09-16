use flate2::read::GzDecoder;
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::path::Path;
use tar::Archive;
use thiserror::Error;

#[derive(Error, Debug, Serialize, Deserialize)]
#[serde(tag = "name")]
pub enum ArchiveExtractionError {
    #[error("Archive extraction failed: {message}")]
    ArchiveExtractionError { message: String },
}

/// Extract a tar.gz archive to a target directory
#[tauri::command]
pub async fn extract_parakeet_model(
    archive_path: String,
    target_dir: String,
) -> Result<(), ArchiveExtractionError> {
    let archive_path = Path::new(&archive_path);
    let target_dir = Path::new(&target_dir);

    // Verify archive exists
    if !archive_path.exists() {
        return Err(ArchiveExtractionError::ArchiveExtractionError {
            message: format!("Archive not found: {}", archive_path.display()),
        });
    }

    // Open the tar.gz file
    let tar_gz = File::open(archive_path).map_err(|e| ArchiveExtractionError::ArchiveExtractionError {
        message: format!("Failed to open archive: {}", e),
    })?;

    let tar = GzDecoder::new(tar_gz);
    let mut archive = Archive::new(tar);

    // Extract to the target directory
    archive
        .unpack(target_dir)
        .map_err(|e| ArchiveExtractionError::ArchiveExtractionError {
            message: format!("Failed to extract archive: {}", e),
        })?;

    Ok(())
}