import { REST, Routes } from "discord.js";
import { config } from "./config.js";
import { commands } from "./commands/index.js";

const rest = new REST({ version: "10" }).setToken(config.discordToken);
const body = commands.map((command) => command.data.toJSON());

if (config.guildId) {
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body });
  console.log("Registered " + body.length + " command(s) to guild " + config.guildId + ".");
} else {
  await rest.put(Routes.applicationCommands(config.clientId), { body });
  console.log("Registered " + body.length + " global command(s).");
}
