CREATE TABLE `games` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gameId` varchar(128) NOT NULL,
	`sportKey` varchar(128) NOT NULL,
	`league` varchar(255) NOT NULL,
	`homeTeam` varchar(255) NOT NULL,
	`awayTeam` varchar(255) NOT NULL,
	`commenceTime` timestamp NOT NULL,
	`homeOdd` decimal(10,2) NOT NULL,
	`drawOdd` decimal(10,2) NOT NULL,
	`awayOdd` decimal(10,2) NOT NULL,
	`status` enum('waiting','green','red') NOT NULL DEFAULT 'waiting',
	`scoreHome` int,
	`scoreAway` int,
	`analyzedAt` timestamp NOT NULL DEFAULT (now()),
	`resultUpdatedAt` timestamp,
	`completed` boolean NOT NULL DEFAULT false,
	CONSTRAINT `games_id` PRIMARY KEY(`id`),
	CONSTRAINT `games_gameId_unique` UNIQUE(`gameId`)
);
--> statement-breakpoint
CREATE TABLE `statistics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` timestamp NOT NULL,
	`totalGreens` int NOT NULL DEFAULT 0,
	`totalReds` int NOT NULL DEFAULT 0,
	`totalGames` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `statistics_id` PRIMARY KEY(`id`)
);
