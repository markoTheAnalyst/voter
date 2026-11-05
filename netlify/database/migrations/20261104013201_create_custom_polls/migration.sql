CREATE TABLE "poll_votes" (
	"poll_id" text,
	"voter_id" text,
	"choice" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_votes_pkey" PRIMARY KEY("poll_id","voter_id"),
	CONSTRAINT "valid_poll_choice" CHECK ("choice" in ('mountains', 'ocean'))
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" text PRIMARY KEY,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id");