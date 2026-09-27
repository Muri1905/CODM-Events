import {
  Client,
  Collection,
  GatewayIntentBits,
  type ChatInputCommandInteraction,
} from "discord.js";
import { config } from "./config.js";
import { closeDatabase } from "./database.js";
import { commands } from "./commands/index.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commandMap = new Collection<
  string,
  (interaction: ChatInputCommandInteraction) => Promise<void>
>();

for (const command of commands) {
  commandMap.set(command.data.name, command.execute);
}

client.once("ready", (readyClient) => {
  console.log("CODM Events logged in as " + readyClient.user.tag);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandMap.get(interaction.commandName);
  if (!command) return;

  try {
    await command(interaction);
  } catch (error) {
    console.error(error);
    const message = {
      content: "❌ Something went wrong while processing that command.",
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(message);
    } else {
      await interaction.reply(message);
    }
  }
});

const shutdown = (): void => {
  closeDatabase();
  client.destroy();
  process.exit(0);
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

await client.login(config.discordToken);
