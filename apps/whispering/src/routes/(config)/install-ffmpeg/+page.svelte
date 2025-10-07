<script lang="ts">
	import { Button, buttonVariants } from '@repo/ui/button';
	import { Link } from '@repo/ui/link';
	import * as Card from '@repo/ui/card';
	import * as Alert from '@repo/ui/alert';
	import { Snippet } from '@repo/ui/snippet';
	import { Badge } from '@repo/ui/badge';
	import {
		DownloadIcon,
		CheckCircleIcon,
		XCircleIcon,
		LoaderIcon,
		RefreshCwIcon,
		ExternalLinkIcon,
		ArrowLeftIcon,
	} from '@lucide/svelte';
	import * as services from '$lib/services';
	import { goto } from '$app/navigation';
	import { createQuery } from '@tanstack/svelte-query';
	import { rpc } from '$lib/query';

	const platform = services.os.type();

	// Query to check FFmpeg installation status
	const ffmpegQuery = createQuery(() => ({
		...rpc.ffmpeg.checkFfmpegInstalled.options(),
		refetchInterval: (query) => {
			// Refetch every 5 seconds if not installed, every 30 seconds if installed
			const isInstalled = query.state.data;
			return isInstalled ? 30000 : 5000;
		},
		refetchOnWindowFocus: true,
		staleTime: 1000,
	}));
</script>

<svelte:head>
	<title>Install FFmpeg - Whispering</title>
</svelte:head>

