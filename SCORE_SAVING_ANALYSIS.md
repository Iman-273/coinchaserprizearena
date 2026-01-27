# 📊 WHERE SCORES ARE SAVED - COMPLETE ANALYSIS

## 🎯 Overview

Tournament scores are saved in **MULTIPLE PLACES** depending on the game mode and context:

---

## 1️⃣ **TOURNAMENT GAME MODE** (EndlessRunner.tsx)

### Entry Point: `EndlessRunner.tsx` (Lines 200-250)

```typescript
// ✅ SAVES TO: Supabase RPC Function
const { data, error } = await supabase.rpc("save_tournament_progress", payload);

// Payload:
{
  p_user_id: "user123",
  p_tournament_id: "tournament42",
  p_score: 1500,           // Total coins collected
  p_distance: 2500,        // Distance traveled (delta)
  p_coins: 150             // New coins since last save (delta)
}
```

### When It's Called:
- **Auto-save every 30 seconds** during gameplay
- **On exit** when user clicks "Save & Exit"
- **Only in tournament mode** (`mode === "tournament"`)

### What Happens:
```
save_tournament_progress RPC
       │
       ├─ Backend processes the RPC
       └─ Saves/updates data in multiple tables:
           ├─ game_scores (INSERT new game record)
           ├─ tournament_participants (UPDATE best_score)
           └─ profiles (UPDATE if needed)
```

---

## 2️⃣ **FREE PLAY GAME MODE** (SkyRunnerGame.tsx)

### Entry Point: `SkyRunnerGame.tsx` (Lines 65-120)

```typescript
// ✅ SAVES TO: game_scores table directly
const { error: scoreError } = await supabase
  .from('game_scores')
  .insert({
    user_id: profile.id,
    profile_id: profile.id,
    tournament_id: null,              // NULL in free play
    score: finalScore,
    coins_collected: coins,
    game_duration: finalTime,
    distance_covered: finalDistance,
    obstacles_avoided: Math.floor(finalDistance / 50),
    game_mode: 'free_play'            // Marks as free play
  });

// Also updates user's total coins:
await supabase
  .from('profiles')
  .update({ 
    total_coins: (profile.total_coins || 0) + coins 
  })
  .eq('id', profile.id);
```

### When It's Called:
- **When free play game ends** (game over)
- Inserted directly into `game_scores` table

### Difference from Tournament:
- `tournament_id` is **NULL**
- `game_mode` is **'free_play'** (not 'tournament')
- Does NOT update `tournament_participants`

---

## 3️⃣ **DATABASE TABLES INVOLVED**

### **game_scores Table**

```
Columns:
├─ id (PK)
├─ user_id (FK → profiles.id)
├─ tournament_id (FK → tournaments.id) [CAN BE NULL]
├─ score: number              [COINS COLLECTED]
├─ distance: number           [METERS TRAVELED]
├─ game_mode: enum            ['free_play' | 'tournament']
├─ created_at: timestamp
└─ updated_at: timestamp

Data Structure:
{
  "id": "abc123",
  "user_id": "user456",
  "tournament_id": "tourn789",      ← NULL if free play
  "score": 1250,
  "distance": 3000,
  "game_mode": "tournament",        ← 'free_play' or 'tournament'
  "created_at": "2026-01-26T10:30:00Z"
}
```

### **tournament_participants Table**

```
Columns:
├─ id (PK)
├─ tournament_id (FK → tournaments.id)
├─ user_id (FK → profiles.id)
├─ entry_payment_id: string (Stripe session ID)
├─ best_score: number    ← UPDATED when user plays tournament
├─ created_at: timestamp
└─ updated_at: timestamp

Example:
{
  "tournament_id": "tourn789",
  "user_id": "user456",
  "best_score": 1250,      ← Highest score from ANY game in this tournament
  "entry_payment_id": "stripe_session_123"
}
```

### **profiles Table**

```
Columns:
├─ id (PK)
├─ total_coins: number       ← UPDATED after each game
├─ total_winnings: number    ← UPDATED when user wins tournament
├─ total_spent: number       ← UPDATED when user pays entry fee
├─ tournament_active: boolean
└─ ...other fields

Example:
{
  "id": "user456",
  "total_coins": 5000,        ← Sum of all coins ever earned
  "total_winnings": 150,      ← Prize money won
  "total_spent": 4.00         ← Entry fees paid (£2 × 2 tournaments)
}
```

---

## 4️⃣ **SAVE FLOW DIAGRAM**

```
┌─────────────────────────────────────────────────────────────┐
│                    SCORE SAVING FLOW                        │
└─────────────────────────────────────────────────────────────┘

TOURNAMENT MODE:
================

EndlessRunner (User Playing)
       │
       ├─ Every 30 seconds → Call RPC: save_tournament_progress
       │                     (or when user saves/exits)
       │
       ├─ RPC Payload:
       │  ├─ p_user_id
       │  ├─ p_tournament_id
       │  ├─ p_score (coins)
       │  ├─ p_distance (delta)
       │  └─ p_coins (delta)
       │
       └─ RPC Backend Process:
           ├─ INSERT into game_scores
           │  ├─ user_id
           │  ├─ tournament_id ← NOT NULL
           │  ├─ score
           │  ├─ distance
           │  └─ game_mode: 'tournament'
           │
           ├─ UPDATE tournament_participants
           │  └─ best_score (if this score > previous best)
           │
           └─ UPDATE profiles
              └─ total_coins += coins_collected


FREE PLAY MODE:
================

SkyRunnerGame (User Playing Free)
       │
       ├─ Game ends (time up or hit obstacle)
       │
       ├─ Direct INSERT into game_scores:
       │  ├─ user_id
       │  ├─ tournament_id: NULL ← NULL for free play
       │  ├─ score
       │  ├─ distance
       │  ├─ game_mode: 'free_play'
       │  └─ coins_collected
       │
       └─ UPDATE profiles
          └─ total_coins += coins_collected
```

