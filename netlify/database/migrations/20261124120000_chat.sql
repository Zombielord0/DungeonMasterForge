-- Chat (2026-11-24): whispers go both ways now. A player's reply is a row to the campaign's DM, and a message to the
-- players' party chat is a row with to_user_id = 'party'. The DM is never sent party rows (the API filters them).
-- chat_reads keeps each player's read position in the party chat; one-to-one messages still use whispers.read_at.
CREATE TABLE chat_reads (
  campaign_id  uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id      text NOT NULL,
  thread       text NOT NULL,
  last_read_id bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (campaign_id, user_id, thread)
);
CREATE INDEX whispers_from_idx ON whispers (campaign_id, from_user_id, created_at DESC);
