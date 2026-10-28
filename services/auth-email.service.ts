import { logger } from "@/lib/logger";
type AuthEmail = { to: string; subject: string; url: string };
export async function sendAuthEmail({ to, subject, url }: AuthEmail) { if (process.env.NODE_ENV !== "production") { logger.info("Auth email URL generated (development only)", { to, subject, url }); return; } throw new Error("Transactional email delivery is not configured."); }
