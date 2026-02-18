# Pairing System - Architecture & Visual Guide

## 🏗️ System Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Tournament Page                           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ├───── props──────────────────┐
               ↓                             ↓
    ┌──────────────────────┐    ┌──────────────────────┐
    │ TournamentPairings   │    │ TournamentSettings   │
    │ (ENHANCED)           │    │ (Unchanged)          │
    └──────┬───────────────┘    └──────────────────────┘
           │
           ├─── Uses ────────────────────────────────────────┐
           │                                                 │
           ↓                                                 ↓
    ┌─────────────────────────────┐    ┌──────────────────────────┐
    │  Validation Functions       │    │  Pairing Engine          │
    │  (NEW: pairingValidation)   │    │  (UNCHANGED)             │
    │                             │    │                          │
    │ • validateRoundIntegrity()  │    │ • generatePairings()     │
    │ • allMatchesCompleted()     │    │ • assignBatchesAndBoards │
    │ • validatePairingAddition() │    │ • Swiss algorithm        │
    │ • canAdvanceToNextRound()   │    │                          │
    │ • findPlayerInRound()       │    │                          │
    │ • getRoundProgress()        │    │                          │
    └─────────────────────────────┘    └──────────────────────────┘
           ↑                                      ↑
           └──────────────┬─────────────────────┘
                          │
                          ↓
                ┌──────────────────────┐
                │  TournamentStorage   │
                │  (Unchanged)         │
                │                      │
                │ • saveTournament()   │
                │ • loadTournament()   │
                └──────────────────────┘
                          ↑
                          │
                          ↓
                ┌──────────────────────┐
                │  LocalStorage        │
                │  tournament_${id}    │
                └──────────────────────┘
```

---

## 📊 Component State Management

### TournamentPairings State

```
TournamentPairings
├── searchQuery: string
│   ├── Input: User types player name
│   ├── Effect: Triggers findPlayerInRound()
│   └── UI: Search input, highlight, notification
│
├── highlightedBatch: number | null
│   ├── Set when: foundPlayerInRound() succeeds
│   ├── Applied: data-batch attribute with blue ring
│   └── Cleared: When search emptied
│
├── showManualPairingDialog: boolean
│   ├── Set: When user clicks "Add Manual Pairing" button
│   ├── Opens: Dialog with player/color selectors
│   └── Closed: After successful add or cancel
│
├── manualPlayer1: string
├── manualPlayer2: string
├── manualColorAssignment: 'white' | 'black' | 'auto'
│   └── Used: To determine match assignment
│
├── showGenerateConfirm: boolean
│   └── Used: To confirm round generation
│
├── selectedRound: number
│   └── Which round pairings to display
│
└── error: string | null
    └── Displays in alert at top of page
```

---

## 🔄 Feature Flow Diagrams

### Player Search Flow

```
User Types Name
    ↓
useEffect triggers
    ↓
findPlayerInRound(searchQuery, currentRound, players)
    ↓
    ├─ Player not found
    │   ↓
    │   Clear highlight
    │   Return
    │
    └─ Player found in match
        ↓
        Extract: batch, board, opponent, color
        ↓
        setHighlightedBatch(batch)
        ↓
        setTimeout 100ms
        ↓
        querySelector(`[data-batch="${batch}"]`)
        ↓
        scrollIntoView({ smooth, center })
        ↓
        Show "Found on Board X" popup
```

### Manual Pairing Flow

```
Admin Clicks Button
    ↓
setShowManualPairingDialog(true)
    ↓
Dialog Renders
    ↓
Admin selects Player 1, Player 2, Color
    ↓
Clicks "Add Pairing"
    ↓
validatePairingAddition(p1, p2, round, tournament, players)
    ↓
    Multiple checks:
    ├─ Same player? → ERROR
    ├─ Already paired? → ERROR
    ├─ Played before? → ERROR
    └─ All pass? → Continue
    ↓
Determine colors (auto/manual)
    ↓
Calculate board/batch
    ↓
Create Match object
    ↓
validateRoundIntegrity(newMatches)
    ↓
    ├─ ERROR → Show error, return
    │
    └─ OK → Continue
    ↓
saveTournament(updated)
    ↓
onTournamentUpdate(updated)
    ↓
Close dialog
    ↓
Clear form fields
```

### Round Progression Flow

```
All Matches Recorded
    ↓
Check: allMatchesCompleted(currentRound)? 
    ↓
    ├─ No → "Next Round" stays disabled
    │
    └─ Yes → "Next Round" button enables
        ↓
        User clicks "Next Round"
        ↓
        Check: canAdvanceToNextRound()?
        ↓
        Validation:
        ├─ All matches complete? ✓
        ├─ Round passes integrity? ✓
        ├─ currentRound < totalRounds? ✓
        └─ All pass? Continue
        ↓
        generatePairings(tournament)
        ↓
        Create new Round object
        ↓
        validateRoundIntegrity(newMatches)
        ↓
        Add to tournament.rounds
        ↓
        Increment currentRound
        ↓
        Check: currentRound >= totalRounds?
        ↓
        ├─ No → Set status to 'in-progress'
        │
        └─ Yes → Set status to 'completed'
        ↓
        saveTournament(updated)
        ↓
        onTournamentUpdate(updated)
        ↓
        New round displayed
