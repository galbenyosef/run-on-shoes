CREATE TABLE `leaderboard_rates` (
	`bucket` text PRIMARY KEY NOT NULL,
	`requests` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_rates_expiration` ON `leaderboard_rates` (`expires_at`);--> statement-breakpoint
CREATE TABLE `leaderboard_runs` (
	`run_id` text PRIMARY KEY NOT NULL,
	`player_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`submitted_at` text,
	`username` text,
	`time_ms` integer,
	`dodged` integer,
	`distance_mm` integer,
	`ratio` integer
);
--> statement-breakpoint
CREATE INDEX `idx_runs_started` ON `leaderboard_runs` (`started_at`);--> statement-breakpoint
CREATE TABLE `leaderboard_scores` (
	`player_id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`username` text NOT NULL,
	`time_ms` integer NOT NULL,
	`dodged` integer NOT NULL,
	`distance_mm` integer NOT NULL,
	`ratio` integer NOT NULL,
	`submitted_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scores_ranking` ON `leaderboard_scores` (`time_ms`,`dodged`,`distance_mm`);