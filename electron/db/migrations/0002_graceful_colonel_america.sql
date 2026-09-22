CREATE TABLE `members` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`archived` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE `transactions` ADD `member_id` integer REFERENCES members(id);