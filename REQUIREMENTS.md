# GoalGuru Requirements

## MVP Features (Built or In Progress)

### 1. Admin Registration
- Admin can register players by username only (no password entry)
- System generates a temporary password for admin to distribute
- Players cannot access accounts until they receive their password from admin
- Admin account protected — only admin can access `/admin` page

### 2. Public Leaderboard
- All players visible on public leaderboard sorted by total points
- Players see their own rank, display name, total points, and bet count
- No login required to view the leaderboard
- Current player highlighted with "Tu" badge

### 3. Match Betting
- User can place a bet on any match (before it starts) choosing one of three outcomes:
  - Home team win (odds: 1)
  - Draw (odds: X)
  - Away team win (odds: 2)
- Two odds modes:
  - **Fixed odds**: Based on FIFA team rankings, calculated at generation
  - **Pool odds**: Dynamic odds based on how much money is bet on each outcome
- Bet stake deducted from player's coin balance immediately
- Each player can place only one bet per match
- Bets locked once match starts ("live" or "finished" status)

### 4. Match Results & Scoring
- Admin enters match results (home score, away score)
- Bets automatically settled when match result is entered
- Points awarded: `stake × coefficient` if bet wins, 0 if bet loses
- Player's total points updated automatically in leaderboard

### 5. Fixtures & Grouping
- All FIFA World Cup 2026 group-stage matches (72 total, 12 groups A–L)
- Matches grouped by group letter
- Real team names, real match dates, real venues
- Real match odds calculated from FIFA team rankings
- Venues: 12 real US host cities (Los Angeles, New York, Dallas, Miami, Houston, Atlanta, Seattle, Toronto, Vancouver, Guadalajara, Mexico City, Kansas City)

### 6. User Accounts
- Email/password registration and login (Supabase auth)
- Google OAuth sign-in support (optional, when configured)
- Player profile: display name, coin balance (1000 starting), total points, default odds preference
- Password-protected account access — only players with a password can log in

### 7. UI & Localization
- Fully Lithuanian interface
- Responsive design (mobile + desktop)
- Group tabs to filter matches
- Match cards show team names, venue, date, current/final score
- Bet sheet modal for placing/reviewing bets
- Header with nav, user info, logout

---

## Future Features (Planned, Not Yet Built)

### F1: Squad & Player Data
- Real player rosters for each team (names, numbers, positions)
- Players visible in team details
- Foundation for player-level predictions

### F2: Substitution Tracking
- Admin can log player substitutions during matches
- Minute, team, player out, player in
- Needed for player-level micro-bets

### F3: Player-Level Micro-Bets
- Individual prediction: "Will [Player Name] score a goal in [Match] first half?"
- Each micro-bet has a separate coefficient
- Coefficient varies by player and match context
- Expands market complexity and engagement

### F4: Knockout Stage
- Generate Round of 32, QF, SF, Final brackets
- Auto-advance teams based on group stage standings
- Bettable like group stage matches
- Expand tournament from 72 to 120+ total matches

### F5: Live Match Status
- Mark matches as "live" during gameplay
- Disable new bets once match starts
- Display live score updates (manual or API-driven)

### F6: Bets Persistence (Supabase)
- Currently bets stored only in browser localStorage
- Need server-side `bets` table to survive device/browser changes
- Enable cross-device betting account access

### F7: Enhanced Admin Tools
- Batch result entry
- View settlement history
- Player activity audit log
- Reset player balances or points (for testing/admin use)

### F8: Analytics & Reporting
- Player win rate per odds mode
- Most-bet-on matches
- Hottest teams/players in prediction market
- Export tournament results

---

## Technical Notes

### Data Sources
- **Teams & Groups**: FIFA World Cup 2026 official draw (Dec 9, 2024)
- **Match Schedule**: Official FIFA 2026 WC fixture list (real dates, real venues)
- **Odds Algorithm**: Based on FIFA world rankings (recalculated as rankings shift)
- **Player Rosters**: FIFA official squad lists (TBD — source when building F1)

### Architecture
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth)
- **Auth Fallback**: localStorage (for local dev, no Supabase)
- **Odds**: Fixed (pre-calculated), Pool (dynamic per match)
- **Scoring**: Deterministic (stake × coefficient if won, 0 if lost)

### Key Constraints
- No real-money transactions — purely gamified scoring
- Tightly-scoped group: admin controls all registrations (no public signup)
- All points public, account access private (password-controlled)
- Single-bet-per-match rule (no multiple bets on same match)
