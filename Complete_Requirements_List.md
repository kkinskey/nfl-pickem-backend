# NFL Pick'em API - Complete Requirements List

Based on the code in `src`, here's what your application currently does:

---

## Core Application Architecture
- Express.js REST API server listening on configurable port (default 3000)
- CORS-enabled for cross-origin requests
- PostgreSQL database via Prisma ORM
- JWT-based authentication and authorization
- Centralized error handling
- Pretty-printed JSON responses (2-space indentation)
- Health check endpoint at `/healthz`

---

## Authentication & Authorization (`auth.js`)
### JWT token verification middleware (`authenticateToken`)
- Validates Bearer tokens from Authorization header
- Decodes token payload containing: `id`, `email`, `role`, `iat`, `exp`
- Attaches decoded user to `req.user` for downstream use
- Returns 401 for missing/invalid/expired tokens

### Admin-only access middleware (`authenticateAdmin`)
- First authenticates token, then checks `role === "ADMIN"`
- Returns 403 for non-admin users

---

## User Management (`users routes + usersService.js`)
### View all users (GET `/users`)
- Returns list of users with `id`, `email`, `display_name`, `role`, `created_at`
- No password hashes exposed

### User registration (POST `/users`)
- Accepts: `email`, `password`, `display_name`, optional `role`
- Validates email and password presence
- Checks for existing email (prevents duplicates)
- Hashes password with bcrypt (10 salt rounds)
- Defaults role to `"USER"` if not provided
- Returns created user (without password)

### User login (POST `/users/login`)
- Accepts: `email`, `password`
- Validates credentials exist
- Verifies user exists in database
- Compares password with bcrypt hash
- Generates JWT token with 1-hour expiration
- Token payload includes: `id`, `email`, `role`
- Returns token and user object (without password)

### Update user profile (PATCH `/users/updateProfile`) [Protected]
- Requires valid JWT token
- Only supports updating `display_name`
- User can only update their own profile (`req.user.id`)
- Returns updated user object (without password)

---

## Picks Management (`/picks routes + picksService.js`)
### View all picks (GET `/picks`)
- Optional filters: `userId`, `season`, `week`
- Season + week must both be provided to filter by week
- Returns picks with:
  - User info (`id`, `name`, `email`)
  - Game info (`id`, `season`, `week`, `home/away teams`, `kickoff`, `status`)
  - Pick details (`winner_side`, `selected_team code`, `margin`, `score`, timestamps)
- Ordered by pick id ascending

### View single pick (GET `/picks/:id`)
- Validates pick ID is numeric
- Returns 400 for invalid pick ID
- Returns 404 if pick not found
- Same response shape as view all picks (but single object)

### Create pick (POST `/picks/add`)
- Accepts: `user_id`, `game_id`, `winner ("HOME"/"AWAY")`, `margin`
- Validates all required fields present
- Normalizes winner to uppercase
- Validates winner is `"HOME"` or `"AWAY"`
- Validates margin is numeric
- Prevents duplicate picks (same user + game combination)
- Returns 409 for duplicate picks
- Returns created pick with `id`, `user_id`, `game_id`, `winner`, `margin`, `submitted_at`

### Update pick (PATCH `/picks/:id`) [Protected]
- Requires valid JWT token
- Validates pick ID is numeric
- Authorization: user must be pick owner OR admin
- Returns 403 if user lacks permission
- Kickoff lock: prevents edits after game has started
- Returns 403 if game already started
- Accepts: `winner` (optional), `margin` (optional)
- Validates and normalizes winner if provided
- Validates margin is numeric if provided
- Returns 400 if no valid fields provided
- Returns updated pick with all details

---

## Admin Picks Management (`/admin/picks route`)
### View all picks (admin only) (GET `/admin/picks`) [Protected - Admin]
- Requires valid JWT token with ADMIN role
- Returns 403 for non-admin users
- Same filters and response format as public picks endpoint
- Can see picks from all users

---

