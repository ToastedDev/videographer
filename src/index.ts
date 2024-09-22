/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const channels = ['UCwOfBvSQvmCEco7GpbxFBlw', 'UCkaQHnnaXDmdu-OhaCeJUGA'];

interface Video {
	id: string;
	title: string;
	url?: string;
	is_live: number;
	is_spotlight: number;
	views: number;
	published_at: number;
	channel_name: string;
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);
		if (url.pathname === '/videos') {
			const { DB: db } = env;
			const channel = url.searchParams.get('channel');
			if (channel) {
				const result = await db.prepare('SELECT * FROM videos WHERE channel_name LIKE ?').bind(`%${channel}%`).all<Video>();
				return Response.json({
					videos: result.results
						.sort((a, b) => b.published_at - a.published_at)
						.map((video) => {
							video.is_live = !!video.is_live as any;
							video.is_spotlight = !!video.is_spotlight as any;
							return video;
						}),
				});
			} else {
				const result = await db.prepare('SELECT * FROM videos').all<Video>();
				return Response.json({
					videos: result.results
						.sort((a, b) => b.published_at - a.published_at)
						.map((video) => {
							video.is_live = !!video.is_live as any;
							video.is_spotlight = !!video.is_spotlight as any;
							return video;
						}),
				});
			}
		}
		return new Response(null, { status: 404 });
	},
	async scheduled(_, env) {
		const { DB: db } = env;
		for (const channel of channels) {
			const res = await fetch(
				`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${channel.replace('UC', 'UU')}&maxResults=20000&key=${env.YOUTUBE_API_KEY}`,
			);
			const data = await res.json<any>();

			let fetchedIds = [];
			let currentIndex = -1;

			for (const item of data.items) {
				currentIndex++;
				fetchedIds.push([item.snippet.resourceId.videoId, currentIndex]);
				if (currentIndex === data.items.length - 1 || fetchedIds.length >= 50) {
					const ids = fetchedIds;
					fetchedIds = [];
					const res = await fetch(
						`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,liveStreamingDetails&id=${ids.map((v) => v[0]).join(',')}&key=${env.YOUTUBE_API_KEY}`,
					);
					const data = await res.json<any>();
					for (const video of data.items) {
						const videoId = video.id;
						const title = video.snippet.title;
						const isLive = !!video.liveStreamingDetails;
						const views = parseInt(video.statistics.viewCount);
						const publishedAt = new Date(video.snippet.publishedAt).getTime();
						const channelName = video.snippet.channelTitle;

						await db
							.prepare(
								'INSERT INTO videos (id, title, is_live, views, published_at, channel_name) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET title = ?, views = ?',
							)
							.bind(videoId, title, isLive, views, publishedAt, channelName, title, views)
							.run();
					}
				}
			}
		}
	},
} satisfies ExportedHandler<Env>;
