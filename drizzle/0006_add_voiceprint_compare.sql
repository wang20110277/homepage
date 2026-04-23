-- Add voiceprintCompare feature to existing tenants and update default
ALTER TABLE "tenants" ALTER COLUMN "features" SET DEFAULT '{"ppt":true,"ocr":true,"tianyancha":true,"qualityCheck":true,"fileCompare":true,"zimage":true,"voiceprintCompare":true}'::jsonb;

-- Backfill existing tenants with the new feature flag
UPDATE "tenants" SET "features" = "features" || '{"voiceprintCompare": true}'::jsonb;
