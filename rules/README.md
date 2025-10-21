# Rules Organization

This directory contains guidelines for AI assistants working on this codebase. Content is organized to support lazy loading: load only what's needed for the specific task at hand.

## Structure

### Core Guidelines (Always Loaded)

**@rules/general-guidelines.md** - Loaded immediately for all tasks. Contains:

- Standard Workflow
- Expensive/destructive actions
- Honesty principle
- Human-Readable Control Flow

These principles apply across all development tasks regardless of domain.

### Domain-Specific Guidelines (Load on Demand)

Load these only when working in their specific domains:

**Language & Framework**

- `@rules/typescript.md` - TypeScript rules, type co-location principles
- `@rules/svelte.md` - Svelte patterns, TanStack Query mutations, component composition
- `@rules/rust.md` - Rust to TypeScript error handling patterns (Tauri)

**Development Practices**

- `@rules/error-handling.md` - wellcrafted trySync/tryAsync patterns
- `@rules/styling.md` - CSS, Tailwind, shadcn-svelte best practices

**Tools & Workflows**

- `@rules/git.md` - Commit messages, PR guidelines, conventional commits
- `@rules/github.md` - Issue responses, community interaction patterns
- `@rules/posthog.md` - Analytics integration patterns

**Content & Communication**

- `@rules/documentation.md` - Technical writing, README guidelines, punctuation
- `@rules/social-media.md` - LinkedIn, Reddit, Twitter post guidelines

## Migration Plan

Content currently in `general-guidelines.md` will be split into these domain-specific files:

**Move to `@rules/typescript.md`:**

- TypeScript rules (type vs interface, imports)
- Type Co-location Principles

**Move to `@rules/svelte.md`:**

- Mutation Pattern Preference
- Shadcn-svelte Best Practices
- Self-Contained Component Pattern
- Styling Best Practices

**Move to `@rules/rust.md`:**

- Rust to TypeScript Error Handling

**Move to `@rules/error-handling.md`:**

- Error Handling with wellcrafted trySync and tryAsync

**Move to `@rules/git.md`:**

- Git Commit and Pull Request Guidelines
- Conventional Commits Format

**Move to `@rules/github.md`:**

- GitHub Issue Comment Guidelines

**Move to `@rules/documentation.md`:**

- Documentation & README Writing Guidelines
- Punctuation Guidelines
- Writing Style Examples
- README and Documentation Guidelines (consolidate duplicates)

**Move to `@rules/social-media.md`:**

- Social Media Post Guidelines (all platforms)

**Move to `@rules/posthog.md`:**

- PostHog Astro Rules

**Keep in `@rules/general-guidelines.md`:**

- Standard Workflow
- Expensive/destructive actions
- Human-Readable Control Flow
- Honesty

## Usage

When the AI assistant encounters a file reference like `@rules/typescript.md`, it should:

1. Use the Read tool to load the file only when needed
2. Treat the content as mandatory instructions
3. Follow references recursively if needed
4. Not preemptively load all files

This lazy loading approach keeps context focused and token usage efficient.
