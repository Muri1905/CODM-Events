import { PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
export function isOrganizer(interaction:ChatInputCommandInteraction):boolean {
  if(!interaction.guild) return false;
  if(interaction.guild.ownerId===interaction.user.id) return true;
  const member=interaction.member;
  return Boolean(member && "permissions" in member && member.permissions.has(PermissionFlagsBits.ManageGuild));
}