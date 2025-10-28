<script lang="ts">
	import { Badge } from '@repo/ui/badge';
	import * as Command from '@repo/ui/command';
	import { rpc } from '$lib/query';
	import type { Transformation } from '$lib/services/db';
	import { createQuery } from '@tanstack/svelte-query';
	import { LayersIcon } from '@lucide/svelte';

	const transformationsQuery = createQuery(
		rpc.db.transformations.getAll.options,
	);

	const transformations = $derived(transformationsQuery.data ?? []);

	let {
		onSelect,
		onSelectManageTransformations,
		placeholder,
		class: className,
	}: {
		/**
		 * Called when a transformation is selected from the list.
		 * Receives the selected transformation object.
		 */
		onSelect: (transformation: Transformation) => void;
		/**
		 * Called when the "Manage transformations" option is selected.
		 * Parent components typically close themselves and navigate to /transformations.
		 */
		onSelectManageTransformations: () => void;
		/**
		 * Placeholder text shown in the search input field.
		 */
		placeholder: string;
		/**
		 * Optional class name to apply to the command root
		 */
		class?: string;
	} = $props();
</script>

{#snippet renderTransformationIdTitle(transformation: Transformation)}
	<div class="flex items-center gap-2">
		<Badge variant="id" class="shrink-0 max-w-16 truncate">
			{transformation.id}
		</Badge>
		<span class="font-medium truncate">
			{transformation.title}
		</span>
	</div>
{/snippet}

<Command.Root loop class={className}>
	<Command.Input {placeholder} class="h-11 border-0 border-b focus:ring-0 text-base" autofocus />
	<Command.Empty class="py-12 text-center">
		<div class="flex flex-col items-center gap-2">
			<LayersIcon class="size-8 text-muted-foreground/30" />
			<p class="text-sm text-muted-foreground">No transformations found.</p>
			<p class="text-xs text-muted-foreground/70">Try a different search term.</p>
		</div>
	</Command.Empty>
	<div class="relative">
		<Command.Group class="overflow-y-auto min-h-[180px] max-h-[360px] p-2">
		{#each transformations as transformation (transformation.id)}
			<Command.Item
				value="${transformation.id} - ${transformation.title} - ${transformation.description}"
				onSelect={() => onSelect(transformation)}
				class="flex items-center gap-3 p-3 rounded-md cursor-pointer"
			>
				<div class="flex flex-col min-w-0 gap-0.5">
					{@render renderTransformationIdTitle(transformation)}
					{#if transformation.description}
						<span class="text-xs text-muted-foreground/70 line-clamp-1">
							{transformation.description}
						</span>
					{/if}
				</div>
			</Command.Item>
		{/each}
		</Command.Group>
		<!-- Scroll fade indicator -->
		<div class="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
	</div>
	<Command.Separator />
	<Command.Item
		value="Manage transformations"
		onSelect={onSelectManageTransformations}
		class="rounded-none border-0 p-3 bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"
	>
		<LayersIcon class="size-4 mr-2.5" />
		Manage transformations
	</Command.Item>
</Command.Root>
