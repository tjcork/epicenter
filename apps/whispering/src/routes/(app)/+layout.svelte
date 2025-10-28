<script lang="ts">
	import { rpc } from '$lib/query';
	import * as services from '$lib/services';
	import AppLayout from './_components/AppLayout.svelte';

	let { children } = $props();

	$effect(() => {
		const unlisten = services.localShortcutManager.listen();
		return () => unlisten();
	});

	// Log app started event once on mount
	$effect(() => {
		rpc.analytics.logEvent.execute({ type: 'app_started' });
	});
</script>

<AppLayout>
	{@render children()}
</AppLayout>
