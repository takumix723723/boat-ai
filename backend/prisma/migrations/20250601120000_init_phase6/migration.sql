-- CreateTable
CREATE TABLE "racers" (
    "id" VARCHAR(10) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "rank" VARCHAR(10),
    "branch" VARCHAR(50),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "racers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "races" (
    "id" UUID NOT NULL,
    "external_id" VARCHAR(32) NOT NULL,
    "race_date" DATE NOT NULL,
    "venue_code" VARCHAR(2) NOT NULL,
    "venue_name" VARCHAR(50) NOT NULL,
    "race_no" INTEGER NOT NULL,
    "grade" VARCHAR(100),
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "races_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_entries" (
    "id" UUID NOT NULL,
    "race_id" UUID NOT NULL,
    "lane" INTEGER NOT NULL,
    "racer_id" VARCHAR(10) NOT NULL,
    "motor" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "race_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "race_snapshots" (
    "id" UUID NOT NULL,
    "race_id" UUID NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" VARCHAR(20),
    "start_time" VARCHAR(10),
    "last_minute" JSONB,
    "data_source" VARCHAR(20),
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "race_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_scores" (
    "id" UUID NOT NULL,
    "snapshot_id" UUID NOT NULL,
    "race_entry_id" UUID NOT NULL,
    "total" INTEGER NOT NULL,
    "previous_total" INTEGER,
    "breakdown" JSONB,
    "score_delta" JSONB,
    "st" DECIMAL(5,3),
    "exhibition_time" DECIMAL(5,3),
    "tilt" DECIMAL(4,2),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "races_external_id_key" ON "races"("external_id");

-- CreateIndex
CREATE INDEX "races_race_date_idx" ON "races"("race_date");

-- CreateIndex
CREATE UNIQUE INDEX "races_race_date_venue_code_race_no_key" ON "races"("race_date", "venue_code", "race_no");

-- CreateIndex
CREATE INDEX "race_entries_racer_id_idx" ON "race_entries"("racer_id");

-- CreateIndex
CREATE UNIQUE INDEX "race_entries_race_id_lane_key" ON "race_entries"("race_id", "lane");

-- CreateIndex
CREATE INDEX "race_snapshots_race_id_captured_at_idx" ON "race_snapshots"("race_id", "captured_at");

-- CreateIndex
CREATE UNIQUE INDEX "race_snapshots_race_id_sequence_key" ON "race_snapshots"("race_id", "sequence");

-- CreateIndex
CREATE INDEX "ai_scores_race_entry_id_idx" ON "ai_scores"("race_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_scores_snapshot_id_race_entry_id_key" ON "ai_scores"("snapshot_id", "race_entry_id");

-- AddForeignKey
ALTER TABLE "race_entries" ADD CONSTRAINT "race_entries_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_entries" ADD CONSTRAINT "race_entries_racer_id_fkey" FOREIGN KEY ("racer_id") REFERENCES "racers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "race_snapshots" ADD CONSTRAINT "race_snapshots_race_id_fkey" FOREIGN KEY ("race_id") REFERENCES "races"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_scores" ADD CONSTRAINT "ai_scores_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "race_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_scores" ADD CONSTRAINT "ai_scores_race_entry_id_fkey" FOREIGN KEY ("race_entry_id") REFERENCES "race_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
