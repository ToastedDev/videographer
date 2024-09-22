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

async function fetchVideos(env: Env) {
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
					const channelUrl = video.snippet.channelId;

					await db
						.prepare(
							'INSERT INTO videos (id, title, is_live, views, published_at, channel_name, channel_url) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET title = ?, views = ?',
						)
						.bind(videoId, title, isLive, views, publishedAt, channelName, channelUrl, title, views)
						.run();
				}
			}
		}
	}
}

export default {
	async fetch(request, env) {
		// TODO: protect this endpoint
		const url = new URL(request.url);
		if (url.pathname === '/fetch-videos' && request.method === 'POST') {
			await fetchVideos(env);
			return new Response('OK');
		}
		return new Response('Hello World!');
	},
	async scheduled(_, env) {
		await fetchVideos(env);
	},
} satisfies ExportedHandler<Env>;
