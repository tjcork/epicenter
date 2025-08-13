# Contributing to Epicenter

Welcome! We're excited you're interested in contributing to Epicenter. This guide will help you get up and running quickly.

## Getting Started

Epicenter is a monorepo containing multiple applications. The main application ready for contributions is **Whispering** (located in `apps/whispering`).

### Quick Setup

1. **Clone and install dependencies**
   ```bash
   git clone https://github.com/epicenter-so/epicenter.git
   cd epicenter
   bun install
   ```

2. **Navigate to the Whispering app**
   ```bash
   cd apps/whispering
   ```

3. **Start development**
   ```bash
   # Run both web and desktop mode
   bun dev
   
   # Or run just the web version
   bun dev:web
   ```

That's it! You're ready to start contributing.

## Project Structure

This is a monorepo with the following structure:

```
epicenter/
├── apps/
│   ├── whispering/     # Main transcription app (ready for contributions)
│   ├── sh/             # Local assistant (in development)
│   └── ...             # Other apps in various stages
├── packages/
│   ├── db/             # Shared database schema for our hosted services
│   ├── ui/             # Shared UI components
│   └── ...
└── ...
```

### Where to Contribute

Currently, **Whispering** (`apps/whispering`) is the most mature application and the best place to start contributing. Check the [Whispering README](apps/whispering/README.md) for specific details about that application.

## Development Workflow

1. **Create a branch** for your feature or fix
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** following our coding standards (see below)

3. **Test your changes** thoroughly
   ```bash
   # Run tests if available
   bun test
   ```

4. **Commit using conventional commits**
   ```bash
   git commit -m "feat(whispering): add new feature"
   ```

5. **Push and create a pull request**
   ```bash
   git push origin feat/your-feature-name
   ```

## Coding Standards

### TypeScript
- Use `type` instead of `interface`
- Prefer absolute imports over relative imports
- Use object method shorthand syntax when appropriate

### Svelte
- We use Svelte 5 with the latest runes syntax
- Follow shadcn-svelte patterns for UI components
- Use Tailwind CSS for styling

### Commits
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Maintenance tasks

Examples:
- `feat(whispering): add model selection for OpenAI providers`
- `fix(sound): resolve audio import paths`
- `docs: update contribution guidelines`

## Getting Help

- **Discord**: Join our community at [go.epicenter.so/discord](https://go.epicenter.so/discord)
- **Issues**: Check existing issues or create a new one
- **Documentation**: Each app has its own README with specific details

## Philosophy

We believe in:
- **Local-first**: Your data stays on your machine
- **Open source**: Everything is transparent and auditable
- **User ownership**: You own your data and choose your models
- **Simplicity**: Every change should be as simple as possible

## What We're Looking For

- Bug fixes and improvements to existing features
- Performance optimizations
- Documentation improvements
- New features that align with our local-first philosophy
- UI/UX enhancements

## Questions?

Feel free to:
- Open an issue for discussion
- Join our Discord and ask questions
- Reach out directly at github@bradenwong.com

Thank you for contributing to Epicenter! We're building something special together.