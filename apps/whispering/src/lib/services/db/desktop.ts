import type { DownloadService } from '$lib/services/download';
import type { DbService } from './types';
import { createDbServiceWeb } from './web';

export function createDbServiceDesktop({
	DownloadService,
}: {
	DownloadService: DownloadService;
}): DbService {
	// Phase 1: Use web implementation (IndexedDB)
	// Phase 2: Will implement file system storage
	return createDbServiceWeb({ DownloadService });
}
