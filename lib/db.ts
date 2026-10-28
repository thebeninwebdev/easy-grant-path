import mongoose, { type Mongoose } from "mongoose";
import { getServerEnv } from "@/lib/validation/env";
import { logger } from "@/lib/logger";

type MongooseCache = { conn: Mongoose | null; promise: Promise<Mongoose> | null };
const globalForMongoose = globalThis as typeof globalThis & { mongooseCache?: MongooseCache };
const cache = globalForMongoose.mongooseCache ?? { conn: null, promise: null };
globalForMongoose.mongooseCache = cache;

export async function connectToDatabase(): Promise<Mongoose> {
  if (cache.conn) return cache.conn;
  if (!cache.promise) {
    const { MONGODB_URI } = getServerEnv();
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).catch((error: unknown) => {
      cache.promise = null;
      logger.error("MongoDB connection failed", { error: error instanceof Error ? error.message : "Unknown error" });
      throw error;
    });
  }
  cache.conn = await cache.promise;
  return cache.conn;
}
