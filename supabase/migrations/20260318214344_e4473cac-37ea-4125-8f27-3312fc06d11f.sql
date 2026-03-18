
-- Clean up orphaned DM channels (no members)
DELETE FROM channels WHERE is_direct = true AND id NOT IN (SELECT DISTINCT channel_id FROM channel_members);

-- Add all staff users to all group channels
INSERT INTO channel_members (channel_id, user_id)
SELECT c.id, p.id
FROM channels c
CROSS JOIN profiles p
WHERE c.is_direct = false
  AND p.role IN ('boss', 'koordynator', 'specjalista', 'praktykant')
ON CONFLICT DO NOTHING;
