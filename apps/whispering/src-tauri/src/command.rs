use std::process::{Command, Stdio};
use serde::{Deserialize, Serialize};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

// Windows process creation flag to prevent console window from appearing
#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandOutput {
    pub code: Option<i32>,
    pub signal: Option<i32>,
    pub stdout: String,
    pub stderr: String,
}

/// Parse a command string into program and arguments.
/// Handles quoted arguments properly for direct execution without shell wrapper.
fn parse_command(command: &str) -> (String, Vec<String>) {
    // Match quoted strings or non-space sequences
    let re = regex::Regex::new(r#"(?:[^\s"]+|"[^"]*")+"#).unwrap();
    let parts: Vec<String> = re
        .find_iter(command)
        .map(|m| m.as_str().trim_matches('"').to_string())
        .collect();

    if parts.is_empty() {
        return (String::new(), Vec::new());
    }

    (parts[0].clone(), parts[1..].to_vec())
}

/// Execute a command and wait for it to complete.
///
/// Parses the command string into program and arguments, then executes directly
/// without using a shell wrapper. This approach provides:
/// - Consistent behavior across all platforms
/// - No shell injection vulnerabilities
/// - Lower process overhead
/// - PATH resolution still works via Command::new()
///
/// On Windows, also uses CREATE_NO_WINDOW flag to prevent console window flash (GitHub issue #815).
///
/// # Arguments
/// * `command` - The command to execute as a string
///
/// # Returns
/// Result containing the command output (stdout, stderr, exit code) or error message
///
/// # Examples
/// ```
/// execute_command("ffmpeg -version".to_string())
/// execute_command("ffmpeg -i input.wav output.mp3".to_string())
/// ```
#[tauri::command]
pub async fn execute_command(command: String) -> Result<CommandOutput, String> {
    let (program, args) = parse_command(&command);

    if program.is_empty() {
        return Err("Empty command".to_string());
    }

    let mut cmd = Command::new(&program);
    cmd.args(&args);
    cmd.stdout(Stdio::piped()).stderr(Stdio::piped());

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.output() {
        Ok(output) => Ok(CommandOutput {
            code: output.status.code(),
            signal: None, // Signal is Unix-specific, not available from std::process::Output
            stdout: String::from_utf8_lossy(&output.stdout).to_string(),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        }),
        Err(e) => Err(format!("Command execution failed: {}", e)),
    }
}

/// Spawn a child process without waiting for it to complete.
///
/// Parses the command string into program and arguments, then spawns directly
/// without using a shell wrapper. This approach provides:
/// - Consistent behavior across all platforms
/// - No shell injection vulnerabilities
/// - Lower process overhead
/// - PATH resolution still works via Command::new()
///
/// On Windows, also uses CREATE_NO_WINDOW flag to prevent console window flash (GitHub issue #815).
///
/// # Arguments
/// * `command` - The command to spawn as a string
///
/// # Returns
/// Result containing the process ID or error message
///
/// # Examples
/// ```
/// // Long-running process (e.g., FFmpeg recording)
/// spawn_command("ffmpeg -f avfoundation -i :0 output.wav".to_string())
/// ```
#[tauri::command]
pub async fn spawn_command(command: String) -> Result<u32, String> {
    let (program, args) = parse_command(&command);

    if program.is_empty() {
        return Err("Empty command".to_string());
    }

    let mut cmd = Command::new(&program);
    cmd.args(&args);

    #[cfg(target_os = "windows")]
    cmd.creation_flags(CREATE_NO_WINDOW);

    match cmd.spawn() {
        Ok(child) => Ok(child.id()),
        Err(e) => Err(format!("Failed to spawn process: {}", e)),
    }
}
