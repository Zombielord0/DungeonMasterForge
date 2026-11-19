-- Feature requests from signed-in people (the Requests tab). Each person sees their own, with its status and the owner's
-- reply; the app's owner (emails in the FORGE_OWNER_EMAILS Netlify setting) sees all of them and sets the status.
CREATE TABLE feature_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text NOT NULL,
  user_name   text NOT NULL DEFAULT '',
  user_email  text NOT NULL DEFAULT '',
  data        jsonb NOT NULL,
  image       text,
  status      text NOT NULL DEFAULT 'new',
  reply       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX feature_requests_user ON feature_requests (user_id, created_at);
