import { db } from "../database.js";
export function audit(input:{guildId:string; actorId:string; action:string; eventId?:number; targetType?:string; targetId?:string; details?:Record<string,unknown>}):void {
  db.prepare("INSERT INTO audit_logs (guild_id,event_id,actor_discord_id,action,target_type,target_id,details_json) VALUES (?,?,?,?,?,?,?)")
    .run(input.guildId,input.eventId??null,input.actorId,input.action,input.targetType??null,input.targetId??null,JSON.stringify(input.details??{}));
}