---

## 5️⃣ **KEY DIFFERENCES: Tournament vs Free Play**

| Aspect | Tournament | Free Play |
|--------|-----------|-----------|
| **Save Method** | RPC function `save_tournament_progress` | Direct INSERT into `game_scores` |
| **Save Frequency** | Every 30 seconds + on exit | Once at game end |
| **tournament_id** | Filled (active tournament ID) | NULL |
| **game_mode** | 'tournament' | 'free_play' |
| **Updates tournament_participants** | YES (best_score) | NO |
| **10-minute timer** | YES | NO |
| **Affects leaderboard** | YES | NO (user history only) |
| **Counts toward prizes** | YES | NO |

---

## 6️⃣ **WHERE SCORES ARE READ/DISPLAYED**

### **Leaderboard Screen** (LeaderboardScreen.tsx)

```typescript
// Tournament Leaders Tab:
const { data: tournamentLeaders } = await supabase
  .from('tournament_participants')
  .select(`
    user_id,
    best_score,
    profiles!inner(username)
  `)
  .eq('tournament_id', currentTournament.id)
  .order('best_score', { ascending: false });
// Reads from: tournament_participants (best_score field)

// Winners Tab:
const { data: winners } = await supabase
  .from('tournament_winners')
  .select('*')
  .order('position', { ascending: true });
// Reads from: tournament_winners

// My Games Tab:
const { data: gameHistory } = await supabase
  .from('game_scores')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
// Reads from: game_scores (all games, free + tournament)
```

---

## 7️⃣ **RPC FUNCTION: save_tournament_progress**

### Location: Backend/Database
The RPC function is defined in Supabase backend and handles:

```sql
FUNCTION save_tournament_progress(
  p_user_id UUID,
  p_tournament_id UUID,
  p_score INTEGER,
  p_distance INTEGER,
  p_coins INTEGER
)

Process:
1. Validate inputs
2. INSERT game record into game_scores table
3. UPDATE tournament_participants.best_score
4. UPDATE profiles.total_coins
5. Return success/error
```

### Called From: [EndlessRunner.tsx Line 241](src/components/game/EndlessRunner.tsx#L241)

---

## 8️⃣ **SCORE SAVING TIMELINE IN TOURNAMENT**

```
User Starts Tournament Game (Monday 10:00)
       │
       ├─ 10:05 → Auto-save #1 (RPC call)
       │           └─ game_scores: INSERT
       │           └─ tournament_participants: UPDATE best_score
       │
       ├─ 10:10 → Auto-save #2 (if score improved)
       │           └─ game_scores: INSERT (new record)
       │           └─ tournament_participants: UPDATE best_score
       │
       ├─ 10:15 → Game ends (time up or obstacle hit)
       │           └─ Manual save (Save & Exit button)
       │           └─ Final score recorded
       │
       ├─ 10:20 → User plays another tournament game
       │           └─ Another round of saves
       │           └─ tournament_participants.best_score updated
       │
       └─ FRIDAY → finalize_tournament calculates winner
                    ├─ Sums ALL game_scores for this user
                    │  WHERE tournament_id = current_tournament
                    │  AND game_mode = 'tournament'
                    ├─ Calculates total_score
                    ├─ Ranks against other participants
                    └─ Inserts into tournament_winners (top 3 only)
```

---

## 9️⃣ **VERIFICATION: Check Actual Saves**

### To verify scores are being saved:

```javascript
// Check game_scores table:
const { data: myScores } = await supabase
  .from('game_scores')
  .select('*')
  .eq('user_id', 'YOUR_USER_ID');

console.log('My game scores:', myScores);
// Output: Array of all games (tournament + free play)

// Check tournament_participants:
const { data: tournament } = await supabase
  .from('tournament_participants')
  .select('*')
  .eq('tournament_id', 'TOURNAMENT_ID')
  .eq('user_id', 'YOUR_USER_ID');

console.log('My tournament best score:', tournament[0]?.best_score);
// Output: Single highest score in this tournament

// Check profiles total_coins:
const { data: profile } = await supabase
  .from('profiles')
  .select('total_coins')
  .eq('id', 'YOUR_USER_ID')
  .single();

console.log('My total coins ever:', profile.total_coins);
// Output: Sum of all coins from all games
```

---

## 🔟 **SUMMARY: WHERE EACH SCORE GOES**

```
TOURNAMENT GAME PLAYED:
├─ game_scores table (new record with tournament_id)
├─ tournament_participants.best_score (if highest)
└─ profiles.total_coins (updated)

FREE PLAY GAME PLAYED:
├─ game_scores table (new record with tournament_id=NULL)
└─ profiles.total_coins (updated)

TOURNAMENT ENDS (Fri-Sun):
├─ tournament_winners table (top 3 only)
└─ profiles.total_winnings (for winners)
```

---

**File Locations:**
- Tournament saving: [EndlessRunner.tsx Lines 200-250](src/components/game/EndlessRunner.tsx#L200-L250)
- Free play saving: [SkyRunnerGame.tsx Lines 65-120](src/components/game/SkyRunnerGame.tsx#L65-L120)
- RPC definition: [types.ts Line 511](src/integrations/supabase/types.ts#L511)
- Leaderboard reading: [useLeaderboardData.tsx Line 95](src/components/leaderboard/hooks/useLeaderboardData.tsx#L95)
