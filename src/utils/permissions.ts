import { PermissionFlagsBits, type ChatInputCommandInteraction } from "discord.js";
export function isOrganizer(interaction:ChatInputCommandInteraction):boolean {
 return Boolean(interaction.guild && (interaction.guild.ownerId===interaction.user.id || interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)));
}
