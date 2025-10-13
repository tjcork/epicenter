import * as services from '$lib/services';
import type { Accessor } from '@tanstack/svelte-query';
import { defineQuery } from './_client';

// Define the query key as a constant array
export const transformationRunKeys = {
	all: ['transformationRuns'] as const,
	runsByTransformationId: (id: string) =>
		['transformationRuns', 'transformationId', id] as const,
	runsByRecordingId: (recordingId: string) =>
		['transformationRuns', 'recordingId', recordingId] as const,
};

export const transformationRuns = {
	getTransformationRunsByTransformationId: (id: Accessor<string>) =>
		defineQuery({
			queryKey: transformationRunKeys.runsByTransformationId(id()),
			resultQueryFn: () =>
				services.db.runs.getByTransformationId(id()),
		}),
	getTransformationRunsByRecordingId: (recordingId: Accessor<string>) =>
		defineQuery({
			queryKey: transformationRunKeys.runsByRecordingId(recordingId()),
			resultQueryFn: () =>
				services.db.runs.getByRecordingId(recordingId()),
		}),
	getLatestTransformationRunByRecordingId: (recordingId: Accessor<string>) =>
		defineQuery({
			queryKey: transformationRunKeys.runsByRecordingId(recordingId()),
			resultQueryFn: () =>
				services.db.runs.getByRecordingId(recordingId()),
			select: (data) => data.at(0),
		}),
};
