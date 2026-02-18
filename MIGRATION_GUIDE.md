# Migration Guide: From Single Tournament to Multi-Tournament

## For Developers Integrating This Codebase

---

## 🔄 Breaking Changes

### Before: Single Tournament Model
```typescript
// OLD: Only one tournament at a time
loadTournament(): Tournament | null
saveTournament(tournament: Tournament): void
resetAllData(): void  // Cleared single tournament
```

### After: Multi-Tournament Model
```typescript
// NEW: Load specific tournament by ID
loadTournament(tournamentId: string): Tournament | null

// NEW: Save with ID isolation
saveTournament(tournament: Tournament): void  // ID-aware

// NEW: List all tournaments
loadAllTournaments(): Tournament[]

// NEW: Manage tournaments
deleteTournament(tournamentId: string): void
duplicateTournament(id: string, newName: string): Tournament | null
getTournamentIds(): string[]

// NEW: Get statistics
getTournamentStats(tournament: Tournament): {
  totalPlayers: number
  totalMatches: number
  batchesRequired: number
  matchesPerRound: number
}

// UPDATED: Clear everything
clearAllTournaments(): void
```

---

## 🏗 Architecture Changes

### Storage Structure Changed
```
BEFORE:
  LocalStorage['swiss_tournament_current'] = Tournament

AFTER:
  LocalStorage['tournaments_list'] = ["id1", "id2", ...]
  LocalStorage['tournament_id1'] = Tournament
  LocalStorage['tournament_id2'] = Tournament
  LocalStorage['tournament_id3'] = Tournament
```

### Type Changes in Tournament
```typescript
// BEFORE
interface Tournament {
  id: string
  name: string
  totalRounds: number  // ← Always 6
  players: Player[]
  rounds: Round[]
  // ... rest
}

// AFTER
interface Tournament {
  id: string
  name: string
  totalRounds: number  // ← Configurable (1-12)
  totalBoards: number  // ← NEW: 1-20
  players: Player[]
  rounds: Round[]
  status: 'setup' | 'ready' | 'in-progress' | 'completed'  // ← NEW
  // ... rest
}
```

### Round Changes
```typescript
// BEFORE
interface Round {
  roundNumber: number
  matches: Match[]
  isComplete: boolean
  // ... other fields
}

// AFTER
interface Round {
  roundNumber: number
  matches: Match[]
  isComplete: boolean
  completedBatches: Set<number>  // ← NEW: Track partial round completion
  generatedAt?: Date
  completedAt?: Date
}
```

---

## 🔧 Migration Path for Existing Code

### If You Have Single Tournament Stored
```typescript
// 1. Create tournament structure with new fields
const oldTournament = localStorage.getItem('swiss_tournament_current');
if (oldTournament) {
  const parsed = JSON.parse(oldTournament);
  
  const migrated: Tournament = {
    ...parsed,
    totalBoards: 6,  // ← Default to old behavior
    status: 'in-progress',  // ← Preserve state
    id: uuidv4(),  // ← If no ID exists
  };
  
  // 2. Save to new storage structure
  saveTournament(migrated);
  
  // 3. Remove old key
  localStorage.removeItem('swiss_tournament_current');
}
```

### Update Your Components
```typescript
// OLD Code
const tournament = loadTournament();
if (tournament) {
  // use tournament
}

// NEW Code
const tournamentId = params.id as string;  // From route
const tournament = loadTournament(tournamentId);
if (tournament) {
  // use tournament
}
```

### Update Tournament Creation
```typescript
// OLD
const tournament: Tournament = {
  id: uuidv4(),
  name: 'Test',
  totalRounds: 6,  // ← Hardcoded
  players: [],
  rounds: [],
  // ...
}

// NEW
const tournament: Tournament = {
  id: uuidv4(),
  name: 'Test',
  totalRounds: 6,  // ← User input
  totalBoards: 10,  // ← User input (NEW)
  players: [],
  rounds: [],
  status: 'setup',  // ← Track lifecycle
  // ...
}
```

---

## 📍 Route Migration

### Page Structure Changed
```
BEFORE:
  /               → TournamentDashboard (single tournament)
  
AFTER:
  /               → Redirect to /tournaments
  /tournaments    → List of all tournaments
  /tournaments/[id] → Specific tournament detail
  /tournaments/[id]/overview (implicit)
  /tournaments/[id]/players (implicit)
  /tournaments/[id]/pairings (implicit)
  /tournaments/[id]/standings (implicit)
```

