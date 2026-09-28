import { createHash } from "node:crypto";
import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getEvent } from "../services/eventService.js";
import { getLeaderboard, saveResult, verifyResult, rejectResult } from "../services/scoringService.js";
import { getTextChannel } from "../services/channelService.js";
import { db } from "../database.js";
import { audit } from "../services/auditService.js";
import { startIntake, stopIntake, getIntake } from "../services/resultIntakeService.js";

export const data=new SlashCommandBuilder().setName("result").setDescription("Store and verify match results.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
.addSubcommand(s=>s.setName("add").setDescription("Add a pending result for organizer review.")
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true))
 .addIntegerOption(o=>o.setName("match-id").setDescription("Match ID").setMinValue(1).setRequired(true))
 .addIntegerOption(o=>o.setName("team-id").setDescription("Team ID").setMinValue(1).setRequired(true))
 .addIntegerOption(o=>o.setName("placement").setDescription("Placement").setMinValue(1).setRequired(true))
 .addIntegerOption(o=>o.setName("kills").setDescription("Kills").setMinValue(0).setRequired(true))
 .addIntegerOption(o=>o.setName("bonus").setDescription("Bonus points").setMinValue(0))
 .addAttachmentOption(o=>o.setName("screenshot").setDescription("Optional result screenshot")))
.addSubcommand(s=>s.setName("verify").setDescription("Verify a pending result.").addIntegerOption(o=>o.setName("result-id").setDescription("Result ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("reject").setDescription("Reject a pending result.").addIntegerOption(o=>o.setName("result-id").setDescription("Result ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("list").setDescription("List event results.").addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("intake").setDescription("Manage screenshot intake for a finished match.")
 .addStringOption(o=>o.setName("action").setDescription("Intake action").setRequired(true).addChoices({name:"start",value:"start"},{name:"stop",value:"stop"},{name:"status",value:"status"}))
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true))
 .addIntegerOption(o=>o.setName("match-id").setDescription("Match ID (required for start)").setMinValue(1)));

