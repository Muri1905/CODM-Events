import { db } from "../database.js";
import type { PlayerInput, TeamStatus } from "../types.js";
export function registerTeam(input:{eventId:number;managerId:string;clanName:string;players:PlayerInput[]}):number {
  if(!input.players.length) throw new Error("At least one player is required.");
  const duplicate=db.prepare(`SELECT 1 FROM players p JOIN teams t ON t.id=p.team_id WHERE t.event_id=? AND t.status IN ('pending','approved') AND p.uid IN (${input.players.map(()=>"?").join(",")}) LIMIT 1`)
    .get(input.eventId,...input.players.map(p=>p.uid));
  if(duplicate) throw new Error("A player UID is already registered for this event.");
  return db.transaction(()=>{
    const team=db.prepare("INSERT INTO teams (event_id,manager_discord_id,clan_name,status) VALUES (?,?,?,'pending')").run(input.eventId,input.managerId,input.clanName);
    const id=Number(team.lastInsertRowid);
    const add=db.prepare("INSERT INTO players (team_id,slot,ign,discord_id,uid) VALUES (?,?,?,?,?)");
    for(const p of input.players)add.run(id,p.slot,p.ign,p.discordId,p.uid);
    return id;
  })();
}
export function setTeamStatus(id:number,status:TeamStatus):void { db.prepare("UPDATE teams SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(status,id); }
export function getTeam(id:number):any { return db.prepare("SELECT * FROM teams WHERE id=?").get(id); }
export function getTeams(eventId:number):any[] { return db.prepare("SELECT * FROM teams WHERE event_id=? ORDER BY id").all(eventId) as any[]; }
export function getPlayers(teamId:number):PlayerInput[] { return db.prepare("SELECT slot,ign,discord_id AS discordId,uid FROM players WHERE team_id=? ORDER BY slot").all(teamId) as PlayerInput[]; }