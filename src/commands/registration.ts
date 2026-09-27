import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, SlashCommandBuilder, type ButtonInteraction, type ChatInputCommandInteraction, type ModalSubmitInteraction } from "discord.js";
import { getEvent } from "../services/eventService.js";
import { getTextChannel } from "../services/channelService.js";
import { registerTeam, setTeamStatus, getTeam, getPlayers } from "../services/registrationService.js";
import { parseRoster } from "../utils/registrationParser.js";
import { audit } from "../services/auditService.js";

export const data=new SlashCommandBuilder().setName("registration").setDescription("Manage event registration.")
.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
.addSubcommand(s=>s.setName("panel").setDescription("Publish registration panel.").addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)));

export async function execute(i:ChatInputCommandInteraction):Promise<void>{
 if(!i.guild){await i.reply({content:"❌ Server only.",ephemeral:true});return;}
 const e=getEvent(i.options.getInteger("event-id",true)); if(!e||e.guild_id!==i.guild.id){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 const c=await getTextChannel(i.guild,e.registration_channel_id); if(!c){await i.reply({content:"❌ Run /event setup first.",ephemeral:true});return;}
 const embed=new EmbedBuilder().setTitle(`📝 ${e.name} — Team Registration`).setDescription(`Register your roster below. Required players: **${e.team_size}**.`).addFields({name:"Prize Pool",value:e.prize_pool??"Not set",inline:true},{name:"Status",value:e.status==="registration"?"OPEN":"CLOSED",inline:true});
 const row=new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`codm:register:${e.id}`).setLabel("Register Team").setStyle(ButtonStyle.Primary));
 await c.send({embeds:[embed],components:[row]}); await i.reply({content:`✅ Panel published in ${c}.`,ephemeral:true});
}

export async function handleButton(i:ButtonInteraction):Promise<void>{
 const eventId=Number(i.customId.split(":")[2]); const e=getEvent(eventId);
 if(!e){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 if(e.status!=="registration"){await i.reply({content:"❌ Registration is closed.",ephemeral:true});return;}
 const modal=new ModalBuilder().setCustomId(`codm:register-modal:${e.id}`).setTitle(`Register — ${e.name}`);
 const clan=new TextInputBuilder().setCustomId("clan").setLabel("Clan name").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(64);
 const roster=new TextInputBuilder().setCustomId("roster").setLabel("Players: IGN | Discord ID | UID").setStyle(TextInputStyle.Paragraph).setRequired(true).setPlaceholder("Player 1 | 123456789 | 1234567890\nPlayer 2 | ...").setMaxLength(4000);
 modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(clan),new ActionRowBuilder<TextInputBuilder>().addComponents(roster));
 await i.showModal(modal);
}

export async function handleModal(i:ModalSubmitInteraction):Promise<void>{
 const eventId=Number(i.customId.split(":")[2]); const e=getEvent(eventId); if(!e){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 try{
  const players=parseRoster(i.fields.getTextInputValue("roster"));
  if(players.length!==e.team_size) throw new Error(`This event requires exactly ${e.team_size} players.`);
  const teamId=registerTeam({eventId,managerId:i.user.id,clanName:i.fields.getTextInputValue("clan"),players});
  audit({guildId:i.guildId!,actorId:i.user.id,eventId,action:"team.registered",targetType:"team",targetId:String(teamId)});
  await i.reply({content:`✅ Registration submitted. Team ID: **${teamId}**. Your team is now **PENDING REVIEW**.`,ephemeral:true});
  const channel=await getTextChannel(i.guild!,e.teams_channel_id);
  if(channel) await channel.send({content:`📥 **Team #${teamId} — ${i.fields.getTextInputValue("clan")}**\nManager: <@${i.user.id}>\nStatus: **PENDING REVIEW**`,components:[new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`codm:team:approve:${teamId}`).setLabel("Approve").setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId(`codm:team:reject:${teamId}`).setLabel("Reject").setStyle(ButtonStyle.Danger))]});
 }catch(error){await i.reply({content:`❌ ${error instanceof Error?error.message:"Registration failed."}`,ephemeral:true});}
}

export async function handleApproval(i:ButtonInteraction):Promise<void>{
 if(!i.memberPermissions?.has(PermissionFlagsBits.ManageGuild)){await i.reply({content:"❌ Organizer permission required.",ephemeral:true});return;}
 const parts=i.customId.split(":"); const teamId=Number(parts[3]); const action=parts[2]; const team=getTeam(teamId);
 if(!team){await i.reply({content:"❌ Team not found.",ephemeral:true});return;}
 const status=action==="approve"?"approved":"rejected"; setTeamStatus(teamId,status);
 audit({guildId:i.guildId!,actorId:i.user.id,eventId:team.event_id,action:`team.${status}`,targetType:"team",targetId:String(teamId)});
 if(status==="approved"){try{const user=await i.client.users.fetch(team.manager_discord_id);await user.send(`🏆 Your team **${team.clan_name}** has been **APPROVED** for event **${getEvent(team.event_id)?.name}**. Please review the event rules before match day.`);}catch{}}
 await i.update({content:`Team #${teamId} — **${team.clan_name}** — **${status.toUpperCase()}**`,components:[]});
}