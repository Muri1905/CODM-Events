import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getEvent } from "../services/eventService.js";
import { createMatch } from "../services/scoringService.js";
export const data=new SlashCommandBuilder().setName("match").setDescription("Manage matches.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
.addSubcommand(s=>s.setName("create").setDescription("Create a match.").addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)).addIntegerOption(o=>o.setName("number").setDescription("Match number").setMinValue(1).setRequired(true)));
export async function execute(i:ChatInputCommandInteraction):Promise<void>{
 if(!i.guildId){await i.reply({content:"❌ Server only.",ephemeral:true});return;}
 const e=getEvent(i.options.getInteger("event-id",true));if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 const id=createMatch(e.id,i.options.getInteger("number",true));await i.reply({content:`🎮 Match created. ID: **${id}**`,ephemeral:true});
}