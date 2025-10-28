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

<Command.Root loop>
	<Command.Input {placeholder} />
	<Command.Empty>No transformation found.</Command.Empty>
	<Command.Group class="overflow-y-auto max-h-[400px]">
		{#each transformations as transformation (transformation.id)}
			<Command.Item
				value="${transformation.id} - ${transformation.title} - ${transformation.description}"
				onSelect={() => onSelect(transformation)}
				class="flex items-center gap-2 p-2"
			>
				<div class="flex flex-col min-w-0">
					{@render renderTransformationIdTitle(transformation)}
					{#if transformation.description}
						<span class="text-sm text-muted-foreground line-clamp-2">
							{transformation.description}
						</span>
					{/if}
				</div>
			</Command.Item>
		{/each}
	</Command.Group>
	<Command.Item
		value="Manage transformations"
		onSelect={onSelectManageTransformations}
		class="rounded-none p-2 bg-muted/50 text-muted-foreground"
	>
		<LayersIcon class="size-4 mx-2.5" />
		Manage transformations
	</Command.Item>
</Command.Root>
