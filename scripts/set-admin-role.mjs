import { loadEnvConfig } from "@next/env";
import { MongoClient } from "mongodb";

loadEnvConfig(process.cwd());

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Usage: yarn admin:promote admin@example.com");
  process.exitCode = 1;
} else if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is required.");
  process.exitCode = 1;
} else {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const result = await client.db().collection("user").updateOne({ email }, { $set: { role: "admin" } });
    if (!result.matchedCount) {
      console.error(`No account exists for ${email}. Create the account first.`);
      process.exitCode = 1;
    } else {
      console.log(`Promoted ${email} to admin. Sign in again to refresh the session.`);
    }
  } finally {
    await client.close();
  }
}
