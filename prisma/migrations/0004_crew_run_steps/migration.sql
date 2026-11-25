-- Audit trail eksekusi subagent OpenCode per karyawan.
CREATE TABLE IF NOT EXISTS "crew_run_steps" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "stepKey" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "sessionId" TEXT,
  "parentId" TEXT,
  "model" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "note" TEXT,
  "error" TEXT,
  "files" JSONB,
  "durationMs" INTEGER,
  "startedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "finishedAt" TIMESTAMPTZ,
  CONSTRAINT "crew_run_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "crew_run_steps_runId_stepKey_key" ON "crew_run_steps" ("runId", "stepKey");
CREATE INDEX IF NOT EXISTS "crew_run_steps_runId_idx" ON "crew_run_steps" ("runId");

DO $$
BEGIN
  ALTER TABLE "crew_run_steps" ADD CONSTRAINT "crew_run_steps_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "crew_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