<main class="flex flex-1 items-center justify-center p-4">
	<Card.Root class="relative w-full min-w-[640px] max-w-4xl">
		<Button
			onclick={() => window.history.back()}
			variant="ghost"
			size="icon"
			class="absolute left-4 top-4 z-10"
		>
			<ArrowLeftIcon class="size-4" />
		</Button>

		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="space-y-1.5 pl-12">
					<Card.Title class="text-2xl">Install FFmpeg</Card.Title>
					<Card.Description>
						We highly recommend installing FFmpeg for enhanced audio processing
						in Whispering. FFmpeg converts audio files to WAV format for Whisper
						C++ transcription and compresses native audio files for efficient
						transmission to transcription services.
					</Card.Description>
				</div>

				<div class="flex items-center gap-2">
					{#if ffmpegQuery.isPending}
						<Badge variant="secondary" class="gap-1.5">
							<LoaderIcon class="size-3 animate-spin" />
							Checking
						</Badge>
					{:else if ffmpegQuery.data === true}
						<Badge
							variant="default"
							class="gap-1.5 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
						>
							<CheckCircleIcon class="size-3" />
							Installed
						</Badge>
					{:else if ffmpegQuery.data === false}
						<Badge variant="destructive" class="gap-1.5">
							<XCircleIcon class="size-3" />
							Not Found
						</Badge>
					{/if}

					<Button
						size="icon"
						variant="ghost"
						onclick={() => ffmpegQuery.refetch()}
						title="Check again"
						class="size-8"
					>
						<RefreshCwIcon
							class="size-4 {ffmpegQuery.isFetching ? 'animate-spin' : ''}"
						/>
					</Button>
				</div>
			</div>
		</Card.Header>

		<Card.Content class="space-y-6">
			{#if ffmpegQuery.data === true}
				<Alert.Root class="border-green-500/20 bg-green-500/5">
					<CheckCircleIcon class="size-4 text-green-600 dark:text-green-400" />
					<Alert.Title class="text-green-600 dark:text-green-400">
						FFmpeg is installed!
					</Alert.Title>
					<Alert.Description>
						FFmpeg has been detected on your system. You can now use all audio
						processing features.
					</Alert.Description>
				</Alert.Root>

				<div class="flex gap-3">
					<Link
						href="/settings/transcription"
						class={buttonVariants({ class: 'flex-1' })}
					>
						Continue to Settings
					</Link>
					<Button variant="outline" onclick={() => goto('/')}>
						Go to Home
					</Button>
				</div>
			{:else if platform === 'macos'}
				<div class="space-y-4">
					<h3 class="text-lg font-semibold">macOS Installation</h3>

					<div class="space-y-3">
						<p class="text-sm font-medium">
							Option 1: Using Homebrew (Recommended)
						</p>
						<Snippet text="brew install ffmpeg" />

						<p class="text-xs text-muted-foreground">
							Don't have Homebrew?
							<Link
								href="https://brew.sh"
								target="_blank"
								rel="noopener noreferrer"
							>
								Install it from brew.sh
							</Link>
						</p>
					</div>

					<div class="space-y-3">
						<p class="text-sm font-medium">Option 2: Direct Download</p>
						<Button
							href="https://evermeet.cx/ffmpeg/"
							target="_blank"
							rel="noopener noreferrer"
							variant="outline"
						>
							<DownloadIcon class="size-4 mr-2" />
							Download FFmpeg for macOS
						</Button>
					</div>

					<div class="border-t pt-4">
						<p class="text-sm font-medium mb-2">Verify Installation</p>
						<p class="text-sm text-muted-foreground mb-2">
							After installation, verify FFmpeg is working by running this
							command:
						</p>
						<Snippet text="ffmpeg -version" variant="secondary" />
					</div>
				</div>
			{:else if platform === 'windows'}
				<div class="space-y-4">
					<h3 class="text-lg font-semibold">Windows Installation</h3>

					<ol
						class="text-sm text-muted-foreground list-decimal list-inside space-y-3"
					>
						<li>
							Download FFmpeg from GitHub:
							<Button
								href="https://github.com/BtbN/FFmpeg-Builds/releases"
								target="_blank"
								rel="noopener noreferrer"
								variant="outline"
								class="mt-2 ml-6"
							>
								<DownloadIcon class="size-4 mr-2" />
								Download FFmpeg for Windows
							</Button>
						</li>
						<li>
							Download the latest <code
								class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono"
								>ffmpeg-master-latest-win64-gpl-shared.zip</code
							>
						</li>
						<li>
							Extract the ZIP file to <code
								class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono"
								>C:\ffmpeg</code
							>
						</li>
						<li>
							Add <code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono"
								>C:\ffmpeg\bin</code
							> to your Windows PATH:
						</li>
					</ol>

					<div class="ml-6 mt-4 space-y-4">
						<div>
							<p class="text-sm font-medium mb-3">
								Method 1: Using Windows Settings (Recommended)
							</p>
							<ol
								class="text-xs text-muted-foreground list-decimal list-inside space-y-1 ml-4"
							>
								<li>
									Press <kbd class="bg-muted px-1 py-0.5 rounded"
										>Windows + X</kbd
									> and select "System"
								</li>
								<li>
									Click "Advanced system settings" → "Environment Variables..."
								</li>
								<li>
									Under "System variables", select "Path" → "Edit..." → "New"
								</li>
								<li>
									Add: <code class="bg-muted px-1 py-0.5 rounded"
										>C:\ffmpeg\bin</code
									>
								</li>
								<li>Click "OK" on all dialogs</li>
							</ol>
						</div>

						<div>
							<p class="text-sm font-medium mb-2">
								Method 2: PowerShell (One Command)
							</p>
							<Snippet
								text='[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\ffmpeg\bin", "Machine")'
							/>
							<p class="text-xs text-muted-foreground ml-2 mt-1">
								<strong>Note:</strong> Run PowerShell as Administrator for this command
							</p>
						</div>

						<div class="border rounded-lg p-3 bg-muted/20">
							<p class="text-xs font-medium mb-1">
								📹 Need help with PATH setup?
							</p>
							<Button
								href="https://www.youtube.com/watch?v=eRZRXpzZfM4&t=85s"
								target="_blank"
								rel="noopener noreferrer"
								variant="outline"
								size="sm"
							>
								<ExternalLinkIcon class="size-3 mr-2" />
								Watch Tutorial Video
							</Button>
						</div>
					</div>

					<div class="border-t pt-4 mt-6">
						<p class="text-sm font-medium mb-2">Verify Installation</p>
						<p class="text-sm text-muted-foreground mb-2">
							Restart Whispering, then test FFmpeg by running:
						</p>
						<Snippet text="ffmpeg -version" variant="secondary" />
					</div>

					<div class="border-t pt-4 space-y-3">
						<h4 class="text-lg font-semibold">Troubleshooting</h4>

						<div class="p-3 border rounded-lg bg-muted/10">
							<p class="text-sm font-medium mb-2">
								🚫 "ffmpeg is not recognized as an internal or external command"
							</p>
							<ul
								class="text-xs text-muted-foreground space-y-1 ml-4 list-disc"
							>
								<li>
									Make sure you added <code class="bg-muted px-1 py-0.5 rounded"
										>C:\ffmpeg\bin</code
									>
									to PATH (not just
									<code class="bg-muted px-1 py-0.5 rounded">C:\ffmpeg</code>)
								</li>
								<li>Restart Whispering completely after adding to PATH</li>
								<li>
									Test in a new Command Prompt: <code
										class="bg-muted px-1 py-0.5 rounded">ffmpeg -version</code
									>
								</li>
							</ul>
						</div>

						<details class="border rounded-lg">
							<summary
								class="p-3 cursor-pointer hover:bg-muted/5 text-sm font-medium"
							>
								🔧 Advanced Troubleshooting
							</summary>
							<div class="px-3 pb-3 space-y-2 border-t bg-muted/5">
								<ul
									class="text-xs text-muted-foreground space-y-1 ml-4 list-disc"
								>
									<li>
										Log out and back into Windows to refresh environment
										variables
									</li>
									<li>Check if Windows Defender is blocking FFmpeg</li>
									<li>
										Verify the ffmpeg.exe file exists at <code
											class="bg-muted px-1 py-0.5 rounded"
											>C:\ffmpeg\bin\ffmpeg.exe</code
										>
									</li>
								</ul>
							</div>
						</details>
					</div>
				</div>
			{:else if platform === 'linux'}
				<div class="space-y-4">
					<h3 class="text-lg font-semibold">Linux Installation</h3>

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

					<div class="border-t pt-4">
						<p class="text-sm font-medium mb-2">Verify Installation</p>
						<p class="text-sm text-muted-foreground mb-2">
							After installation, verify FFmpeg is working by running this
							command:
						</p>
						<Snippet text="ffmpeg -version" variant="secondary" />
					</div>
				</div>
			{:else}
				<div class="space-y-4">
					<h3 class="text-lg font-semibold">Download FFmpeg</h3>
					<p class="text-sm text-muted-foreground">
						Visit the official FFmpeg download page for your operating system:
					</p>
					<Button
						href="https://ffmpeg.org/download.html"
						target="_blank"
						rel="noopener noreferrer"
						variant="outline"
					>
						<DownloadIcon class="size-4 mr-2" />
						Visit FFmpeg Download Page
					</Button>
				</div>
			{/if}
		</Card.Content>

		{#if ffmpegQuery.data !== true}
			<Card.Footer>
				<Link
					href="/settings/transcription"
					class={buttonVariants({ variant: 'outline', class: 'w-full' })}
				>
					Back to Settings
				</Link>
			</Card.Footer>
		{/if}
	</Card.Root>
</main>

<style>
	:global(.animate-spin) {
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
