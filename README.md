<img width="1254" height="1254" alt="physique_logo" src="https://github.com/user-attachments/assets/fbc56772-23cb-4f0e-a764-7b02ef945b3a" />

# Physique

A personal health and fitness tracker designed to manage workouts, nutrition, body measurements, progress photos, and medical records in one place.

## Goals

- Track workout sessions and exercise progression
- Organize nutrition plans and meal schedules
- Monitor body composition and progress photos
- Store medical records and clinical exams
- Provide long-term insights into personal health and fitness

## CSV Import

The Plan tab imports a single CSV that creates both the meal plan and the workout plan. The file must be **semicolon-separated** (`;`) with a header row followed by one row per scheduled activity:

```
dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo
```

| Column | Content |
|---|---|
| `dia` | Portuguese weekday name, e.g. `Segunda-feira`, `Terça-feira` (accent-insensitive) |
| `horário` | Start time in `HH:MM`, e.g. `07:00` |
| `atividade/refeição` | Workout rows: `Calistenia`, `HIT`, or `Musculação`. Anything else is imported as a meal |
| `o que fazer/o que comer` | Meal description, or the workout's exercise list (see below) |
| `foco/motivo` | Meal rows: biological objective. Workout rows: becomes the workout name |

### Exercise prescription syntax

Workout descriptions are split into exercises separated by `+`. Each exercise is sequentially indexed (`orderIndex`) to preserve workout order.

The general exercise pattern is:

```
<sets>x <reps or duration> <name> (<weight>) (<rest intervals>)
```

#### Supported forms:

- **Reps-based exercises**:
  - `4x 10-12 Flexão declinada` — 4 sets of 10–12 reps (the lower bound `10` is stored as target reps).
  - `3x 10 Supino reto` — 3 sets of 10 reps.
- **Time-based exercises**:
  - `4x 45s Wall sit` — 4 sets of 45 seconds (stored as `durationSeconds: 45`).
  - `3x 1:20min Prancha` — 3 sets of 1 minute and 20 seconds (`durationSeconds: 80`).
- **Load / Weight annotations**:
  - `(7kg)` or `(4.5kg)` — extracts numeric weight in kg (stored in `weightKg`).
  - `(2 anilhas de 1.5kg)` — parses `1.5` as weight and stores additional detail in notes.
- **Rest Intervals** (rest between series vs. rest before next exercise):
  - **Both intervals inline**: `(descanso: 15s / 30s transição)` or `(rest: 15s, 30s proximo)` — sets 15 seconds rest between sets (`restSecondsBetweenSets`) and 30 seconds before moving to the next exercise (`restSecondsBeforeNextExercise`).
  - **Transition only inline**: `(transição: 30s)` or `(próximo 45s)` — sets rest before the next exercise.
  - **Standalone rest segment**: `+ 15s rest`, `+ 30s descanso`, or `+ 45s transição` — sets the transition rest on the preceding exercise.
- **Shared set prefix**:
  - `3 séries: 45s prancha + 35s wall sit (4.5kg) + 26 shoulder taps` — applies 3 sets to all exercises in the row.
- **Alternative exercises**:
  - `3x 12 Bicep curl (4kg) / KB halo (7.5kg)` — the alternative after `/` is stored in notes (`ou KB halo (7.5kg)`).
- **Free text / HIT videos**:
  - `20 a 25 minutos de treino HIIT ou Tabata` — imported as a notes-only exercise for circuit/video-based training without fixed set/rep structure.

### Example CSV

```csv
dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo
Segunda-feira;07:00;Café da Manhã;2 fatias de pão integral + 3 ovos mexidos + 1 banana;Aporte proteico e energia
Segunda-feira;18:30;Musculação;4x 10-12 Flexão declinada (descanso: 15s / 30s transição) + 3x 10-12 Pullover (7kg) (descanso: 20s / 30s transição) + 3x 12-15 Tríceps testa (5kg);Peitoral e Tríceps
Terça-feira;07:00;Calistenia;3 séries: 45s Prancha + 35s Wall sit (4.5kg) + 26 Shoulder taps + 30s descanso;Core e Pernas
Quarta-feira;18:30;Musculação;3x 12-15 Bicep curl (4kg) / KB halo (7.5kg) + 3x 45s Prancha + 15s rest;Braços e Core
Quinta-feira;06:30;HIT;20 a 25 minutos de treino HIIT ou Tabata;Cardio e Queima de Gordura
```
