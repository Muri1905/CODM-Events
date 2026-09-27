import { ChannelType, PermissionFlagsBits, type Guild } from "discord.js";
import { updateEventChannels } from "./eventService.js";
export async function setupEventChannels(guild:Guild,eventId:number,eventName:string):Promise<void> {
  const category=await guild.channels.create({name:`🏆 ${eventName}`,type:ChannelType.GuildCategory});
  const publicRead={id:guild.roles.everyone.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory]};
  const publicWrite={id:guild.roles.everyone.id,allow:[PermissionFlagsBits.ViewChannel,PermissionFlagsBits.ReadMessageHistory,PermissionFlagsBits.SendMessages]};
  const registration=await guild.channels.create({name:"📝│registration",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[publicRead,publicWrite]});
  const rules=await guild.channels.create({name:"📜│rules",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[publicRead]});
  const teams=await guild.channels.create({name:"👥│registered-teams",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[publicRead]});
  const leaderboard=await guild.channels.create({name:"🏆│leaderboard",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[publicRead]});
  const results=await guild.channels.create({name:"📊│results",type:ChannelType.GuildText,parent:category.id,permissionOverwrites:[publicRead]});
  updateEventChannels(eventId,{category_id:category.id,registration_channel_id:registration.id,rules_channel_id:rules.id,teams_channel_id:teams.id,leaderboard_channel_id:leaderboard.id,results_channel_id:results.id});
}