-- Phase17: 8因子スコア + 選手統計 + 級キャリブレーション

ALTER TABLE "race_entries"
  ADD COLUMN IF NOT EXISTS "racer_stats" JSONB;

ALTER TABLE "ai_weight_profiles"
  ADD COLUMN IF NOT EXISTS "weight_rank" DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS "weight_racer" DECIMAL(6,4),
  ADD COLUMN IF NOT EXISTS "calibration_json" JSONB;
