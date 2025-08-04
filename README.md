<p align="center">
  <a href="https://epicenter.so">
    <img width="200" src="./docs/assets/epicenter-logo.png" alt="Epicenter">
  </a>
  <h1 align="center">Epicenter</h1>
  <p align="center">A Database for Your Mind, Built on Plain Text</p>
  <p align="center">Every tool shares one memory. Your data stays yours. Free and open source ❤️</p>
</p>

<p align="center">
  <!-- GitHub Stars Badge -->
  <a href="https://github.com/epicenter-so/epicenter" target="_blank">
    <img alt="GitHub stars" src="https://img.shields.io/github/stars/epicenter-so/epicenter?style=flat-square" />
  </a>
  <!-- Latest Version Badge -->
  <img src="https://img.shields.io/github/v/release/epicenter-so/epicenter?style=flat-square&label=Latest%20Version&color=brightgreen" />
  <!-- License Badge -->
  <a href="LICENSE" target="_blank">
    <img alt="MIT License" src="https://img.shields.io/github/license/epicenter-so/epicenter.svg?style=flat-square" />
  </a>
  <!-- Discord Badge -->
  <a href="https://go.epicenter.so/discord" target="_blank">
    <img alt="Discord" src="https://img.shields.io/badge/Discord-Join%20us-5865F2?style=flat-square&logo=discord&logoColor=white" />
  </a>
  <!-- Platform Support Badges -->
  <a href="https://github.com/epicenter-so/epicenter/releases" target="_blank">
    <img alt="macOS" src="https://img.shields.io/badge/-macOS-black?style=flat-square&logo=apple&logoColor=white" />
  </a>
  <a href="https://github.com/epicenter-so/epicenter/releases" target="_blank">
    <img alt="Windows" src="https://img.shields.io/badge/-Windows-blue?style=flat-square&logo=windows&logoColor=white" />
  </a>
  <a href="https://github.com/epicenter-so/epicenter/releases" target="_blank">
    <img alt="Linux" src="https://img.shields.io/badge/-Linux-yellow?style=flat-square&logo=linux&logoColor=white" />
  </a>
</p>

<p align="center">
  <a href="#current-tools">Tools</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#join-us">Contributing</a> •
  <a href="https://go.epicenter.so/discord">Discord</a> •
  <a href="https://twitter.com/braden_wong">Twitter</a>
</p>

---

## What is Epicenter?

Epicenter is an open-source, local-first ecosystem for writers, builders, and privacy enthusiasts. It stores all your work—notes, transcripts, chat histories—in a single folder of plain text. Every tool we build shares this memory: your text editor, personal assistant, etc. It's open, tweakable, and yours. Grep it, open it in Obsidian, host it wherever you like. The choice is yours.

Our vision is to build a personal workspace where you own your data, choose your models, and replace siloed apps with open, interoperable alternatives. All while preserving authenticity and being free and open source.

## The Core Philosophy

<div align="center">
  <h3>🧠 One Memory</h3>
  <p>All tools share a single plain-text folder</p>
  <h3>🔓 No Lock-in</h3>
  <p>Open it in any editor. Grep it. Sync it. Own it.</p>
  <h3>🛡️ Privacy First</h3>
  <p>Your data stays on your machine. No tracking, no telemetry.</p>
</div>

In a world where every app wants to trap you and your data, we're building the opposite.

## Quick Start

### For Users

1. **Download Whispering** - Our flagship transcription app
   ```bash
   # macOS/Windows/Linux installers available
   # Visit: https://github.com/epicenter-so/epicenter/releases
   ```

2. **Get an API Key** - Groq recommended ($0.02/hour)
   - Visit [console.groq.com/keys](https://console.groq.com/keys)
   - No credit card required for free tier

3. **Start Transcribing** - Press shortcut → speak → get text

### For Developers

```bash
# Clone and setup
git clone https://github.com/epicenter-so/epicenter.git
cd epicenter
bun install

# Run any tool
cd apps/whispering
bun tauri dev
```

## Current Tools

<table>
  <tr>
    <td align="center" width="33%">
      <h3>🤖 <a href="./apps/sh">epicenter.sh</a></h3>
      <p>A local-first assistant you can chat with. It lives in your folder, becoming the access point to everything you've ever written, thought, or built.</p>
      <p><a href="./apps/sh">Full documentation →</a></p>
    </td>
    <td align="center" width="33%">
      <h3>🎙️ <a href="./apps/whispering">Whispering</a></h3>
      <p>Press shortcut → speak → get text. Desktop transcription that cuts out the middleman. Bring your own API key.</p>
      <p><a href="./apps/whispering">Full documentation →</a></p>
    </td>
    <td align="center" width="33%">
      <h3>🛠️ <a href="./apps/cli">Epicenter CLI</a></h3>
      <p>The command-line glue that connects everything. Smart defaults, automatic configuration, built for hackers.</p>
      <p><a href="./apps/cli">Full documentation →</a></p>
    </td>
  </tr>
</table>

## Where We're Headed

A growing software ecosystem—text editor, personal CRM, and more—all built around your shared local memory. Tools for people who read, write, build, and connect.

A renaissance workflow, built on plain text and real ownership.

### Upcoming Tools
- 📝 **Text Editor**: Write in your memory, not someone else's cloud
- 👥 **Personal CRM**: Keep track of relationships in plain text
- 📊 **Knowledge Graph**: Visualize connections in your thinking
- 🔍 **Search Engine**: Semantic search across your entire memory

## Join Us

<div align="center">
  <h3>🚀 We're looking for contributors</h3>
  <p>If you're passionate about open source, local-first software, or are just a cracked Svelte/TypeScript developer—we'd love to build with you.</p>
  <p>If you think like a generalist, build like a hacker, and value tools that respect your mind:</p>
  <p><strong>→ <a href="https://go.epicenter.so/discord">Join our Discord and DM me</a></strong></p>
</div>

### Ways to Contribute
- 🐛 Report bugs and suggest features
- 🎨 Improve UI/UX and accessibility
- 📚 Write documentation and tutorials
- 🔧 Build new tools for the ecosystem
- 🌍 Translate to other languages

## Tech Stack

<p align="center">
  <img alt="Svelte 5" src="https://img.shields.io/badge/-Svelte%205-orange?style=flat-square&logo=svelte&logoColor=white" />
  <img alt="Tauri" src="https://img.shields.io/badge/-Tauri-blue?style=flat-square&logo=tauri&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/-TypeScript-blue?style=flat-square&logo=typescript&logoColor=white" />
  <img alt="Rust" src="https://img.shields.io/badge/-Rust-orange?style=flat-square&logo=rust&logoColor=white" />
  <img alt="TanStack Query" src="https://img.shields.io/badge/-TanStack%20Query-red?style=flat-square&logo=react-query&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/-Tailwind%20CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white" />
</p>

## About the Creator

At 18, I taught myself to code while studying ethics, politics, and economics at Yale. Since then, I've averaged ~10k commits/year and worked at three YC startups. I wrote my 65-page senior thesis on open-source governance and digital platforms.

I care deeply about data ownership, open-source, and interdisciplinary thinking. I want this project to reflect that.

## License

[MIT](LICENSE). Build on it. Fork it. Make it yours. Please contribute if you can.

---

<p align="center">
  <strong>Contact:</strong> <a href="mailto:github@bradenwong.com">github@bradenwong.com</a> | <a href="https://go.epicenter.so/discord">Discord</a> | <a href="https://twitter.com/braden_wong">@braden_wong</a>
</p>

<p align="center">
  <sub>Built with ❤️ for the future of personal computing</sub>
</p>