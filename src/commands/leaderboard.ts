import { EmbedBuilder, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getEvent } from "../services/eventService.js";
import { getLeaderboard } from "../services/scoringService.js";
export const data=new SlashCommandBuilder().setName("leaderboard").setDescription("Show event standings.")
.addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true));
export async function execute(i:ChatInputCommandInteraction):Promise<void>{
 if(!i.guildId){await i.reply({content:"❌ Server only.",ephemeral:true});return;}
 const e=getEvent(i.options.getInteger("event-id",true)); if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 const rows=getLeaderboard(e.id); const text=rows.length?rows.slice(0,25).map((r:any,n:number)=>`**${n+1}. ${r.clanName}** — ${r.totalPoints} pts | ${r.kills} kills | ${r.matches} matches`).join("\n"):"No approved teams/results yet.";
 await i.reply({embeds:[new EmbedBuilder().setTitle(`🏆 ${e.name} — Leaderboard`).setDescription(text)]});
}