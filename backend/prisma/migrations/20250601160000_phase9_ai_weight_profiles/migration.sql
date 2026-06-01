-- Phase9: AI重みプロファイル
CREATE TABLE "ai_weight_profiles" (
    "id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "weight_st" DECIMAL(6,4) NOT NULL,
    "weight_exhibition" DECIMAL(6,4) NOT NULL,
    "weight_lane" DECIMAL(6,4) NOT NULL,
    "weight_motor" DECIMAL(6,4) NOT NULL,
    "weight_course" DECIMAL(6,4) NOT NULL,
    "weight_last_minute" DECIMAL(6,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ai_weight_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_weight_profiles_name_key" ON "ai_weight_profiles"("name");

INSERT INTO "ai_weight_profiles" (
    "id",
    "name",
    "label",
    "is_active",
    "weight_st",
    "weight_exhibition",
    "weight_lane",
    "weight_motor",
    "weight_course",
    "weight_last_minute",
    "updated_at"
) VALUES (
    gen_random_uuid(),
    'default',
    '既定プロファイル',
    true,
    0.2000,
    0.2500,
    0.1500,
    0.2000,
    0.1000,
    0.1000,
    CURRENT_TIMESTAMP
);
