import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getEvent, updateEventStatus } from "../services/eventService.js";
import { audit } from "../services/auditService.js";
import { getTextChannel } from "../services/channelService.js";
import { createMatch, getEventMatches, getMatch, updateMatchStatus } from "../services/scoringService.js";

export const data=new SlashCommandBuilder().setName("match").setDescription("Manage matches.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
.addSubcommand(s=>s.setName("create").setDescription("Create a match.").addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)).addIntegerOption(o=>o.setName("number").setDescription("Match number").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("list").setDescription("List event matches.").addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("start").setDescription("Start a match.").addIntegerOption(o=>o.setName("match-id").setDescription("Match ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("finish").setDescription("Finish a match.").addIntegerOption(o=>o.setName("match-id").setDescription("Match ID").setMinValue(1).setRequired(true)));

export async function execute(i:ChatInputCommandInteraction):Promise<void>{
 if(!i.guildId){await i.reply({content:"❌ Server only.",ephemeral:true});return;}
 const sub=i.options.getSubcommand();
 if(sub==="create"){
  const eventId=i.options.getInteger("event-id",true); const e=getEvent(eventId);
  if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
  try{
  const id=createMatch(e.id,i.options.getInteger("number",true));
  audit({guildId:i.guildId,actorId:i.user.id,eventId:e.id,action:"match.created",targetType:"match",targetId:String(id)});
  const channel=await getTextChannel(i.guild,e.results_channel_id);
  if(channel) await channel.send({content:`🎮 **Match ${i.options.getInteger("number",true)}** created for **${e.name}**. Match ID: **#${id}**`});
  await i.reply({content:`🎮 Match created. ID: **${id}**`,ephemeral:true});
 }
  catch(error){await i.reply({content:`❌ ${error instanceof Error?error.message:"Could not create match."}`,ephemeral:true});}
  return;
 }
 if(sub==="list"){
  const eventId=i.options.getInteger("event-id",true); const e=getEvent(eventId);
  if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
  const rows=getEventMatches(eventId);
  await i.reply({content:rows.length?rows.map(r=>`**#${r.id}** Match ${r.match_number} — **${String(r.status).toUpperCase()}**`).join("\n"):"No matches created yet.",ephemeral:true});return;
 }
 const match=getMatch(i.options.getInteger("match-id",true));
 if(!match){await i.reply({content:"❌ Match not found.",ephemeral:true});return;}
 const e=getEvent(match.event_id);
 if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Match not found in this server.",ephemeral:true});return;}
 if(sub==="start"){
  if(match.status==="finished"){await i.reply({content:"❌ Match is already finished.",ephemeral:true});return;}
  updateMatchStatus(match.id,"live");
  if(e.status==="locked"||e.status==="registration") updateEventStatus(e.id,"live");
  audit({guildId:i.guildId,actorId:i.user.id,eventId:e.id,action:"match.started",targetType:"match",targetId:String(match.id)});
  await i.reply({content:`🟢 Match **#${match.match_number}** is now LIVE.`,ephemeral:true});return;
 }
 updateMatchStatus(match.id,"finished");
 audit({guildId:i.guildId,actorId:i.user.id,eventId:e.id,action:"match.finished",targetType:"match",targetId:String(match.id)});
 await i.reply({content:`🏁 Match **#${match.match_number}** is now FINISHED. You can now submit and verify results.`,ephemeral:true});
}
