-- Phase16: Auto Learning runs
CREATE TABLE "ai_learning_runs" (
    "id" UUID NOT NULL,
    "run_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trigger_source" VARCHAR(20) NOT NULL,
    "mode" VARCHAR(20) NOT NULL,
    "race_count" INTEGER NOT NULL,
    "trial_count" INTEGER,
    "baseline_accuracy" JSONB NOT NULL,
    "optimized_accuracy" JSONB NOT NULL,
    "improvement" DECIMAL(8,4) NOT NULL,
    "selected_profile" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "message" VARCHAR(500),
    "overfit_flagged" BOOLEAN NOT NULL DEFAULT false,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_learning_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_learning_runs_run_at_idx" ON "ai_learning_runs"("run_at" DESC);
CREATE INDEX "ai_learning_runs_status_idx" ON "ai_learning_runs"("status");
