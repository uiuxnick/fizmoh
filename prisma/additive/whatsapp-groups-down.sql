-- Reversible rollback migration for WhatsApp Cloud API Groups feature.
-- Drops only the isolated wa_group_* tables.

DROP TABLE IF EXISTS "wa_group_messages" CASCADE;
DROP TABLE IF EXISTS "wa_group_participants" CASCADE;
DROP TABLE IF EXISTS "wa_groups" CASCADE;
