# Icons Directory

This directory contains SVG icons for various AI/ML service providers and models used in the Whispering application.

## Structure

The icons are stored as individual SVG files, each representing a different service provider or technology:

- **deepgram.svg** - Deepgram speech recognition service
- **elevenlabs.svg** - ElevenLabs text-to-speech service
- **ggml.svg** - GGML (Georgi Gerganov Machine Learning) model format
- **groq.svg** - Groq LPU inference engine
- **nvidia.svg** - NVIDIA (likely for local GPU inference)
- **openai.svg** - OpenAI API services
- **speaches.svg** - Speaches service

## Sources

Icons are sourced from:
- [Simple Icons](https://simpleicons.org) - A collection of SVG icons for popular brands
- [SVGL](https://svgl.app) - A collection of SVG logos

## Customization

The fill colors of these icons are sometimes modified from their original versions to better match the application's design system and ensure proper visibility across different themes and backgrounds.

## Why This Structure?

This flat file structure was chosen because:
1. **Direct imports**: Each icon can be imported directly as an SVG component in Svelte
2. **Version control**: Individual SVG files are easier to track, diff, and update in git
3. **Flexibility**: Each icon can be customized independently (colors, sizes, etc.)
4. **Performance**: SVGs are lightweight and can be inlined directly into the HTML
5. **Type safety**: Individual files work better with TypeScript imports and IDE autocomplete