import { ChannelType, PermissionFlagsBits, type Guild, type TextChannel } from "discord.js";
import { updateEventChannels } from "./eventService.js";

export async function setupEventChannels(guild:Guild,eventId:number,eventName:string,organizerRoleId?:string):Promise<void>{
 const category=await guild.channels.create({name:`🏆 ${eventName}`,type:ChannelType.GuildCategory});
 const everyoneRead={id:guild.roles.everyone.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory]};
 const everyoneReadOnly={id:guild.roles.everyone.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory],deny:[PermissionFlagsBits.SendMessages]};
 const registration=await guild.channels.create({name:"📝│registration",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[everyoneRead]});
 const rules=await guild.channels.create({name:"📜│rules",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[everyoneReadOnly]});
 const teams=await guild.channels.create({name:"👥│registered-teams",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[everyoneReadOnly]});
 const leaderboard=await guild.channels.create({name:"🏆│leaderboard",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[everyoneReadOnly]});
 const results=await guild.channels.create({name:"📊│results",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[everyoneReadOnly]});
 const organizer=await guild.channels.create({
  name:"🔐│organizer-control",type:ChannelType.GuildText,parent:category.id,
  permissionOverwrites:[
   {id:guild.roles.everyone.id,deny:[PermissionFlagsBits.ViewChannel]},
   ...(organizerRoleId?[{id:organizerRoleId,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.SendMessages,PermissionFlagsBits.ReadMessageHistory]}]:[])
  ]
 });
 updateEventChannels(eventId,{category_id:category.id,registration_channel_id:registration.id,rules_channel_id:rules.id,teams_channel_id:teams.id,leaderboard_channel_id:leaderboard.id,results_channel_id:results.id,organizer_channel_id:organizer.id,organizer_role_id:organizerRoleId??""});
}
export async function getTextChannel(guild:Guild,channelId:string|null):Promise<TextChannel|null>{
 if(!channelId)return null;
 const channel=await guild.channels.fetch(channelId);
 return channel?.type===ChannelType.GuildText ? channel : null;
}