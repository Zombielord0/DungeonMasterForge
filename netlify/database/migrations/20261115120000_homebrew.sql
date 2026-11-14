-- Homebrew rules content a DM shares with their campaign: subclasses,
-- backgrounds, feats and species. `data` is the Forge's own homebrew object.
CREATE TABLE homebrew (
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  id          text NOT NULL,
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, id)
);
