# CODM Events

A competitive **Call of Duty: Mobile tournament management platform for Discord**.

The project is event-first: each tournament can have its own Discord structure, registration rules, roster size, scoring, matches, results and leaderboard.

## Foundation now in place

- Event lifecycle: draft → registration → locked → live → finished
- Event templates: CODM Tournament, Clan War, 1v1, Custom
- Automatic event category + registration/rules/teams/leaderboard/results channels
- Team registration panel with roster modal
- UID duplicate protection
- Pending → approved/rejected team workflow
- Manager approval DM
- Rules versioning
- Configurable kill/placement/bonus scoring
- Match creation
- Verified result storage and automatic score calculation
- Leaderboard aggregation
- Screenshot hash + OCR/vision result contracts
- Audit logging
- Centralized command deployment and interaction routing
- Professional welcome message when the bot joins a server
- Branded CODM Events welcome artwork

## Commands

`/ping`
`/event create|setup|open|close|deadline|list|status`
`/registration panel`
`/rules show|set`
`/match create`
`/result add`
`/leaderboard`
`/setup templates`

## Product flow

**Create event → build Discord structure → configure rules/scoring → open registration → validate/approve teams → create matches → process screenshots → verify results → calculate scores → publish leaderboard/results.**

## Implemented test layer

- Organizer control panel with status, teams, scoring, rules, matches, results, settings and refresh controls.
- Event editing with lifecycle validation and registration deadline enforcement.
- Automatic event category/channel creation plus initial rules and registration panels.
- Persistent registration button with roster validation, UID protection, manager protection and approval workflow.
- Approved roster publication and manager DM.
- Configurable scoring editor and versioned rules publishing.
- Match lifecycle: create → live → finished.
- Result workflow: pending → verified/rejected, screenshot attachment tracking and duplicate protection.
- Verified leaderboard aggregation and publication.
- Audit trail for event, team, match, scoring, rules and result actions.

## Remaining external integration

1. OCR/vision provider for automatic extraction of placement/kills/team from uploaded screenshots.
2. Automatic result/leaderboard graphic rendering.
3. Production database/hosting, backups and monitoring.

## Development

Copy `.env.example` to `.env`, set the Discord credentials and test guild ID, then run:

```bash
npm install
npm run check
npm run deploy-commands
npm run dev
```

Never commit `.env` or Discord credentials.


## High-volume screenshot processing

Result screenshots are processed through a persistent OCR/vision queue.

1. Finish the match.
2. Run `/result intake action:start event-id:<ID> match-id:<ID>`.
3. Upload screenshots in the event's results channel. Multiple screenshots can be sent in one Discord message.
4. The bot queues them automatically, rejects duplicate attachments, and processes them with controlled concurrency.
5. High-confidence extractions are stored as **pending** results. Low-confidence or inconsistent extractions are flagged for review.
6. Only verified results affect the leaderboard.
7. Stop intake with `/result intake action:stop event-id:<ID>`.

### OCR configuration

Set these environment variables:

- `OPENAI_API_KEY` — API key for the vision/OCR provider.
- `OCR_MODEL` — defaults to `gpt-5.6-luna`.
- `OCR_CONCURRENCY` — simultaneous processing jobs; defaults to 3.
- `OCR_MAX_RETRIES` — retry count for failed jobs; defaults to 3.
- `OCR_CONFIDENCE_THRESHOLD` — automatic acceptance threshold; defaults to 0.90.

The queue is persisted in SQLite, so a burst of screenshots does not create one API request per Discord event loop tick and processing is deliberately concurrency-limited.
