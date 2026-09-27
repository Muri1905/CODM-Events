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
  databasePath: process.env.DATABASE_PATH ?? "./data/codm-events.sqlite",
};
