CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(100) NOT NULL,
	`lastName` varchar(100) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(30),
	`state` varchar(50) NOT NULL,
	`practiceArea` enum('Property Damage','Personal Injury','Immigration','Not sure yet') NOT NULL DEFAULT 'Not sure yet',
	`inquiryType` enum('general','understand','strategy','representation') NOT NULL DEFAULT 'general',
	`description` text NOT NULL,
	`newsletterOptIn` boolean NOT NULL DEFAULT false,
	`status` enum('New','Contacted','Strategy Call Booked','Active Client','Closed') NOT NULL DEFAULT 'New',
	`source` varchar(50) NOT NULL DEFAULT 'website',
	`airtableRecordId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
