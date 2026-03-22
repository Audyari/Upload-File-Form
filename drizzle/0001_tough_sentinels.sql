PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_entities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`file_id` text,
	`created_at` text DEFAULT '2026-03-22T08:56:52.933Z'
);
--> statement-breakpoint
INSERT INTO `__new_entities`("id", "name", "description", "file_id", "created_at") SELECT "id", "name", "description", "file_id", "created_at" FROM `entities`;--> statement-breakpoint
DROP TABLE `entities`;--> statement-breakpoint
ALTER TABLE `__new_entities` RENAME TO `entities`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_temporary_uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file_id` text NOT NULL,
	`file_name` text NOT NULL,
	`file_path` text NOT NULL,
	`file_size` integer NOT NULL,
	`mime_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT '2026-03-22T08:56:52.931Z'
);
--> statement-breakpoint
INSERT INTO `__new_temporary_uploads`("id", "file_id", "file_name", "file_path", "file_size", "mime_type", "status", "created_at") SELECT "id", "file_id", "file_name", "file_path", "file_size", "mime_type", "status", "created_at" FROM `temporary_uploads`;--> statement-breakpoint
DROP TABLE `temporary_uploads`;--> statement-breakpoint
ALTER TABLE `__new_temporary_uploads` RENAME TO `temporary_uploads`;--> statement-breakpoint
CREATE UNIQUE INDEX `temporary_uploads_file_id_unique` ON `temporary_uploads` (`file_id`);