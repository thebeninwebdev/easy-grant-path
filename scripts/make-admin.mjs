import { MongoClient } from "mongodb";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error("Usage: yarn make-admin email@example.com");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is required. Load .env.local before running this command.");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI);
try {
  const users = client.db().collection("user");
  const result = await users.updateOne({ email }, { $set: { role: "admin", updatedAt: new Date() } });
  if (result.matchedCount === 0) {
    console.error(`No Better Auth user exists for ${email}. Create the account first.`);
    process.exitCode = 1;
  } else {
    console.log(`Admin role assigned to ${email}.`);
  }
} finally {
  await client.close();
}
