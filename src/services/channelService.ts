import { ChannelType, PermissionFlagsBits, type Guild, type TextChannel, type PermissionOverwriteOptions } from "discord.js";
import { updateEventChannels } from "./eventService.js";

export async function setupEventChannels(guild:Guild,eventId:number,eventName:string,organizerRoleId?:string):Promise<void>{
 const category=await guild.channels.create({name:`🏆 ${eventName}`,type:ChannelType.GuildCategory});
 const publicRead:PermissionOverwriteOptions={id:guild.roles.everyone.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory]};
 const publicReadOnly:PermissionOverwriteOptions={id:guild.roles.everyone.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory],deny:[PermissionFlagsBits.SendMessages]};
 const registration=await guild.channels.create({name:"📝│registration",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[publicRead]});
 const rules=await guild.channels.create({name:"📜│rules",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[publicReadOnly]});
 const teams=await guild.channels.create({name:"👥│registered-teams",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[publicReadOnly]});
 const leaderboard=await guild.channels.create({name:"🏆│leaderboard",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[publicReadOnly]});
 const results=await guild.channels.create({name:"📊│results",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[publicReadOnly]});
 const organizerOverwrites:PermissionOverwriteOptions[]=[{id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]}];
 if(organizerRoleId) organizerOverwrites.push({id:organizerRoleId,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]});
 const organizer=await guild.channels.create({name:"🔐│organizer-control",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:organizerOverwrites});
 updateEventChannels(eventId,{category_id:category.id,registration_channel_id:registration.id,rules_channel_id:rules.id,teams_channel_id:teams.id,leaderboard_channel_id:leaderboard.id,results_channel_id:results.id,organizer_channel_id:organizer.id,organizer_role_id:organizerRoleId??""});
}
export async function getTextChannel(guild:Guild,channelId:string|null):Promise<TextChannel|null>{
 if(!channelId)return null;
 const channel=await guild.channels.fetch(channelId);
 return channel?.type===ChannelType.GuildText ? channel : null;
}
