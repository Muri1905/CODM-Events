import {
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
} from "discord.js";
import { db } from "../database.js";

export const data = new SlashCommandBuilder()
  .setName("event")
  .setDescription("Create and manage CODM events.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
  .addSubcommand((subcommand) =>
    subcommand
      .setName("create")
      .setDescription("Create a new tournament event.")
      .addStringOption((option) =>
        option.setName("name").setDescription("The name of the event.").setRequired(true)
      )
      .addIntegerOption((option) =>
        option
          .setName("team-size")
          .setDescription("Number of players required per team.")
          .setMinValue(1)
          .setMaxValue(20)
          .setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName("prize-pool")
          .setDescription("Prize pool shown to participants, e.g. €500.")
      )
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guildId) {
    await interaction.reply({ content: "❌ This command can only be used inside a server.", ephemeral: true });
    return;
  }

  const name = interaction.options.getString("name", true);
  const teamSize = interaction.options.getInteger("team-size", true);
  const prizePool = interaction.options.getString("prize-pool");

  const result = db
    .prepare("INSERT INTO events (guild_id, name, team_size, prize_pool, created_by) VALUES (?, ?, ?, ?, ?)")
    .run(interaction.guildId, name, teamSize, prizePool, interaction.user.id);

  db.prepare("INSERT INTO event_scoring (event_id) VALUES (?)").run(result.lastInsertRowid);

  await interaction.reply({
    content: `🏆 **Event created**\n\n**Event:** ${name}\n**Team size:** ${teamSize}\n**Prize pool:** ${prizePool ?? "Not set"}\n**Event ID:** ${result.lastInsertRowid}\n\nNext step: configure the event rules and scoring system.`,
    ephemeral: true,
  });
}
