# 🎮 EASYBUCKS TOURNAMENT COMPLETE FLOW DOCUMENTATION

## 📋 TABLE OF CONTENTS
1. [Tournament Timeline](#tournament-timeline)
2. [Tournament States & Transitions](#tournament-states--transitions)
3. [Complete User Journey](#complete-user-journey)
4. [Database & Functions Overview](#database--functions-overview)
5. [Payment Flow](#payment-flow)
6. [Score Tracking & Leaderboard](#score-tracking--leaderboard)
7. [Winner Announcement & Prize Distribution](#winner-announcement--prize-distribution)

---

## 🗓️ TOURNAMENT TIMELINE

### Weekly Tournament Cycle (Asia/Karachi Timezone)

```
┌─────────────────────────────────────────────────────────┐
│        TOURNAMENT WEEKLY SCHEDULE (PKT TIMEZONE)        │
└─────────────────────────────────────────────────────────┘

MONDAY (Day 1)
├─ Tournament state changes: UPCOMING → ACTIVE
├─ Users CAN join (£2.00 entry fee)
├─ Users CAN play & collect coins (=runs/score)
└─ Leaderboard shows live rankings

TUESDAY (Day 2)
├─ Tournament state: ACTIVE
├─ Users CAN join (if haven't already)
├─ Users CAN play & compete
└─ Leaderboard updates in real-time

WEDNESDAY (Day 3)
├─ Tournament state: ACTIVE
├─ Users CAN join (final day to join)
├─ Users CAN play
└─ Leaderboard updates in real-time

THURSDAY (Day 4)
├─ Tournament state: ACTIVE → LOCKED (at 00:00 PKT)
├─ ❌ Users CANNOT join (join window closed)
├─ ✅ Users CAN still play if already joined
└─ Final day to accumulate score

FRIDAY-SUNDAY (Days 5-7)
├─ Tournament state: LOCKED → FINALIZED → EXPIRED
├─ ❌ Users CANNOT play
├─ 🏆 Winner calculation happens
├─ 💰 Prize distribution processed
├─ Notifications sent to winners
└─ New tournament created for next week
```

---

## 🔄 TOURNAMENT STATES & TRANSITIONS

### State Machine Diagram

```
         ┌──────────────┐
         │   UPCOMING   │
         └──────┬───────┘
                │
         Monday 00:00 (PKT)
                │
         ┌──────▼───────┐
         │    ACTIVE    │ ◄──── Users can join & play
         └──────┬───────┘
                │
      Thursday 00:00 (PKT)
                │
         ┌──────▼───────┐
         │    LOCKED    │ ◄──── Users cannot join (can still play)
         └──────┬───────┘
                │
      Sunday 23:59 (PKT)
                │
         ┌──────▼───────┐
         │   FINALIZE   │ ◄──── Calculate winners & distribute prizes
         └──────┬───────┘
                │
         ┌──────▼───────┐
         │   EXPIRED    │ ◄──── Tournament complete
         └──────────────┘
```

---

## 👤 COMPLETE USER JOURNEY

### Scenario: User Joining & Playing Tournament

#### **STEP 1: BROWSE TOURNAMENT (GameScreen.tsx)**
```
User Action: Opens GameScreen
       ↓
System Fetches:
  ├─ Current tournament (state: ACTIVE or UPCOMING)
  ├─ Tournament details: prizes, entry_fee, dates
  ├─ Participant count
  ├─ Join window (join_start_at → join_end_at)
  └─ Days remaining

Display Shows:
  ├─ Tournament card with "Join Tournament - £2.00"
  ├─ Prize pool (£150, £100, £50)
  ├─ Days left countdown
  ├─ Current participants count
  └─ Game rules
```

**Code Location:** [GameScreen.tsx - Lines 60-76](src/components/game/GameScreen.tsx#L60-L76)

---

#### **STEP 2: USER CLICKS "JOIN TOURNAMENT" BUTTON**

```
User clicks: "Join Tournament - £2.00"
       ↓
Trigger: handleTournamentAction()
       ↓
Check: Is user already a participant?
       ├─ NO → Proceed to payment
       └─ YES → Skip to game (Step 3)
```

**Code Location:** [GameScreen.tsx - Lines 128-169](src/components/game/GameScreen.tsx#L128-L169)

---

#### **STEP 3: PAYMENT FLOW** ⚡
```
┌────────────────────────────────────────────┐
│   PAYMENT PROCESSING (Stripe Integration)  │
└────────────────────────────────────────────┘

1. Get Session Token
   └─ User authenticated via Supabase Auth
   
2. Call Edge Function: create-tournament-payment
   ├─ Parameters: tournament_id
   ├─ Amount: £2.00 (200 pence)
   ├─ Currency: GBP
   └─ Return: Stripe checkout URL

3. Stripe Creates Checkout Session
   ├─ Customer creation/lookup
   ├─ Session metadata: {user_id, tournament_id}
   ├─ Success URL: /tournament-success?session_id={SESSION_ID}
   └─ Cancel URL: /

4. Payment Record Created in DB
   ├─ Table: payments
   ├─ Status: pending
   ├─ stripe_payment_intent_id: session.id
   └─ Amount: 2.00 GBP

5. Redirect to Stripe Checkout
   └─ Opens in new tab (window.open)
```

**Edge Function:** [create-tournament-payment/index.ts](supabase/functions/create-tournament-payment/index.ts)

**Code Location:** [GameScreen.tsx - Lines 141-154](src/components/game/GameScreen.tsx#L141-L154)

---

#### **STEP 4: STRIPE PAYMENT COMPLETION**

User completes payment on Stripe checkout page:
```
Stripe Processes Payment
       ↓
Payment Status: PAID
       ↓
Stripe Redirects to: /tournament-success?session_id={CHECKOUT_SESSION_ID}
```

**Payment Page:** [TournamentSuccess.tsx](src/pages/TournamentSuccess.tsx)

---

#### **STEP 5: VERIFY PAYMENT & REGISTER PARTICIPANT** ✅
```
┌──────────────────────────────────────────────┐
│  PAYMENT VERIFICATION (Edge Function)        │
└──────────────────────────────────────────────┘

Function: verify-tournament-payment

Process:
1. Retrieve Stripe session using session_id
   └─ Check payment_status === "paid"

2. If PAID:
   ├─ Update: payments table
   │  └─ Status: pending → succeeded
   │
   ├─ Insert: tournament_participants table
   │  ├─ tournament_id
   │  ├─ user_id
   │  └─ entry_payment_id (session_id)
   │
   ├─ Update: profiles table
   │  └─ tournament_active: true
   │
   └─ Call: increment_total_spent()
      └─ Add £2.00 to user's total_spent

3. Return Success Response
   └─ status: "paid"
   └─ user_id: authenticated_user_id

4. UI Shows Confirmation
   ├─ "Tournament Payment Successful!"
   ├─ CheckCircle icon (green)
   └─ Redirect to home after 3 seconds
```

**Edge Function:** [verify-tournament-payment/index.ts](supabase/functions/verify-tournament-payment/index.ts)

**Code Location:** [TournamentSuccess.tsx - Lines 18-51](src/pages/TournamentSuccess.tsx#L18-L51)

---

#### **STEP 6: START PLAYING TOURNAMENT GAME**

After payment verification succeeds:
```
User clicks: "Start Tournament Game"
       ↓
GameScreen detects: isParticipant = true
       ↓
Launch: <EndlessRunner mode="tournament" />
       ↓
Game Starts:
  ├─ 10-minute countdown timer displayed
  ├─ Player controls character (left/right lanes)
  ├─ Collect coins = Score/Runs increases
  ├─ Hit obstacles = Game over
  ├─ Save progress every 30 seconds
  └─ Final score saved to tournament_scores table
```

**Game Component:** [EndlessRunner.tsx](src/components/game/EndlessRunner.tsx)

**Code Location:** [EndlessRunner.tsx - Lines 23-80](src/components/game/EndlessRunner.tsx#L23-L80)

---

## 💾 DATABASE & FUNCTIONS OVERVIEW

### Key Tables Structure

```
┌─────────────────────────────────────────────────────────┐
│                  TOURNAMENTS TABLE                      │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ name: string (e.g., "Weekly Tournament #42")            │
│ week_key: string (e.g., "2026-4" = Week 4 of 2026)    │
│ state: enum [UPCOMING|ACTIVE|LOCKED|EXPIRED]          │
│ start_at: timestamp (Monday 00:00 PKT)                 │
│ end_date: timestamp (Sunday 23:59 PKT)                 │
│ join_start_at: timestamp (Monday 00:00 PKT)            │
│ join_end_at: timestamp (Thursday 23:59 PKT)            │
│ entry_fee: number (e.g., 2.00 in GBP)                 │
│ first_prize: number (e.g., 150)                        │
│ second_prize: number (e.g., 100)                       │
│ third_prize: number (e.g., 50)                         │
│ created_at: timestamp                                  │
│ updated_at: timestamp                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│           TOURNAMENT_PARTICIPANTS TABLE                 │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ tournament_id (FK → tournaments.id)                    │
│ user_id (FK → profiles.id)                             │
│ entry_payment_id: string (Stripe session ID)           │
│ best_score: number (highest score in tournament)       │
│ created_at: timestamp (when joined)                    │
│ updated_at: timestamp                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│             GAME_SCORES TABLE                           │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ user_id (FK → profiles.id)                             │
│ score: number (coins collected in this game)           │
│ distance: number (how far player ran)                  │
│ mode: enum [free|tournament]                           │
│ tournament_id: (FK → tournaments.id, if mode=tournament)
│ created_at: timestamp (when game ended)                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│            TOURNAMENT_WINNERS TABLE                     │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ tournament_id (FK → tournaments.id)                    │
│ user_id (FK → profiles.id)                             │
│ position: integer (1, 2, or 3)                        │
│ prize_amount: number (actual prize in GBP)            │
│ total_score: number (sum of all scores in tournament) │
│ created_at: timestamp                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 PAYMENTS TABLE                          │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ user_id (FK → profiles.id)                             │
│ tournament_id (FK → tournaments.id)                    │
│ amount: number (2.00 for tournament)                   │
│ currency: string ("gbp")                               │
│ status: enum [pending|succeeded|failed]                │
│ stripe_payment_intent_id: string (session ID)          │
│ created_at: timestamp                                  │
│ updated_at: timestamp                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  PROFILES TABLE                         │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ username: string                                        │
│ email: string                                           │
│ total_coins: number (total coins ever earned)          │
│ total_winnings: number (total prizes won)              │
│ total_spent: number (total on tournament entries)      │
│ tournament_active: boolean (is in current tournament?) │
│ created_at: timestamp                                  │
│ updated_at: timestamp                                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│               NOTIFICATIONS TABLE                       │
├─────────────────────────────────────────────────────────┤
│ id (PK)                                                 │
│ user_id (FK → profiles.id)                             │
│ title: string (e.g., "You placed #1!")                │
│ body: string (e.g., "Congratulations — you won £150") │
│ link: string (e.g., "/tournament/123")                │
│ read: boolean                                           │
│ created_at: timestamp                                  │
└─────────────────────────────────────────────────────────┘
```

---

## ⚙️ EDGE FUNCTIONS & SCHEDULED TASKS

### 1️⃣ **create-tournament-payment**
```
When Called: User clicks "Join Tournament" button
Who Calls It: GameScreen.tsx (handleTournamentAction)

Input:
  ├─ tournament_id: string
  ├─ Authorization: Bearer token (user session)
  └─ Headers: Supabase auth headers

Process:
  ├─ Get authenticated user
  ├─ Create/lookup Stripe customer
  ├─ Create Stripe checkout session (£2.00)
  ├─ Store payment record (status: pending)
  └─ Return Stripe checkout URL

Output:
  └─ { url: "https://checkout.stripe.com/..." }

Database Changes:
  └─ INSERT into payments (status: pending)

Code Location: supabase/functions/create-tournament-payment/index.ts
```

---

### 2️⃣ **verify-tournament-payment**
```
When Called: TournamentSuccess page loads with session_id
Who Calls It: TournamentSuccess.tsx (verifyPayment)

Input:
  └─ session_id: string (from URL query ?session_id=...)

Process:
  ├─ Call Stripe API: retrieve session
  ├─ Check if payment_status === "paid"
  ├─ If YES:
  │  ├─ Update payments table (status: succeeded)
  │  ├─ Add to tournament_participants
  │  ├─ Set profile.tournament_active = true
  │  ├─ Call increment_total_spent (add £2.00)
  │  └─ Return success
  └─ If NO: Return failure

Output:
  ├─ { status: "paid", user_id: "..." }
  └─ { status: "unpaid" or error message }

Database Changes:
  ├─ UPDATE payments (status: succeeded)
  ├─ INSERT tournament_participants
  ├─ UPDATE profiles (tournament_active: true)
  └─ UPDATE profiles (total_spent += 2.00)

Code Location: supabase/functions/verify-tournament-payment/index.ts
```

---

### 3️⃣ **increment_total_spent**
```
When Called: verify-tournament-payment (after payment succeeds)
Who Calls It: verify-tournament-payment edge function

Input:
  ├─ user_id: string
  └─ amount: number (2.00 for tournament)

Process:
  ├─ Get current total_spent from profiles
  ├─ Add amount to total_spent
  └─ UPDATE profiles table

Output:
  └─ { success: true }

Database Changes:
  └─ UPDATE profiles SET total_spent = total_spent + 2.00

Code Location: supabase/functions/increment_total_spent/index.ts
```

---

### 4️⃣ **finalize-weekly-tournament** ⏰ (Scheduled)
```
When Called: Automatically daily (should be scheduled as cron job)
Frequency: Every day at 00:00 PKT
Who Initiates It: Scheduled cron job OR manual trigger

Logic by Day (PKT Timezone):

MONDAY-WEDNESDAY (Days 1-3):
  └─ Set current tournament state: UPCOMING/LOCKED → ACTIVE

THURSDAY (Day 4):
  └─ Lock current tournament: ACTIVE → LOCKED
     (Users can't join anymore, but can still play)

FRIDAY-SUNDAY (Days 5-7):
  ├─ Get all ACTIVE/LOCKED tournaments with current week_key
  ├─ For each tournament:
  │  ├─ Call finalize_tournament RPC
  │  │  ├─ Calculate top 3 scorers
  │  │  ├─ Sum all their scores
  │  │  ├─ Compare totals (highest = 1st, etc.)
  │  │  └─ INSERT into tournament_winners
  │  │
  │  ├─ UPDATE tournament state: LOCKED → EXPIRED
  │  │
  │  ├─ Update profiles: tournament_active = false
  │  │
  │  ├─ Update profiles: total_winnings += prize
  │  │
  │  └─ Create notifications for winners
  │     ├─ Title: "You placed #1 in Tournament #42!"
  │     ├─ Body: "Congratulations — you won £150"
  │     └─ link: "/tournament/{tournament_id}"
  │
  └─ Create new tournament for next week
     └─ Call create_weekly_tournament RPC

Code Location: supabase/functions/finalize-weekly-tournament/index.ts
```

---

### 5️⃣ **send-email** (Optional)
```
When Called: Various events (tournament success, winner notification, etc.)
Who Calls It: Other functions or API calls

Input:
  ├─ to: string (recipient email)
  ├─ subject: string
  └─ html: string (email body)

Process:
  └─ Send email via configured email provider

Code Location: supabase/functions/send-email/index.ts
```

---

## 💳 PAYMENT FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────┐
│                    TOURNAMENT PAYMENT FLOW                   │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────┐
│  User Clicks "Join Tournament"  │
│  (GameScreen.tsx)               │
└────────────────┬────────────────┘
                 │
                 ▼
        ┌────────────────┐
        │  Check if user │
        │  is participant│
        └────────┬───────┘
                 │
         ┌───────┴────────┐
         │ YES            │ NO
         ▼                ▼
    START GAME      PAYMENT FLOW
                         │
                    ┌────▼──────────────────┐
                    │ Get Supabase Session  │
                    │ (User auth token)     │
                    └────┬───────────────────┘
                         │
                    ┌────▼──────────────────────────────────┐
                    │ Edge Function:                        │
                    │ create-tournament-payment             │
                    └────┬──────────────────────────────────┘
                         │
                    ┌────▼──────────────┐
                    │ Create Stripe     │
                    │ Checkout Session  │
                    │ Amount: £2.00     │
                    └────┬──────────────┘
                         │
            ┌────────────▼────────────┐
            │ Save Payment Record:    │
            │ payments table          │
            │ status: "pending"       │
            └────┬───────────────────┘
                 │
            ┌────▼────────────────────┐
            │ Return Checkout URL     │
            │ window.open(url)        │
            └────┬───────────────────┘
                 │
         ┌───────▼───────────────────┐
         │ User fills Stripe form    │
         │ Enters payment details    │
         └───────┬───────────────────┘
                 │
         ┌───────▼───────────────────┐
         │ Stripe processes payment  │
         │ Creates payment intent    │
         └───────┬───────────────────┘
                 │
         ┌───────▼───────────────────┐
         │ Payment succeeds          │
         │ Stripe redirects to:      │
         │ /tournament-success?...   │
         └───────┬───────────────────┘
                 │
         ┌───────▼──────────────────────────┐
         │ TournamentSuccess component      │
         │ Loads with session_id from URL   │
         └───────┬──────────────────────────┘
                 │
         ┌───────▼────────────────────────────────┐
         │ Edge Function:                         │
         │ verify-tournament-payment              │
         │ Retrieves Stripe session               │
         └───────┬────────────────────────────────┘
                 │
         ┌───────▼────────────────────────────┐
         │ Check: payment_status === "paid"?  │
         └───────┬───────────┬────────────────┘
                 │ YES       │ NO
                 ▼           ▼
         ┌────────────┐  FAIL
         │ UPDATE     │
         │ payments   │
         │ status:    │
         │ succeeded  │
         └────┬───────┘
              │
         ┌────▼──────────────┐
         │ INSERT            │
         │ tournament_        │
         │ participants      │
         └────┬──────────────┘
              │
         ┌────▼──────────────────┐
         │ UPDATE profiles       │
         │ tournament_active=true│
         └────┬───────────────────┘
              │
         ┌────▼──────────────────┐
         │ Call RPC:             │
         │ increment_total_spent │
         │ +£2.00                │
         └────┬───────────────────┘
              │
         ┌────▼───────────────┐
         │ Return: success    │
         │ Show confirmation  │
         │ Redirect to home   │
         └────────────────────┘
```

---

## 🏆 SCORE TRACKING & LEADERBOARD

### How Scores Are Tracked

```
USER PLAYS GAME (EndlessRunner)
       │
       ├─ Game runs for 10 minutes (tournament mode)
       │
       ├─ Player collects coins
       │  └─ Each coin = 1 run/point
       │
       ├─ Progress saved every 30 seconds
       │  ├─ Stored in localStorage
       │  └─ If score improves: uploaded to DB
       │
       └─ Game ends (time up or hit obstacle)
           │
           ├─ Final score calculated
           ├─ Save to game_scores table:
           │  ├─ user_id
           │  ├─ score (total coins collected)
           │  ├─ distance (how far they ran)
           │  ├─ mode: "tournament" (if in tournament)
           │  ├─ tournament_id (if in tournament)
           │  └─ created_at (timestamp)
           │
           └─ Update best_score in tournament_participants
              (if this game's score > previous best)
```

**Code Location:** [EndlessRunner.tsx - Lines 180-250](src/components/game/EndlessRunner.tsx#L180-L250)

---

### Leaderboard Display

```
LEADERBOARD SCREEN (LeaderboardScreen.tsx)

Shows 4 Tabs:
│
├─ TOURNAMENT (Current Week)
│  └─ Displays: tournament_participants with highest scores
│     ├─ Rank (#1, #2, #3, etc.)
│     ├─ Player name
│     ├─ Total score (sum of all their games)
│     ├─ Games played
│     └─ Days left in tournament
│
├─ ALL TIME (Across All Tournaments)
│  └─ Displays: all users by total_winnings
│     ├─ Rank
│     ├─ Player name
│     └─ Total earnings
│
├─ WINNERS (Recent Tournament Winners)
│  └─ Displays: tournament_winners table
│     ├─ Position (#1, #2, #3)
│     ├─ Player name
│     ├─ Prize amount
│     └─ Tournament name
│
└─ MY GAMES (User's Game History)
   └─ Displays: user's recent tournament_scores
      ├─ Score from each game
      ├─ Distance traveled
      ├─ Date played
      └─ Tournament name
```

**Code Location:** [LeaderboardScreen.tsx](src/components/leaderboard/LeaderboardScreen.tsx)

---

## 🎉 WINNER ANNOUNCEMENT & PRIZE DISTRIBUTION

### Winner Calculation Process

```
FRIDAY-SUNDAY (finalize-weekly-tournament triggers)
       │
       ├─ Get all participants from tournament_participants
       ├─ For each participant:
       │  ├─ Query game_scores table WHERE:
       │  │  ├─ user_id = participant.user_id
       │  │  ├─ tournament_id = current_tournament.id
       │  │  └─ mode = "tournament"
       │  │
       │  ├─ Sum all their scores from game_scores
       │  └─ Store as: total_score
       │
       ├─ Sort by total_score descending
       ├─ Take top 3
       │
       ├─ Position 1 (Highest Score)
       │  ├─ Prize: £150
       │  ├─ INSERT tournament_winners (position: 1, prize_amount: 150)
       │  ├─ UPDATE profiles: total_winnings += 150
       │  └─ CREATE notification
       │
       ├─ Position 2
       │  ├─ Prize: £100
       │  ├─ INSERT tournament_winners (position: 2, prize_amount: 100)
       │  ├─ UPDATE profiles: total_winnings += 100
       │  └─ CREATE notification
       │
       └─ Position 3
           ├─ Prize: £50
           ├─ INSERT tournament_winners (position: 3, prize_amount: 50)
           ├─ UPDATE profiles: total_winnings += 50
           └─ CREATE notification
```

### Real-time Winner Notification

When a tournament_winners record is inserted:
```
Supabase Realtime Trigger (EndlessRunner.tsx)
       │
       ├─ Listen to: INSERT events on tournament_winners
       ├─ Filter: tournament_id matches current tournament
       │
       └─ For each new winner:
           ├─ Check: Is this the current user?
           ├─ If YES and position <= 3:
           │  └─ Show toast: "🎉 Congrats! You placed #X and won £Y"
           └─ If NO:
               └─ Show toast: "Tournament winners announced!"
```

**Code Location:** [EndlessRunner.tsx - Lines 146-165](src/components/game/EndlessRunner.tsx#L146-L165)

### Notification Display

```
User receives notification:
       │
       ├─ Title: "You placed #1 in Tournament #42!"
       ├─ Body: "Congratulations — you won £150"
       ├─ link: "/tournament/42"
       └─ UI shows notification badge

User can view:
       ├─ Leaderboard → Winners tab
       │  └─ See all 3 winners with prizes
       │
       └─ Profile page
           └─ total_winnings updated
```

---

## 📊 COMPLETE TOURNAMENT STATE FLOW

```
┌─────────────────────────────────────────────────────────────┐
│          SINGLE USER'S TOURNAMENT JOURNEY                   │
└─────────────────────────────────────────────────────────────┘

MONDAY 00:00
├─ Tournament state: UPCOMING → ACTIVE
├─ User sees GameScreen
├─ Notices: "Join now and compete! (£2.00 fee)"
└─ User clicks: "Join Tournament"

MONDAY 01:00 (Payment initiated)
├─ Edge function: create-tournament-payment called
├─ Stripe checkout created (£2.00)
├─ payments table: INSERT (status: pending)
└─ User redirected to Stripe checkout

MONDAY 01:05 (Payment completed)
├─ User completes Stripe payment
├─ Stripe processes payment
├─ Redirects to: /tournament-success?session_id=...
├─ TournamentSuccess page loads

MONDAY 01:06 (Payment verified)
├─ Edge function: verify-tournament-payment called
├─ Checks: session.payment_status === "paid"
├─ payments table: UPDATE (status: succeeded)
├─ tournament_participants: INSERT
├─ profiles: UPDATE tournament_active = true
├─ profiles: UPDATE total_spent += 2.00
├─ User sees: "Tournament Payment Successful!"
└─ Page redirects to home after 3 seconds

MONDAY 01:10
├─ User is back on home page
├─ GameScreen now shows: "✓ You're in!"
├─ Button text: "Start Tournament Game"
├─ User clicks "Start Tournament Game"
└─ EndlessRunner component loads

MONDAY-THURSDAY
├─ User plays tournament game(s)
├─ Each game:
│  ├─ Runs for 10 minutes
│  ├─ Player collects coins = score
│  ├─ Score saved to tournament_scores table
│  ├─ best_score updated in tournament_participants
│  └─ Leaderboard updates in real-time
│
├─ User can play unlimited games
├─ Can join in free play mode too
└─ All tournament scores count toward final ranking

THURSDAY 23:59
├─ Tournament state: ACTIVE → LOCKED
├─ User CAN'T join more games (but can still play)
├─ GameScreen shows: "Join window closed"
└─ Button becomes disabled

FRIDAY 00:00
├─ finalize-weekly-tournament triggered
├─ Tournament state: LOCKED → EXPIRED
├─ Scores calculated:
│  ├─ User's total score calculated
│  ├─ Ranked against all participants
│  └─ If in top 3: INSERT into tournament_winners
│
├─ If user won:
│  ├─ Position: 1, 2, or 3
│  ├─ Prize amount: 150, 100, or 50 GBP
│  ├─ profiles: UPDATE total_winnings += prize
│  ├─ notifications: INSERT winner notification
│  └─ User gets toast: "🎉 You placed #X and won £Y"
│
└─ New tournament created for next week

THE CYCLE REPEATS 🔄
```

---

## 🔐 SECURITY CONSIDERATIONS

```
TOURNAMENT PAYMENT SECURITY:

1. Authentication Required
   └─ All operations check user session token

2. Payment Verification
   ├─ Stripe session must have payment_status === "paid"
   ├─ Server-side verification (not client-side)
   └─ No payment without verification

3. User Identification
   ├─ tournament_id tied to user_id via session
   ├─ Payment records include user_id
   └─ Prevents user spoofing

4. Entry Fee Enforcement
   ├─ Fixed £2.00 amount in edge function
   ├─ Cannot be modified by client
   └─ Stored in database as immutable record

5. Double-Entry Prevention
   ├─ Check: user already in tournament_participants
   ├─ Cannot join twice
   └─ Upsert prevents duplicate entries

6. Score Integrity
   ├─ Scores submitted with user_id
   ├─ tied to tournament_id
   └─ Server calculates rankings (not client)
```

---

## 🐛 DEBUGGING & MONITORING

### Key Logs to Check

```
Browser Console:
├─ Payment flow logs:
│  ├─ "Verifying tournament payment for session: ..."
│  ├─ "Tournament verification response: ..."
│  └─ Payment error messages
│
└─ Game logs:
   ├─ Tournament data loading
   ├─ Score saving intervals
   └─ Leaderboard updates

Supabase Logs:
├─ Edge function execution:
│  ├─ create-tournament-payment
│  ├─ verify-tournament-payment
│  ├─ finalize-weekly-tournament
│  └─ increment_total_spent
│
├─ Database triggers:
│  ├─ tournament state updates
│  ├─ participant insertions
│  └─ score recordings
│
└─ Realtime events:
   ├─ tournament_winners inserts
   ├─ tournament_participants updates
   └─ notification creations
```

---

## 📱 SUMMARY TABLE

| Component | Purpose | When Used |
|-----------|---------|-----------|
| **GameScreen** | Display tournament info & join button | Always visible (home) |
| **create-tournament-payment** | Create Stripe checkout | When user clicks "Join" |
| **verify-tournament-payment** | Confirm payment & register user | After Stripe redirects |
| **increment_total_spent** | Track user spending | After payment verified |
| **TournamentSuccess** | Show payment confirmation | After Stripe checkout |
| **EndlessRunner** | Game engine & score tracking | When user plays game |
| **finalize-weekly-tournament** | Calculate winners & distribute prizes | Fri-Sun automated |
| **LeaderboardScreen** | Display rankings & winners | Always visible (tab) |
| **Notifications** | Notify winners of prizes | When tournament ends |

---

## ✅ TOURNAMENT CHECKLIST

Before going live:

- [ ] Test payment flow (use Stripe test cards)
- [ ] Verify tournament state transitions (Mon-Sun)
- [ ] Test score saving & leaderboard updates
- [ ] Verify winner calculation logic
- [ ] Test payment verification edge case (session not found)
- [ ] Test user can't join after Thursday
- [ ] Test notifications sent to winners
- [ ] Verify prize amounts correct (150, 100, 50)
- [ ] Test total_spent tracking
- [ ] Test total_winnings updates
- [ ] Verify tournament_active flag behavior
- [ ] Test new tournament creation each week

---

**Document Created:** January 26, 2026
**Last Updated:** January 26, 2026
**Tournament Timezone:** Asia/Karachi (PKT)
