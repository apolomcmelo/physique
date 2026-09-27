import { occurrenceForRow, markOccurrence, occurrenceStatus } from '../../use-cases/routine/RoutineOccurrences';
import { RoutineVersion } from '../../use-cases/routine/RoutineVersions';

const version: RoutineVersion = { id: 'routine-one', startsAt: new Date('2026-09-23T10:00:00Z'), timezone: 'UTC',
    anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };

it('keeps weekly instances independent, with unrecorded distinct from explicitly skipped', () => {
    const first = occurrenceForRow(version, 'meal-1', 'Quarta-feira', '10:00', 0);
    const nextWeek = occurrenceForRow(version, 'meal-1', 'Quarta-feira', '10:00', 1);
    expect(first.at.toISOString()).toBe('2026-09-23T10:00:00.000Z');
    expect(nextWeek.at.toISOString()).toBe('2026-09-30T10:00:00.000Z');
    expect(occurrenceStatus([], first)).toBe('unrecorded');
    const records = markOccurrence([], first, 'skipped');
    expect(occurrenceStatus(records, first)).toBe('skipped');
    expect(occurrenceStatus(records, nextWeek)).toBe('unrecorded');
});

it('allows retroactive correction without changing a later occurrence', () => {
    const first = occurrenceForRow(version, 'meal-1', 'Quarta-feira', '10:00', 0);
    const next = occurrenceForRow(version, 'meal-1', 'Quarta-feira', '10:00', 1);
    const records = markOccurrence(markOccurrence([], next, 'completed'), first, 'skipped');
    expect(occurrenceStatus(markOccurrence(records, first, 'completed'), first)).toBe('completed');
    expect(occurrenceStatus(records, next)).toBe('completed');
});

it('keeps the weekly wall time through a daylight-saving change', () => {
    const spring: RoutineVersion = { ...version, startsAt: new Date('2026-03-01T15:00:00Z'), timezone: 'America/New_York',
        anchorDay: 'Domingo', anchorTime: '10:00' };
    expect(occurrenceForRow(spring, 'meal-1', 'Domingo', '10:00', 1).at.toISOString()).toBe('2026-03-08T14:00:00.000Z');
});

it('keeps a performed record associated with the old routine after its replacement', () => {
    const oldOccurrence = occurrenceForRow(version, 'meal-1', 'Quarta-feira', '10:00', 0);
    const records = markOccurrence([], oldOccurrence, 'completed');
    const replacement: RoutineVersion = { ...version, id: 'routine-two' };
    expect(occurrenceStatus(records, oldOccurrence)).toBe('completed');
    expect(occurrenceStatus(records, occurrenceForRow(replacement, 'meal-1', 'Quarta-feira', '10:00', 0))).toBe('unrecorded');
});

it('rejects negative week indexes rather than generating an earlier unintended occurrence', () => {
    expect(() => occurrenceForRow(version, 'meal-1', 'Quarta-feira', '10:00', -1)).toThrow('Semana');
});

it('treats a later unrecorded workout as absent, not skipped, despite an earlier skip', () => {
    const previous = occurrenceForRow(version, 'workout-1', 'Quarta-feira', '10:00', 0);
    const later = occurrenceForRow(version, 'workout-1', 'Quarta-feira', '10:00', 1);
    expect(occurrenceStatus(markOccurrence([], previous, 'skipped'), later)).toBe('unrecorded');
});

it('keeps two activities on the same date independent', () => {
    const breakfast = occurrenceForRow(version, 'breakfast', 'Quarta-feira', '10:00', 0);
    const workout = occurrenceForRow(version, 'workout', 'Quarta-feira', '10:00', 0);
    expect(occurrenceStatus(markOccurrence([], breakfast, 'completed'), workout)).toBe('unrecorded');
});

it('keeps the first weekly occurrence exactly at the routine start', () => {
    expect(occurrenceForRow(version, 'first-row', 'Quarta-feira', '10:00', 0).at.getTime()).toBe(version.startsAt.getTime());
});

