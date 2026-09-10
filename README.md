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

Workout descriptions are split into exercises on `+`. Each exercise follows the pattern:

```
<sets>x <reps or duration> <name> (<weight>)
```

Examples from a valid workout row:

```
Segunda-feira;18:30;Musculação;4x 10-12 Flexão declinada + 3x 10-12 Pullover (7kg) + 4x 45s Wall sit (4.5kg);Hipertrofia do peitoral
```

Supported forms:

- `4x 10-12 Flexão declinada` — 4 sets of 10–12 reps (the lower bound is stored as the target)
- `4x 45s Wall sit (4.5kg)` — time-based sets; duration is kept in the exercise notes
- `3 séries: 45s prancha + 26 shoulder taps` — an `N séries:` prefix applies the set count to every exercise in the list
- `3x 12 Bicep curl (4kg) / KB halo (7.5kg)` — a `/` alternative is stored in the primary exercise's notes
- Free text without a prescription (e.g. `20 a 25 minutos de treino HIIT ou Tabata`) is imported as a notes-only exercise — HIT workouts follow videos, so they have no fixed sets/reps