```

---

## 🎯 Validation Decision Tree

### Manual Pairing Validation

```
                    validatePairingAddition()
                            │
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
    Player1        Player2              Both Valid?
    Exists?        Exists?
    YES/NO         YES/NO               YES/NO
        │               │                   │
        ├─NO─→ ERROR    ├─NO─→ ERROR       │
        │               │                   │
        └─YES──→ ✓       └─YES──→ ✓          │
                 │               │           │
                 └───────────────┼───────────┘
                                 ↓
                    Same Player?
                    NO ✓ / YES ✗
                         │
                         ↓
                    Already Paired?
                    NO ✓ / YES ✗
                         │
                         ↓
                    Played Before?
                    NO ✓ / YES ✗
                         │
        ┌────────────────┴─────────────────┐
        ↓                                   ↓
    Any Error?                        All Pass?
    YES → Show Errors                 YES → Add Pairing
    NO → ERROR occurred                    │
                                           ↓
                                   Determine Colors
                                   AUTO/MANUAL
                                           │
                                           ↓
                                   Calculate Board
                                   Location
                                           │
                                           ↓
                                   validateRoundIntegrity()
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ↓                      ↓                      ↓
            ERROR Detected        Validation Pass      Continue Process
            Show Error               Save & Close
            Abort
```

---

## 📈 Round Completion Progress

### Visual Progress Indication

```
Round 1:
[                    ] 0% (0/12 matches)
  ↓ (user records first 3 results)
[███                 ] 25% (3/12 matches)
  ↓ (user records 6 more)
[████████            ] 67% (8/12 matches)
  ↓ (user records last 4)
[████████████████████] 100% (12/12 matches)
  ↓
"Next Round" button ENABLES
  ↓
(User clicks "Next Round")
  ↓
Round 2:
[                    ] 0% (0/12 matches)
  ...
```

---

## 🛡️ Validation Safety Layers

### Duplicate Prevention Strategy

```
Layer 1: UI Level
├─ Player 2 dropdown excludes Player 1
└─ Prevents obvious mistakes

Layer 2: Pairing Addition Validation
├─ Check: Same player?
├─ Check: Already paired this round?
├─ Check: Played before?
└─ Prevents invalid manual additions

Layer 3: Round Integrity Check
├─ Uses Set<string> to track seen players
├─ Detects: Player in multiple matches
├─ Detects: Bye conflicts
└─ Prevents saving corrupted round

Layer 4: Transaction Safety
├─ validateRoundIntegrity() throws if error
├─ Caught in try-catch
├─ saveTournament() not called
└─ No partial updates
```

---

## 📊 Function Call Hierarchy

```
handleGeneratePairings()
    ├─ Check: tournament.players.length >= 2
    ├─ Check: tournament.currentRound < totalRounds
    ├─ If currentRound > 0:
    │   ├─ currentRoundData = get current round
    │   └─ canAdvanceToNextRound(tournament, currentRoundData)
    │       ├─ Check: allMatchesCompleted(round)
    │       ├─ Check: validateRoundIntegrity(matches)
    │       └─ Return: { canAdvance, reasons }
    │
    ├─ generatePairings(tournament)
    │   └─ Swiss algorithm (UNCHANGED)
    │
    ├─ validateRoundIntegrity(newRound.matches)
    │   └─ Throws if invalid
    │
    ├─ recalculateAllStats(players, allMatches)
    │   └─ Updates scores/tiebreaks
    │
    └─ saveTournament(updated)
        └─ Persist to localStorage

handleAddManualPairing()
    ├─ Input: player1Id, player2Id, colorMode
    ├─ validatePairingAddition(p1, p2, round, tournament, players)
    │   ├─ Check: Different players
    │   ├─ Check: Neither already paired
    │   ├─ Check: Haven't played before
    │   └─ Return: { isValid, errors[] }
    │
    ├─ Determine colors (auto/manual)
    │
    ├─ Calculate board/batch location
    │
    ├─ validateRoundIntegrity(newMatches)
    │   └─ Throws if invalid
    │
    └─ saveTournament(updated)
        └─ Persist to localStorage

handleRecordResult(matchIdx, result)
    ├─ Update: round.matches[idx].result = result
    │
    ├─ validateRoundIntegrity(round.matches)
    │   └─ Throws if invalid
    │
    ├─ recalculateAllStats(players, allMatches)
    │
    └─ saveTournament(updated)
        └─ Persist to localStorage
