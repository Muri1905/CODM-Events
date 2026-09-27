import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getEvent, getScoring, updateScoring } from "../services/eventService.js";
export const data=new SlashCommandBuilder().setName("scoring").setDescription("Configure event scoring.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
.addSubcommand(s=>s.setName("show").setDescription("Show scoring.").addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("set").setDescription("Set scoring.").addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)).addIntegerOption(o=>o.setName("kill-points").setDescription("Points per kill").setMinValue(0).setRequired(true)).addStringOption(o=>o.setName("placement").setDescription("Example: 1=100,2=80,3=65").setRequired(true)).addIntegerOption(o=>o.setName("win-bonus").setDescription("Bonus for first place").setMinValue(0)));
export async function execute(i:ChatInputCommandInteraction):Promise<void>{
 if(!i.guildId){await i.reply({content:"❌ Server only.",ephemeral:true});return;}
 const e=getEvent(i.options.getInteger("event-id",true));if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 if(i.options.getSubcommand()==="show"){const s=getScoring(e.id);await i.reply({content:`Kill: **${s.killPoints}**\nPlacement: **${Object.entries(s.placementPoints).map(([p,v])=>p+"="+v).join(", ")||"none"}**\nWin bonus: **${s.winBonus}**`,ephemeral:true});return;}
 const raw=i.options.getString("placement",true);const points:Record<string,number>={};
 for(const item of raw.split(",")){const [p,v]=item.split("=").map(x=>x.trim());if(!p||v===undefined||Number.isNaN(Number(v)))throw new Error("Placement must look like 1=100,2=80,3=65.");points[p]=Number(v);}
 const current=getScoring(e.id);updateScoring(e.id,{...current,killPoints:i.options.getInteger("kill-points",true),placementPoints:points,winBonus:i.options.getInteger("win-bonus")??0});
 await i.reply({content:"✅ Scoring configuration updated.",ephemeral:true});
}