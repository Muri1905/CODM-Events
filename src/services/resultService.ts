import crypto from "node:crypto";
import { db } from "../database.js";
export function hashScreenshot(buffer:Buffer):string { return crypto.createHash("sha256").update(buffer).digest("hex"); }
export function screenshotAlreadyProcessed(hash:string):boolean { return Boolean(db.prepare("SELECT 1 FROM match_results WHERE screenshot_hash=?").get(hash)); }
export interface ExtractedResult { clanName:string; placement:number; kills:number; confidence?:number; }
export interface ResultPreview { matchId:number; source:"ocr"|"vision"; extracted:ExtractedResult[]; }
export function findTeamByClan(eventId:number,clanName:string):number|undefined {
  const r:any=db.prepare("SELECT id FROM teams WHERE event_id=? AND clan_name=? AND status='approved' LIMIT 1").get(eventId,clanName); return r?.id;
}