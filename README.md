<img width="1254" height="1254" alt="physique_logo" src="https://github.com/user-attachments/assets/fbc56772-23cb-4f0e-a764-7b02ef945b3a" />

# Physique

A personal health and fitness tracker for workouts, nutrition, body measurements, progress photos, and medical records.

The agreed product targets **desktop and mobile web/PWA**: Android Chrome, iPhone Safari, and current desktop Chrome/Edge/Safari, with optional home-screen installation. The interface and CSV are Brazilian Portuguese with metric units. Google accounts have separate private data; the intended audience is personal use followed by family and friends.

## Project status and documentation

The app has an Expo/React Native Web foundation, Google sign-in, Supabase/local adapters, workout and meal-plan screens, workout modals, measurement history, food OCR, photo/exam upload paths, and copyable LLM prompts. **These are partial implementations, not a claim that all agreed behavior works.** PWA installation, offline recovery and browser capabilities still need implementation/verification.

- [Requirements and product decisions](docs/requirements-and-functionalities.md) — authoritative agreed behavior, including explicit unresolved boundaries.
- [Implementation and bug-remediation plan](docs/plan.md) — source-based status, original-requirement coverage, dependencies and acceptance checks.
- [Workout execution and responsive UX plan](docs/workout-ux-and-responsiveness-plan.md) — focused execution/recovery work that retains existing UI improvements.

The September 2026 static review found final-set recording, prescribed-rest, CSV parsing, measurement consistency, photo-reminder and partial-write defects. See the plans for evidence and remaining work. Tests, deployed services and the browser matrix were not verified as part of that review.

## Development setup

