CREATE TABLE `analysisHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisDate` timestamp NOT NULL,
	`totalAnalyzed` int NOT NULL DEFAULT 0,
	`totalApproved` int NOT NULL DEFAULT 0,
	`logs` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysisHistory_id` PRIMARY KEY(`id`)
);
