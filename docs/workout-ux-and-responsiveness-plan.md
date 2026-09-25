# Workout execution, recovery and responsive UX

Updated 2026-09-25. This is the workout-specific companion to the [implementation plan](plan.md), governed by the [agreed requirements](requirements-and-functionalities.md), especially ROT, CSV, TRE, OFF, HIS and LEM.

The previous document proposed creating components and schema that now exist. This revision targets remaining behavior and defects. It is a static review and future-work plan, not evidence of passing tests or completed browser validation.

## 1. Existing work to retain

| Area | Existing files | Status |
|---|---|---|
| Viewport and root | `app/+html.tsx`, `app/_layout.tsx` | Present; do not recreate. Check accessible zoom and real mobile behavior. |
| Workout inspection | `src/ui/components/WorkoutDetailModal.tsx`; Plan, Workout and Dashboard screens | Wired into the three screens; verify inspect/edit/start flows. |
| Modal editing and ordering | `src/ui/components/WorkoutFormModal.tsx`, `IconButton.tsx` | Move-up/down and prescription inputs exist. Preserve accessible controls; drag-and-drop is not a new prerequisite. |
| Interval/order model | `src/domain/entities/Workout.ts`, both workout repositories | Fields and mappings exist; active execution does not use the prescribed rest fields. |
| Schema | `src/infrastructure/supabase/migrations/006_exercise_intervals_and_order.sql` | Already exists. Any future schema work needs a new migration, not recreation of 006. |
| Countdown audio | `src/ui/utils/sound.ts`, `src/ui/hooks/useWorkoutTimer.ts` | Implemented scaffolding, browser behavior unverified; timer currently counts callbacks. |
| Dashboard window | `src/domain/use-cases/workout/GetNextWorkout.ts` | Window and next-scheduled fallback exist. Future workouts are not simply hidden outside the window. |

## 2. Confirmed requirements for execution

- Preserve prescribed order, sets, repetitions/duration, weight and interval metadata.
- Prefill editable actual values; completion records what was performed without changing the routine.
- A HIT/video workout is **one exercise, one set, with a defined duration**, typically 20–30 minutes. Record actual time, not fictitious reps/load. `1x 25min Treino HIT` illustrates its intended CSV representation.
- Complete and persist the final set before offering Finish. A one-set workout must begin with an executable set, not Finish.
- Between-set rest = `restSecondsBetweenSets ?? 60`.
- Transition rest = `restSecondsBeforeNextExercise ?? restSecondsBetweenSets ?? 60`.
- Explicit zero skips rest. The last exercise has no transition rest.
- Rest values are visible/editable; session overrides do not rewrite the routine. Rest may be skipped.
- Timed sets can finish automatically or early; actual values can be corrected afterward.
- Resume, Save as partial and Discard are distinct. Partial sessions retain recorded work; discard requires confirmation.
- Historical sessions preserve names, prescriptions and actual values independently of later routine edits/deletion.

## 3. Ordered increments and acceptance

### W1 — Final-set lifecycle and actual values (main plan P1)

Paths: `app/workout/active.tsx`, `src/domain/entities/WorkoutSession.ts`, `src/domain/use-cases/workout/CompleteSet.ts`, `FinishWorkoutSession.ts`, `StartWorkoutSession.ts`, workout repository ports/adapters, `app/(tabs)/history.tsx`.

Current defect: completion is inferred from being positioned on the final set. The UI hides start/complete actions before that set is recorded, and Finish only timestamps the session.

- [ ] Test one-exercise/one-set, multiple-set and multiple-exercise sessions through final-set recording.
- [ ] Separate position from completion state; record final set exactly once before finishing.
- [ ] Record actual reps/load/duration, distinguish prescribed from performed and implement partial/discard semantics.
- [ ] Verify rapid repeated completion, failed save/retry and premature Finish do not duplicate or lose sets.
- [ ] Show meaningful history, including workout/exercise names, loads, durations and partial status.

### W2 — Rest selection and elapsed-time timers (main plan P1)

Paths: active screen, `src/ui/hooks/useWorkoutTimer.ts`, `src/ui/components/WorkoutTimer.tsx`, `src/ui/utils/sound.ts`; extract testable domain transitions/time calculations through the existing architecture.

- [ ] Connect persisted interval metadata to execution; verify `null`/missing versus zero and default **60 s**.
- [ ] Verify explicit transition overrides, inherited rest, skip/manual override and no final transition.
- [ ] Calculate from timestamps/deadlines so delayed callbacks do not stretch the timer.
- [ ] On return, finish only the timer that was running. If a timed set expired, calculate rest from its expiry, show remaining/completed rest, never auto-run later sets.
- [ ] Play final-five-second cues and completion when permitted; avoid duplicate/late cues on resume. Audio permission failure cannot break execution.
- [ ] Offer screen wake lock while visible where supported; describe locked-screen audio as best-effort.

Acceptance examples: missing/missing → 60 s; between=20/transition missing → transition 20 s; between=20/transition=0 → no transition; final set of final exercise → completion flow without transition. A 45 s set resumed two minutes later records that one set and elapsed rest, not additional work.

