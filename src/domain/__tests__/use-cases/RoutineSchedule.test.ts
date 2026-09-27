import { nextRoutineStart, occurrenceAt } from '../../use-cases/routine/RoutineSchedule';

it.each([
    ['2026-09-22T12:00:00Z', '2026-09-23T10:00:00Z'],
    ['2026-09-24T12:00:00Z', '2026-09-30T10:00:00Z'],
    ['2026-09-23T09:00:00Z', '2026-09-23T10:00:00Z'],
    ['2026-09-23T10:00:00Z', '2026-09-23T10:00:00Z'],
    ['2026-09-23T11:00:00Z', '2026-09-30T10:00:00Z'],
])('anchors Wednesday 10:00 from %s', (now, expected) => {
    expect(nextRoutineStart('Quarta-feira', '10:00', 'UTC', new Date(now)).getTime()).toBe(new Date(expected).getTime());
});

it('wraps rows preceding the first row into the following anchored week', () => {
    expect(occurrenceAt(new Date('2026-09-23T10:00:00Z'), 'Segunda-feira', '07:00', 'UTC').toISOString())
        .toBe('2026-09-28T07:00:00.000Z');
});

it('moves nonexistent spring-forward time to the first valid minute and uses the first overlap occurrence', () => {
    expect(nextRoutineStart('Domingo', '02:30', 'America/New_York', new Date('2026-03-08T05:00:00Z')).toISOString())
        .toBe('2026-03-08T07:00:00.000Z');
    expect(nextRoutineStart('Domingo', '01:30', 'America/New_York', new Date('2026-11-01T04:00:00Z')).toISOString())
        .toBe('2026-11-01T05:30:00.000Z');
});

it('does not replay the second ambiguous hour after its first occurrence has passed', () => {
    expect(nextRoutineStart('Domingo', '01:30', 'America/New_York', new Date('2026-11-01T05:45:00Z')).toISOString())
        .toBe('2026-11-08T06:30:00.000Z');
});

it('uses the chosen profile timezone instead of the device timezone', () => {
    expect(nextRoutineStart('Quarta-feira', '10:00', 'America/Sao_Paulo', new Date('2026-09-23T12:00:00Z')).toISOString())
        .toBe('2026-09-23T13:00:00.000Z');
});

it('recomputes a future activation from the newly selected profile timezone', () => {
    const now = new Date('2026-09-23T12:00:00Z');
    expect(nextRoutineStart('Quarta-feira', '10:00', 'UTC', now).toISOString()).toBe('2026-09-30T10:00:00.000Z');
    expect(nextRoutineStart('Quarta-feira', '10:00', 'America/Sao_Paulo', now).toISOString()).toBe('2026-09-23T13:00:00.000Z');
});

it('keeps the first row at the anchor instant even during a DST overlap', () => {
    const anchor = new Date('2026-11-01T05:30:00Z');
    expect(occurrenceAt(anchor, 'Domingo', '01:30', 'America/New_York').toISOString()).toBe('2026-11-01T05:30:00.000Z');
});

it('rejects an invalid IANA timezone instead of silently using the device timezone', () => {
    expect(() => nextRoutineStart('Quarta-feira', '10:00', 'Invalid/Zone', new Date('2026-09-22T12:00:00Z'))).toThrow();
});

it('maps an earlier same-day row to the next weekly cycle', () => {
    const anchor = new Date('2026-09-23T10:00:00Z');
    expect(occurrenceAt(anchor, 'Quarta-feira', '06:00', 'UTC').toISOString()).toBe('2026-09-30T06:00:00.000Z');
});

it('maps a later same-day row within the same anchored cycle', () => {
    const anchor = new Date('2026-09-23T10:00:00Z');
    expect(occurrenceAt(anchor, 'Quarta-feira', '12:00', 'UTC').toISOString()).toBe('2026-09-23T12:00:00.000Z');
});

it('keeps a Friday row within the Wednesday-anchored week', () => {
    const anchor = new Date('2026-09-23T10:00:00Z');
    expect(occurrenceAt(anchor, 'Sexta-feira', '18:00', 'UTC').toISOString()).toBe('2026-09-25T18:00:00.000Z');
});

it('does not drift weekly starts across a DST transition', () => {
    const first = nextRoutineStart('Domingo', '10:00', 'America/New_York', new Date('2026-03-01T12:00:00Z'));
    const next = nextRoutineStart('Domingo', '10:00', 'America/New_York', new Date(first.getTime() + 60_000));
    expect(first.toISOString()).toBe('2026-03-01T15:00:00.000Z');
    expect(next.toISOString()).toBe('2026-03-08T14:00:00.000Z');
});

it('uses the first valid minute after a missing local time without moving the weekday', () => {
    const start = nextRoutineStart('Domingo', '02:30', 'America/New_York', new Date('2026-03-08T05:00:00Z'));
    expect(start.toISOString()).toBe('2026-03-08T07:00:00.000Z');
});

it('keeps the earlier occurrence on the fall-back day at its first 01:30', () => {
    const first = nextRoutineStart('Domingo', '01:30', 'America/New_York', new Date('2026-11-01T04:00:00Z'));
    expect(first.toISOString()).toBe('2026-11-01T05:30:00.000Z');
});

it('schedules an exact equality without rolling to the next week', () => {
    const now = new Date('2026-09-23T10:00:00.000Z');
    expect(nextRoutineStart('Quarta-feira', '10:00', 'UTC', now).getTime()).toBe(now.getTime());
});

it('rolls to next Wednesday when the local start time passed earlier the same day', () => {
    expect(nextRoutineStart('Quarta-feira', '06:00', 'UTC', new Date('2026-09-23T09:00:00Z')).toISOString())
        .toBe('2026-09-30T06:00:00.000Z');
});

it('handles a month boundary while retaining the first-row weekday', () => {
    expect(nextRoutineStart('Quarta-feira', '10:00', 'UTC', new Date('2026-09-30T11:00:00Z')).toISOString())
        .toBe('2026-10-07T10:00:00.000Z');
});

it('does not treat a timezone offset as a fixed weekly UTC duration', () => {
    const before = nextRoutineStart('Domingo', '10:00', 'America/New_York', new Date('2026-03-01T12:00:00Z'));
    const after = nextRoutineStart('Domingo', '10:00', 'America/New_York', new Date(before.getTime() + 60_000));
    expect(after.getTime() - before.getTime()).toBe(167 * 60 * 60 * 1000);
});

it('interprets the first row in the profile timezone when the device is elsewhere', () => {
    const now = new Date('2026-09-23T09:30:00Z');
    expect(nextRoutineStart('Quarta-feira', '07:00', 'America/Sao_Paulo', now).toISOString())
        .toBe('2026-09-23T10:00:00.000Z');
});

it('rejects an invalid weekday instead of silently returning an occurrence', () => {
    expect(() => nextRoutineStart('Dia 1', '10:00', 'UTC', new Date('2026-09-22T12:00:00Z'))).toThrow('Dia inválido');
});
