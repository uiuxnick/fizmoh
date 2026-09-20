-- CreateTable
CREATE TABLE "BotSeatHold" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "remaining" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotSeatHold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotScheduleDispatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CLAIMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BotScheduleDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialReplyJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'DM',
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialReplyJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BotSeatHold_tenantId_expiresAt_idx" ON "BotSeatHold"("tenantId", "expiresAt");

-- CreateIndex
CREATE INDEX "BotSeatHold_slotId_idx" ON "BotSeatHold"("slotId");

-- CreateIndex
CREATE UNIQUE INDEX "BotScheduleDispatch_flowId_conversationId_scheduledAt_key" ON "BotScheduleDispatch"("flowId", "conversationId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "SocialReplyJob_messageId_key" ON "SocialReplyJob"("messageId");

-- CreateIndex
CREATE INDEX "SocialReplyJob_tenantId_status_dueAt_idx" ON "SocialReplyJob"("tenantId", "status", "dueAt");

