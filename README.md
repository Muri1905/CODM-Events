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

## Next implementation layer

1. Full organizer control panel with buttons/selects/modals.
2. Rich registration validation and persistent team cards.
3. Scoring editor UI.
4. Match result screenshot upload + OCR/vision provider.
5. Result preview and organizer confirmation.
6. Automatic result/leaderboard graphics.
7. Production database/hosting, backups and monitoring.

## Development

Copy `.env.example` to `.env`, set the Discord credentials and test guild ID, then run:

```bash
npm install
npm run check
npm run deploy-commands
npm run dev
```

Never commit `.env` or Discord credentials.
