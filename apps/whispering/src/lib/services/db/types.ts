import { createTaggedError } from 'wellcrafted/error';
import type { Result } from 'wellcrafted/result';
import type { Settings } from '$lib/settings';
import type {
	Recording,
	Transformation,
	TransformationRun,
	TransformationRunCompleted,
	TransformationRunFailed,
	TransformationStepRun,
} from './models';

export const { DbServiceError, DbServiceErr } =
	createTaggedError('DbServiceError');
export type DbServiceError = ReturnType<typeof DbServiceError>;

export type DbService = {
	recordings: {
		getAll(): Promise<Result<Recording[], DbServiceError>>;
		getLatest(): Promise<Result<Recording | null, DbServiceError>>;
		getTranscribingIds(): Promise<Result<string[], DbServiceError>>;
		getById(id: string): Promise<Result<Recording | null, DbServiceError>>;
		create(recording: Recording): Promise<Result<Recording, DbServiceError>>;
		update(recording: Recording): Promise<Result<Recording, DbServiceError>>;
		delete(
			recordings: Recording | Recording[],
		): Promise<Result<void, DbServiceError>>;
		cleanupExpired(params: {
			recordingRetentionStrategy: Settings['database.recordingRetentionStrategy'];
			maxRecordingCount: Settings['database.maxRecordingCount'];
		}): Promise<Result<void, DbServiceError>>;
	};
	transformations: {
		getAll(): Promise<Result<Transformation[], DbServiceError>>;
		getById(id: string): Promise<Result<Transformation | null, DbServiceError>>;
		create(
			transformation: Transformation,
		): Promise<Result<Transformation, DbServiceError>>;
		update(
			transformation: Transformation,
		): Promise<Result<Transformation, DbServiceError>>;
		delete(
			transformations: Transformation | Transformation[],
		): Promise<Result<void, DbServiceError>>;
	};
	runs: {
		getById(
			id: string,
		): Promise<Result<TransformationRun | null, DbServiceError>>;
		getByTransformationId(
			transformationId: string,
		): Promise<Result<TransformationRun[], DbServiceError>>;
		getByRecordingId(
			recordingId: string,
		): Promise<Result<TransformationRun[], DbServiceError>>;
		create(params: {
			transformationId: string;
			recordingId: string | null;
			input: string;
		}): Promise<Result<TransformationRun, DbServiceError>>;
		addStep(
			run: TransformationRun,
			step: {
				id: string;
				input: string;
			},
		): Promise<Result<TransformationStepRun, DbServiceError>>;
		failStep(
			run: TransformationRun,
			stepRunId: string,
			error: string,
		): Promise<Result<TransformationRunFailed, DbServiceError>>;
		completeStep(
			run: TransformationRun,
			stepRunId: string,
			output: string,
		): Promise<Result<TransformationRun, DbServiceError>>;
		complete(
			run: TransformationRun,
			output: string,
		): Promise<Result<TransformationRunCompleted, DbServiceError>>;
	};
};
