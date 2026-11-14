-- Shared campaigns: the DM creates one, players join it with its code.
CREATE TABLE campaigns (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  code        text NOT NULL UNIQUE,
  dm_user_id  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE members (
  campaign_id  uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id      text NOT NULL,
  email        text,
  display_name text NOT NULL,
  role         text NOT NULL CHECK (role IN ('dm', 'player')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);
CREATE INDEX members_user_idx ON members (user_id);

-- One row per character sheet. `data` is the Forge's own character object.
-- `version` goes up on every save so two people editing at once can be detected.
CREATE TABLE characters (
  campaign_id uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  id          text NOT NULL,
  owner_id    text NOT NULL,
  data        jsonb NOT NULL,
  version     integer NOT NULL DEFAULT 1,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  text,
  deleted_at  timestamptz,
  PRIMARY KEY (campaign_id, id)
);
CREATE INDEX characters_changed_idx ON characters (campaign_id, updated_at);

-- What changed, by whom. `before` holds the sheet as it was when the entry was
-- opened, so quick successive edits fold into one readable line.
CREATE TABLE activity (
  id           bigserial PRIMARY KEY,
  campaign_id  uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  character_id text NOT NULL,
  actor_id     text NOT NULL,
  summary      text NOT NULL,
  before       jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_campaign_idx ON activity (campaign_id, updated_at DESC);

-- Private notes from the DM to one player.
CREATE TABLE whispers (
  id           bigserial PRIMARY KEY,
  campaign_id  uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  from_user_id text NOT NULL,
  to_user_id   text NOT NULL,
  body         text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  read_at      timestamptz
);
CREATE INDEX whispers_to_idx ON whispers (campaign_id, to_user_id, created_at DESC);
