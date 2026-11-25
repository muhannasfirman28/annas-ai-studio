CREATE TYPE "UserRole" AS ENUM ('FOUNDER', 'EXECUTIVE', 'MANAGER', 'EMPLOYEE');

CREATE TYPE "Availability" AS ENUM ('AVAILABLE', 'BUSY', 'AWAY', 'OFFLINE');

CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'REVISION', 'COMPLETED', 'BLOCKED');

CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED');

CREATE TYPE "ReportPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

CREATE TYPE "NotificationType" AS ENUM ('TASK_ASSIGNED', 'DEADLINE_CHANGED', 'TASK_COMPLETED', 'TASK_OVERDUE', 'NEW_COMMENT', 'NEW_REPORT', 'NEW_PROJECT', 'REVIEW_REQUESTED');

CREATE TYPE "ConversationType" AS ENUM ('GENERAL', 'PROJECT', 'DIVISION');

CREATE TYPE "MessageKind" AS ENUM ('MESSAGE', 'INSTRUCTION');

CREATE TABLE "users" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'EMPLOYEE'::"UserRole",
  "active" BOOLEAN NOT NULL DEFAULT true,
  "employeeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastLoginAt" TIMESTAMP(3),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "departments" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#2563eb',
  "description" TEXT,
  CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "roles" (
  "id" TEXT NOT NULL,
  "key" "UserRole" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "permissions" TEXT[],
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employees" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "departmentId" TEXT NOT NULL,
  "avatarColor" TEXT NOT NULL DEFAULT '#2563eb',
  "avatarUrl" TEXT,
  "bio" TEXT NOT NULL DEFAULT '',
  "personality" TEXT NOT NULL DEFAULT '',
  "communicationStyle" TEXT NOT NULL DEFAULT '',
  "responsibilities" TEXT NOT NULL DEFAULT '',
  "targets" TEXT NOT NULL DEFAULT '',
  "availability" "Availability" NOT NULL DEFAULT 'AVAILABLE'::"Availability",
  "managerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_skills" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 80,
  CONSTRAINT "employee_skills_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "projects" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING'::"ProjectStatus",
  "color" TEXT NOT NULL DEFAULT '#2563eb',
  "managerId" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deadline" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_members" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'Member',
  CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "milestones" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3),
  "done" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tasks" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "priority" "Priority" NOT NULL DEFAULT 'MEDIUM'::"Priority",
  "status" "TaskStatus" NOT NULL DEFAULT 'TODO'::"TaskStatus",
  "progress" INTEGER NOT NULL DEFAULT 0,
  "deadline" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "departmentId" TEXT,
  "projectId" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_assignees" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  CONSTRAINT "task_assignees_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_checklist_items" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "done" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "task_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_comments" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "authorId" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_attachments" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "storedAs" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_activity_logs" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "actorEmployeeId" TEXT,
  "action" TEXT NOT NULL,
  "detail" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "task_activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "employee_reports" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "projectId" TEXT,
  "period" "ReportPeriod" NOT NULL DEFAULT 'DAILY'::"ReportPeriod",
  "periodDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "tasksWorked" TEXT NOT NULL DEFAULT '',
  "completedWork" TEXT NOT NULL DEFAULT '',
  "ongoingWork" TEXT NOT NULL DEFAULT '',
  "obstacles" TEXT NOT NULL DEFAULT '',
  "solutions" TEXT NOT NULL DEFAULT '',
  "recommendations" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'On Track',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "employee_reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL DEFAULT '',
  "link" TEXT,
  "read" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversations" (
  "id" TEXT NOT NULL,
  "type" "ConversationType" NOT NULL DEFAULT 'GENERAL'::"ConversationType",
  "title" TEXT NOT NULL,
  "projectId" TEXT,
  "departmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "authorUserId" TEXT,
  "authorEmployeeId" TEXT,
  "kind" "MessageKind" NOT NULL DEFAULT 'MESSAGE'::"MessageKind",
  "body" TEXT NOT NULL,
  "mentions" TEXT[],
  "generatedByAi" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "company_settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "name" TEXT NOT NULL,
  "tagline" TEXT NOT NULL,
  "founder" TEXT NOT NULL,
  "industries" TEXT[],
  "vision" TEXT NOT NULL,
  "missions" TEXT[],
  "logoUrl" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#0a1530',
  "secondaryColor" TEXT NOT NULL DEFAULT '#2563eb',
  "accentColor" TEXT NOT NULL DEFAULT '#22d3ee',
  "notificationPrefs" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "security" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "integrations" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ai_agent_configurations" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'openai',
  "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  "systemPrompt" TEXT NOT NULL DEFAULT '',
  "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_agent_configurations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "activity_logs" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "link" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "_Collaboration" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE UNIQUE INDEX "users_employeeId_key" ON "users"("employeeId");

CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

CREATE UNIQUE INDEX "departments_slug_key" ON "departments"("slug");

CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

CREATE UNIQUE INDEX "employee_skills_employeeId_name_key" ON "employee_skills"("employeeId", "name");

CREATE UNIQUE INDEX "project_members_projectId_employeeId_key" ON "project_members"("projectId", "employeeId");

CREATE UNIQUE INDEX "tasks_code_key" ON "tasks"("code");

CREATE UNIQUE INDEX "task_assignees_taskId_employeeId_key" ON "task_assignees"("taskId", "employeeId");

CREATE UNIQUE INDEX "ai_agent_configurations_employeeId_key" ON "ai_agent_configurations"("employeeId");

CREATE UNIQUE INDEX "_Collaboration_AB_unique" ON "_Collaboration"("A", "B");

CREATE INDEX "_Collaboration_B_index" ON "_Collaboration"("B");

CREATE INDEX "tasks_status_idx" ON "tasks"("status");

CREATE INDEX "tasks_deadline_idx" ON "tasks"("deadline");

CREATE INDEX "task_activity_logs_taskId_idx" ON "task_activity_logs"("taskId");

CREATE INDEX "notifications_userId_read_idx" ON "notifications"("userId", "read");

CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

ALTER TABLE "users" ADD CONSTRAINT "users_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employees" ADD CONSTRAINT "employees_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employee_skills" ADD CONSTRAINT "employee_skills_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "projects" ADD CONSTRAINT "projects_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "project_members" ADD CONSTRAINT "project_members_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "milestones" ADD CONSTRAINT "milestones_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tasks" ADD CONSTRAINT "tasks_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_assignees" ADD CONSTRAINT "task_assignees_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_checklist_items" ADD CONSTRAINT "task_checklist_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_activity_logs" ADD CONSTRAINT "task_activity_logs_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_activity_logs" ADD CONSTRAINT "task_activity_logs_actorEmployeeId_fkey" FOREIGN KEY ("actorEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "employee_reports" ADD CONSTRAINT "employee_reports_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "employee_reports" ADD CONSTRAINT "employee_reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversations" ADD CONSTRAINT "conversations_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "messages" ADD CONSTRAINT "messages_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "messages" ADD CONSTRAINT "messages_authorEmployeeId_fkey" FOREIGN KEY ("authorEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ai_agent_configurations" ADD CONSTRAINT "ai_agent_configurations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "_Collaboration" ADD CONSTRAINT "_Collaboration_A_fkey" FOREIGN KEY ("A") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_Collaboration" ADD CONSTRAINT "_Collaboration_B_fkey" FOREIGN KEY ("B") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
