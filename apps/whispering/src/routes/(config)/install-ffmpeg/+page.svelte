<script lang="ts">
	import { Button } from '@repo/ui/button';
	import * as Card from '@repo/ui/card';
	import { Snippet } from '@repo/ui/snippet';
	import { TerminalIcon } from '@lucide/svelte';
	import * as services from '$lib/services';

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
				FFmpeg is required for processing audio files in Whisper C++. It's a free, 
				open-source tool that handles audio format conversion.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			{#if platform === 'macos'}
				<div class="space-y-4">
					<h3 class="font-semibold">macOS Installation</h3>
					
					<div class="space-y-3">
						<p class="text-sm font-medium">Option 1: Using Homebrew (Recommended)</p>
						<ol class="text-muted-foreground list-decimal list-inside space-y-3 text-sm">
							<li>
								Open Terminal (press <kbd class="px-1 py-0.5 text-xs bg-muted rounded">⌘</kbd> + <kbd class="px-1 py-0.5 text-xs bg-muted rounded">Space</kbd>, type "Terminal")
							</li>
							<li>
								Install Homebrew if you haven't already:
								<Snippet
									text='/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
									class="mt-2"
								/>
							</li>
							<li>
								Install FFmpeg:
								<Snippet text="brew install ffmpeg" class="mt-2" />
							</li>
						</ol>
					</div>

					<div class="space-y-2">
						<p class="text-sm font-medium">Option 2: Direct Download</p>
						<Button
							href="https://evermeet.cx/ffmpeg/"
							target="_blank"
							rel="noopener noreferrer"
							variant="outline"
							size="sm"
						>
							Download FFmpeg for macOS
						</Button>
					</div>
				</div>
			{:else if platform === 'windows'}
				<div class="space-y-4">
					<h3 class="font-semibold">Windows Installation</h3>
					
					<div class="space-y-3">
						<p class="text-sm font-medium">Option 1: Using winget (Windows 11/10)</p>
						<ol class="text-muted-foreground list-decimal list-inside space-y-3 text-sm">
							<li>Open Command Prompt as Administrator</li>
							<li>
								Run this command:
								<Snippet text="winget install ffmpeg" class="mt-2" />
							</li>
						</ol>
					</div>

					<div class="space-y-3">
						<p class="text-sm font-medium">Option 2: Manual Installation</p>
						<ol class="text-muted-foreground list-decimal list-inside space-y-2 text-sm">
							<li>
								Download FFmpeg from the official website:
								<Button
									href="https://www.gyan.dev/ffmpeg/builds/"
									target="_blank"
									rel="noopener noreferrer"
									variant="outline"
									size="sm"
									class="mt-2 block w-fit"
								>
									Download FFmpeg for Windows
								</Button>
							</li>
							<li>Choose "release builds" → "ffmpeg-release-essentials.zip"</li>
							<li>Extract the ZIP file to <code class="bg-muted px-1 rounded">C:\ffmpeg</code></li>
							<li>Add <code class="bg-muted px-1 rounded">C:\ffmpeg\bin</code> to your PATH</li>
							<li>Restart Whispering for the changes to take effect</li>
						</ol>
					</div>
				</div>
			{:else if platform === 'linux'}
				<div class="space-y-4">
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
				</div>
			{:else}
				<div class="space-y-3">
					<p class="text-muted-foreground text-sm">
						Visit the official FFmpeg download page for your operating system:
					</p>
					<Button
						href="https://ffmpeg.org/download.html"
						target="_blank"
						rel="noopener noreferrer"
						variant="outline"
						size="sm"
					>
						Visit FFmpeg Download Page
					</Button>
				</div>
			{/if}

			<div class="p-4 bg-muted/50 rounded-lg space-y-3">
				<h4 class="text-sm font-medium">Verify Installation</h4>
				<p class="text-muted-foreground text-sm">
					After installation, verify FFmpeg is working:
				</p>
				<Snippet text="ffmpeg -version" variant="secondary" />
			</div>
		</Card.Content>
		<Card.Footer class="gap-2">
			<Button
				href="/settings/transcription"
				variant="default"
				size="sm"
				class="flex-1"
			>
				Back to Settings
			</Button>
			<Button
				onclick={async () => {
					try {
						const { Command } = await import('@tauri-apps/plugin-shell');
						const command = new Command('ffmpeg', ['-version']);
						const output = await command.execute();
						if (output.code === 0) {
							window.location.href = '/settings/transcription';
						}
					} catch {
						// ffmpeg still not found
					}
				}}
				variant="outline"
				size="sm"
			>
				<TerminalIcon class="size-4 mr-2" />
				Check Again
			</Button>
		</Card.Footer>
	</Card.Root>
</main>