1. Install dependencies with `npm install`.
2. Create `.env.local` using `.env.example` as the template:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
   EXPO_PUBLIC_SUPABASE_KEY=your-supabase-anon-key
   SUPABASE_DB_URL=your-supabase-db-url
   ```

   The `EXPO_PUBLIC_*` values configure the browser client. `SUPABASE_DB_URL` is a server-side PostgreSQL connection string for the migration runner; do not expose it as an `EXPO_PUBLIC_*` value.

3. Configure Google authentication in Supabase and permit your local/deployed application origins as OAuth redirect URLs. The current web sign-in redirects to `window.location.origin`.
4. Provision the intended Supabase database and `photos`/`exams` storage buckets. Review the numbered migrations and bucket policies before using real records. The repository does not establish the configuration of an existing deployment.
5. Run `npm run web` and use the URL Expo reports. Camera and other browser permissions require a secure context for deployed use.

`EXPO_PUBLIC_USE_LOCAL_DB=true` selects local repository adapters, but **does not bypass Supabase authentication or implement cloud synchronization**. It is not the planned offline-workout recovery feature.

### Checks and deployment commands

| Command | Current behavior |
|---|---|
| `npm run web` | Start Expo for web development. |
| `npm run test:domain` | Run domain tests only using `jest.domain.config.js`. |
| `npm test -- --runInBand` | Run the full configured Jest suite. |
| `npx tsc --noEmit` | Check TypeScript without emitting application files. |
| `npx expo export --platform web` | Export web assets without invoking the migration runner. |
| `npm run migrate` | Apply numbered SQL migrations to the database in `SUPABASE_DB_URL`. |
| `npm run build` | **Run migrations, then export web assets.** |

The full Jest configuration uses `setupFilesAfterEnv`, and its native matcher setup has a regression test. With dependencies installed on 25/09/2026, the domain suite passed (115 tests) and full Jest suite passed (169 tests). TypeScript still reports a missing `react-test-renderer` declaration in `src/ui/hooks/__tests__/useAccelerometer.test.tsx`; web export is blocked by an unresolved `query-string` import from `expo-router`. These checks do not verify deployed services or browsers. No lint script is declared.

`scripts/migrate.js` reads `.env.local`, tracks applied files in `schema_migrations`, and runs each numbered file from `src/infrastructure/supabase/migrations/` in its own transaction. A failure rolls back that file, not earlier migrations. Use an identified test database for migration verification; an existing schema without the runner's history may need reconciliation before running the initial migration.

Vercel is configured to run `npm run build` and serve `dist/`. Configure environment variables there accordingly. `npm run build` is not a database-free build check. Storage privacy and account isolation are review items; current upload code uses public-URL helpers, so private-file behavior must not be inferred from the presence of storage policies alone.

## Reviewed behaviour to complete

- Recurring weekly meal/workout routines, with one active and one pending version. The first CSV data row anchors the next start in the profile timezone; no fixed Monday-only rule.
- Strict, all-or-nothing CSV validation and preview, using the same contract the generated LLM prompts request.
- Actual workout values, final-set recording, **60-second default rest**, timed HIT and recovery of an already-loaded workout while offline.
- Free-text meal-consumption history, separate from the scheduled meal plan; no automatic meal nutrition calculation.
- Full structured nutrition labels, including arbitrary vitamins/minerals, reviewed and corrected after OCR; all foods marked available for planning feed the prompt.
- Dated measurements as the source of current values; goals with dated baselines.
- Monthly photo galleries, four primary angles, same-angle comparisons and honest handling of unavailable sensors.
- Exam date required before upload, timestamp-prefixed filenames, and matching download/prompt attachment names.
- Manual LLM workflow: review/copy the prompt, attach exams with the exact referenced names yourself, then import returned CSV. Defaults include actual meals/workouts for 30 days, measurements for 90 days and all exams from the last 12 months by examination date.
- In-app reminders plus separately opted-in Web Push. Photo pushes default to 8:00 AM in the profile timezone, once daily for one week while incomplete; the internal reminder lasts until the current month's four photos are complete. The start of that one-week window remains an explicit open decision.

## CSV import: current interface and target contract

The Plan tab currently reads a combined meal/workout CSV. The intended contract uses **semicolon-separated** (`;`) CSV with a header and one row per scheduled activity:

```text
dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo
```

| Column | Meaning                                                                                                                                                           |
|---|-------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `dia` | Portuguese weekday, e.g. `Segunda-feira`, `Terça-feira`; the first data row determines the weekly starting point in the agreed target behavior.                   |
| `horário` | Start time in `HH:MM`, e.g. `07:00`.                                                                                                                              |
| `atividade/refeição` | Workout type `Calistenia`, `HIT`, or `Musculação`; otherwise a meal label under the current classifier. Stricter ambiguity handling is part of the contract work. |
| `o que fazer/o que comer` | Meal description or workout exercise prescriptions.                                                                                                               |
| `foco/motivo` | Meal biological objective/context or workout name/focus.                                                                                                          |

**Current limitation:** the parsers split strings rather than implementing full quoted CSV. They can silently skip malformed content and import data in separate writes. The agreed quoted-field support, row errors, complete preview, recurring version activation and all-or-nothing behavior are planned, not delivered guarantees.

### Prescription examples and known gaps

Workout exercises use `+` separators and sequential `orderIndex`. The existing documented pattern is:

```text
<sets>x <reps or duration> <name> (<weight>) (<rest intervals>)
```

These examples describe intended meanings and compatibility work. They are **not** a claim that every form currently parses correctly. The complete strict grammar and numeric boundaries must be consolidated before implementation; both prompt generators and importers must then use that same contract.

| Form | Intended meaning / current caveat |
|---|---|
| `4x 10-12 Flexão declinada` | Four sets, target reps currently use the lower bound. |
| `3x 10 Supino reto (7kg)` | Three sets of ten with 7 kg prescribed load. |
| `4x 45s Wall sit` | Four timed sets of 45 seconds. |
| `3x 1:20min Prancha` | Intended as 80-second sets; standalone colon duration is a known parser gap. |
| `(4.5kg)` / `(2 anilhas de 1.5kg)` | Numeric kg extraction; additional annotation can be retained as notes. |
| `(descanso: 15s / 30s transição)` | 15 seconds between sets and 30 before the next exercise. Weight in a separate preceding parenthesis is currently lost in this combination. |
| `(transição: 30s)` | Explicit transition-only rest. |
| `+ 15s rest` | Intended to apply transition rest to the preceding exercise; a nonterminal segment is currently assigned incorrectly. |
| `3 séries: 45s prancha + 35s wall sit + 26 shoulder taps` | Shared set count. |
| `3x 12 Bicep curl (4kg) / KB halo (7.5kg)` | Alternative retained in notes. |
| `1x 25min Treino HIT` | Agreed HIT representation: one exercise, one set, defined duration, normally 20–30 minutes; no fabricated reps/load. |

The former notes-only HIT example (`20 a 25 minutos de treino HIT ou Tabata`) is not the agreed strict representation. Unknown/malformed workout prescriptions must invalidate an import, not fall back to a notes exercise. Existing code still needs that change.

### Illustrative target CSV

```csv
dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo
Segunda-feira;07:00;Café da Manhã;2 fatias de pão integral + 3 ovos mexidos + 1 banana;Energia e proteína
Terça-feira;18:30;Musculação;3x 10 Supino reto (7kg) (descanso: 20s / 30s transição) + 3x 45s Prancha;Peitoral e Core
Quarta-feira;06:30;HIT;1x 25min Treino HIT;Cardio
```

This deliberately includes the combined weight/rest case that needs correction. Treat it as an acceptance example for the target contract, not a verified current import fixture. The [requirements](docs/requirements-and-functionalities.md#14-fronteiras-ainda-abertas--open) record unresolved activation and grammar boundaries.
