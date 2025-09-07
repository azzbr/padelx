Core Design Philosophy for Beta:

Simple but Scalable: Start with LocalStorage, easy to migrate to database later
Mobile-First Responsive: Most scoring happens courtside on phones
Offline-First: Works without internet (critical for indoor courts)
Version Control Ready: Clean separation of concerns for future updates

Data Flow Architecture:
User Input → React Component → Context/State → LocalStorage → UI Update
                                    ↓
                            History Tracking
                                    ↓
                            Analytics Engine
Smart Matching Algorithm (Beta Version):
1. Get available players (16 needed)
2. Sort by skill rating
3. Divide into tiers (Strong: top 50%, Weak: bottom 50%)
4. Within each tier: Pair 1st+8th, 2nd+7th, etc.
5. Match teams with closest combined scores
6. Avoid recent partnerships (last 3 rounds)

Complete Prompt for Cline to Create the Padel Team Maker Beta
markdownCreate a Padel Team Maker web application for beta testing. This is an internal tool for managing padel (tennis-like sport) matches with 16 players divided into balanced teams.

## PROJECT SETUP:
Create a React application with the following structure:
- Use Create React App with TypeScript
- Install Tailwind CSS for styling
- Use LocalStorage for data persistence (no backend needed for beta)
- Make it fully responsive (mobile-first design)
- Dark mode support

## FILE STRUCTURE:
padel-team-maker/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx
│   │   ├── PlayerManager.tsx
│   │   ├── MatchMaker.tsx
│   │   ├── LiveMatch.tsx
│   │   ├── MatchHistory.tsx
│   │   ├── Leaderboard.tsx
│   │   └── Navigation.tsx
│   ├── context/
│   │   └── AppContext.tsx
│   ├── utils/
│   │   ├── matchmaking.ts
│   │   ├── storage.ts
│   │   └── calculations.ts
│   ├── types/
│   │   └── index.ts
│   └── App.tsx

## DATA MODELS (TypeScript):

