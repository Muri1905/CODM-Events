import { db } from "../database.js";
export function getRules(eventId:number):{version:number;content:string} {
  return (db.prepare("SELECT version,content FROM rules_versions WHERE event_id=? ORDER BY version DESC LIMIT 1").get(eventId) as any) ?? {version:1,content:"Rules have not been configured yet."};
}
export function saveRules(eventId:number,content:string,actorId:string):number {
  const next=getRules(eventId).version+1;
  db.transaction(()=>{
    db.prepare("INSERT INTO rules_versions (event_id,version,content,created_by) VALUES (?,?,?,?)").run(eventId,next,content,actorId);
    db.prepare("UPDATE events SET rules_version=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(next,eventId);
  })();
  return next;
}