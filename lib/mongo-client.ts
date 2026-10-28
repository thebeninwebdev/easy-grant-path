import { MongoClient } from "mongodb";
import { getServerEnv } from "@/lib/validation/env";

const globalForMongo = globalThis as typeof globalThis & { mongoClient?: MongoClient };
export function getMongoClient() {
  if (!globalForMongo.mongoClient) globalForMongo.mongoClient = new MongoClient(getServerEnv().MONGODB_URI);
  return globalForMongo.mongoClient;
}
