CREATE TABLE "votes" (
	"voter_id" text PRIMARY KEY,
	"choice" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "valid_choice" CHECK ("choice" in ('mountains', 'ocean'))
);
