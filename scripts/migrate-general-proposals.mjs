import nextEnv from "@next/env";
import { MongoClient } from "mongodb";

nextEnv.loadEnvConfig(process.cwd());

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is required.");
  process.exitCode = 1;
} else {
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const templates = db.collection("proposaltemplates");
    const applications = db.collection("proposalapplications");

    await templates.updateMany(
      { opportunityId: { $type: "objectId" }, scope: { $exists: false } },
      { $set: { scope: "opportunity" } },
    );
    await applications.updateMany(
      { opportunityId: { $type: "objectId" }, proposalKind: { $exists: false } },
      { $set: { proposalKind: "opportunity" } },
    );

    for (const [collection, name] of [[templates, "opportunityId_1"], [applications, "userId_1_opportunityId_1"]]) {
      const index = (await collection.listIndexes().toArray()).find((item) => item.name === name);
      if (index && !index.partialFilterExpression) await collection.dropIndex(name);
    }

    await templates.createIndex(
      { opportunityId: 1 },
      { name: "opportunityId_1", unique: true, partialFilterExpression: { opportunityId: { $type: "objectId" } } },
    );
    await applications.createIndex(
      { userId: 1, opportunityId: 1 },
      { name: "userId_1_opportunityId_1", unique: true, partialFilterExpression: { opportunityId: { $type: "objectId" } } },
    );
    console.log("Proposal indexes now support general templates and proposals.");
  } finally {
    await client.close();
  }
}
