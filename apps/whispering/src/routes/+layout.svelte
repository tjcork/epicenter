<script lang="ts">
	import { onNavigate } from '$app/navigation';
	import { queryClient } from '$lib/query/_client';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { SvelteQueryDevtools } from '@tanstack/svelte-query-devtools';
	import { ModeWatcher } from 'mode-watcher';
	import '@repo/ui/app.css';

	let { children } = $props();

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	<title>Whispering</title>
</svelte:head>

<QueryClientProvider client={queryClient}>
	{@render children()}
</QueryClientProvider>

<ModeWatcher />
<SvelteQueryDevtools client={queryClient} buttonPosition="bottom-left" />

<style>
	/* Override inspector button to bottom-center positioning */
	:global(#svelte-inspector-host button) {
		bottom: 16px !important;
		left: 50% !important;
		transform: translateX(-50%) !important;
		right: auto !important;
	}
</style>
