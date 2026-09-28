import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error("Missing required environment variable: " + name);
  return value;
}

export const config = {
  discordToken: required("DISCORD_TOKEN"),
  clientId: required("DISCORD_CLIENT_ID"),
  guildId: process.env.DISCORD_GUILD_ID,
  openaiApiKey: process.env.OPENAI_API_KEY,
  ocrModel: process.env.OCR_MODEL ?? "gpt-5.6-luna",
  ocrConcurrency: Math.max(1, Number(process.env.OCR_CONCURRENCY ?? 3)),
  ocrMaxRetries: Math.max(1, Number(process.env.OCR_MAX_RETRIES ?? 3)),
  ocrConfidenceThreshold: Math.min(1, Math.max(0, Number(process.env.OCR_CONFIDENCE_THRESHOLD ?? 0.90))),
  databasePath: process.env.DATABASE_PATH ?? "./data/codm-events.sqlite",
};