### W3 — Strict prescriptions and recurring schedules (main plan P2)

Paths: `src/domain/use-cases/workout/ParseCsvWorkouts.ts`, `src/domain/use-cases/meal/ParseCsvMealPlan.ts`, both prompt generators, `app/(tabs)/plan.tsx`, workout form/screen, model/repositories and new migrations as needed.

- [ ] Use one tested CSV/prescription contract in prompt generation and import validation. Include quoted semicolons/escaped quotes and row-number diagnostics.
- [ ] Fix standalone `1:20min`, weight followed by rest annotation and rest segment assigned to the preceding exercise.
- [ ] Reject malformed/unknown workout prescriptions. Do not silently skip or accept as notes-only; HIT now has an explicit timed-set representation.
- [ ] First CSV data row anchors the recurring week in the profile timezone; compute the next start relative to now, not a fixed Monday.
- [ ] Keep one active and one pending routine, preview replacements and apply the agreed activation policy to edits of the viewed version only.
- [ ] Preserve active-session snapshots and historical occurrences through replacements. Make writes recoverable/idempotent rather than sequential partial updates.

Resolve requirements O1–O3 before calendar boundaries, full grammar and edit-anchor implementation. Updating a routine must not recreate exercise IDs in a way that destroys historical context.

### W4 — Offline recovery and account boundaries (main plan P3)

Paths: session domain/ports, repository adapters, `src/ui/hooks/useAuth.tsx`, `useSupabase.ts`, active screen, web/PWA configuration. New persistence/synchronization paths should be selected during implementation, not assumed to exist.

- [ ] Save session snapshot, actual values, timer state and pending actions locally per account after meaningful actions.
- [ ] Resume after refresh/reopening; synchronize on reconnect/reopen. Do not rely on Safari supporting Background Sync.
- [ ] Distinguish local-only/pending/synchronized, retry without duplicate sets, and test lost acknowledgments.
- [ ] Keep session on its starting device; warn elsewhere when known. Preserve competing offline sessions and flag for user resolution (O4).
- [ ] On storage failure and no working sync, keep timer/instructions but block further recording with an honest warning.
- [ ] Sign-out with pending work offers synchronization, explicit discard or cancellation; clear private workout cache only on completed sign-out.

Acceptance: normal reloading offline retains saved work; another account cannot read it; retries are idempotent; unsaved memory is not labelled persisted. Browser eviction/user clearing remain documented limits, not promised recoverability.

### W5 — Cross-screen UX, reminders and responsive verification (main plan P8)

Paths: `app/(tabs)/workout.tsx`, `plan.tsx`, `index.tsx`, `app/workout/active.tsx`, existing workout modals/buttons, notification hooks and infrastructure.

- [ ] Retain filters for day/type and sorting by scheduled time/name/exercise count; verify behavior against recurring versions/occurrences.
- [ ] Inspect from Plan, Workout and Dashboard; explicit Start/Edit; modal keyboard, focus, scrolling and accessible icon actions.
- [ ] Prioritize in-progress session, otherwise retain an uncompleted due workout for 60 min. Preserve next-scheduled fallback; resolve overlapping display rules without losing future information.
- [ ] In-app warning within 15 min on another screen, dismissal per occurrence. Optional workout push has its own opt-in; frequency/rescheduling remains O5.
- [ ] Verify 360/390/412/768 px and desktop, short heights, zoom, touch targets, keyboard and screen-reader labels. Review existing `maximum-scale=1`; hiding horizontal overflow is not proof of responsive content.
- [ ] Test Chrome Android, Safari iPhone and current desktop Chrome/Edge/Safari. Native oscillator/audio implementation is not a deliverable for this web/PWA scope.

## 4. Verification strategy

Use meaningful tests per increment: failing behavior → smallest fix → relevant passing gate. Final end-to-end checks supplement, rather than replace, this cycle.

- Existing domain tests: `src/domain/__tests__/entities/Workout.test.ts`, `src/domain/__tests__/use-cases/ParseCsvWorkouts.test.ts`, `GetNextWorkout.test.ts`.
- Existing adapter tests: `src/adapters/__tests__/SupabaseWorkoutRepository.test.ts`. Extend with failed updates, round trips and history retention; add local-adapter behavior checks as needed.
- Existing sound tests: `src/ui/utils/__tests__/sound.test.ts`. These do not establish timer lifecycle, real sound delivery or mobile behavior.
- Add state-transition/UI tests for final sets, editable actuals, HIT, rest selection, interruption, retry and partial sessions; use an injected/fake clock for deadline boundaries.
- Exercise schema changes against a test database, including historical sessions and migration recovery. Preserve applied migration history.
- Gate commands and migration side effects are defined in [the main plan](plan.md#5-gate-e-entrega). The domain-only gate does not cover adapters or UI.

No checks in this document have been marked complete based solely on existing filenames. Device tests and deployed database/storage behavior remain unverified until results are recorded.
