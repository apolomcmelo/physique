import { ROUTINE_CSV_HEADER } from './ReadRoutineCsv';

export const CSV_PROMPT_CONTRACT = `Use semicolon-separated CSV with this exact header: ${ROUTINE_CSV_HEADER}.
Quote fields containing semicolons, newlines or double quotes; use doubled escaped double quotes inside quoted fields.
Use Portuguese weekday names and 24-hour HH:MM times. Workout activities are exactly Calistenia, Musculação or HIT.
Workout exercises: 1–100 sets; 1–1000 reps or 1–10800 seconds per set; kg load 0–1000 with at most two decimal places; rests 0–300 seconds.
Separate exercises with +. Accept rep ranges like 10-12 (use 10), MM:SSmin, optional kg and (descanso: 15s / 30s transição), shared sets and alternatives /.
Meal descriptions are free text. Do not disguise an unknown workout type as a meal or provide malformed exercise prescriptions.
For HIT use one exercise, one timed set (e.g. 1x 25min Treino HIT); never use vague notes-only HIT.
Give the plan and recommendations in Brazilian Portuguese.`;
