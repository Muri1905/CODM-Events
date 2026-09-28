import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type ModalSubmitInteraction,
} from "discord.js";
import { getEvent, getEventResults, getEventTeams, getScoring, updateEventStatus, updateScoring } from "../services/eventService.js";
import { getRules, saveRules } from "../services/rulesService.js";
import { EVENT_STATUS_LABELS } from "../constants.js";
import { audit } from "../services/auditService.js";

export const data=new SlashCommandBuilder().setName("organizer").setDescription("Organizer control center.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
.addSubcommand(s=>s.setName("panel").setDescription("Publish the organizer control panel.").addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)));

function mainRows(eventId:number):ActionRowBuilder<ButtonBuilder>[] {
 return [
  new ActionRowBuilder<ButtonBuilder>().addComponents(
   new ButtonBuilder().setCustomId(`codm:org:status:${eventId}`).setLabel("Event Status").setStyle(ButtonStyle.Secondary),
   new ButtonBuilder().setCustomId(`codm:org:teams:${eventId}`).setLabel("Teams").setStyle(ButtonStyle.Primary),
   new ButtonBuilder().setCustomId(`codm:org:scoring:${eventId}`).setLabel("Scoring").setStyle(ButtonStyle.Primary),
  ),
  new ActionRowBuilder<ButtonBuilder>().addComponents(
   new ButtonBuilder().setCustomId(`codm:org:rules:${eventId}`).setLabel("Rules").setStyle(ButtonStyle.Primary),
   new ButtonBuilder().setCustomId(`codm:org:results:${eventId}`).setLabel("Results").setStyle(ButtonStyle.Primary),
   new ButtonBuilder().setCustomId(`codm:org:refresh:${eventId}`).setLabel("Refresh").setStyle(ButtonStyle.Secondary),
  ),
 ];
}

export async function execute(i:ChatInputCommandInteraction):Promise<void>{
 if(!i.guild||!i.guildId){await i.reply({content:"❌ Server only.",ephemeral:true});return;}
 const e=getEvent(i.options.getInteger("event-id",true));
 if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 const embed=new EmbedBuilder()
  .setTitle(`🎮 Organizer Control — ${e.name}`)
  .setDescription("Use the controls below to manage the complete tournament lifecycle.")
  .addFields(
   {name:"Status",value:EVENT_STATUS_LABELS[e.status as keyof typeof EVENT_STATUS_LABELS],inline:true},
   {name:"Teams",value:String(getEventTeams(e.id).length),inline:true},
   {name:"Rules",value:`v${e.rules_version}`,inline:true},
  );
 await i.reply({embeds:[embed],components:mainRows(e.id)});
}

