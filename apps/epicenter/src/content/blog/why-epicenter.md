---
title: 'Why I'm building another personal database'
description: 'I corrupted my vault on purpose. Then synced it across three devices. Here's what happened.'
pubDate: 2025-01-28
---

I was paying $15/month for a note-taking app, $20/month for task management, and another $10/month for an email client that promised to "revolutionize my workflow." That's $540/year to store text files with extra steps.

Then I tried to export my data. The notes came out as markdown (good), but with proprietary frontmatter that broke in other apps. The tasks exported as JSON with no schema documentation. The emails? "Export coming soon!"

So I built Epicenter to solve a simple problem: What if your personal database was just... files?

## The vault pattern

Here's my Epicenter vault right now:

```
~/Epicenter/
├── email/
│   ├── messages.yjs
│   └── attachments/
├── todo/
│   └── tasks.yjs
├── notes/
│   ├── 2025-01-28-why-epicenter.yjs
│   └── 2025-01-27-crdt-thoughts.yjs
└── assistants/
    └── context-config.json
```

Each folder is a service. Each service stores its data in Yjs documents—these are just files on disk that happen to have superpowers.

## I corrupted my vault on purpose

Last week I did something stupid on purpose. I edited the same task on three devices while offline:

- Laptop: Changed "Write blog post" to "Write Epicenter announcement"
- Phone: Changed priority from "medium" to "high"
- Desktop: Added a due date

Then I turned on sync. In any other app, I'd be picking which version to keep. With CRDTs, all three changes merged perfectly. The task had the new title, high priority, and a due date.

That's not a feature I built. That's just how CRDTs work.

## Your assistants can see everything

I gave Claude access to my vault last week. Not through an API or integration—I just mounted the folder. It immediately understood:

- Every email I'd sent about the project
- All my task history and patterns
- My notes and thought process

When I asked "What should I work on today based on my commitments?", it had actual context. Not a chat history—my entire digital memory.

## Why files matter

I can grep my emails. I can version control my tasks. I can rsync my entire digital life to a new machine. When Epicenter eventually dies (all software does), my data won't.

Delete the app, keep your files. That's the promise.

## What's different

Every personal database promises "no lock-in," but then stores your data in SQLite with a custom schema, or in a proprietary format, or in the cloud where exports are an afterthought.

Epicenter is different because there's nothing to lock you in with. It's folders and files, enhanced by CRDTs for perfect sync. You could implement a compatible client in a weekend because the "protocol" is just Yjs.

## The technical bits

For the curious, here's why this works:

- **Yjs** provides the CRDT magic. Every change is a delta that can be applied in any order
- **One doc per item** keeps merge conflicts semantic, not structural
- **Plain file fallbacks** mean you can always `cat` your data in an emergency
- **Pluggable sync** because CRDTs don't care about transport

## What's next

I'm using Epicenter as my daily driver. It's rough—the UI is minimal, and some features are CLI-only. But my data is mine, sync never fails, and my LLM assistants have perfect context.

If you're tired of paying rent to store your own thoughts, [check out the code](https://github.com/epicentered/epicenter). PRs welcome, especially if you've also been burned by "revolutionary" productivity apps.

The revolution isn't in the features. It's in the files.