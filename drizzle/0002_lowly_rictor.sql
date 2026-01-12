CREATE TABLE "collection_audit_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"coll_id" varchar(255),
	"date_folder" varchar(50),
	"score" integer,
	"deductions" text,
	"txt_filename" varchar(255),
	"processed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tenants" ALTER COLUMN "features" SET DEFAULT '{"ppt":true,"ocr":true,"tianyancha":true,"qualityCheck":true}'::jsonb;