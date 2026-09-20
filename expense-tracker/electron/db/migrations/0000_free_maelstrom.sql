CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`type` text NOT NULL,
	`amount` integer NOT NULL,
	`category` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`date` text NOT NULL
);
