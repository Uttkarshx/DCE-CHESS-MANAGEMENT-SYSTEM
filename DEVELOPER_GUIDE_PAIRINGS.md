# Pairing System - Quick Reference & Integration Guide

## 🚀 Quick Start - Using the New Features

### 1. Player Search (End User)
```
1. Open Pairing page for current round
2. Type player name in search field at top
3. Board automatically highlights in blue
4. Page scrolls to show that board
5. Notification appears: "Found on Board 4"
```

**Search Features:**
- ✅ Case-insensitive ("rahul" finds "Rahul Shah")
- ✅ Partial match ("ra" finds "Rahul")
- ✅ Instant results as you type
- ✅ Clear to remove highlight

---

### 2. Manual Pairing Override (Admin)
```
1. Current round open on pairing page
2. Click "➕ Add Manual Pairing" button
3. Dialog opens with dropdowns
4. Select Player 1 from first dropdown
5. Select Player 2 from second dropdown
6. Choose color assignment:
   - "Auto (balanced)" = system balances colors
   - "Player 1 = White"
   - "Player 1 = Black"
7. Click "Add Pairing"
8. Match appended to current round
```

**Admin Override Safety:**
- ✅ Cannot pair same player twice
- ✅ Cannot pair player already matched this round
- ✅ Cannot pair players who played each other before
- ✅ Auto-validates before adding
- ✅ Shows error if invalid

**Use Cases:**
- BYE reassignment
- Late player arrival
- Pairing corrections
- Special tournament rules

---

### 3. Round Progression (Tournament Operator)
```
Flow:
1. Generate R1 pairings
   └─> currentRound = 1
   
2. Players play their matches
   └─> Record results in dropdown
   
3. All results recorded
   └─> "Next Round" button enables
   └─> Progress bar shows 100%
   
4. Click "Next Round"
   └─> Round integrity validated
   └─> R2 pairings generated
   └─> currentRound = 2
   └─> Page shows new round

5. Repeat for each round...

6. Final round completed
   └─> Badge shows: "🏆 Tournament Complete"
   └─> "Next Round" button disabled
   └─> Pairings panel hidden
```

---

## 🔧 Integration for Developers

### Importing Validation Functions
```typescript
import {
  validateRoundIntegrity,
  allMatchesCompleted,
  validatePairingAddition,
  canAdvanceToNextRound,
  findPlayerInRound,
  getRoundProgress,
  getRoundStatusMessage,
  validateTournamentStructure,
  shouldLockRound,
} from '@/lib/pairingValidation';
```

### Common Integration Patterns

#### Pattern 1: Validating Before Saving
```typescript
// Before saving any round changes
try {
  validateRoundIntegrity(round.matches);
  // Safe to save
  saveTournament(updated);
} catch (err) {
  // Show error to user
  setError(err.message);
}
```

#### Pattern 2: Checking If Round Complete
```typescript
if (allMatchesCompleted(currentRound)) {
  // All matches have results
  // Safe to advance to next round
  enableAdvanceButton();
} else {
  // Still waiting for results
  disableAdvanceButton();
}
```

#### Pattern 3: Validating Manual Pairing
```typescript
const validation = validatePairingAddition(
  playerId1,
  playerId2,
  currentRound,
  tournament,
  allPlayers
);

if (!validation.isValid) {
  // Pairing would be invalid
  showErrors(validation.errors);
} else {
  // Safe to add this pairing
  addMatchToRound(...);
}
```

#### Pattern 4: Checking If Can Advance
```typescript
const check = canAdvanceToNextRound(tournament, currentRound);

if (check.canAdvance) {
  // All conditions met, safe to generate next round
  handleGeneratePairings();
} else {
  // Show reasons why we can't advance
  setError(check.reasons.join(', '));
}
```

#### Pattern 5: Finding Player in Round
```typescript
const result = findPlayerInRound(
  'Rahul',
  currentRound,
  tournament.players
);

if (result.boardInfo) {
  // Player found!
  console.log(result.boardInfo);
  // {
  //   batch: 2,
  //   board: 3,
  //   opponent: 'Priya',
  //   color: 'white'
  // }
  
  // Highlight and scroll
  highlightBoard(result.boardInfo.batch);
} else {
  // Player not in this round
}
```

#### Pattern 6: Round Progress
```typescript
const progress = getRoundProgress(currentRound);

// Show progress UI
console.log(`${progress.completed}/${progress.total} matches (${progress.percentage}%)`);
// Output: "8/12 matches (67%)"
```

---

## 📊 State Management Example

### Complete Round Flow
```typescript
// 1. Initial state
tournament = {
  currentRound: 0,
  totalRounds: 6,
  rounds: [],
  status: 'in-progress'
}

// 2. Generate Round 1
tournament.rounds.push({
  roundNumber: 1,
  matches: [...generated matches...],
  isComplete: false
})
tournament.currentRound = 1

// 3. Record results
round.matches.forEach(m => m.result = '1-0' or '0-1' or '1/2-1/2')

// 4. Check completion
allMatchesCompleted(round) // true

// 5. Advance to Round 2
tournament.rounds.push({
  roundNumber: 2,
  matches: [...newly generated...],
  isComplete: false
})
tournament.currentRound = 2

// 6. Repeat cycles...

// 7. After Round 6 completes
tournament.currentRound = 6
tournament.status = 'completed'
tournament.isComplete = true
// "🏆 Tournament Complete" shown
```

---

## ⚠️ Validation Rules

