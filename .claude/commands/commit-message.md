# Generate Commit Message

Generate a conventional commit message for currently staged changes.

## Description
This command instructs Claude to analyze the currently staged changes and create an appropriate conventional commit message following the project's commit guidelines. Claude will examine the staged files and their changes to understand what was modified and craft a descriptive commit message.

## What Claude Will Do
1. Check `git status` to see what files are staged for commit
2. Analyze the staged changes using `git diff --cached`
3. Determine the appropriate commit type (feat, fix, refactor, etc.)
4. Identify the scope if applicable (component/module names)
5. Generate a descriptive commit message following conventional commit format
6. Present the commit message for review

## Usage
Run this command when you have changes staged and ready to commit but want help crafting an appropriate commit message. The generated message will follow the project's conventional commit guidelines with proper type, scope, and description.

## Commit Message Format
The generated message will follow this format:
```
<type>[optional scope]: <description>

[optional body]
```

Where type includes: feat, fix, refactor, docs, test, chore, style, perf, build, ci