export type EventStatus = "draft" | "registration" | "locked" | "live" | "finished" | "cancelled";
export type TeamStatus = "pending" | "approved" | "rejected" | "withdrawn";
export type ResultSource = "manual" | "ocr" | "vision";
export interface ScoringConfig { killPoints: number; placementPoints: Record<string, number>; winBonus: number; customBonuses: Record<string, number>; }
export interface PlayerInput { slot: number; ign: string; discordId: string; uid: string; }
export interface LeaderboardRow { teamId:number; clanName:string; matches:number; kills:number; totalPoints:number; }