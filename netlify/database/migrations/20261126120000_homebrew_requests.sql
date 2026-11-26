-- Homebrew a player suggests (2026-11-26). It waits here until the DM approves it, which copies it into `homebrew`,
-- or turns it down, which deletes the row. Players only ever read and change their own rows; only the DM approves.
CREATE TABLE homebrew_requests (
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id     text NOT NULL,
  id          text NOT NULL,
  data        jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id, id)
);