export async function handleOrganizerButton(i:ButtonInteraction):Promise<void>{
 if(!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)){await i.reply({content:"❌ Organizer permission required.",ephemeral:true});return;}
 const [,,action,idText]=i.customId.split(":");
 const eventId=Number(idText); const e=getEvent(eventId);
 if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}

 if(action==="refresh"){
  const embed=new EmbedBuilder().setTitle(`🎮 Organizer Control — ${e.name}`).setDescription("Control panel refreshed.")
   .addFields({name:"Status",value:EVENT_STATUS_LABELS[e.status as keyof typeof EVENT_STATUS_LABELS],inline:true},{name:"Teams",value:String(getEventTeams(e.id).length),inline:true},{name:"Rules",value:`v${e.rules_version}`,inline:true});
  await i.update({embeds:[embed],components:mainRows(e.id)});return;
 }

 if(action==="status"){
  const row1=new ActionRowBuilder<ButtonBuilder>().addComponents(
   new ButtonBuilder().setCustomId(`codm:org:statusset:${eventId}:registration`).setLabel("Open Registration").setStyle(ButtonStyle.Success),
   new ButtonBuilder().setCustomId(`codm:org:statusset:${eventId}:locked`).setLabel("Lock").setStyle(ButtonStyle.Secondary),
   new ButtonBuilder().setCustomId(`codm:org:statusset:${eventId}:live`).setLabel("Go Live").setStyle(ButtonStyle.Primary),
  );
  const row2=new ActionRowBuilder<ButtonBuilder>().addComponents(
   new ButtonBuilder().setCustomId(`codm:org:statusset:${eventId}:finished`).setLabel("Finish").setStyle(ButtonStyle.Success),
   new ButtonBuilder().setCustomId(`codm:org:statusset:${eventId}:cancelled`).setLabel("Cancel").setStyle(ButtonStyle.Danger),
   new ButtonBuilder().setCustomId(`codm:org:back:${eventId}`).setLabel("Back").setStyle(ButtonStyle.Secondary),
  );
  await i.update({content:`**${e.name}** — current status: **${EVENT_STATUS_LABELS[e.status as keyof typeof EVENT_STATUS_LABELS]}**`,embeds:[],components:[row1,row2]});return;
 }

 if(action==="statusset"){
  const status=i.customId.split(":")[4] as "registration"|"locked"|"live"|"finished"|"cancelled";
  updateEventStatus(eventId,status);
  audit({guildId:i.guildId!,actorId:i.user.id,eventId,action:"event.status",details:{status,source:"organizer-panel"}});
  await i.update({content:`✅ **${e.name}** is now **${EVENT_STATUS_LABELS[status]}**.`,embeds:[],components:mainRows(eventId)});return;
 }

 if(action==="back"){
  const current=getEvent(eventId);
  await i.update({content:null,embeds:[new EmbedBuilder().setTitle(`🎮 Organizer Control — ${current.name}`).setDescription("Use the controls below to manage the complete tournament lifecycle.").addFields({name:"Status",value:EVENT_STATUS_LABELS[current.status as keyof typeof EVENT_STATUS_LABELS],inline:true},{name:"Teams",value:String(getEventTeams(eventId).length),inline:true},{name:"Rules",value:`v${current.rules_version}`,inline:true})],components:mainRows(eventId)});return;
 }

 if(action==="teams"){
  const teams=getEventTeams(eventId);
  const pending=teams.filter(t=>t.status==="pending");
  const approved=teams.filter(t=>t.status==="approved");
  const rejected=teams.filter(t=>t.status==="rejected");
  const lines=teams.slice(0,20).map(t=>`**#${t.id} ${t.clan_name}** — ${String(t.status).toUpperCase()} — ${t.player_count}/${e.team_size} players`).join("\n")||"No teams registered yet.";
  const components:ActionRowBuilder<ButtonBuilder>[]=[];
  if(pending.length){
   components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(...pending.slice(0,5).map(t=>new ButtonBuilder().setCustomId(`codm:team:approve:${t.id}`).setLabel(`Approve #${t.id}`).setStyle(ButtonStyle.Success))));
  }
  components.push(new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`codm:org:back:${eventId}`).setLabel("Back").setStyle(ButtonStyle.Secondary)));
  await i.update({content:`**Teams — ${e.name}**\nPending: **${pending.length}** · Approved: **${approved.length}** · Rejected: **${rejected.length}**\n\n${lines}`,embeds:[],components});return;
 }

 if(action==="scoring"){
  const s=getScoring(eventId);
  const modal=new ModalBuilder().setCustomId(`codm:org-modal:scoring:${eventId}`).setTitle(`Scoring — ${e.name}`);
  modal.addComponents(
   new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("kill").setLabel("Points per kill").setStyle(TextInputStyle.Short).setRequired(true).setValue(String(s.killPoints))),
   new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("placement").setLabel("Placement points (1=100,2=80,3=65)").setStyle(TextInputStyle.Short).setRequired(true).setValue(Object.entries(s.placementPoints).map(([k,v])=>`${k}=${v}`).join(","))),
   new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("win").setLabel("First-place bonus").setStyle(TextInputStyle.Short).setRequired(true).setValue(String(s.winBonus))),
  );
  await i.showModal(modal);return;
 }

 if(action==="rules"){
  const r=getRules(eventId);
  const modal=new ModalBuilder().setCustomId(`codm:org-modal:rules:${eventId}`).setTitle(`Rules v${r.version+1} — ${e.name}`);
  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(new TextInputBuilder().setCustomId("content").setLabel("Rules").setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(4000).setValue(r.content.slice(0,4000))));
  await i.showModal(modal);return;
 }

 if(action==="results"){
  const results=getEventResults(eventId);
  const text=results.slice(0,20).map(r=>`**Match ${r.match_number}** · ${r.clan_name} — P${r.placement} · ${r.kills} kills · **${r.total_points} pts** · ${r.status}`).join("\n")||"No results recorded yet.";
  await i.reply({content:`📊 **Results — ${e.name}**\n\n${text}`,ephemeral:true});return;
 }

 await i.reply({content:"❌ Unknown organizer action.",ephemeral:true});
}

export async function handleOrganizerModal(i:ModalSubmitInteraction):Promise<void>{
 if(!i.guildId||!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)){await i.reply({content:"❌ Organizer permission required.",ephemeral:true});return;}
 const [, , action, idText]=i.customId.split(":");
 const eventId=Number(idText); const e=getEvent(eventId);
 if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 try{
  if(action==="scoring"){
   const kill=Number(i.fields.getTextInputValue("kill"));
   const win=Number(i.fields.getTextInputValue("win"));
   if(!Number.isInteger(kill)||kill<0||!Number.isInteger(win)||win<0) throw new Error("Kill points and bonus must be non-negative whole numbers.");
   const points:Record<string,number>={};
   for(const item of i.fields.getTextInputValue("placement").split(",")){const [p,v]=item.split("=").map(x=>x.trim());if(!p||v===undefined||!/^\d+$/.test(p)||!/^\d+$/.test(v)) throw new Error("Placement must look like 1=100,2=80,3=65.");points[p]=Number(v);}
   const current=getScoring(eventId); updateScoring(eventId,{...current,killPoints:kill,placementPoints:points,winBonus:win});
   audit({guildId:i.guildId,actorId:i.user.id,eventId,action:"scoring.updated",details:{killPoints:kill,winBonus:win,placementPoints:points}});
   await i.reply({content:"✅ Scoring updated successfully.",ephemeral:true});return;
  }
  if(action==="rules"){
   const content=i.fields.getTextInputValue("content");
   const version=saveRules(eventId,content,i.user.id);
   audit({guildId:i.guildId,actorId:i.user.id,eventId,action:"rules.updated",details:{version}});
   await i.reply({content:`✅ Rules saved as **v${version}**.`,ephemeral:true});return;
  }
  await i.reply({content:"❌ Unknown organizer editor.",ephemeral:true});
 }catch(error){await i.reply({content:`❌ ${error instanceof Error?error.message:"Update failed."}`,ephemeral:true});}
}
