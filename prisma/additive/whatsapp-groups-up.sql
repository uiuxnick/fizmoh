-- Additive, non-destructive migration for WhatsApp Cloud API Groups feature.
-- Safe to run on live production: creates only new tables, zero ALTER/DROP on existing tables.

CREATE TABLE IF NOT EXISTS "wa_groups" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "group_id" TEXT NOT NULL,
  "phone_number_id" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "description" TEXT,
  "join_approval_mode" TEXT NOT NULL DEFAULT 'auto_approve',
  "invite_link" TEXT,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "customer_id" TEXT,
  "booking_id" TEXT,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wa_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "wa_groups_group_id_key" ON "wa_groups"("group_id");
CREATE INDEX IF NOT EXISTS "wa_groups_tenant_id_status_idx" ON "wa_groups"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "wa_groups_phone_number_id_status_idx" ON "wa_groups"("phone_number_id", "status");

CREATE TABLE IF NOT EXISTS "wa_group_participants" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "group_ref" TEXT NOT NULL,
  "wa_id" TEXT NOT NULL,
  "join_request_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'invited',
  "joined_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wa_group_participants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wa_group_participants_group_ref_fkey" FOREIGN KEY ("group_ref") REFERENCES "wa_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "wa_group_participants_group_ref_wa_id_key" ON "wa_group_participants"("group_ref", "wa_id");
CREATE INDEX IF NOT EXISTS "wa_group_participants_tenant_id_group_ref_status_idx" ON "wa_group_participants"("tenant_id", "group_ref", "status");

CREATE TABLE IF NOT EXISTS "wa_group_messages" (
  "id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "group_ref" TEXT NOT NULL,
  "wa_message_id" TEXT,
  "sender_wa_id" TEXT,
  "direction" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "body" TEXT,
  "media_ref" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SENT',
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wa_group_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "wa_group_messages_group_ref_fkey" FOREIGN KEY ("group_ref") REFERENCES "wa_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "wa_group_messages_wa_message_id_key" ON "wa_group_messages"("wa_message_id");
CREATE INDEX IF NOT EXISTS "wa_group_messages_tenant_id_group_ref_timestamp_idx" ON "wa_group_messages"("tenant_id", "group_ref", "timestamp");
