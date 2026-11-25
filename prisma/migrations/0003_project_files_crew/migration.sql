-- File kode yang ditulis karyawan AI + paket aksi crew yang disetujui sekali.
DO $$ BEGIN
  CREATE TYPE "CrewRunStatus" AS ENUM ('PLANNED', 'APPROVED', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "CrewActionStatus" AS ENUM ('PENDING', 'DONE', 'ERROR', 'SKIPPED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "project_files" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "path" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "authorEmployeeId" TEXT,
  "authorUserId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "project_files_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "project_files_projectId_path_key" ON "project_files" ("projectId", "path");
CREATE INDEX IF NOT EXISTS "project_files_projectId_idx" ON "project_files" ("projectId");

CREATE TABLE IF NOT EXISTS "crew_runs" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "brief" TEXT NOT NULL,
  "status" "CrewRunStatus" NOT NULL DEFAULT 'PLANNED',
  "plan" JSONB NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "createdById" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMPTZ,
  "startedAt" TIMESTAMPTZ,
  "finishedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "crew_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "crew_runs_projectId_createdAt_idx" ON "crew_runs" ("projectId", "createdAt");

CREATE TABLE IF NOT EXISTS "crew_run_actions" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "seq" INTEGER NOT NULL,
  "kind" TEXT NOT NULL,
  "tool" TEXT NOT NULL,
  "target" TEXT NOT NULL DEFAULT '',
  "employeeId" TEXT,
  "payload" JSONB NOT NULL,
  "status" "CrewActionStatus" NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "result" JSONB,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "finishedAt" TIMESTAMPTZ,
  CONSTRAINT "crew_run_actions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "crew_run_actions_runId_seq_idx" ON "crew_run_actions" ("runId", "seq");

ALTER TABLE "project_files" ADD CONSTRAINT "project_files_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_authorEmployeeId_fkey" FOREIGN KEY ("authorEmployeeId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "crew_runs" ADD CONSTRAINT "crew_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crew_run_actions" ADD CONSTRAINT "crew_run_actions_runId_fkey" FOREIGN KEY ("runId") REFERENCES "crew_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crew_run_actions" ADD CONSTRAINT "crew_run_actions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
