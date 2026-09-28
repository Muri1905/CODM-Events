import type { PlayerInput } from "../types.js";

const DISCORD_ID=/^\d{17,20}$/;
const UID=/^\d{5,20}$/;

export function parseRoster(input:string):PlayerInput[] {
  const lines=input.split("\n").map(line=>line.trim()).filter(Boolean);
  if(!lines.length) throw new Error("Roster cannot be empty.");
  const players=lines.map((line,index)=>{
    const parts=line.split("|").map(v=>v.trim());
    if(parts.length!==3) throw new Error(`Player line ${index+1} must be: IGN | Discord ID | UID`);
    const [ign,discordId,uid]=parts;
    if(!ign||!discordId||!uid) throw new Error(`Player line ${index+1} contains an empty field.`);
    if(!DISCORD_ID.test(discordId)) throw new Error(`Player line ${index+1}: Discord ID must be a valid numeric Discord ID.`);
    if(!UID.test(uid)) throw new Error(`Player line ${index+1}: UID must be numeric.`);
    if(ign.length>64) throw new Error(`Player line ${index+1}: IGN is too long.`);
    return {slot:index+1,ign,discordId,uid};
  });
  const discordIds=new Set<string>();
  const uids=new Set<string>();
  for(const player of players){
    if(discordIds.has(player.discordId)) throw new Error(`Discord ID ${player.discordId} appears more than once.`);
    if(uids.has(player.uid)) throw new Error(`UID ${player.uid} appears more than once.`);
    discordIds.add(player.discordId);
    uids.add(player.uid);
  }
  return players;
}
