import type { PlayerInput } from "../types.js";
export function parseRoster(input:string):PlayerInput[] {
  return input.split("\n").map((line,index)=>{
    const [ign,discordId,uid]=line.split("|").map(v=>v.trim());
    if(!ign||!discordId||!uid) throw new Error(`Player line ${index+1} must be: IGN | Discord ID | UID`);
    return {slot:index+1,ign,discordId,uid};
  });
}