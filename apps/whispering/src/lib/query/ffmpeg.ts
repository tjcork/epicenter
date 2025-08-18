import { defineQuery } from './_client';
import * as services from '$lib/services';

export const ffmpeg = {
	checkFfmpegInstalled: defineQuery({
		queryKey: ['ffmpeg.checkInstalled'],
		resultQueryFn: () => services.ffmpeg.checkInstalled(),
	}),
};
