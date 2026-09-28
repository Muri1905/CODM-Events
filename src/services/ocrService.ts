import { config } from "../config.js";
import { db } from "../database.js";
import { findTeamByClan } from "./resultService.js";
import { saveResult } from "./scoringService.js";

export interface OcrExtraction {
  clanName: string;
  placement: number;
  kills: number;
  confidence: number;
}

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          clanName: { type: "string" },
          placement: { type: "integer", minimum: 1 },
          kills: { type: "integer", minimum: 0 },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        },
        required: ["clanName", "placement", "kills", "confidence"]
      }
    }
  },
  required: ["results"]
};

const activeWorkers = new Set<number>();
let pollingStarted = false;

function normalizeClan(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (typeof content?.text === "string") return content.text;
    }
  }
  throw new Error("OCR provider returned no text.");
}

async function callVision(url: string, mimeType: string): Promise<{ extracted: OcrExtraction[]; raw: unknown }> {
  if (!config.openaiApiKey) throw new Error("OPENAI_API_KEY is not configured.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openaiApiKey}`
    },
    body: JSON.stringify({
      model: config.ocrModel,
      input: [{
        role: "user",
        content: [
          {
            type: "input_text",
            text:
              "You are the result extraction engine for a Call of Duty: Mobile tournament. Read the scoreboard screenshot. " +
              "Extract every clearly visible team/clan result. Return only structured data. " +
              "Do not invent values. If a value is unclear, lower confidence. " +
              "placement is the final placement number and kills is the displayed kill count. " +
              "Use the clan/team name exactly as visible where possible."
          },
          {
            type: "input_image",
            image_url: url,
            detail: "high"
          }
        ]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "codm_match_results",
          strict: true,
          schema
        }
      }
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OCR provider HTTP ${response.status}: ${body.slice(0, 500)}`);
  }

  const payload = await response.json() as any;
  const parsed = JSON.parse(extractOutputText(payload));
  const extracted = Array.isArray(parsed.results) ? parsed.results : [];

  return {
    extracted,
    raw: payload
  };
}

async function processJob(job: any): Promise<void> {
  db.prepare("UPDATE ocr_jobs SET status='processing',attempts=attempts+1,updated_at=CURRENT_TIMESTAMP WHERE id=?").run(job.id);

  try {
    const { extracted, raw } = await callVision(job.source_url, job.content_type || "image/jpeg");

    const accepted: Array<{ resultId: number; clanName: string; placement: number; kills: number; confidence: number }> = [];
    const review: Array<{ clanName: string; reason: string }> = [];
    const seenTeams = new Set<number>();
    const seenPlacements = new Set<number>();

    for (const item of extracted) {
      const clanName = String(item.clanName ?? "").trim();
      const placement = Number(item.placement);
      const kills = Number(item.kills);
      const confidence = Number(item.confidence);

      if (!clanName || !Number.isInteger(placement) || placement < 1 || !Number.isInteger(kills) || kills < 0) {
        review.push({ clanName: clanName || "Unknown", reason: "Invalid extracted values." });
        continue;
      }

      const teamId = findTeamByClan(job.event_id, clanName);
      if (!teamId) {
        review.push({ clanName, reason: "Clan is not an approved team in this event." });
        continue;
      }
      if (seenTeams.has(teamId)) {
        review.push({ clanName, reason: "Team was detected more than once in the screenshot." });
        continue;
      }
      if (seenPlacements.has(placement)) {
        review.push({ clanName, reason: `Placement ${placement} was detected more than once.` });
        continue;
      }

      seenTeams.add(teamId);
      seenPlacements.add(placement);

      const existing = db.prepare("SELECT id FROM match_results WHERE match_id=? AND team_id=? AND status!='rejected'").get(job.match_id, teamId) as { id: number } | undefined;
      if (existing) {
        review.push({ clanName, reason: `Team already has result #${existing.id} for this match.` });
        continue;
      }

      const id = saveResult({
        eventId: job.event_id,
        matchId: job.match_id,
        teamId,
        placement,
        kills,
        bonus: 0,
        source: "vision",
        status: "pending",
        screenshotHash: accepted.length === 0 ? job.screenshot_hash : null,
        raw: { extraction: item, provider: raw, screenshotHash: job.screenshot_hash }
      });

      accepted.push({ resultId: id, clanName, placement, kills, confidence });
    }

    const lowConfidence = accepted.filter(r => r.confidence < config.ocrConfidenceThreshold);
    db.prepare(
      "UPDATE ocr_jobs SET status=?,result_count=?,review_count=?,raw_extraction_json=?,error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?"
    ).run(
      accepted.length > 0 && lowConfidence.length === 0 && review.length === 0 ? "completed" : "review",
      accepted.length,
      review.length + lowConfidence.length,
      JSON.stringify({ extracted, accepted, review, lowConfidence }),
      review.length || lowConfidence.length ? JSON.stringify({ review, lowConfidence }) : null,
      job.id
    );
  } catch (error) {
    const attempts = Number(job.attempts) + 1;
    const status = attempts >= config.ocrMaxRetries ? "failed" : "pending";
    db.prepare("UPDATE ocr_jobs SET status=?,error=?,updated_at=CURRENT_TIMESTAMP WHERE id=?")
      .run(status, error instanceof Error ? error.message : String(error), job.id);
  }
}

async function workerLoop(): Promise<void> {
  while (true) {
    const jobs = db.prepare(
      "SELECT * FROM ocr_jobs WHERE status='pending' AND attempts<? ORDER BY id ASC LIMIT ?"
    ).all(config.ocrMaxRetries, config.ocrConcurrency) as any[];

    const available = jobs.filter(job => !activeWorkers.has(job.id));
    if (available.length === 0) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      continue;
    }

    await Promise.all(available.map(async job => {
      activeWorkers.add(job.id);
      try {
        await processJob(job);
      } finally {
        activeWorkers.delete(job.id);
      }
    }));
  }
}

export function enqueueScreenshotJob(input: {
  eventId: number;
  matchId: number;
  guildId: string;
  channelId: string;
  messageId: string;
  attachmentId: string;
  sourceUrl: string;
  attachmentName: string;
  contentType: string;
  size: number;
  screenshotHash: string;
}): { id: number; duplicate: boolean } {
  const existing = db.prepare("SELECT id FROM ocr_jobs WHERE attachment_id=?").get(input.attachmentId) as { id: number } | undefined;
  if (existing) return { id: existing.id, duplicate: true };

  const duplicate = db.prepare("SELECT id FROM ocr_jobs WHERE screenshot_hash=? AND match_id=? AND status!='failed'").get(input.screenshotHash, input.matchId) as { id: number } | undefined;
  if (duplicate) return { id: duplicate.id, duplicate: true };

  const result = db.prepare(
    "INSERT INTO ocr_jobs (event_id,match_id,guild_id,channel_id,message_id,attachment_id,source_url,attachment_name,content_type,size,screenshot_hash,status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending')"
  ).run(
    input.eventId, input.matchId, input.guildId, input.channelId, input.messageId,
    input.attachmentId, input.sourceUrl, input.attachmentName, input.contentType,
    input.size, input.screenshotHash
  );

  return { id: Number(result.lastInsertRowid), duplicate: false };
}

export function startOcrWorkers(): void {
  if (pollingStarted) return;
  if (!config.openaiApiKey) {
    console.warn("OCR workers disabled: OPENAI_API_KEY is not configured.");
    return;
  }
  pollingStarted = true;
  void workerLoop();
}
