import { db } from "../database.js";
import { DEFAULT_SCORING, EVENT_TEMPLATES } from "../constants.js";
import type { EventStatus, ScoringConfig } from "../types.js";

export function getEvent(id:number): any { return db.prepare("SELECT * FROM events WHERE id=?").get(id); }
export function getGuildEvents(guildId:string): any[] { return db.prepare("SELECT * FROM events WHERE guild_id=? ORDER BY id DESC").all(guildId) as any[]; }

export function createEvent(input:{guildId:string;name:string;createdBy:string;templateKey?:string;teamSize?:number;prizePool?:string|null;description?:string|null}): any {
  const template = EVENT_TEMPLATES.find(x=>x.key===input.templateKey) ?? EVENT_TEMPLATES[3];
  const tx=db.transaction(()=>{
    const r=db.prepare("INSERT INTO events (guild_id,name,template_key,description,team_size,prize_pool,created_by) VALUES (?,?,?,?,?,?,?)")
      .run(input.guildId,input.name,template.key,input.description??null,input.teamSize??template.teamSize,input.prizePool??null,input.createdBy);
    const id=Number(r.lastInsertRowid);
    db.prepare("INSERT INTO event_scoring (event_id,kill_points,placement_points_json,win_bonus,custom_bonuses_json) VALUES (?,?,?,?,?)")
      .run(id,template.scoring.killPoints,JSON.stringify(template.scoring.placementPoints),template.scoring.winBonus,JSON.stringify(template.scoring.customBonuses));
    db.prepare("INSERT INTO rules_versions (event_id,version,content,created_by) VALUES (?,?,?,?)").run(id,1,"Rules have not been configured yet.",input.createdBy);
    return id;
  });
  return getEvent(tx());
}

export function updateEventStatus(id:number,status:EventStatus):void { db.prepare("UPDATE events SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status,id); }

export function updateEventChannels(id:number,channels:Record<string,string>):void {
  const entries=Object.entries(channels); if(!entries.length)return;
  db.prepare(`UPDATE events SET ${entries.map(([k])=>k+"=?").join(",")},updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(...entries.map(([,v])=>v),id);
}

export function getScoring(eventId:number):ScoringConfig {
  const r:any=db.prepare("SELECT * FROM event_scoring WHERE event_id=?").get(eventId);
  if(!r) return DEFAULT_SCORING;
  return { killPoints:r.kill_points, placementPoints:JSON.parse(r.placement_points_json), winBonus:r.win_bonus, customBonuses:JSON.parse(r.custom_bonuses_json) };
}

export function updateScoring(eventId:number,s:ScoringConfig):void {
  db.prepare("UPDATE event_scoring SET kill_points=?,placement_points_json=?,win_bonus=?,custom_bonuses_json=? WHERE event_id=?")
    .run(s.killPoints,JSON.stringify(s.placementPoints),s.winBonus,JSON.stringify(s.customBonuses),eventId);
}

export function setDeadline(id:number,value:string|null):void { db.prepare("UPDATE events SET registration_deadline=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(value,id); }

export function getEventTeams(eventId:number):any[] {
  return db.prepare(`SELECT t.*, COUNT(p.id) AS player_count
    FROM teams t LEFT JOIN players p ON p.team_id=t.id
    WHERE t.event_id=? GROUP BY t.id ORDER BY t.id ASC`).all(eventId) as any[];
}

export function getEventResults(eventId:number):any[] {
  return db.prepare(`SELECT r.*, m.match_number, t.clan_name
    FROM match_results r
    JOIN matches m ON m.id=r.match_id
    JOIN teams t ON t.id=r.team_id
    WHERE m.event_id=? ORDER BY m.match_number ASC, r.total_points DESC, r.id ASC`).all(eventId) as any[];
}
