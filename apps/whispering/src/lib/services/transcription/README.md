# Transcription Services

This directory organizes transcription providers by deployment model.

## Organization

### `/cloud`
API-based services that send audio to external providers. These require API keys and an internet connection. Audio is processed on the provider's servers.

### `/local`
On-device processing that runs entirely on the user's machine. These require downloading model files but work offline. Audio never leaves the device.

### `/self-hosted`
Services that connect to servers you deploy yourself. You provide the base URL of your own instance. This gives you control over infrastructure and data while still using a server-based approach.

## Core Files

- `registry.ts`: Service metadata and configuration for all providers
- `index.ts`: Central export point for service implementations
