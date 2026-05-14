# Known Issues

## Bugs

### 1. ~~Index-based list keys~~ ✅ Fixed
`keyExtractor` used item index instead of a stable identifier, causing React to misidentify items on deletion and potentially remove the wrong entry or glitch animations.

### 2. ~~No error handling on AsyncStorage~~ ✅ Fixed
If storage read/write fails (device full, permission issue), the app silently swallowed the error. A failed read loaded an empty list, and the save effect then immediately overwrote stored data — causing permanent data loss.

**Solution:** wrapped both calls in `.catch(() => {})` to prevent unhandled rejections. The read uses `.finally()` to guarantee `isLoaded` is set regardless of success or failure, so a storage error never blocks saves from working once the app is running.

### 4. ~~`removeActivity` uses index instead of value — inconsistency~~ ✅ Fixed
`keyExtractor` now identifies items by their text, but `removeActivity` still took an index. If sorting or reordering is ever added, these could silently diverge and delete the wrong item.

**Solution:** changed `removeActivity` to take the item text and filter by value, matching the key strategy. Removed `index` from `renderItem` destructuring entirely.

### 5. ~~`JSON.parse` without validation — potential crash~~ ✅ Fixed
If AsyncStorage contained corrupted data, `JSON.parse` would throw an uncaught exception. The result was also cast blindly to `string[]` with no check that it was actually an array.

**Solution:** added shape validation — checks that the parsed value is an array and every element is a string before calling `setActivities`. Malformed JSON exceptions propagate to the existing `.catch(() => {})` at the end of the chain, so no separate try/catch is needed.

### 6. ~~Memory leak when unmounting during spin~~ ✅ Fixed
If the component unmounts while a spin is in progress, the `setTimeout` callbacks still fired and called `setResult` and `setIsSpinning` on a dead component. Not a problem now but becomes real if screens are added later.

**Solution:** stored the active timeout ID in a ref (`spinTimeoutRef`) and added a cleanup effect that calls `clearTimeout` on unmount. This cancels the pending callback entirely rather than just ignoring it.

---

### 3. ~~Fragile `isLoaded` ref pattern~~ ✅ Fixed
The ref-based guard that prevented saving before loading had a subtle race condition: `isLoaded.current = true` was set inside `.then()`, but React state updates are also async. If the save effect fired before the ref was set but after React scheduled a re-render, the guard could be bypassed.

**Solution:** replaced the ref with a `useState` boolean. Since state is reactive, adding `isLoaded` to the save effect's dependency array means React guarantees the effect re-runs only after loading completes — no timing ambiguity possible.