it('preserves an occurrence ID after a session is recorded for a different version', () => {
    const old = occurrenceForRow(version, 'workout', 'Quarta-feira', '10:00', 0);
    const next = occurrenceForRow({ ...version, id: 'replacement' }, 'workout', 'Quarta-feira', '10:00', 0);
    const records = markOccurrence([], old, 'completed');
    expect(occurrenceStatus(records, next)).toBe('unrecorded');
});

it('supports a retroactively recorded skipped occurrence without implying other days were skipped', () => {
    const tuesday = occurrenceForRow(version, 'meal-1', 'Terça-feira', '12:00', 0);
    const thursday = occurrenceForRow(version, 'meal-2', 'Quinta-feira', '12:00', 0);
    const records = markOccurrence([], tuesday, 'skipped');
    expect(occurrenceStatus(records, thursday)).toBe('unrecorded');
});

it('preserves completion when correcting an occurrence from skipped to completed', () => {
    const occurrence = occurrenceForRow(version, 'meal-1', 'Quarta-feira', '10:00', 0);
    const corrected = markOccurrence(markOccurrence([], occurrence, 'skipped'), occurrence, 'completed');
    expect(corrected).toHaveLength(1);
    expect(occurrenceStatus(corrected, occurrence)).toBe('completed');
});

it('does not automatically skip an unrecorded instance when a new week begins', () => {
    const first = occurrenceForRow(version, 'meal', 'Quarta-feira', '10:00', 0);
    const second = occurrenceForRow(version, 'meal', 'Quarta-feira', '10:00', 1);
    expect(occurrenceStatus([], first)).toBe('unrecorded');
    expect(occurrenceStatus(markOccurrence([], second, 'completed'), first)).toBe('unrecorded');
});

it('retains a past occurrence timestamp even when another routine takes over', () => {
    const old = occurrenceForRow(version, 'meal', 'Quarta-feira', '10:00', 0);
    const recorded = markOccurrence([], old, 'completed');
    expect(occurrenceStatus(recorded, old)).toBe('completed');
    expect(old.at.toISOString()).toBe('2026-09-23T10:00:00.000Z');
});

it('keeps occurrence IDs unique for two weeks with the same activity row', () => {
    const a = occurrenceForRow(version, 'meal', 'Quarta-feira', '10:00', 0);
    const b = occurrenceForRow(version, 'meal', 'Quarta-feira', '10:00', 1);
    expect(a.id).not.toBe(b.id);
});

it('does not move an explicitly skipped instance to the next day', () => {
    const first = occurrenceForRow(version, 'meal', 'Quarta-feira', '10:00', 0);
    const records = markOccurrence([], first, 'skipped');
    expect(records[0].occurrenceId).toBe(first.id);
});

it('does not infer a status for an unrecorded occurrence in an old routine', () => {
    const old = occurrenceForRow(version, 'meal', 'Quarta-feira', '10:00', 0);
    expect(occurrenceStatus([], old)).toBe('unrecorded');
});

it('separates a planned future occurrence from a completed past one', () => {
    const past = occurrenceForRow(version, 'workout', 'Quarta-feira', '10:00', 0);
    const future = occurrenceForRow(version, 'workout', 'Quarta-feira', '10:00', 2);
    expect(occurrenceStatus(markOccurrence([], past, 'completed'), future)).toBe('unrecorded');
});

it('does not mark another row at the same time completed by a workout session', () => {
    const a = occurrenceForRow(version, 'workout-1', 'Quarta-feira', '10:00', 0);
    const b = occurrenceForRow(version, 'workout-2', 'Quarta-feira', '10:00', 0);
    expect(occurrenceStatus(markOccurrence([], a, 'completed'), b)).toBe('unrecorded');
});

it('keeps an explicit skipped record after the routine slot has been replaced', () => {
    const skipped = occurrenceForRow(version, 'meal', 'Quarta-feira', '10:00', 0);
    const records = markOccurrence([], skipped, 'skipped');
    expect(occurrenceStatus(records, skipped)).toBe('skipped');
});
