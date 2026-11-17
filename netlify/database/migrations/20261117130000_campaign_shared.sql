-- What the DM shows the whole campaign: the players' Journal ("journal": quests, session recaps, Lore the DM shares)
-- and the live turn order of a fight ("turns", never HP numbers). Written by the DM's browser, read by every member.
CREATE TABLE campaign_shared (
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  id          text NOT NULL,
  data        jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, id)
);
