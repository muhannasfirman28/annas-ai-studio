-- Retry aman untuk step yang timeout karena cold start model / Fly trial.
ALTER TABLE "crew_run_steps" ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;
