import "server-only";
import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { admin } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email";

const uri = process.env.MONGODB_URI;
const secret = process.env.BETTER_AUTH_SECRET;
if (!uri) throw new Error("MONGODB_URI is required for authentication.");
if (!secret) throw new Error("BETTER_AUTH_SECRET is required for authentication.");

const globalForAuth = globalThis as typeof globalThis & { betterAuthMongoClient?: MongoClient };
const client = globalForAuth.betterAuthMongoClient ?? new MongoClient(uri, { maxPoolSize: 10, minPoolSize: 0, serverSelectionTimeoutMS: 10_000 });
globalForAuth.betterAuthMongoClient = client;

export const auth = betterAuth({
  database: mongodbAdapter(client.db(), { client, transaction: false }),
  secret,
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 3600,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ name: user.name, email: user.email, url });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ name: user.name, email: user.email, url });
    },
  },
  plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] })],
});
