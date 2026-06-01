-- Phase7: レース結果（公式着順）をレース・スナップショットに紐づけ
ALTER TABLE "races" ADD COLUMN "official_result" JSONB;

ALTER TABLE "race_snapshots" ADD COLUMN "official_result" JSONB;