### Navigation Updates
```typescript
// OLD: Wasn't needed (single tournament)

// NEW: Route to tournament
router.push(`/tournaments/${tournamentId}`);

// NEW: Go back to list
router.push('/tournaments');

// NEW: Create new
router.push(`/tournaments/${newId}/setup`);
```

---

## 🎛 Pairing Engine API (Minor Change)

### Function Signature Updated
```typescript
// BEFORE: Used BOARDS_PER_BATCH constant
function assignBatchesAndBoards(matches: Match[]): Match[] {
  return matches.map((match, index) => ({
    ...match,
    batch: Math.floor(index / 6) + 1,
    board: (index % 6) + 1,
  }));
}

// AFTER: Uses tournament.totalBoards
function assignBatchesAndBoards(
  matches: Match[], 
  boardsPerBatch: number
): Match[] {
  return matches.map((match, index) => ({
    ...match,
    batch: Math.floor(index / boardsPerBatch) + 1,
    board: (index % boardsPerBatch) + 1,
  }));
}
```

### Call Sites Updated
```typescript
// In generateRound1Pairings():
- matches = assignBatchesAndBoards(matches);
+ matches = assignBatchesAndBoards(matches, tournament.totalBoards);

// In generateRound2PlusPairings():
- matches = assignBatchesAndBoards(matches);
+ matches = assignBatchesAndBoards(matches, tournament.totalBoards);
```

---

## 💾 Storage API Expansion

### New Methods in tournamentStorage.ts
```typescript
// Tournament Management
getTournamentIds(): string[]
loadAllTournaments(): Tournament[]
saveTournament(tournament: Tournament): void
loadTournament(tournamentId: string): Tournament | null
deleteTournament(tournamentId: string): void
duplicateTournament(tournamentId: string, newName: string): Tournament | null

// Export/Import
exportTournamentJSON(tournament: Tournament): void
importTournamentJSON(json: string): Tournament
exportAllTournamentsJSON(): void
importAllTournamentsJSON(json: string): number

// Utilities
getTournamentStats(tournament: Tournament): TournamentStats
clearAllTournaments(): void
```

---

## 🔒 Data Safety Considerations

### Read-Only After Round 1
```typescript
// Check before allowing modifications
if (tournament.currentRound > 0) {
  throw new Error('Cannot modify tournament after Round 1 starts');
}

// Or show UI restrictions
<Button disabled={tournament.currentRound > 0}>
  Add Player
</Button>
```

### Verify Tournament Exists
```typescript
const tournament = loadTournament(id);
if (!tournament) {
  return <ErrorPage message="Tournament not found" />;
}
```

### Backup Before Major Operations
```typescript
// Optional: Create backup before deletion
createBackupIfNeeded(tournament);

// Then delete
deleteTournament(tournamentId);
```

---

## 📊 Statistics API New

### Usage Example
```typescript
const tournament = loadTournament(id);
const stats = getTournamentStats(tournament);

console.log(`
  Players: ${stats.totalPlayers}
  Matches/Round: ${stats.matchesPerRound}
  Batches: ${stats.batchesRequired}
  Boards: ${tournament.totalBoards}
`);

// Output:
// Players: 48
// Matches/Round: 24
// Batches: 3
// Boards: 10
```

### Stats Object
```typescript
interface TournamentStats {
  totalPlayers: number;      // Count of players
  totalMatches: number;      // = totalPlayers / 2
  batchesRequired: number;   // = ceil(matches / boards)
  matchesPerRound: number;   // = floor(players / 2)
}
```

---

## 🧪 Testing Checklist

### Unit Tests to Add
```typescript
// Tournament Storage
✓ saveTournament() stores with ID isolation
✓ loadTournament() retrieves specific tournament
✓ loadAllTournaments() returns array
✓ deleteTournament() removes and updates list
✓ duplicateTournament() creates copy with new ID

// Tournament Stats
✓ getTournamentStats() calculates correctly
✓ getTournamentStats() handles 0 players
✓ getTournamentStats() handles odd number of players

// Pairing Engine
✓ assignBatchesAndBoards() with 6 boards
✓ assignBatchesAndBoards() with 10 boards
✓ assignBatchesAndBoards() with 2 boards
✓ Round 1 still generates correct pairings
✓ Round 2+ respects dynamic board count
```

### Integration Tests
```typescript
// Complete Flow
✓ Create tournament → Save → Load → Modify → Delete
✓ Create two tournaments → Verify isolation
✓ Import Excel → Verify player count
✓ Generate round → Verify batch calculation
✓ Switch tournaments → Verify correct data loads
```

