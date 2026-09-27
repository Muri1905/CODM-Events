import { PermissionFlagsBits, SlashCommandBuilder, type ChatInputCommandInteraction } from "discord.js";
import { getEvent } from "../services/eventService.js";
import { saveResult } from "../services/scoringService.js";
export const data=new SlashCommandBuilder().setName("result").setDescription("Store verified match results.").setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
.addSubcommand(s=>s.setName("add").setDescription("Add a verified result.").addIntegerOption(o=>o.setName("event-id").setDescription("Event ID").setMinValue(1).setRequired(true)).addIntegerOption(o=>o.setName("match-id").setDescription("Match ID").setMinValue(1).setRequired(true)).addIntegerOption(o=>o.setName("team-id").setDescription("Team ID").setMinValue(1).setRequired(true)).addIntegerOption(o=>o.setName("placement").setDescription("Placement").setMinValue(1).setRequired(true)).addIntegerOption(o=>o.setName("kills").setDescription("Kills").setMinValue(0).setRequired(true)).addIntegerOption(o=>o.setName("bonus").setDescription("Bonus points").setMinValue(0)));
export async function execute(i:ChatInputCommandInteraction):Promise<void>{
 if(!i.guildId){await i.reply({content:"❌ Server only.",ephemeral:true});return;}
 const e=getEvent(i.options.getInteger("event-id",true));if(!e||e.guild_id!==i.guildId){await i.reply({content:"❌ Event not found.",ephemeral:true});return;}
 const id=saveResult({eventId:e.id,matchId:i.options.getInteger("match-id",true),teamId:i.options.getInteger("team-id",true),placement:i.options.getInteger("placement",true),kills:i.options.getInteger("kills",true),bonus:i.options.getInteger("bonus")??0,source:"manual",status:"verified",verifiedBy:i.user.id});
 await i.reply({content:`✅ Result saved. **${id}** points calculated from the event scoring.`,ephemeral:true});
}