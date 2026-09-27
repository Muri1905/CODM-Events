import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, type ButtonInteraction, type ChatInputCommandInteraction } from "discord.js";
import { getEvent } from "../services/eventService.js";
export const data=new SlashCommandBuilder().setName("organizer").setDescription("Organizer control center.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
.addSubcommand(s=>s.setName("panel").setDescription("Publish the organizer control panel.").addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)));
export async function execute(i:ChatInputCommandInteraction):Promise<void>{
 if(!i.guild||!i.guildId){await i.reply({content:"❌ Server only.",ephemeral:true});return;}
 const e=getEvent(i.options.getInteger("event-id",true));if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 const row1=new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId(`codm:org:status:${e.id}`).setLabel("Event Status").setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId(`codm:org:teams:${e.id}`).setLabel("Teams").setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId(`codm:org:scoring:${e.id}`).setLabel("Scoring").setStyle(ButtonStyle.Primary),
 );
 const row2=new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId(`codm:org:rules:${e.id}`).setLabel("Rules").setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId(`codm:org:results:${e.id}`).setLabel("Results").setStyle(ButtonStyle.Primary),
 );
 await i.reply({embeds:[new EmbedBuilder().setTitle(`🎮 Organizer Control — ${e.name}`).setDescription("Central control point for this event. The buttons are the entry points for the full organizer workflow.")],components:[row1,row2]});
}
export async function handleOrganizerButton(i:ButtonInteraction):Promise<void>{
 if(!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)){await i.reply({content:"❌ Organizer permission required.",ephemeral:true});return;}
 const [,,action,id]=i.customId.split(":");await i.reply({content:`🛠️ Organizer module **${action}** selected for event **#${id}**. This control point is ready for the detailed editor workflow.`,ephemeral:true});
}