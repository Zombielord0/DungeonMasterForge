-- Each account's own saved data, private to that account: the DM's Campaign Tracker campaigns
-- (one row each, id "c-…"), World places ("world"), Your NPCs ("npclib"), custom items ("items")
-- and My monsters ("mymonsters"). `data` is the Forge's own object. `version` goes up on every
-- save so two devices editing at once can be detected; deleted rows are kept (deleted_at) so
-- another device's copy isn't uploaded again.
CREATE TABLE user_docs (
  user_id     text NOT NULL,
  id          text NOT NULL,
  data        jsonb,
  version     integer NOT NULL DEFAULT 1,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz,
  PRIMARY KEY (user_id, id)
);