```typescript
interface Player {
  id: string;
  name: string;
  skill: number; // 1-100
  isGuest: boolean;
  availability: string[]; // array of date strings
  createdAt: string;
  stats: {
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    gamesWon: number;
    gamesLost: number;
    currentStreak: number;
    points: number;
    lastPlayed?: string;
  };
}

interface Match {
  id: string;
  sessionId: string;
  round: number;
  court: string;
  status: 'waiting' | 'live' | 'completed';
  teamA: {
    player1Id: string;
    player2Id: string;
    gamesWon: number;
  };
  teamB: {
    player1Id: string;
    player2Id: string;
    gamesWon: number;
  };
  winner?: 'teamA' | 'teamB';
  startTime?: string;
  endTime?: string;
  history: GamePoint[]; // for undo functionality
}

interface GamePoint {
  teamAScore: number;
  teamBScore: number;
  timestamp: string;
  action: 'teamA_score' | 'teamB_score' | 'undo';
}

interface Session {
  id: string;
  date: string;
  availablePlayers: string[]; // player IDs
  matches: string[]; // match IDs
  status: 'planning' | 'active' | 'completed';
  tiers: {
    strong: string[]; // player IDs
    weak: string[]; // player IDs
  };
}
CORE FEATURES TO IMPLEMENT:
1. PLAYER MANAGER:

Add new player with name and initial skill (1-100)
Quick "Add Guest" button (auto-names: Guest1, Guest2, etc.)
Edit player skill ratings
Mark availability with date picker (multiple dates)
Show availability status with green/red indicators
Delete/deactivate players
Import sample players button (for testing - creates 16 players)

2. PLAYER AVAILABILITY SYSTEM:

Calendar view showing who's available each day
Quick toggle buttons: "Available Today", "Available Tomorrow"
Minimum players indicator (need 16 to start)
Send reminder button (just shows "Reminders sent!" for beta)

3. MATCH MAKER:

Only enabled when 16+ players are available
Three generation modes:
a) Skill-Based Tiers: Strong vs Strong, Weak vs Weak
b) Random Balanced: Random but ensures team balance
c) Mixed Tiers: Each team has one strong + one weak player
Algorithm for Skill-Based Tiers:

Sort available players by skill
Top 8 = Strong tier, Bottom 8 = Weak tier
In each tier: pair 1st+8th, 2nd+7th, 3rd+6th, 4th+5th
Match teams with similar combined skills
Assign to courts (Court A & B for strong, Court C & D for weak)


Show preview before confirming
Avoid recent partnerships (check last 3 sessions)

4. LIVE MATCH TRACKER:

Display all 4 courts in a grid (2x2 on desktop, 1 column on mobile)
For each court:

Team names and current score (e.g., "3-2")
Big +1 buttons for each team to add score
Game progress bar (first to 4 wins)
Undo last action button
Finish match button (when someone reaches 4)
Timer showing match duration


Auto-save every score change to LocalStorage

5. UNDO/EDIT FUNCTIONS:

Store last 10 actions per match
Undo button reverts last score change
Edit mode to manually adjust scores
Confirm dialog for major changes
Activity log showing all changes

6. MATCH HISTORY VIEWER:

List all sessions with date and player count
Expandable to show all matches from that session
Format: "Round X - Court A: Player1 + Player2 (WIN 4) vs Player3 + Player4 (LOSE 2)"
Search by player name
Filter by date range
Export session results as text (copyable format)

7. LEADERBOARD:

Sort by: Points, Win Rate, Games Won, Current Streak
Point system:

Win: +10 points
Close loss (3-4): +2 points
Regular loss (2-4): +1 point
Bad loss (0-4 or 1-4): 0 points


Show player stats: Matches (W-L), Games (W-L), Points, Trend
Highlight top 3 players
Show "Most Improved" badge for biggest rating gain

8. DASHBOARD (Home Page):

Today's availability count
Quick actions: New Session, Add Player, View History
Live matches (if any active)
Recent results (last 3 matches)
Top 3 leaderboard preview

UI/UX REQUIREMENTS:

Clean, modern design with cards and shadows
Color scheme: Primary: Indigo-600, Success: Green-500, Danger: Red-500
All buttons should be large and touch-friendly (min 44px height)
Loading states for all actions
Toast notifications for success/error messages
Confirmation dialogs for destructive actions
Mobile responsive (test at 375px width)
Dark mode toggle in navigation

LOCALSTORAGE STRUCTURE:
javascript{
  "padel_players": [...],
  "padel_matches": [...],
  "padel_sessions": [...],
  "padel_settings": {
    "gamesToWin": 4,
    "courtsAvailable": ["A", "B", "C", "D"],
    "darkMode": false
  }
}
MATCHMAKING ALGORITHM DETAILS:
javascriptfunction generateSkillBasedMatches(players) {
  // Sort by skill
  const sorted = players.sort((a, b) => b.skill - a.skill);
  
  // Divide into tiers
  const strong = sorted.slice(0, 8);
  const weak = sorted.slice(8, 16);
  
  // Create balanced teams within each tier
  const strongTeams = [
    [strong[0], strong[7]], // 1st + 8th
    [strong[1], strong[6]], // 2nd + 7th
    [strong[2], strong[5]], // 3rd + 6th
    [strong[3], strong[4]]  // 4th + 5th
  ];
  
  const weakTeams = [
    [weak[0], weak[7]],
    [weak[1], weak[6]],
    [weak[2], weak[5]],
    [weak[3], weak[4]]
  ];
  
  // Create matches (pair teams with closest combined skills)
  return {
    courtA: { teamA: strongTeams[0], teamB: strongTeams[3] },
    courtB: { teamA: strongTeams[1], teamB: strongTeams[2] },
    courtC: { teamA: weakTeams[0], teamB: weakTeams[3] },
    courtD: { teamA: weakTeams[1], teamB: weakTeams[2] }
  };
}
INITIAL SAMPLE DATA:
Include a button "Load Sample Data" that creates:

20 players with varied skills (30-90 range)
Names: Use real names from the example (Salmeen, Nawaf, Khalid, Janahi, Bu Faisal, Badran, Bucheeri, Al Mannai) plus generic ones
5 completed sessions with match history
Current availability for 16 players

ERROR HANDLING:

Validate minimum 16 players before creating matches
Prevent duplicate player names
Handle LocalStorage quota exceeded
Graceful fallbacks for missing data

FUTURE CONSIDERATIONS (Add comments for these):

Database backend integration points
User authentication preparation
API structure for mobile app
WebSocket connections for real-time updates
Export to Excel functionality

TESTING CHECKLIST:

Can add 16 players and create matches
Undo works correctly during live scoring
History persists after page refresh
Leaderboard calculates points correctly
Works on mobile (iPhone Safari, Android Chrome)
Guest players can be added and play matches
Availability system prevents unavailable players from being selected

Build this application step by step, starting with the project setup, then implementing each component. Make sure all TypeScript types are properly defined and the app is fully functional for beta testing.