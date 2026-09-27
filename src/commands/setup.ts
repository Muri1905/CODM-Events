import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { EVENT_TEMPLATES } from "../constants.js";
export const data=new SlashCommandBuilder().setName("setup").setDescription("Show event platform setup options.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
.addSubcommand(s=>s.setName("templates").setDescription("List event templates."));
export async function execute(i:ChatInputCommandInteraction):Promise<void>{await i.reply({content:EVENT_TEMPLATES.map(t=>`**${t.key}** — ${t.name} — team size ${t.teamSize}`).join("\n"),ephemeral:true});}