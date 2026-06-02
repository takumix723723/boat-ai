-- Phase18: 買い目凍結・verdict・成績検証
CREATE TABLE "race_bet_advice" (
    "id" UUID NOT NULL,
    "race_id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "race_date" DATE NOT NULL,
    "venue_code" VARCHAR(2) NOT NULL,
    "venue_name" VARCHAR(50) NOT NULL,
    "race_no" INTEGER NOT NULL,
    "advice_generated_at" TIMESTAMPTZ(6) NOT NULL,
    "prediction_generated_at" TIMESTAMPTZ(6) NOT NULL,
    "odds_source" VARCHAR(20) NOT NULL DEFAULT 'estimated',
    "verdict" VARCHAR(10) NOT NULL,
    "bet_score" DECIMAL(6,2) NOT NULL,
    "skip_score" DECIMAL(6,2) NOT NULL,
    "factor_alignment_score" DECIMAL(6,2),
    "ev_honmei" DECIMAL(8,4),
    "has_edge" BOOLEAN NOT NULL DEFAULT false,
    "verdict_reasons" JSONB NOT NULL DEFAULT '[]',
    "stake_plan_json" JSONB NOT NULL,
    "honmei_lane" INTEGER NOT NULL,
    "honmei_mark" VARCHAR(4) NOT NULL DEFAULT '◎',
    "honmei_confidence_percent" INTEGER NOT NULL,
    "honmei_confidence_tier" VARCHAR(10) NOT NULL,
    "honmei_trifecta_combo" VARCHAR(20) NOT NULL,
    "honmei_estimated_odds" DECIMAL(8,2),
    "formation_json" JSONB NOT NULL,
    "box_json" JSONB NOT NULL,
    "ana_combo" VARCHAR(20),
    "ana_estimated_odds" DECIMAL(8,2),
    "prediction_payload" JSONB,
    "result_status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "result_settled_at" TIMESTAMPTZ(6),
    "result_combo" VARCHAR(20),
    "winner_lane" INTEGER,
    "hit_honmei_win" BOOLEAN,
    "hit_honmei_trifecta" BOOLEAN,
    "hit_formation" BOOLEAN,
    "hit_box" BOOLEAN,
    "hit_ana" BOOLEAN,
    "roi_status" VARCHAR(20) NOT NULL DEFAULT 'unsupported',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "race_bet_advice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "race_bet_advice_race_id_key" ON "race_bet_advice"("race_id");
CREATE INDEX "race_bet_advice_race_date_idx" ON "race_bet_advice"("race_date");
CREATE INDEX "race_bet_advice_verdict_idx" ON "race_bet_advice"("verdict");
CREATE INDEX "race_bet_advice_result_status_idx" ON "race_bet_advice"("result_status");

ALTER TABLE "race_bet_advice" ADD CONSTRAINT "race_bet_advice_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;
