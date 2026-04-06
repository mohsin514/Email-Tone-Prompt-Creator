/*
  Warnings:

  - You are about to drop the column `access_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `token_expiry` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "emails" ADD COLUMN     "analyzed_at" TIMESTAMP(3),
ADD COLUMN     "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "keywords" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "sentiment" TEXT DEFAULT 'neutral',
ADD COLUMN     "tone" TEXT DEFAULT 'neutral';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "access_token",
DROP COLUMN "refresh_token",
DROP COLUMN "token_expiry",
ADD COLUMN     "gmail_access_token" TEXT,
ADD COLUMN     "gmail_email" TEXT,
ADD COLUMN     "gmail_linked_at" TIMESTAMP(3),
ADD COLUMN     "gmail_refresh_token" TEXT,
ADD COLUMN     "gmail_token_expiry" TIMESTAMP(3),
ALTER COLUMN "provider" SET DEFAULT 'password';

-- CreateIndex
CREATE INDEX "emails_tone_idx" ON "emails"("tone");
