import type { OAuthScope } from "@arkham-build/shared";

export const OAUTH_SCOPE_TRANSLATION_KEYS: Record<
  OAuthScope,
  { description: string; title: string }
> = {
  "profile:read": {
    title: "oauth_consent.scopes.profile_read.title",
    description: "oauth_consent.scopes.profile_read.description",
  },
  "decks:read": {
    title: "oauth_consent.scopes.decks_read.title",
    description: "oauth_consent.scopes.decks_read.description",
  },
  "decks:write": {
    title: "oauth_consent.scopes.decks_write.title",
    description: "oauth_consent.scopes.decks_write.description",
  },
  "decks:delete": {
    title: "oauth_consent.scopes.decks_delete.title",
    description: "oauth_consent.scopes.decks_delete.description",
  },
};