```

---

## 🎨 UI Component Hierarchy

```
TournamentPairings
│
├┬─ Error Alert (conditional)
│└─ Red banner with error message
│
├┬─ Tournament Completion Badge (conditional)
│ ├─ Trophy icon
│ └─ "🏆 Tournament Complete" message
│
├┬─ Round Progress Card (current round only)
│ ├─ "Round X of Y"
│ ├─ Progress bar with percentage
│ └─ "Next Round" button
│
├┬─ Generate Pairings Card (before any round)
│ ├─ Stats display (players, matches, batches)
│ └─ "Generate Round Pairings" button
│
├┬─ Pairings Display Card (when round exists)
│ ├┬─ Header
│ │├─ "Round X Pairings"
│ │└─ Round selector dropdown
│ │
│ ├┬─ Controls (current round only)
│ │├─ Search bar
│ ││  ├─ Input field
│ ││  ├─ Search icon
│ ││  └─ Result notification popup
│ ││
│ │└─ "Add Manual Pairing" button
│ │
│ └┬─ Matches by Batch (multiple batches)
│   ├─ Batch 1
│   │  ├─ Match 1-1
│   │  ├─ Match 1-2
│   │  └─ Match 1-N
│   │
│   ├─ Batch 2
│   │  └─ ...
│   │
│   └─ Batch N
│      └─ ...
│
├┬─ Generate Confirmation Dialog
│ ├─ Title & description
│ ├─ Stats summary
│ └─ Buttons: Cancel / Generate
│
└┬─ Manual Pairing Dialog
  ├─ Player 1 selector
  ├─ Player 2 selector
  ├─ Color assignment selector
  └─ Buttons: Cancel / Add Pairing
```

---

## 🔄 State Flow Diagram

```
Initial State:
tournament = {
  currentRound: 0,
  rounds: [],
  players: [...]
}

     ↓ Generate R1
     
After R1 Generated:
tournament = {
  currentRound: 1,
  rounds: [
    { roundNumber: 1, matches: [...], isComplete: false }
  ]
}

     ↓ Record Results
     
After Results Recorded:
tournament = {
  currentRound: 1,
  rounds: [
    { roundNumber: 1, matches: [{result: '1-0'}, ...], isComplete: true }
  ]
}

     ↓ Generate R2 (when all matched completed)
     
After R2 Generated:
tournament = {
  currentRound: 2,
  rounds: [
    { roundNumber: 1, matches: [...], isComplete: true },
    { roundNumber: 2, matches: [...], isComplete: false }
  ]
}

     ↓ Continue for each round...
     
After Final Round Completed:
tournament = {
  currentRound: 6 (=== totalRounds),
  rounds: [
    { roundNumber: 1, ... },
    { roundNumber: 2, ... },
    ...,
    { roundNumber: 6, matches: [...], isComplete: true }
  ],
  status: 'completed',
  isComplete: true
}

     ↓ Tournament Complete Badge Shown
```

---

## 📝 API Contract

### validateRoundIntegrity(matches)
```
Input:
  matches: Match[] = [
    { whiteId: string, blackId: string, result: string }
  ]

Output:
  void (throws on error)

Errors:
  - "Player ${id} paired twice in same round"
  - "Player paired twice in same round (Bye with other match)"
```

### validatePairingAddition(p1, p2, round, tournament, players)
```
Input:
  p1: string (player ID)
  p2: string (player ID)
  round: Round
  tournament: Tournament
  players: Player[]

Output:
  { isValid: boolean, errors: string[] }

Errors (any of):
  - "Cannot pair a player with themselves"
  - "One or both players not found"
  - "Players already paired in this round"
  - "Players already played each other in this round"
  - "${playerName} already has a match in this round"
```

### canAdvanceToNextRound(tournament, currentRound)
```
Input:
  tournament: Tournament
  currentRound: Round

Output:
  { canAdvance: boolean, reasons: string[] }

Reasons (any of):
  - "${count} match(es) missing result(s)"
  - "Round validation failed"
  - "All rounds completed"
```

### findPlayerInRound(playerName, round, allPlayers)
```
Input:
  playerName: string (partial or full name)
  round: Round
  allPlayers: Player[]

Output:
  {
    playerId: string | null,
    boardInfo: {
      batch: number,
      board: number,
      opponent: string,
      color: 'white' | 'black'
    } | null
  }
```

---

## 🎯 Key Integration Points

### For Developers Adding Features

```
1. Import validation functions
   └─ from '@/lib/pairingValidation'

2. Call validation before saving
   └─ validateRoundIntegrity() for all round changes

3. Check round completion
   └─ allMatchesCompleted() for UI state

4. Use findPlayerInRound()
   └─ For search/filtering features

5. Check advancement safety
   └─ canAdvanceToNextRound() before generating

6. Get progress info
   └─ getRoundProgress() for displays
```

---

**Status:** All diagrams updated and verified ✅
