<script lang="ts">
	import { Button } from '@repo/ui/button';
	import * as Card from '@repo/ui/card';
	import * as Alert from '@repo/ui/alert';
	import { Snippet } from '@repo/ui/snippet';
	import { TerminalIcon, DownloadIcon, CheckIcon } from '@lucide/svelte';
	import * as services from '$lib/services';
	import { goto } from '$app/navigation';
	import { tryAsync } from 'wellcrafted/result';
	import { Err } from 'wellcrafted/result';

	const platform = services.os.type();
</script>

<svelte:head>
	<title>Install FFmpeg - Whispering</title>
</svelte:head>

<main class="flex flex-1 items-center justify-center">
	<Card.Root class="w-full max-w-2xl">
		<Card.Header>
			<Card.Title>Install FFmpeg</Card.Title>
			<Card.Description>
				FFmpeg is required for audio processing in Whispering. This free,
				open-source tool handles audio format conversion, sample rate
				adjustments, and channel conversions needed for transcription and
				recording features.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			{#if platform === 'macos'}
				<h3 class="font-semibold">macOS Installation</h3>

				<div>
					<p class="text-sm font-medium mb-2">
						Option 1: Using Homebrew (Recommended)
					</p>
					<Snippet text="brew install ffmpeg" />
				</div>

				<div>
					<p class="text-sm font-medium mb-2">Option 2: Direct Download</p>
					<Button
						href="https://ffmpeg.org/download.html"
						target="_blank"
						rel="noopener noreferrer"
					>
						<DownloadIcon class="size-4 mr-2" />
						Download FFmpeg for macOS
					</Button>
				</div>
			{:else if platform === 'windows'}
				<h3 class="font-semibold">Windows Installation</h3>

				<div class="space-y-3">
					<p class="text-sm font-medium">
						Option 1: Using winget (Windows 11/10)
					</p>
					<ol
						class="text-muted-foreground list-decimal list-inside space-y-3 text-sm"
					>
						<li>Open Command Prompt as Administrator</li>
						<li>
							Run this command:
							<Snippet text="winget install ffmpeg" class="mt-2" />
						</li>
					</ol>
				</div>

				<div class="space-y-3">
					<p class="text-sm font-medium">Option 2: Manual Installation</p>
					<ol
						class="text-muted-foreground list-decimal list-inside space-y-2 text-sm"
					>
						<li>
							Download FFmpeg from the official website:
							<Button
								href="https://www.gyan.dev/ffmpeg/builds/"
								target="_blank"
								rel="noopener noreferrer"
								class="mt-2"
							>
								<DownloadIcon class="size-4 mr-2" />
								Download FFmpeg for Windows
							</Button>
						</li>
						<li>Choose "release builds" → "ffmpeg-release-essentials.zip"</li>
						<li>
							Extract the ZIP file to <code class="bg-muted px-1 rounded"
								>C:\ffmpeg</code
							>
						</li>
						<li>
							Add <code class="bg-muted px-1 rounded">C:\ffmpeg\bin</code> to your
							PATH
						</li>
						<li>Restart Whispering for the changes to take effect</li>
					</ol>
				</div>
			{:else if platform === 'linux'}
				<h3 class="font-semibold">Linux Installation</h3>

				<div class="space-y-4">
					<div>
						<p class="text-sm font-medium mb-2">Ubuntu/Debian:</p>
						<Snippet text="sudo apt update && sudo apt install ffmpeg" />
					</div>

					<div>
						<p class="text-sm font-medium mb-2">Fedora/RHEL:</p>
						<Snippet text="sudo dnf install ffmpeg" />
					</div>

					<div>
						<p class="text-sm font-medium mb-2">Arch Linux:</p>
						<Snippet text="sudo pacman -S ffmpeg" />
					</div>
				</div>
			{:else}
				<p class="text-muted-foreground text-sm mb-3">
					Visit the official FFmpeg download page for your operating system:
				</p>
				<Button
					href="https://ffmpeg.org/download.html"
					target="_blank"
					rel="noopener noreferrer"
				>
					<DownloadIcon class="size-4 mr-2" />
					Visit FFmpeg Download Page
				</Button>
			{/if}

			<Alert.Root>
				<CheckIcon class="h-4 w-4" />
				<Alert.Title>Verify Installation</Alert.Title>
				<Alert.Description class="space-y-3">
					<p>
						After installation, verify FFmpeg is working by running this
						command:
					</p>
					<Snippet text="ffmpeg -version" variant="secondary" />
				</Alert.Description>
			</Alert.Root>
		</Card.Content>
		<Card.Footer class="gap-2">
			<Button href="/settings/transcription" class="flex-1">
				Back to Settings
			</Button>
			<Button
				onclick={async () => {
	const { data } = await tryAsync({
		try: async () => {
			const { Command } = await import('@tauri-apps/plugin-shell');
			const result = await Command.create('exec-sh', [
				'-c',
				'ffmpeg -version',
			]).execute();
			return result;
		},
		mapErr: () => Err(undefined),
	});

	if (data?.code === 0) {
		goto('/settings/transcription');
	}
}}
			>
				<TerminalIcon class="size-4 mr-2" />
				Check Again
			</Button>
		</Card.Footer>
	</Card.Root>
</main>
