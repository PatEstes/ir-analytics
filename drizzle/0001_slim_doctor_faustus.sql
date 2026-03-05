CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`fileName` varchar(255) NOT NULL,
	`semester` varchar(64),
	`academicYear` varchar(20),
	`totalResponses` int NOT NULL DEFAULT 0,
	`cleanedComments` int NOT NULL DEFAULT 0,
	`topicCount` int NOT NULL DEFAULT 0,
	`noiseRatio` varchar(10),
	`processingTime` varchar(20),
	`resultsJson` json,
	`institutions` json,
	`programLevels` json,
	`schools` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `analysis_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`responseId` varchar(128),
	`commentText` text NOT NULL,
	`topic` varchar(255),
	`sentimentLabel` varchar(20),
	`sentimentScore` varchar(20),
	`institution` varchar(255),
	`programLevel` varchar(128),
	`school` varchar(255),
	`surveyDate` varchar(64),
	`isRepresentative` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analysis_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `share_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`analysisId` int NOT NULL,
	`createdByUserId` int NOT NULL,
	`shareToken` varchar(64) NOT NULL,
	`label` varchar(255),
	`isActive` int NOT NULL DEFAULT 1,
	`expiresAt` bigint,
	`accessCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `share_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `share_links_shareToken_unique` UNIQUE(`shareToken`)
);
