CREATE TABLE `attempt_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`problem_slug` text NOT NULL,
	`reviewed_at` text NOT NULL,
	`rating` integer NOT NULL,
	`solve_time_ms` integer,
	`mode` text NOT NULL,
	`log_snapshot` text,
	FOREIGN KEY (`problem_slug`) REFERENCES `study_states`(`problem_slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_attempt_history_slug_reviewed_at` ON `attempt_history` (`problem_slug`,`reviewed_at`);--> statement-breakpoint
CREATE TABLE `companies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `problems` (
	`slug` text PRIMARY KEY NOT NULL,
	`leetcode_id` text,
	`title` text DEFAULT 'Untitled' NOT NULL,
	`difficulty` text DEFAULT 'Unknown' NOT NULL,
	`is_premium` integer DEFAULT false NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`topic_ids` text NOT NULL,
	`company_ids` text NOT NULL,
	`user_edits` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_problems_difficulty` ON `problems` (`difficulty`);--> statement-breakpoint
CREATE INDEX `idx_problems_is_premium` ON `problems` (`is_premium`);--> statement-breakpoint
CREATE TABLE `settings_kv` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `study_states` (
	`problem_slug` text PRIMARY KEY NOT NULL,
	`suspended` integer DEFAULT false NOT NULL,
	`tags` text NOT NULL,
	`best_time_ms` integer,
	`last_solve_time_ms` integer,
	`last_rating` integer,
	`confidence` real,
	`fsrs_due` text,
	`fsrs_stability` real,
	`fsrs_difficulty` real,
	`fsrs_elapsed_days` real,
	`fsrs_scheduled_days` real,
	`fsrs_learning_steps` integer,
	`fsrs_reps` integer,
	`fsrs_lapses` integer,
	`fsrs_state` text,
	`fsrs_last_review` text,
	`interview_pattern` text,
	`time_complexity` text,
	`space_complexity` text,
	`languages` text,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`problem_slug`) REFERENCES `problems`(`slug`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_study_states_due` ON `study_states` (`fsrs_due`) WHERE "study_states"."suspended" = 0;--> statement-breakpoint
CREATE INDEX `idx_study_states_suspended` ON `study_states` (`suspended`);--> statement-breakpoint
CREATE TABLE `topics` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `track_group_problems` (
	`group_id` text NOT NULL,
	`problem_slug` text NOT NULL,
	`order_index` integer NOT NULL,
	PRIMARY KEY(`group_id`, `problem_slug`),
	FOREIGN KEY (`group_id`) REFERENCES `track_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`problem_slug`) REFERENCES `problems`(`slug`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_tgp_group_id_order` ON `track_group_problems` (`group_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `idx_tgp_problem_slug` ON `track_group_problems` (`problem_slug`);--> statement-breakpoint
CREATE TABLE `track_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text NOT NULL,
	`topic_id` text,
	`name` text,
	`description` text,
	`order_index` integer NOT NULL,
	FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_track_groups_track_id_order` ON `track_groups` (`track_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Untitled Track' NOT NULL,
	`description` text,
	`enabled` integer DEFAULT true NOT NULL,
	`is_curated` integer DEFAULT false NOT NULL,
	`order_index` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tracks_enabled` ON `tracks` (`enabled`);--> statement-breakpoint
CREATE INDEX `idx_tracks_order_index` ON `tracks` (`order_index`);