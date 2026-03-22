CREATE TABLE `entities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`file_id` text,
	`created_at` text DEFAULT '(CURRENT_TIMESTAMP)'
);
--> statement-breakpoint
CREATE TABLE `temporary_uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT '(CURRENT_TIMESTAMP)'
);
--> statement-breakpoint
CREATE UNIQUE INDEX `temporary_uploads_file_id_unique` ON `temporary_uploads` (`file_id`);