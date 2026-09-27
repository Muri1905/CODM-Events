import { SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Check whether the CODM Events bot is online.");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({
    content: `🏆 CODM Events is online. Pong: ${interaction.client.ws.ping}ms`,
    ephemeral: true,
  });
}
