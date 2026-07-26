CREATE TABLE `admin_login_attempts` (
	`bucket_key` text PRIMARY KEY NOT NULL,
	`failed_count` integer DEFAULT 0 NOT NULL,
	`window_started_at` integer NOT NULL,
	`locked_until` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	CONSTRAINT "admin_login_attempts_failed_count_check" CHECK("admin_login_attempts"."failed_count" >= 0)
);
--> statement-breakpoint
CREATE INDEX `admin_login_attempts_updated_idx` ON `admin_login_attempts` (`updated_at`);