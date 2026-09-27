import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "./config.js";

fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });
export const db = new Database(config.databasePath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 guild_id TEXT NOT NULL,
 name TEXT NOT NULL,
 template_key TEXT NOT NULL DEFAULT 'custom',
 status TEXT NOT NULL DEFAULT 'draft',
 description TEXT,
 prize_pool TEXT,
 team_size INTEGER NOT NULL DEFAULT 5,
 registration_deadline TEXT,
 rules_version INTEGER NOT NULL DEFAULT 1,
 registration_channel_id TEXT,
 rules_channel_id TEXT,
 teams_channel_id TEXT,
 leaderboard_channel_id TEXT,
 results_channel_id TEXT,
 category_id TEXT,
 created_by TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS event_scoring (
 event_id INTEGER PRIMARY KEY,
 kill_points INTEGER NOT NULL DEFAULT 0,
 placement_points_json TEXT NOT NULL DEFAULT '{}',
 win_bonus INTEGER NOT NULL DEFAULT 0,
 custom_bonuses_json TEXT NOT NULL DEFAULT '{}',
 FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS rules_versions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 event_id INTEGER NOT NULL,
 version INTEGER NOT NULL,
 content TEXT NOT NULL,
 created_by TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(event_id,version),
 FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS teams (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 event_id INTEGER NOT NULL,
 manager_discord_id TEXT NOT NULL,
 clan_name TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS players (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 team_id INTEGER NOT NULL,
 slot INTEGER NOT NULL,
 ign TEXT NOT NULL,
 discord_id TEXT NOT NULL,
 uid TEXT NOT NULL,
 UNIQUE(team_id,slot),
 FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS matches (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 event_id INTEGER NOT NULL,
 match_number INTEGER NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 played_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(event_id,match_number),
 FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS match_results (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 match_id INTEGER NOT NULL,
 team_id INTEGER NOT NULL,
 placement INTEGER NOT NULL,
 kills INTEGER NOT NULL,
 bonus_points INTEGER NOT NULL DEFAULT 0,
 total_points INTEGER NOT NULL,
 source TEXT NOT NULL DEFAULT 'manual',
 status TEXT NOT NULL DEFAULT 'pending',
 screenshot_hash TEXT,
 raw_extraction_json TEXT,
 verified_by TEXT,
 verified_at TEXT,
 UNIQUE(match_id,team_id),
 FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
 FOREIGN KEY(team_id) REFERENCES teams(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 guild_id TEXT NOT NULL,
 event_id INTEGER,
 actor_discord_id TEXT NOT NULL,
 action TEXT NOT NULL,
 target_type TEXT,
 target_id TEXT,
 details_json TEXT NOT NULL DEFAULT '{}',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_events_guild ON events(guild_id);
CREATE INDEX IF NOT EXISTS idx_teams_event ON teams(event_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_event ON matches(event_id);
CREATE INDEX IF NOT EXISTS idx_results_match ON match_results(match_id);
`);

export function closeDatabase():void { db.close(); }