### Regression Tests (Swiss Logic Unchanged)
```typescript
✓ Round 1 pairings unchanged
✓ Tiebreak calculations unchanged
✓ Bye assignment logic unchanged
✓ Color balance unchanged
✓ Score calculation unchanged
```

---

## 🚀 Deployment Checklist

### Before Going Live
- [ ] Update documentation (this file)
- [ ] Test migration script if upgrading existing users
- [ ] Verify all 9 routes work
- [ ] Test with 200+ players
- [ ] Test board counts: 2, 6, 10, 20
- [ ] Verify export/import works
- [ ] Check localStorage limits
- [ ] Test on mobile browsers
- [ ] Verify dark mode compatibility

### After Deployment
- [ ] Monitor error logs
- [ ] Check for localStorage quota issues
- [ ] Gather user feedback on UX
- [ ] Performance monitoring
- [ ] Browser compatibility verification

---

## 🆘 Common Migration Issues

### Issue: "Tournament not found"
```
Cause: Route param not passed correctly
Fix: 
  const params = useParams();
  const tournamentId = params.id as string;  // ← Ensure proper type
  const tournament = loadTournament(tournamentId);
```

### Issue: "Player changes not saving"
```
Cause: Forgetting to call saveTournament()
Fix:
  const updated = { ...tournament, players: [...] };
  saveTournament(updated);  // ← Must save explicitly
  setTournament(updated);  // ← Update state
```

### Issue: "Batch calculation wrong"
```
Cause: Using BOARDS_PER_BATCH constant instead of tournament.totalBoards
Fix:
  - matches = assignBatchesAndBoards(matches);
  + matches = assignBatchesAndBoards(matches, tournament.totalBoards);
```

### Issue: "Old single tournament lost"
```
Cause: Storage keys different
Fix: Implement migration
  const old = localStorage.getItem('swiss_tournament_current');
  if (old) {
    const parsed = JSON.parse(old);
    const withId = { ...parsed, id: uuidv4(), totalBoards: 6 };
    saveTournament(withId);
    localStorage.removeItem('swiss_tournament_current');
  }
```

---

## 📚 Reference: Before/After Examples

### Example 1: Creating a Tournament
```typescript
// BEFORE
const newTournament: Tournament = {
  id: uuidv4(),
  name: 'Championship',
  totalRounds: 6,  // Always 6
  players: [],
  rounds: [],
  settings: defaultSettings,
  createdAt: new Date(),
  updatedAt: new Date(),
  currentRound: 0,
  isComplete: false,
};
saveTournament(newTournament);

// AFTER
const newTournament: Tournament = {
  id: uuidv4(),
  name: 'Championship',
  totalRounds: userInput.rounds,  // ← User picks 1-12
  totalBoards: userInput.boards,  // ← NEW: User picks boards
  players: [],
  rounds: [],
  settings: defaultSettings,
  createdAt: new Date(),
  updatedAt: new Date(),
  currentRound: 0,
  isComplete: false,
  status: 'setup',  // ← NEW: Track lifecycle
};
saveTournament(newTournament);  // ID-safe storage
```

### Example 2: Loading Tournament
```typescript
// BEFORE
const tournament = loadTournament();  // ← Single global
if (tournament) {
  // Use it
}

// AFTER
const params = useParams();
const id = params.id as string;
const tournament = loadTournament(id);  // ← Specific tournament
if (!tournament) {
  return <ErrorPage />;
}
// Use it
```

### Example 3: Listing Tournaments
```typescript
// BEFORE
// Not possible - only one tournament

// AFTER
const allTournaments = loadAllTournaments();
return (
  <div>
    {allTournaments.map(t => (
      <TournamentCard key={t.id} tournament={t} />
    ))}
  </div>
);
```

---

## 🎓 Key Takeaways

1. **ID-Aware Storage** - Every operation includes `tournamentId`
2. **Route-Driven** - Tournament ID comes from URL params
3. **Isolated State** - Data never bleeds between tournaments
4. **Swiss Unchanged** - Pairing algorithm identical, just uses dynamic boards
5. **Type Safe** - TypeScript ensures you don't miss ID parameters
6. **Backward Compatible** - Old data can be migrated
7. **Scalable** - Works with 1 or 1000 tournaments

---

**Document Version:** 1.0  
**Last Updated:** February 18, 2026  
**Status:** Migration Complete ✅
