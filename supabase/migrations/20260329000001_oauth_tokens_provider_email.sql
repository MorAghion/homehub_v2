-- Add provider_email to oauth_tokens so the app can display which Gmail account is connected.
ALTER TABLE oauth_tokens ADD COLUMN IF NOT EXISTS provider_email TEXT;
