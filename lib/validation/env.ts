import { z } from "zod";

const serverEnvSchema = z.object({
  MONGODB_URI: z.string().url("MONGODB_URI must be a valid MongoDB connection URL.").startsWith("mongodb", "MONGODB_URI must start with mongodb:// or mongodb+srv://."),
  SYNC_SECRET: z.string().min(32, "SYNC_SECRET must be at least 32 characters.").optional(),
  GRANTS_GOV_BASE_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let parsedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (parsedEnv) return parsedEnv;
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `- ${issue.message}`).join("\n");
    throw new Error(`Invalid server environment configuration:\n${issues}\nCopy .env.example to .env.local and provide valid values.`);
  }
  parsedEnv = result.data;
  return parsedEnv;
}