## Games Management (`/games routes + gamesService.js`)
### View single game (GET `/games/:id`)
- Validates game ID is numeric
- Returns 400 for invalid game ID
- Returns 404 if game not found
- Returns game with:
  - Game details (`id`, `season`, `week_number`, `kickoff_at`, `status`)
  - Final scores (home/away, null if not final)
  - Home team info (`id`, `code`, `name`)
  - Away team info (`id`, `code`, `name`)

---

## Weeks Management (`/weeks routes + weeksService.js`)
### Get current week (GET `/weeks/current`)
- Finds first non-finalized week
- Orders by season descending, week_number ascending
- Returns 404 if no current week found
- Returns week object with all fields

### Get week schedule (GET `/weeks/:id/games`)
- Validates week ID is numeric
- Returns 400 for invalid week ID
- Returns 404 if week not found
- Returns all games for that week with:
  - Game details (`game_id`, `kickoff_at`, `status`)
  - Home/away team info (`id`, `code`, `name`)
  - Week info (`id`, `season`, `week_number`)
- Ordered by kickoff_at ascending

### Create week (POST `/weeks/add`) [Protected - Admin]
- Requires valid JWT token with ADMIN role
- Accepts: `season`, `week_number`
- Prevents duplicate weeks (same season + week_number)
- Returns created week with `id`, `season`, `week_number`, `open_at`, `lock_at`, `is_finalized`, `created_at`

---

## Standings Management (`/standings routes + standingsService.js`)
### Calculate weekly standings (POST `/standings/calculate/weekly`) [Protected - Admin]
- Requires valid JWT token with ADMIN role
- Accepts: `week_id` in request body
- Validates week_id is numeric
- Fetches all finalized games for the week
- Returns error if no finalized games found
- Determines actual winner for each game (`HOME`, `AWAY`, or null for tie)
- Fetches all picks for those games
- Compares picks to actual winners
- Calculates score: 1 point for correct pick, 0 for incorrect
- Updates individual pick scores in database
- Upserts standings table (`user_id + week_id` composite key)
- Marks week as finalized
- Returns standings with `user_id`, `display_name`, and `score`
- Sorted by score descending

### Calculate overall standings (POST `/standings/calculate/overall`) [Protected - Admin]
- Requires valid JWT token with ADMIN role
- Aggregates total scores per user from standings table
- Returns error if no standings data available
- Fetches user display names in single query (avoids N+1)
- Returns array of users with `user_id`, `display_name`, `total_score`
- Sorted by total_score descending

---

## Score Update System (`updateScores.js`)
- Automated game score sync
- Fetches NFL game data from nflverse CSV endpoint
- Filters games by minimum season (default 2024)
- Maps team abbreviations to full team names
- Looks up team IDs from database
- Parses game date/time and scores
- Determines game status (`FINAL` if scores exist, `SCHEDULED` otherwise)
- Upserts games using `external_game_id` as unique key
- Updates: scores, status, `last_synced_at`
- Creates new games if they don't exist
- Connects to home team, away team, and week
- Logs sync progress and skipped games
- Can be run as standalone script

---

## Error Handling (`utils/handleError.js`)
- Centralized error handling utility
- Handles validation errors with 400 status
- Handles authentication errors with 401 status
- Handles authorization errors with 403 status
- Handles not found errors with 404 status
- Handles conflict errors (duplicates) with 409 status
- Logs error messages
- Returns structured JSON error responses

---

## Database Layer (`lib/db.js`)
- Prisma client singleton
- Single database connection instance
- Used across all services for database operations

---

## Data Model (Inferred from queries)
- **Users table**: `id`, `email`, `password_hash`, `display_name`, `role`, `created_at`
- **Teams table**: `id`, `code`, `name`
- **Weeks table**: `id`, `season`, `week_number`, `open_at`, `lock_at`, `is_finalized`, `created_at`
- **Games table**: `id`, `external_game_id`, `week_id`, `home_team_id`, `away_team_id`, `kickoff_at`, `status`, `final_home_score`, `final_away_score`, `source`, `last_synced_at`
- **Picks table**: `id`, `user_id`, `game_id`, `winner`, `margin`, `score`, `submitted_at`, `updated_at`
- **Standings table**: `user_id`, `week_id` (composite primary