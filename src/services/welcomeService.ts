import { EmbedBuilder, type Client, type Guild } from "discord.js";

const WELCOME_IMAGE_URL = "https://raw.githubusercontent.com/Muri1905/CODM-Events/main/assets/codm-events-welcome.svg";

export async function sendGuildWelcome(guild: Guild): Promise<void> {
  const system = guild.systemChannel;
  const channel = system?.isTextBased() && system.isSendable()
    ? system
    : guild.channels.cache.find((c) => c.isTextBased() && c.isSendable());

  if (!channel) return;

  const embed = new EmbedBuilder()
    .setColor(0x1ed278)
    .setTitle("🎮 CODM Events is ready.")
    .setDescription(
      "A competitive tournament platform built for **Call of Duty: Mobile**.\n\n" +
      "Create events, register teams, configure rules and scoring, process match results and keep everyone on the leaderboard — all inside Discord."
    )
    .addFields(
      { name: "🏆 Tournament Management", value: "Create CODM tournaments, Clan Wars, 1v1s and custom events.", inline: false },
      { name: "👥 Team Registration", value: "Collect rosters, validate UIDs and manage approvals.", inline: true },
      { name: "📊 Scoring & Results", value: "Configure scoring and publish match results and standings.", inline: true },
      { name: "⚙️ Organizer Control", value: "Manage event settings, rules, matches and results from organizer tools.", inline: true },
      { name: "🚀 Get started", value: "Use `/event create` to create your first event.\nThen use `/event setup` to build its Discord structure.", inline: false },
    )
    .setImage(WELCOME_IMAGE_URL)
    .setFooter({ text: "CODM Events • Competitive gaming, organized." })
    .setTimestamp();

  await channel.send({ embeds: [embed] });
}

export function registerGuildWelcomeHandler(client: Client): void {
  client.on("guildCreate", async (guild) => {
    try {
      await sendGuildWelcome(guild);
      console.log("Sent CODM Events welcome message in " + guild.name);
    } catch (error) {
      console.error("Could not send guild welcome message:", error);
    }
  });
}