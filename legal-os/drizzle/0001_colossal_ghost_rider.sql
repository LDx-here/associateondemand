CREATE TABLE `agent_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matterId` int NOT NULL,
	`agentId` int NOT NULL,
	`taskType` varchar(100) NOT NULL,
	`status` enum('pending','in_progress','completed','failed') NOT NULL DEFAULT 'pending',
	`input` json,
	`output` json,
	`llmModel` enum('claude','gpt'),
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agent_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`type` enum('intake','conflict','research','drafting','discovery','calendar','communication','review') NOT NULL,
	`description` text,
	`llmModel` enum('claude','gpt') DEFAULT 'claude',
	`isActive` boolean DEFAULT true,
	`config` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clio_tokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accessToken` text NOT NULL,
	`refreshToken` text NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`scope` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clio_tokens_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clio_webhook_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(100) NOT NULL,
	`resourceType` varchar(100) NOT NULL,
	`resourceId` varchar(100) NOT NULL,
	`payload` json,
	`processedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clio_webhook_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conflict_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matterId` int,
	`leadId` int,
	`opposingParty` varchar(500) NOT NULL,
	`opposingCounsel` varchar(500),
	`result` enum('clear','review_required','conflict_found') NOT NULL,
	`details` text,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `conflict_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matterId` int NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`documentType` varchar(100),
	`version` int NOT NULL DEFAULT 1,
	`uploadedBy` varchar(100),
	`clioDocumentId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `firm_memory_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firmId` int NOT NULL,
	`writingTone` varchar(100),
	`citationStyle` varchar(100),
	`formattingPreferences` json,
	`captionFormat` text,
	`preferredArguments` json,
	`additionalNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `firm_memory_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `firm_memory_samples` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firmId` int NOT NULL,
	`profileId` int NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileUrl` varchar(1000) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`documentType` varchar(100),
	`analysisResult` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `firm_memory_samples_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `firms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contactName` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`practiceArea` varchar(100),
	`firmSize` varchar(50),
	`referralSource` varchar(100),
	`engagementType` varchar(100),
	`outsourcingVolume` varchar(50),
	`firmMemoryEnabled` boolean DEFAULT false,
	`clioClientId` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `firms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firmName` varchar(255) NOT NULL,
	`attorneyName` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`intakePath` enum('quick_upload','guided_request'),
	`status` enum('new','in_progress','abandoned','converted') NOT NULL DEFAULT 'new',
	`lastStepCompleted` varchar(100),
	`referringPage` varchar(500),
	`sessionData` json,
	`followUpSent` boolean DEFAULT false,
	`convertedToMatterId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `llm_task_configs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`taskType` varchar(100) NOT NULL,
	`preferredModel` enum('claude','gpt') NOT NULL DEFAULT 'claude',
	`systemPrompt` text,
	`temperature` decimal(3,2) DEFAULT '0.70',
	`maxTokens` int DEFAULT 4096,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `llm_task_configs_id` PRIMARY KEY(`id`),
	CONSTRAINT `llm_task_configs_taskType_unique` UNIQUE(`taskType`)
);
--> statement-breakpoint
CREATE TABLE `matters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firmId` int,
	`leadId` int,
	`title` varchar(500) NOT NULL,
	`matterType` enum('employment','pi','immigration') NOT NULL,
	`stage` enum('intake','conflict_check','quote','engagement','drafting','review','delivery','closed') NOT NULL DEFAULT 'intake',
	`status` varchar(100) NOT NULL DEFAULT 'pending',
	`nextAction` varchar(500),
	`assignedAgentId` int,
	`deadline` timestamp,
	`urgency` enum('24h','48h','this_week','flexible') NOT NULL DEFAULT 'flexible',
	`jurisdiction` varchar(200),
	`opposingParty` varchar(500),
	`opposingCounsel` varchar(500),
	`caption` varchar(500),
	`description` text,
	`serviceType` varchar(200),
	`complexity` enum('low','medium','high') DEFAULT 'medium',
	`estimatedPages` int,
	`totalFee` decimal(10,2),
	`paymentStatus` enum('pending','paid','refunded') DEFAULT 'pending',
	`stripePaymentId` varchar(255),
	`clioMatterId` varchar(100),
	`conflictStatus` enum('clear','review_required','conflict_found','pending') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`closedAt` timestamp,
	CONSTRAINT `matters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`category` varchar(100),
	`baseFee` decimal(10,2) NOT NULL,
	`rushMultiplier24h` decimal(4,2) DEFAULT '2.00',
	`rushMultiplier48h` decimal(4,2) DEFAULT '1.50',
	`rushMultiplierWeek` decimal(4,2) DEFAULT '1.25',
	`sampleDiscount` decimal(4,2) DEFAULT '0.10',
	`standardTurnaround` varchar(100),
	`deliverables` text,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
