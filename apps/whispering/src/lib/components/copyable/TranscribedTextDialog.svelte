<script lang="ts">
	import TextPreviewDialog from '$lib/components/copyable/TextPreviewDialog.svelte';
	import { getRecordingTransitionId } from '$lib/utils/getRecordingTransitionId';

	let {
		recordingId,
		transcribedText,
		rows = 2,
	}: {
		recordingId: string;
		transcribedText: string;
		rows?: number;
	} = $props();

	const id = getRecordingTransitionId({
		recordingId,
		propertyName: 'transcribedText',
	});
</script>

<TextPreviewDialog
	{id}
	title="Transcribed Text"
	label="transcribed text"
	text={transcribedText}
	{rows}
/>
