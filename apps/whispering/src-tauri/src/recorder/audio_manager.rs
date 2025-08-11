use cpal::traits::{DeviceTrait, HostTrait};
use cpal::{Device, Host};
use std::collections::HashMap;
use std::sync::mpsc::{self, Receiver, Sender};
use std::sync::{Arc, Mutex, OnceLock};
use std::thread;
use std::time::{Duration, Instant};
use tracing::{debug, error, info, warn};

type Result<T> = std::result::Result<T, String>;

/// Cached device information
#[derive(Clone, Debug)]
struct DeviceInfo {
    name: String,
    is_available: bool,
    last_checked: Instant,
}

/// Commands for the audio manager thread
enum AudioCommand {
    EnumerateDevices {
        response: Sender<Result<Vec<String>>>,
    },
    GetDevice {
        name: String,
        response: Sender<Result<Device>>,
    },
    RefreshCache,
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

    /// Refresh the device cache
    pub fn refresh_cache(&self) -> Result<()> {
        self.sender
            .send(AudioCommand::RefreshCache)
            .map_err(|e| format!("Failed to send refresh command: {}", e))
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
    device_cache: HashMap<String, DeviceInfo>,
    cache_duration: Duration,
    last_full_refresh: Option<Instant>,
}

impl AudioManagerWorker {
    fn new(receiver: Receiver<AudioCommand>) -> Self {
        Self {
            receiver,
            host: cpal::default_host(),
            device_cache: HashMap::new(),
            cache_duration: Duration::from_secs(10),
            last_full_refresh: None,
        }
    }

    fn run(mut self) {
        loop {
            match self.receiver.recv() {
                Ok(AudioCommand::EnumerateDevices { response }) => {
                    let result = self.enumerate_devices_cached();
                    let _ = response.send(result);
                }
                Ok(AudioCommand::GetDevice { name, response }) => {
                    let result = self.get_device(&name);
                    let _ = response.send(result);
                }
                Ok(AudioCommand::RefreshCache) => {
                    self.refresh_cache();
                }
                Ok(AudioCommand::Shutdown) | Err(_) => {
                    debug!("Audio manager worker shutting down");
                    break;
                }
            }
        }
    }

    /// Enumerate devices with caching
    fn enumerate_devices_cached(&mut self) -> Result<Vec<String>> {
        // Check if cache needs refresh
        let needs_refresh = self.last_full_refresh
            .map(|t| t.elapsed() > self.cache_duration)
            .unwrap_or(true);

        if needs_refresh {
            self.refresh_cache();
        }

        // Return cached device names
        let mut devices: Vec<String> = self.device_cache
            .values()
            .filter(|info| info.is_available)
            .map(|info| info.name.clone())
            .collect();
        
        devices.sort();
        
        if devices.is_empty() {
            warn!("No audio input devices found");
            // Try one more refresh
            self.refresh_cache();
            devices = self.device_cache
                .values()
                .filter(|info| info.is_available)
                .map(|info| info.name.clone())
                .collect();
            devices.sort();
        }
        
        Ok(devices)
    }

    /// Refresh the device cache
    fn refresh_cache(&mut self) {
        debug!("Refreshing audio device cache");
        
        // Mark all existing devices as potentially unavailable
        for info in self.device_cache.values_mut() {
            info.is_available = false;
        }

        // Try to enumerate devices safely
        match self.host.input_devices() {
            Ok(devices) => {
                for device in devices {
                    // Try to get device name
                    match device.name() {
                        Ok(name) => {
                            // Verify device is actually usable by trying to get its config
                            let is_available = device.default_input_config().is_ok();
                            
                            self.device_cache.insert(
                                name.clone(),
                                DeviceInfo {
                                    name: name.clone(),
                                    is_available,
                                    last_checked: Instant::now(),
                                },
                            );
                            
                            if is_available {
                                debug!("Found available device: {}", name);
                            } else {
                                warn!("Device '{}' found but not available", name);
                            }
                        }
                        Err(e) => {
                            debug!("Failed to get device name: {}", e);
                        }
                    }
                }
            }
            Err(e) => {
                error!("Failed to enumerate input devices: {}", e);
                // Don't clear the cache on error - keep whatever we had
                for info in self.device_cache.values_mut() {
                    info.is_available = true; // Assume cached devices are still available
                }
            }
        }

        self.last_full_refresh = Some(Instant::now());
        info!("Device cache refreshed: {} devices available", 
              self.device_cache.values().filter(|i| i.is_available).count());
    }

    /// Get a specific device
    fn get_device(&mut self, name: &str) -> Result<Device> {
        // Handle "default" device specially
        if name.to_lowercase() == "default" {
            return self.host
                .default_input_device()
                .ok_or_else(|| "No default input device available".to_string());
        }

        // Check cache first
        if let Some(info) = self.device_cache.get(name) {
            if !info.is_available {
                return Err(format!("Device '{}' is not available", name));
            }
            
            // Cache says it's available, but let's verify it still exists
            if info.last_checked.elapsed() > Duration::from_secs(5) {
                // Cache is stale, refresh for this specific device
                self.refresh_single_device(name);
            }
        } else {
            // Device not in cache, try a refresh
            self.refresh_cache();
        }

        // Now try to get the actual device
        match self.host.input_devices() {
            Ok(devices) => {
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
            Err(e) => Err(format!("Failed to enumerate devices: {}", e)),
        }
    }

    /// Refresh cache for a single device
    fn refresh_single_device(&mut self, name: &str) {
        if let Ok(devices) = self.host.input_devices() {
            for device in devices {
                if let Ok(device_name) = device.name() {
                    if device_name == name {
                        let is_available = device.default_input_config().is_ok();
                        self.device_cache.insert(
                            name.to_string(),
                            DeviceInfo {
                                name: name.to_string(),
                                is_available,
                                last_checked: Instant::now(),
                            },
                        );
                        return;
                    }
                }
            }
        }
        
        // Device not found, mark as unavailable
        if let Some(info) = self.device_cache.get_mut(name) {
            info.is_available = false;
            info.last_checked = Instant::now();
        }
    }
}