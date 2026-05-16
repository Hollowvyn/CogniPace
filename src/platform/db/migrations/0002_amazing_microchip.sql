CREATE TABLE `problem_companies` (
	`problem_slug` text NOT NULL,
	`company_id` text NOT NULL,
	PRIMARY KEY(`problem_slug`, `company_id`),
	FOREIGN KEY (`problem_slug`) REFERENCES `problems`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `problem_topics` (
	`problem_slug` text NOT NULL,
	`topic_id` text NOT NULL,
	PRIMARY KEY(`problem_slug`, `topic_id`),
	FOREIGN KEY (`problem_slug`) REFERENCES `problems`(`slug`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON UPDATE no action ON DELETE cascade
);
