import type { ScoringConfig } from "./types.js";
export const DEFAULT_SCORING: ScoringConfig = {
  killPoints: 10,
  placementPoints: { "1": 100, "2": 80, "3": 65, "4": 55, "5": 45 },
  winBonus: 0,
  customBonuses: {},
};
export const EVENT_TEMPLATES = [
  { key: "codm-tournament", name: "CODM Tournament", teamSize: 5, scoring: DEFAULT_SCORING },
  { key: "clan-war", name: "Clan War", teamSize: 5, scoring: { ...DEFAULT_SCORING, placementPoints: {} } },
  { key: "1v1", name: "1v1 Tournament", teamSize: 1, scoring: { killPoints: 0, placementPoints: { "1": 3, "2": 1 }, winBonus: 0, customBonuses: {} } },
  { key: "custom", name: "Custom Event", teamSize: 5, scoring: { killPoints: 0, placementPoints: {}, winBonus: 0, customBonuses: {} } },
] as const;
export const EVENT_STATUS_LABELS = { draft:"DRAFT", registration:"REGISTRATION OPEN", locked:"REGISTRATION LOCKED", live:"LIVE", finished:"FINISHED", cancelled:"CANCELLED" } as const;