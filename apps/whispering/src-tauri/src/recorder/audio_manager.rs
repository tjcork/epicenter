use cpal::traits::{DeviceTrait, HostTrait};
use cpal::{Device, Host};
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::Duration;
use tracing::{debug, info};

type Result<T> = std::result::Result<T, String>;

/// Commands for the audio manager thread
enum AudioCommand {
    EnumerateDevices {
        response: Sender<Result<Vec<String>>>,
    },
    GetDevice {
        name: String,
        response: Sender<Result<Device>>,
    },
    Shutdown,
}

/// Audio manager that runs all CoreAudio operations on a single thread
pub struct AudioManager {
    sender: Sender<AudioCommand>,
    thread_handle: Option<thread::JoinHandle<()>>,
}

impl AudioManager {
    /// Get the global audio manager instance
    pub fn global() -> &'static Arc<Mutex<AudioManager>> {
        static INSTANCE: OnceLock<Arc<Mutex<AudioManager>>> = OnceLock::new();
        INSTANCE.get_or_init(|| {
            Arc::new(Mutex::new(AudioManager::new().expect("Failed to create audio manager")))
        })
    }

    /// Create a new audio manager with dedicated thread
    fn new() -> Result<Self> {
        let (sender, receiver) = mpsc::channel();
        
        let thread_handle = thread::Builder::new()
            .name("audio-manager".to_string())
            .spawn(move || {
                info!("Audio manager thread started");
                AudioManagerWorker::new(receiver).run();
                info!("Audio manager thread shutting down");
            })
            .map_err(|e| format!("Failed to spawn audio manager thread: {}", e))?;

        Ok(Self {
            sender,
            thread_handle: Some(thread_handle),
        })
    }

    /// Enumerate all available audio input devices
    pub fn enumerate_devices(&self) -> Result<Vec<String>> {
        let (response_tx, response_rx) = mpsc::channel();
        
        self.sender
            .send(AudioCommand::EnumerateDevices {
                response: response_tx,
            })
            .map_err(|e| format!("Failed to send enumerate command: {}", e))?;

        response_rx
            .recv_timeout(Duration::from_secs(5))
            .map_err(|e| format!("Failed to receive device list: {}", e))?
    }

    /// Get a specific device by name
    pub fn get_device(&self, name: String) -> Result<Device> {
        let (response_tx, response_rx) = mpsc::channel();
        
        self.sender
            .send(AudioCommand::GetDevice {
                name,
                response: response_tx,
            })
            .map_err(|e| format!("Failed to send get device command: {}", e))?;

        response_rx
            .recv_timeout(Duration::from_secs(5))
            .map_err(|e| format!("Failed to receive device: {}", e))?
    }

}

impl Drop for AudioManager {
    fn drop(&mut self) {
        debug!("Shutting down audio manager");
        let _ = self.sender.send(AudioCommand::Shutdown);
        if let Some(handle) = self.thread_handle.take() {
            let _ = handle.join();
        }
    }
}

/// Worker that runs on the dedicated audio thread
struct AudioManagerWorker {
    receiver: Receiver<AudioCommand>,
    host: Host,
}

impl AudioManagerWorker {
    fn new(receiver: Receiver<AudioCommand>) -> Self {
        Self {
            receiver,
            host: cpal::default_host(),
        }
    }

    fn run(mut self) {
        loop {
            match self.receiver.recv() {
                Ok(AudioCommand::EnumerateDevices { response }) => {
                    let result = self.enumerate_devices();
                    let _ = response.send(result);
                }
                Ok(AudioCommand::GetDevice { name, response }) => {
                    let result = self.get_device(&name);
                    let _ = response.send(result);
                }
                Ok(AudioCommand::Shutdown) | Err(_) => {
                    debug!("Audio manager worker shutting down");
                    break;
                }
            }
        }
    }

    /// Enumerate devices directly
    fn enumerate_devices(&mut self) -> Result<Vec<String>> {
        let devices = self.host
            .input_devices()
            .map_err(|e| format!("Failed to get input devices: {}", e))?;
        
        let mut device_names = Vec::new();
        for device in devices {
            match device.name() {
                Ok(name) => {
                    // Verify device is actually usable by trying to get its config
                    if device.default_input_config().is_ok() {
                        debug!("Found available device: {}", &name);
                        device_names.push(name);
                    } else {
                        debug!("Device '{}' found but not available", name);
                    }
                }
                Err(e) => {
                    debug!("Failed to get device name: {}", e);
                }
            }
        }
        
        device_names.sort();
        Ok(device_names)
    }

    /// Get a specific device
    fn get_device(&mut self, name: &str) -> Result<Device> {
        // Handle "default" device specially
        if name.to_lowercase() == "default" {
            return self.host
                .default_input_device()
                .ok_or_else(|| "No default input device available".to_string());
        }

        // Find the specific device
        let devices = self.host
            .input_devices()
            .map_err(|e| format!("Failed to enumerate devices: {}", e))?;
        
        for device in devices {
            if let Ok(device_name) = device.name() {
                if device_name == name {
                    // Verify it's actually usable
                    if device.default_input_config().is_ok() {
                        return Ok(device);
                    } else {
                        return Err(format!("Device '{}' exists but is not accessible", name));
                    }
                }
            }
        }
        
        Err(format!("Device '{}' not found", name))
    }
}