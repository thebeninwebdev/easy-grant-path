import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
import { MongoClient } from "mongodb";

loadEnvConfig(process.cwd());

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is required.");
  process.exitCode = 1;
} else {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const result = await client.db().collection("userprofiles").updateMany(
      { paid: { $exists: false } },
      { $set: { paid: false } },
    );
    console.log(`Added paid=false to ${result.modifiedCount} existing user profile(s).`);
  } finally {
    await client.close();
  }
}