export async function execute(i:ChatInputCommandInteraction):Promise<void>{
 if(!i.guildId||!i.guild){await i.reply({content:"❌ Server only.",ephemeral:true});return;}
 const sub=i.options.getSubcommand();
 if(sub==="intake"){
  const eventId=i.options.getInteger("event-id",true);
  const e=getEvent(eventId);
  if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
  const action=i.options.getString("action",true);
  try{
   if(action==="start"){
    const matchId=i.options.getInteger("match-id");
    if(!matchId){await i.reply({content:"❌ match-id is required for start.",ephemeral:true});return;}
    const channelId=e.results_channel_id;
    if(!channelId){await i.reply({content:"❌ This event has no results channel.",ephemeral:true});return;}
    startIntake(eventId,matchId,channelId,i.user.id);
    await i.reply({content:`📥 Screenshot intake **OPEN** for Match #${matchId}. Upload all result screenshots in <#${channelId}>. They will be queued and processed automatically.`,ephemeral:true});
   } else if(action==="stop"){
    stopIntake(eventId);
    await i.reply({content:"🛑 Screenshot intake **CLOSED**.",ephemeral:true});
   } else {
    const intake=getIntake(eventId);
    await i.reply({content:intake?`📥 Intake is **OPEN** for Match #${intake.match_id}.`:"ℹ️ No screenshot intake is currently open.",ephemeral:true});
   }
  }catch(error){await i.reply({content:`❌ ${error instanceof Error?error.message:"Could not update screenshot intake."}`,ephemeral:true});}
  return;
 }
 if(sub==="add"){
  const eventId=i.options.getInteger("event-id",true); const e=getEvent(eventId);
  if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
  try{
   const matchId=i.options.getInteger("match-id",true); const attachment=i.options.getAttachment("screenshot");
   const screenshotHash=attachment?createHash("sha256").update(attachment.url).digest("hex"):null;
   const id=saveResult({eventId:e.id,matchId,teamId:i.options.getInteger("team-id",true),placement:i.options.getInteger("placement",true),kills:i.options.getInteger("kills",true),bonus:i.options.getInteger("bonus")??0,source:attachment?"manual+screenshot":"manual",status:"pending",screenshotHash,raw:attachment?{url:attachment.url,name:attachment.name,size:attachment.size}:undefined});
   audit({guildId:i.guildId,actorId:i.user.id,eventId:e.id,action:"result.created",targetType:"result",targetId:String(id)});
   const resultsChannel=await getTextChannel(i.guild,e.results_channel_id);
   if(resultsChannel) await resultsChannel.send({content:`📥 **Result #${id} pending review** · Match ${matchId} · Team #${i.options.getInteger("team-id",true)} · P${i.options.getInteger("placement",true)} · ${i.options.getInteger("kills",true)} kills`});
   await i.reply({content:`📥 Result **#${id}** saved as **PENDING REVIEW**. Use **/result verify result-id:${id}** to publish it to the leaderboard, or reject it.`,ephemeral:true});
  }catch(error){await i.reply({content:`❌ ${error instanceof Error?error.message:"Could not save result."}`,ephemeral:true});}
  return;
 }
 if(sub==="verify"||sub==="reject"){
  const resultId=i.options.getInteger("result-id",true);
  const row=db.prepare(`SELECT r.id,r.status,r.total_points,r.match_id,r.team_id,r.placement,r.kills,m.match_number,m.event_id,e.guild_id,e.name,e.leaderboard_channel_id FROM match_results r JOIN matches m ON m.id=r.match_id JOIN events e ON e.id=m.event_id WHERE r.id=?`).get(resultId) as any;
  if(!row||row.guild_id!==i.guildId){await i.reply({content:"❌ Result not found.",ephemeral:true});return;}
  if(row.status!=="pending"){await i.reply({content:`❌ Result is already **${String(row.status).toUpperCase()}**.`,ephemeral:true});return;}
  const matchState=db.prepare("SELECT status FROM matches WHERE id=?").get(row.match_id) as {status:string}|undefined;
  if(sub==="verify" && matchState?.status!=="finished"){await i.reply({content:"❌ Finish the match before verifying its result.",ephemeral:true});return;}
  if(sub==="verify"){
   verifyResult(resultId,i.user.id);
   audit({guildId:i.guildId,actorId:i.user.id,eventId:row.event_id,action:"result.verified",targetType:"result",targetId:String(resultId)});
   const channel=await getTextChannel(i.guild,row.leaderboard_channel_id);
   if(channel){const leaderboard=getLeaderboard(row.event_id);const text=leaderboard.slice(0,25).map((r:any,n:number)=>`**${n+1}. ${r.clanName}** — ${r.totalPoints} pts · ${r.kills} kills · ${r.matches} matches`).join("\n")||"No verified results yet.";await channel.send({embeds:[new EmbedBuilder().setTitle(`🏆 ${row.name} — Leaderboard Updated`).setDescription(text)]});}
   await i.reply({content:`✅ Result **#${resultId}** verified and published to the leaderboard.`,ephemeral:true});
  } else {
   rejectResult(resultId);
   audit({guildId:i.guildId,actorId:i.user.id,eventId:row.event_id,action:"result.rejected",targetType:"result",targetId:String(resultId)});
   await i.reply({content:`🗑️ Result **#${resultId}** rejected.`,ephemeral:true});
  }
  return;
 }
 const eventId=i.options.getInteger("event-id",true); const e=getEvent(eventId);
 if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 const rows=db.prepare(`SELECT r.id,r.status,r.placement,r.kills,r.total_points,t.clan_name,m.match_number FROM match_results r JOIN teams t ON t.id=r.team_id JOIN matches m ON m.id=r.match_id WHERE m.event_id=? ORDER BY r.id DESC LIMIT 25`).all(eventId) as any[];
 const text=rows.length?rows.map(r=>`**#${r.id}** Match ${r.match_number} · ${r.clan_name} · P${r.placement} · ${r.kills} kills · **${r.total_points} pts** · ${String(r.status).toUpperCase()}`).join("\n"):"No results yet.";
 await i.reply({content:`📊 **${e.name} — Results**\n\n${text}`,ephemeral:true});
}
