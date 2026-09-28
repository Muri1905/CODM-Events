import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { EVENT_STATUS_LABELS, EVENT_TEMPLATES } from "../constants.js";
import { audit } from "../services/auditService.js";
import { createEvent, getEvent, getGuildEvents, setDeadline, updateEventDetails, updateEventStatus } from "../services/eventService.js";
import { setupEventChannels, getTextChannel } from "../services/channelService.js";
import { getRules } from "../services/rulesService.js";

export const data = new SlashCommandBuilder()
.setName("event").setDescription("Create and manage CODM events.")
.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
.addSubcommand(s=>s.setName("create").setDescription("Create an event.")
 .addStringOption(o=>o.setName("name").setDescription("Event name").setRequired(true))
 .addStringOption(o=>o.setName("template").setDescription("Event template").addChoices(...EVENT_TEMPLATES.map(t=>({name:t.name,value:t.key}))))
 .addIntegerOption(o=>o.setName("team-size").setDescription("Players per team").setMinValue(1).setMaxValue(20))
 .addStringOption(o=>o.setName("prize-pool").setDescription("Prize pool"))
 .addStringOption(o=>o.setName("description").setDescription("Description")))
.addSubcommand(s=>s.setName("edit").setDescription("Edit event settings.")
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true))
 .addStringOption(o=>o.setName("name").setDescription("Event name"))
 .addIntegerOption(o=>o.setName("team-size").setDescription("Players per team").setMinValue(1).setMaxValue(20))
 .addStringOption(o=>o.setName("prize-pool").setDescription("Prize pool; use CLEAR to remove"))
 .addStringOption(o=>o.setName("description").setDescription("Description; use CLEAR to remove")))
.addSubcommand(s=>s.setName("setup").setDescription("Create Discord channels.")
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true))
 .addRoleOption(o=>o.setName("organizer-role").setDescription("Role allowed to see the private organizer channel")))
.addSubcommand(s=>s.setName("open").setDescription("Open registration.")
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("close").setDescription("Lock registration.")
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("live").setDescription("Start the live tournament phase.")
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("finish").setDescription("Finish the event.")
 .addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("cancel").setDescription("Cancel the event.")
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
  try{
   const e=createEvent({guildId:i.guildId,name:i.options.getString("name",true),templateKey:i.options.getString("template")??"custom",teamSize:i.options.getInteger("team-size")??undefined,prizePool:i.options.getString("prize-pool"),description:i.options.getString("description"),createdBy:i.user.id});
   audit({guildId:i.guildId,actorId:i.user.id,eventId:e.id,action:"event.created"});
   await i.reply({content:`🏆 **${e.name}** created. ID **${e.id}**. Run **/event setup event-id:${e.id}** to build the tournament channels.`,ephemeral:true});
  }catch(error){await i.reply({content:`❌ ${error instanceof Error?error.message:"Could not create event."}`,ephemeral:true});}
  return;
 }

 const id=i.options.getInteger("event-id")??0;
 const e=getEvent(id);
 if(sub!=="list"&&(!e||e.guild_id!==i.guildId)){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}

 try{
  if(sub==="edit"){
   const rawPrize=i.options.getString("prize-pool");
   const rawDescription=i.options.getString("description");
   if(!i.options.getString("name") && i.options.getInteger("team-size")===null && rawPrize===null && rawDescription===null){
    await i.reply({content:"❌ Provide at least one setting to edit.",ephemeral:true});return;
   }
   updateEventDetails(id,{
    name:i.options.getString("name")??undefined,
    teamSize:i.options.getInteger("team-size")??undefined,
    prizePool:rawPrize===null?undefined:(rawPrize.toUpperCase()==="CLEAR"?null:rawPrize),
    description:rawDescription===null?undefined:(rawDescription.toUpperCase()==="CLEAR"?null:rawDescription)
   });
   audit({guildId:i.guildId,actorId:i.user.id,eventId:id,action:"event.updated"});
   await i.reply({content:`✅ Event **#${id}** updated.`,ephemeral:true});return;
  }

  if(sub==="setup"){
   if(e.category_id){await i.reply({content:"❌ This event already has a Discord structure.",ephemeral:true});return;}
   await setupEventChannels(i.guild,e.id,e.name,i.options.getRole("organizer-role")?.id);
   const updated=getEvent(e.id);
   const rulesChannel=await getTextChannel(i.guild,updated.rules_channel_id);
   if(rulesChannel){
    const rules=getRules(e.id);
    await rulesChannel.send({embeds:[new EmbedBuilder().setTitle(`📜 ${e.name} — Rules`).setDescription(rules.content).setFooter({text:`Rules v${rules.version} • CODM Events`})]});
   }
   audit({guildId:i.guildId,actorId:i.user.id,eventId:e.id,action:"event.channels.created"});
   await i.reply({content:"✅ Event Discord structure created and the rules channel initialized.",ephemeral:true});return;
  }

  if(sub==="open"||sub==="close"||sub==="live"||sub==="finish"||sub==="cancel"){
   const statusMap={open:"registration",close:"locked",live:"live",finish:"finished",cancel:"cancelled"} as const;
   const status=statusMap[sub as keyof typeof statusMap];
   updateEventStatus(e.id,status);
   audit({guildId:i.guildId,actorId:i.user.id,eventId:e.id,action:"event.status",details:{status}});
   await i.reply({content:`✅ Event is now **${EVENT_STATUS_LABELS[status]}**.`,ephemeral:true});return;
  }

  if(sub==="deadline"){
   const iso=i.options.getString("iso");
   if(iso&&Number.isNaN(Date.parse(iso))){await i.reply({content:"❌ Invalid date/time.",ephemeral:true});return;}
   setDeadline(e.id,iso);
   await i.reply({content:iso?`✅ Deadline: ${iso}`:"✅ Deadline cleared.",ephemeral:true});return;
  }

  if(sub==="list"){
   const rows=getGuildEvents(i.guildId);
   await i.reply({content:rows.length?rows.map((x:any)=>`**#${x.id}** ${x.name} — ${EVENT_STATUS_LABELS[x.status as keyof typeof EVENT_STATUS_LABELS]}`).join("\n"):"No events yet.",ephemeral:true});return;
  }

  const current=getEvent(e.id);
  await i.reply({embeds:[new EmbedBuilder().setTitle(`🏆 ${current.name}`).setDescription(current.description??"No description set.").addFields(
   {name:"Status",value:EVENT_STATUS_LABELS[current.status as keyof typeof EVENT_STATUS_LABELS],inline:true},
   {name:"Template",value:current.template_key,inline:true},
   {name:"Team Size",value:String(current.team_size),inline:true},
   {name:"Prize Pool",value:current.prize_pool??"Not set",inline:true},
   {name:"Deadline",value:current.registration_deadline??"Not set",inline:true},
   {name:"Rules",value:`v${current.rules_version}`,inline:true}
  )],ephemeral:true});
 }catch(error){
  await i.reply({content:`❌ ${error instanceof Error?error.message:"Event operation failed."}`,ephemeral:true});
 }
}
