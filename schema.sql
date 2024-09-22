DROP TABLE IF EXISTS videos;

CREATE TABLE videos (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	url TEXT,
	is_live BOOLEAN NOT NULL,
	views INTEGER NOT NULL DEFAULT 0,
	published_at INTEGER NOT NULL,

	channel_name TEXT NOT NULL,
	-- don't know if we should have this, maybe remove it in the future
	channel_url TEXT NOT NULL
);
