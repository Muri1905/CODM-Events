import { db } from "../database.js";

export function startIntake(eventId:number, matchId:number, channelId:string, startedBy:string):void {
  const match=db.prepare("SELECT id,status,event_id FROM matches WHERE id=? AND event_id=?").get(matchId,eventId) as {id:number;status:string;event_id:number}|undefined;
  if (!match) throw new Error("Match does not belong to this event.");
  if (match.status !== "finished") throw new Error("The match must be finished before screenshot processing starts.");

  db.prepare("UPDATE ocr_intakes SET status='closed',closed_at=CURRENT_TIMESTAMP WHERE event_id=? AND status='open'").run(eventId);
  db.prepare("INSERT INTO ocr_intakes (event_id,match_id,channel_id,started_by,status) VALUES (?,?,?,?, 'open')")
    .run(eventId,matchId,channelId,startedBy);
}

export function stopIntake(eventId:number):void {
  db.prepare("UPDATE ocr_intakes SET status='closed',closed_at=CURRENT_TIMESTAMP WHERE event_id=? AND status='open'").run(eventId);
}

export function getOpenIntake(channelId:string):any|undefined {
  return db.prepare("SELECT * FROM ocr_intakes WHERE channel_id=? AND status='open' ORDER BY id DESC LIMIT 1").get(channelId) as any|undefined;
}

export function getIntake(eventId:number):any|undefined {
  return db.prepare("SELECT * FROM ocr_intakes WHERE event_id=? AND status='open' ORDER BY id DESC LIMIT 1").get(eventId) as any|undefined;
}
