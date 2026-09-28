import { Client, Collection, GatewayIntentBits, type ChatInputCommandInteraction } from "discord.js";
import { config } from "./config.js";
import { closeDatabase } from "./database.js";
import { commands } from "./commands/index.js";
import { handleButton, handleApproval, handleModal } from "./commands/registration.js";
import { handleOrganizerButton, handleOrganizerModal } from "./commands/organizer.js";
import { registerGuildWelcomeHandler } from "./services/welcomeService.js";
import { startOcrWorkers, enqueueScreenshotJob } from "./services/ocrService.js";
import { getOpenIntake } from "./services/resultIntakeService.js";
import { createHash } from "node:crypto";

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
const commandMap = new Collection<string, (i: ChatInputCommandInteraction) => Promise<void>>();
for (const c of commands) commandMap.set(c.data.name, c.execute);

client.once("clientReady", (c) => console.log("CODM Events logged in as " + c.user.tag));
registerGuildWelcomeHandler(client);
startOcrWorkers();

client.on("messageCreate", async (message) => {
  if (!message.guildId || message.author.bot || message.attachments.size === 0) return;
  const intake = getOpenIntake(message.channelId);
  if (!intake) return;
  const member = message.member;
  if (!member?.permissions.has("ManageGuild")) return;

  for (const attachment of message.attachments.values()) {
    const contentType = attachment.contentType ?? "";
    if (!contentType.startsWith("image/")) continue;
    if (attachment.size > 15 * 1024 * 1024) {
      await message.channel.send(`⚠️ <@${message.author.id}> ${attachment.name} is larger than 15 MB and was skipped.`);
      continue;
    }

    const screenshotHash = createHash("sha256").update(attachment.url).digest("hex");
    const queued = enqueueScreenshotJob({
      eventId: intake.event_id,
      matchId: intake.match_id,
      guildId: message.guildId,
      channelId: message.channelId,
      messageId: message.id,
      attachmentId: attachment.id,
      sourceUrl: attachment.url,
      attachmentName: attachment.name,
      contentType,
      size: attachment.size,
      screenshotHash
    });

    if (!queued.duplicate) {
      await message.react("⏳").catch(() => undefined);
    } else {
      await message.react("♻️").catch(() => undefined);
    }
  }
});

client.on("interactionCreate", async (i) => {
  try {
    if (i.isChatInputCommand()) {
      const c = commandMap.get(i.commandName);
      if (c) await c(i);
      return;
    }
    if (i.isButton() && i.customId.startsWith("codm:register:")) return handleButton(i);
    if (i.isButton() && i.customId.startsWith("codm:team:")) return handleApproval(i);
    if (i.isButton() && i.customId.startsWith("codm:org:")) return handleOrganizerButton(i);
    if (i.isModalSubmit() && i.customId.startsWith("codm:register-modal:")) return handleModal(i);
    if (i.isModalSubmit() && i.customId.startsWith("codm:org-modal:")) return handleOrganizerModal(i);
  } catch (e) {
    console.error(e);
    if (i.isRepliable()) {
      const msg = { content: "❌ Something went wrong while processing this action.", ephemeral: true };
      if (i.replied || i.deferred) await i.followUp(msg);
      else await i.reply(msg);
    }
  }
});

const shutdown = () => {
  closeDatabase();
  client.destroy();
  process.exit(0);
};
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
await client.login(config.discordToken);