### Round Integrity
```
BEFORE: [Player A vs B], [Player C vs D], [Player A vs E] ❌
ERROR: "Player A paired twice in same round"

AFTER: [Player A vs B], [Player C vs D], [Player E vs F] ✅
```

### Manual Pairing Validation
```
Rule 1: Different players required
  validatePairingAddition('A', 'A', ...) → ERROR

Rule 2: Not already paired this round
  Player A already has match ❌

Rule 3: Not previously played
  A vs B in R1, trying A vs B in R2 again → ERROR

Rule 4: Auto-color balance
  - If Player 1 played more white, assign black
  - If Player 1 played more black, assign white
  - If equal, assign white to Player 1
```

### Round Progression Rules
```
Can Advance? Check:
  ✓ currentRound < totalRounds
  ✓ allMatchesCompleted(currentRound)
  ✓ validateRoundIntegrity(matches) passes
  
If all true → Safe to generate next round
```

---

## 🎯 Component Props & State

### TournamentPairings Component
```typescript
interface TournamentPairingsProps {
  tournament: Tournament;  // Full tournament object
  onTournamentUpdate: (t: Tournament) => void;  // Callback after changes
}

// Internal state
const [searchQuery, setSearchQuery] = useState('');
const [highlightedBatch, setHighlightedBatch] = useState(null);
const [showManualPairingDialog, setShowManualPairingDialog] = useState(false);
const [manualPlayer1, setManualPlayer1] = useState('');
const [manualPlayer2, setManualPlayer2] = useState('');
const [manualColorAssignment, setManualColorAssignment] = useState('auto');
```

---

## 🎨 UI Elements Added

### Search Bar
```
Location: Top of pairings display (current round only)
Shows: "Search player name..."
Behavior: 
  - Case-insensitive
  - Live filtering/highlighting
  - Shows "Found on Board X" popup
  - Auto-scrolls to result
```

### Next Round Button
```
Location: Header, right side (visible when round complete)
Enabled: When allMatchesCompleted(currentRound) = true
Disabled: When matches incomplete or max rounds reached
Click: Opens confirmation dialog → triggers generation
```

### Manual Pairing Button
```
Location: Below search bar (current round only)
Label: "➕ Add Manual Pairing (Admin Override)"
Click: Opens dialog for manual input
Safety: Validates all inputs before adding
```

### Round Progress Bar
```
Location: Header, blue banner (current round only)
Shows:
  - Round X of Y
  - Progress: A / B matches completed
  - Visual progress bar with percentage
Updates: Real-time as results recorded
```

### Tournament Completion Badge
```
Location: Main display area (when complete)
Shows:
  - 🏆 Trophy icon
  - "Tournament Complete" heading
  - "Final standings are shown in the Standings tab"
Background: Amber gradient
```

---

## 📱 UI/UX Considerations

### Responsiveness
- ✅ Search bar responsive on mobile
- ✅ Dialogs work on small screens
- ✅ Progress bar visible on all sizes
- ✅ Buttons accessible on touch

### Accessibility
- ✅ All dropdowns keyboard navigable
- ✅ Error messages clear and visible
- ✅ Color-blind safe (not just red/green)
- ✅ Screen reader friendly

### Error States
```
Search with no results:
  → No highlight, no error
  → Just clears any previous highlight

Invalid manual pairing:
  → Shows error message at top
  → Lists specific problem
  → Dialog stays open for correction

Can't advance round:
  → Button disabled
  → Error message shows why
  → Links to specific incomplete matches
```

---

## 🐛 Debugging Tips

### Check If Round Complete
```typescript
const round = tournament.rounds[0];
console.log('Matches:', round.matches.map(m => m.result));
// If any null → not complete
```

### Validate Round Structure
```typescript
try {
  validateRoundIntegrity(round.matches);
  console.log('✅ Round valid');
} catch (err) {
  console.log('❌ Round invalid:', err.message);
}
```

### Find Player Pairing
```typescript
const result = findPlayerInRound('Rahul', round, players);
if (result.boardInfo) {
  console.log(`${result.boardInfo.opponent} on Board ${result.boardInfo.board}`);
}
```

### Check Tournament Structure
```typescript
const issues = validateTournamentStructure(tournament);
if (issues.length > 0) {
  issues.forEach(i => console.log(`${i.type}: ${i.message}`));
}
```

---

## 📋 Checklist for Integration

- [ ] Import validation functions from pairingValidation
- [ ] Call validateRoundIntegrity before saving rounds
- [ ] Check allMatchesCompleted before enabling advancement
- [ ] Use validatePairingAddition for manual pairing UIs
- [ ] Display progress with getRoundProgress
- [ ] Show tournament completion state
- [ ] Handle error messages from validation
- [ ] Test round progression flow
- [ ] Test search functionality
- [ ] Test manual pairing with edge cases

---

## 🔗 File References

| File | Purpose |
|------|---------|
| `lib/pairingValidation.ts` | All validation utilities (NEW) |
| `components/tournament/TournamentPairings.tsx` | Main pairing UI (ENHANCED) |
| `lib/types.ts` | Data structures (unchanged) |
| `lib/pairingEngine.ts` | Swiss algorithm (unchanged) |

---

## 💾 Backward Compatibility

✅ All changes backwards compatible:
- Existing tournaments work unchanged
- Old round data still loads
- Swiss pairing untouched
- New features are additions, not replacements
- Can migrate old tournaments without changes

---

**Status: ✅ READY FOR PRODUCTION USE**
