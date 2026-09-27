import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getEvent } from "../services/eventService.js";
import { getRules, saveRules } from "../services/rulesService.js";
export const data=new SlashCommandBuilder().setName("rules").setDescription("Manage event rules.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
.addSubcommand(s=>s.setName("show").setDescription("Show current rules.").addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)))
.addSubcommand(s=>s.setName("set").setDescription("Create a new rules version.").addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)).addStringOption(o=>o.setName("content").setDescription("Rules text").setMaxLength(4000).setRequired(true)));
export async function execute(i:ChatInputCommandInteraction):Promise<void>{
 if(!i.guildId){await i.reply({content:"❌ Server only.",ephemeral:true});return;}
 const e=getEvent(i.options.getInteger("event-id",true));if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 if(i.options.getSubcommand()==="show"){const r=getRules(e.id);await i.reply({content:`**Rules v${r.version}**\n\n${r.content}`,ephemeral:true});return;}
 const v=saveRules(e.id,i.options.getString("content",true),i.user.id);await i.reply({content:`✅ Rules saved as **v${v}**.`,ephemeral:true});
}