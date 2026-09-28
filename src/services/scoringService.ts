import { db } from "../database.js";
import { getScoring } from "./eventService.js";

export function calculateScore(eventId:number,placement:number,kills:number,bonus=0):number {
  const s=getScoring(eventId);
  return (s.placementPoints[String(placement)]??0)+(kills*s.killPoints)+bonus+(placement===1?s.winBonus:0);
}

export function createMatch(eventId:number,number:number):number {
  if(number<1||!Number.isInteger(number)) throw new Error("Match number must be a positive whole number.");
  const existing=db.prepare("SELECT id FROM matches WHERE event_id=? AND match_number=?").get(eventId,number) as {id:number}|undefined;
  if(existing) throw new Error(`Match #${number} already exists (ID ${existing.id}).`);
  const r=db.prepare("INSERT INTO matches (event_id,match_number) VALUES (?,?)").run(eventId,number);
  return Number(r.lastInsertRowid);
}

export function getMatch(id:number):any { return db.prepare("SELECT * FROM matches WHERE id=?").get(id); }
export function getEventMatches(eventId:number):any[] { return db.prepare("SELECT * FROM matches WHERE event_id=? ORDER BY match_number ASC").all(eventId) as any[]; }
export function updateMatchStatus(id:number,status:"pending"|"live"|"finished"):void {
  db.prepare("UPDATE matches SET status=?,played_at=CASE WHEN ?='finished' THEN COALESCE(played_at,CURRENT_TIMESTAMP) ELSE played_at END WHERE id=?").run(status,status,id);
}

export function saveResult(input:{eventId:number;matchId:number;teamId:number;placement:number;kills:number;bonus?:number;source?:string;status?:string;verifiedBy?:string|null;screenshotHash?:string|null;raw?:unknown}):number {
  const match=getMatch(input.matchId);
  if(!match||match.event_id!==input.eventId) throw new Error("Match does not belong to this event.");
  const team=db.prepare("SELECT id,status FROM teams WHERE id=? AND event_id=?").get(input.teamId,input.eventId) as {id:number;status:string}|undefined;
  if(!team) throw new Error("Team does not belong to this event.");
  if(team.status!=="approved") throw new Error("Only approved teams can receive match results.");
  if(input.placement<1||!Number.isInteger(input.placement)) throw new Error("Placement must be a positive whole number.");
  if(input.kills<0||!Number.isInteger(input.kills)) throw new Error("Kills must be a non-negative whole number.");
  if(match.status==="pending") throw new Error("Start the match before submitting a result.");
  const existing=db.prepare("SELECT id FROM match_results WHERE match_id=? AND team_id=?").get(input.matchId,input.teamId) as {id:number}|undefined;
  if(existing) throw new Error(`This team already has a result for this match (Result #${existing.id}).`);
  if(input.screenshotHash){
    const duplicate=db.prepare("SELECT id FROM match_results WHERE screenshot_hash=?").get(input.screenshotHash) as {id:number}|undefined;
    if(duplicate) throw new Error(`This screenshot has already been submitted (Result #${duplicate.id}).`);
  }
  const total=calculateScore(input.eventId,input.placement,input.kills,input.bonus??0);
  const r=db.prepare("INSERT INTO match_results (match_id,team_id,placement,kills,bonus_points,total_points,source,status,verified_by,verified_at,screenshot_hash,raw_extraction_json) VALUES (?,?,?,?,?,?,?,?,?,CASE WHEN ? IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,?,?)")
    .run(input.matchId,input.teamId,input.placement,input.kills,input.bonus??0,total,input.source??"manual",input.status??"pending",input.verifiedBy??null,input.verifiedBy??null,input.screenshotHash??null,input.raw?JSON.stringify(input.raw):null);
  return Number(r.lastInsertRowid);
}

export function verifyResult(id:number,verifiedBy:string):void {
  const result=db.prepare("SELECT id FROM match_results WHERE id=?").get(id);
  if(!result) throw new Error("Result not found.");
  db.prepare("UPDATE match_results SET status='verified',verified_by=?,verified_at=CURRENT_TIMESTAMP WHERE id=?").run(verifiedBy,id);
}
export function rejectResult(id:number):void {
  const result=db.prepare("SELECT id FROM match_results WHERE id=?").get(id);
  if(!result) throw new Error("Result not found.");
  db.prepare("UPDATE match_results SET status='rejected' WHERE id=?").run(id);
}

export function getLeaderboard(eventId:number):any[] {
  return db.prepare(`SELECT t.id teamId,t.clan_name clanName,COUNT(CASE WHEN r.status='verified' THEN r.id END) matches,COALESCE(SUM(CASE WHEN r.status='verified' THEN r.kills ELSE 0 END),0) kills,COALESCE(SUM(CASE WHEN r.status='verified' THEN r.total_points ELSE 0 END),0) totalPoints FROM teams t LEFT JOIN match_results r ON r.team_id=t.id WHERE t.event_id=? AND t.status='approved' GROUP BY t.id,t.clan_name ORDER BY totalPoints DESC,kills DESC,t.id ASC`).all(eventId) as any[];
}
