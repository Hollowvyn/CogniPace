CREATE TABLE `track_session` (
	`singleton` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`active_track_id` text,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`active_track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE set null
);
