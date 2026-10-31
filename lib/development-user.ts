import "server-only";
// Authentication is intentionally deferred by AGENTS.md. Keeping identity in one
// server-only adapter means Better Auth can replace this without trusting userId
// values sent by the browser or changing proposal ownership queries.
export const DEVELOPMENT_USER_ID = "development-user";
