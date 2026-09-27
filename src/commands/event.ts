import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { EVENT_STATUS_LABELS, EVENT_TEMPLATES } from "../constants.js";
import { audit } from "../services/auditService.js";
import { createEvent, getEvent, getGuildEvents, setDeadline, updateEventStatus } from "../services/eventService.js";
import { setupEventChannels } from "../services/channelService.js";

export const data = new SlashCommandBuilder()
.setName("event").setDescription("Create and manage CODM events.")
.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
.addSubcommand(s=>s.setName("create").setDescription("Create an event.")
 .addStringOption(o=>o.setName("name").setDescription("Event name").setRequired(true))
 .addStringOption(o=>o.setName("template").setDescription("Event template").addChoices(...EVENT_TEMPLATES.map(t=>({name:t.name,value:t.key}))))
 .addIntegerOption(o=>o.setName("team-size").setDescription("Players per team").setMinValue(1).setMaxValue(20))
 .addStringOption(o=>o.setName("prize-pool").setDescription("Prize pool"))
 .addStringOption(o=>o.setName("description").setDescription("Description")))
.addSubcommand(s=>s.setName("setup").setDescription("Create Discord channels.")
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true))
 .addRoleOption(o=>o.setName("organizer-role").setDescription("Role allowed to see the private organizer channel")))
.addSubcommand(s=>s.setName("open").setDescription("Open registration.")
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("close").setDescription("Lock registration.")
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("deadline").setDescription("Set registration deadline.")
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true))
 .addStringOption(o=>o.setName("iso").setDescription("ISO date/time; omit to clear")))
.addSubcommand(s=>s.setName("list").setDescription("List server events."))
.addSubcommand(s=>s.setName("status").setDescription("Show event status.")
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)));

export async function execute(i:ChatInputCommandInteraction):Promise<void>{
 if(!i.guildId||!i.guild){await i.reply({content:"❌ Server only.",ephemeral:true});return;}
 const sub=i.options.getSubcommand();
 if(sub==="create"){
  const e=createEvent({guildId:i.guildId,name:i.options.getString("name",true),templateKey:i.options.getString("template")??"custom",teamSize:i.options.getInteger("team-size")??undefined,prizePool:i.options.getString("prize-pool"),description:i.options.getString("description"),createdBy:i.user.id});
  audit({guildId:i.guildId,actorId:i.user.id,eventId:e.id,action:"event.created"});
  await i.reply({content:`🏆 **${e.name}** created. ID **${e.id}**. Run **/event setup event-id:${e.id}**, then **/event open event-id:${e.id}**.`,ephemeral:true});return;
 }
 const id=i.options.getInteger("event-id")??0; const e=getEvent(id);
 if(sub!=="list"&&(!e||e.guild_id!==i.guildId)){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 if(sub==="setup"){await setupEventChannels(i.guild,e.id,e.name,i.options.getRole('organizer-role')?.id);audit({guildId:i.guildId,actorId:i.user.id,eventId:e.id,action:"event.channels.created"});await i.reply({content:"✅ Event Discord structure created.",ephemeral:true});return;}
 if(sub==="open"||sub==="close"){const status=sub==="open"?"registration":"locked";updateEventStatus(e.id,status);audit({guildId:i.guildId,actorId:i.user.id,eventId:e.id,action:"event.status",details:{status}});await i.reply({content:`✅ Event is now **${EVENT_STATUS_LABELS[status]}**.`,ephemeral:true});return;}
 if(sub==="deadline"){const iso=i.options.getString("iso");if(iso&&Number.isNaN(Date.parse(iso))){await i.reply({content:"❌ Invalid date/time.",ephemeral:true});return;}setDeadline(e.id,iso);await i.reply({content:iso?`✅ Deadline: ${iso}`:"✅ Deadline cleared.",ephemeral:true});return;}
 if(sub==="list"){const rows=getGuildEvents(i.guildId);await i.reply({content:rows.length?rows.map((x:any)=>`**#${x.id}** ${x.name} — ${EVENT_STATUS_LABELS[x.status as keyof typeof EVENT_STATUS_LABELS]}`).join("\n"):"No events yet.",ephemeral:true});return;}
 await i.reply({content:`🏆 **${e.name}**\nStatus: **${EVENT_STATUS_LABELS[e.status as keyof typeof EVENT_STATUS_LABELS]}**\nTeam size: **${e.team_size}**\nPrize pool: **${e.prize_pool??"Not set"}**\nDeadline: **${e.registration_deadline??"Not set"}**\nRules: **v${e.rules_version}**`,ephemeral:true});
}