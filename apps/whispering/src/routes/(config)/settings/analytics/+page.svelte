<script lang="ts">
	import { Button } from '@repo/ui/button';
	import * as Card from '@repo/ui/card';
	import { Label } from '@repo/ui/label';
	import { Switch } from '@repo/ui/switch';
	import { rpc } from '$lib/query';
	import { settings } from '$lib/stores/settings.svelte';

	function handleAnalyticsToggle(checked: boolean) {
		settings.updateKey('analytics.enabled', checked);
		
		// Log the change (will only send if analytics is now enabled)
		if (checked) {
			rpc.analytics.logEvent.execute({ type: 'settings_changed', section: 'analytics' });
		}
	}
</script>

<div class="space-y-6">
	<div>
		<h3 class="text-lg font-medium">Privacy & Analytics</h3>
		<p class="text-sm text-muted-foreground">
			Control how Whispering collects anonymous usage data to improve the application
		</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Anonymous Analytics</Card.Title>
			<Card.Description>
				Help improve Whispering by sharing anonymous usage patterns
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<div class="flex items-center justify-between space-x-4">
				<div class="flex-1 space-y-1">
					<Label for="analytics-toggle" class="text-base">
						Enable Anonymous Analytics
					</Label>
					<p class="text-sm text-muted-foreground">
						Share anonymous usage data to help improve Whispering. No personal information or
						transcription content is ever collected.
					</p>
				</div>
				<Switch
					id="analytics-toggle"
					checked={settings.value['analytics.enabled']}
					onCheckedChange={handleAnalyticsToggle}
				/>
			</div>

			<div class="rounded-lg border bg-muted/50 p-4">
				<h4 class="mb-2 font-medium">What we collect:</h4>
				<ul class="space-y-1 text-sm text-muted-foreground">
					<li>• Application lifecycle events (start, stop)</li>
					<li>• Feature usage patterns (recordings, transcriptions)</li>
					<li>• Error information (title and description only, no stack traces)</li>
					<li>• Performance metrics (actual durations in milliseconds)</li>
					<li>• Settings changes (which section was modified)</li>
				</ul>
			</div>

			<div class="rounded-lg border bg-muted/50 p-4">
				<h4 class="mb-2 font-medium">What we NEVER collect:</h4>
				<ul class="space-y-1 text-sm text-muted-foreground">
					<li>• Your transcriptions or any text content</li>
					<li>• Personal identifiers or device IDs</li>
					<li>• API keys or credentials</li>
					<li>• File paths or names</li>
					<li>• IP addresses or location data</li>
				</ul>
			</div>

			<div class="rounded-lg border bg-background p-4">
				<p class="text-sm">
					<strong>Privacy First:</strong> Whispering uses{' '}
					<a
						href="https://aptabase.com"
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary underline-offset-4 hover:underline"
					>
						Aptabase
					</a>, an open-source, privacy-first analytics platform. All data is truly anonymous and
					cannot be linked back to you. This helps us understand which features are used most and
					where to focus improvements.
				</p>
			</div>

			<div class="flex items-center space-x-2">
				<Button
					variant="outline"
					size="sm"
					onclick={() => window.open('https://github.com/epicenter-so/epicenter/blob/main/PRIVACY.md', '_blank')}
				>
					View Privacy Policy
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => window.open('https://aptabase.com/privacy', '_blank')}
				>
					Aptabase Privacy
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title>Data Transparency</Card.Title>
			<Card.Description>
				Complete transparency about analytics collection
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="text-sm text-muted-foreground">
				<p class="mb-2">Analytics Status:</p>
				<p class="font-mono text-xs">
					{#if settings.value['analytics.enabled']}
						<span class="text-green-600 dark:text-green-400">● ENABLED</span> - Anonymous events are
						being collected
					{:else}
						<span class="text-yellow-600 dark:text-yellow-400">● DISABLED</span> - No data is being
						collected
					{/if}
				</p>
			</div>

			<div class="rounded-lg border bg-muted/30 p-3">
				<p class="text-xs text-muted-foreground">
					<strong>Note:</strong> Changes to analytics settings take effect immediately. If you disable
					analytics, no further data will be collected. Previously collected anonymous data cannot
					be deleted as it's not associated with you in any way.
				</p>
			</div>
		</Card.Content>
	</Card.Root>
</div>