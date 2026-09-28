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
