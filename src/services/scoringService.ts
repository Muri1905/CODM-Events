import { db } from "../database.js";
import { getScoring } from "./eventService.js";
export function calculateScore(eventId:number,placement:number,kills:number,bonus=0):number {
  const s=getScoring(eventId);
  return (s.placementPoints[String(placement)]??0)+(kills*s.killPoints)+bonus+(placement===1?s.winBonus:0);
}
export function createMatch(eventId:number,number:number):number {
  const r=db.prepare("INSERT INTO matches (event_id,match_number) VALUES (?,?)").run(eventId,number); return Number(r.lastInsertRowid);
}
export function saveResult(input:{eventId:number;matchId:number;teamId:number;placement:number;kills:number;bonus?:number;source?:string;status?:string;verifiedBy?:string|null;screenshotHash?:string|null;raw?:unknown}):number {
  const total=calculateScore(input.eventId,input.placement,input.kills,input.bonus??0);
  const r=db.prepare("INSERT INTO match_results (match_id,team_id,placement,kills,bonus_points,total_points,source,status,verified_by,verified_at,screenshot_hash,raw_extraction_json) VALUES (?,?,?,?,?,?,?,?,?,CASE WHEN ? IS NULL THEN NULL ELSE CURRENT_TIMESTAMP END,?,?)")
    .run(input.matchId,input.teamId,input.placement,input.kills,input.bonus??0,total,input.source??"manual",input.status??"pending",input.verifiedBy??null,input.verifiedBy??null,input.screenshotHash??null,input.raw?JSON.stringify(input.raw):null);
  return Number(r.lastInsertRowid);
}
export function getLeaderboard(eventId:number):any[] {
  return db.prepare(`SELECT t.id teamId,t.clan_name clanName,COUNT(r.id) matches,COALESCE(SUM(r.kills),0) kills,COALESCE(SUM(CASE WHEN r.status='verified' THEN r.total_points ELSE 0 END),0) totalPoints FROM teams t LEFT JOIN match_results r ON r.team_id=t.id WHERE t.event_id=? AND t.status='approved' GROUP BY t.id,t.clan_name ORDER BY totalPoints DESC,kills DESC,t.id ASC`).all(eventId) as any[];
}