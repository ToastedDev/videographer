DROP TABLE IF EXISTS videos;

CREATE TABLE videos (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	url TEXT,
	channel_name TEXT NOT NULL,

	-- don't know if we should have this, maybe remove it in the future
	channel_url TEXT NOT NULL
);
