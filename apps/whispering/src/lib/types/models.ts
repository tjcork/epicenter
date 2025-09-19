/**
 * Configuration for a local AI model that can be downloaded and used for transcription.
 * Supports both direct file downloads and archives that need extraction.
 */
export type LocalModelConfig = {
	/** Unique identifier for the model */
	id: string;

	/** Display name for the model */
	name: string;

	/** Brief description of the model's capabilities */
	description: string;

	/** Human-readable file size (e.g., "850 MB", "1.5 GB") */
	size: string;

	/** Exact size in bytes for progress tracking */
	sizeBytes: number;

	/** URL to download the model from */
	url: string;

	/**
	 * Target filename or directory name after download/extraction.
	 * For direct downloads: the filename to save as
	 * For archives: the directory name after extraction
	 */
	filename: string;

	/**
	 * Whether the model is distributed as an archive that needs extraction.
	 * If true, the model will be downloaded as an archive and extracted.
	 * If false/undefined, the model is downloaded as a ready-to-use file.
	 */
	needsExtraction?: boolean;

	/**
	 * The archive filename if needsExtraction is true.
	 * Required when needsExtraction is true.
	 * Example: "parakeet-tdt-0.6b-v3-int8.tar.gz"
	 */
	archiveName?: string;
};