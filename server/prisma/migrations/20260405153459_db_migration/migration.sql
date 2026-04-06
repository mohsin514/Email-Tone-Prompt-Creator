-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password_hash" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'gmail',
    "access_token" TEXT,
    "refresh_token" TEXT,
    "token_expiry" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emails" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "recipients" JSONB,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "context" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tone_prompts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT 'general',
    "version" INTEGER NOT NULL DEFAULT 1,
    "tone_text" TEXT NOT NULL,
    "style_traits" JSONB NOT NULL DEFAULT '{}',
    "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "email_count" INTEGER NOT NULL DEFAULT 0,
    "consistency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recency_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "job_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tone_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'tone_analysis',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "context" TEXT,
    "error_message" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 3,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "processing_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "emails_user_id_idx" ON "emails"("user_id");

-- CreateIndex
CREATE INDEX "emails_user_id_context_idx" ON "emails"("user_id", "context");

-- CreateIndex
CREATE UNIQUE INDEX "emails_user_id_provider_id_key" ON "emails"("user_id", "provider_id");

-- CreateIndex
CREATE INDEX "tone_prompts_user_id_context_status_idx" ON "tone_prompts"("user_id", "context", "status");

-- CreateIndex
CREATE UNIQUE INDEX "tone_prompts_user_id_context_version_key" ON "tone_prompts"("user_id", "context", "version");

-- CreateIndex
CREATE INDEX "processing_jobs_status_idx" ON "processing_jobs"("status");

-- CreateIndex
CREATE INDEX "processing_jobs_user_id_idx" ON "processing_jobs"("user_id");

-- AddForeignKey
ALTER TABLE "emails" ADD CONSTRAINT "emails_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tone_prompts" ADD CONSTRAINT "tone_prompts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tone_prompts" ADD CONSTRAINT "tone_prompts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "processing_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "processing_jobs" ADD CONSTRAINT "processing_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
