import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getMongoClient } from "@/lib/mongo-client";
import { getServerEnv } from "@/lib/validation/env";
import { sendAuthEmail } from "@/services/auth-email.service";

const env = getServerEnv();
const mongoClient = getMongoClient();

export const auth = betterAuth({
  database: mongodbAdapter(mongoClient.db(), { client: mongoClient }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: { enabled: true, requireEmailVerification: true, minPasswordLength: 8, maxPasswordLength: 128, sendResetPassword: async ({ user, url }) => sendAuthEmail({ to: user.email, subject: "Reset your EasyGrantPath password", url }) },
  emailVerification: { sendOnSignUp: true, sendOnSignIn: true, expiresIn: 60 * 60, sendVerificationEmail: async ({ user, url }) => sendAuthEmail({ to: user.email, subject: "Verify your EasyGrantPath email", url }) },
  user: { additionalFields: { role: { type: ["user", "admin"], required: false, defaultValue: "user", input: false } } },
  advanced: { database: { joins: true } },
  plugins: [nextCookies()],
});
