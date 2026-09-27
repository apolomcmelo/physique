import { proposeRoutine, confirmRoutine, visibleRoutine, editRoutine, changeRoutineTimezone, RoutineState } from '../../use-cases/routine/RoutineVersions';
import { validateRoutineCsv } from '../../use-cases/routine/ValidateRoutineCsv';
import { occurrenceForRow } from '../../use-cases/routine/RoutineOccurrences';

const header = 'dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo';
const csv = `${header}\nQuarta-feira;10:00;Café;Ovos;Energia\nQuinta-feira;18:30;HIT;1x 25min Treino HIT;Cardio`;

it('shows a pending version until the first-row start and cuts over exactly at equality', () => {
    const empty: RoutineState = { active: null, pending: null };
    const proposal = proposeRoutine(empty, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z'));
    expect(proposal.startsAt.toISOString()).toBe('2026-09-23T10:00:00.000Z');
    const saved = confirmRoutine(empty, proposal, new Date('2026-09-22T12:00:00Z'), 'UTC');
    expect(saved.active).toBeNull();
    expect(saved.pending?.id).toBe('csv-one');
    expect(visibleRoutine(saved, new Date('2026-09-23T10:00:00Z')).active?.id).toBe('csv-one');
    expect(visibleRoutine(saved, new Date('2026-09-23T10:00:00Z')).pending).toBeNull();
});

it('does not schedule a fixed Monday start for a first-row Wednesday', () => {
    const proposal = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z'));
    expect(proposal.startsAt.getUTCDay()).toBe(3);
});

it('keeps the ordered rows of the imported version for later weekly display', () => {
    const state = { active: null, pending: null };
    const proposal = proposeRoutine(state, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z'));
    expect(proposal.version.rows?.map((row) => row.activity)).toEqual(['Café', 'HIT']);
});

it('replaces only the pending version when a new import is confirmed, retaining the active one', () => {
    const active = { id: 'old', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const state: RoutineState = { active, pending: null };
    const first = confirmRoutine(state, proposeRoutine(state, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z')), new Date('2026-09-22T12:00:00Z'), 'UTC');
    const second = confirmRoutine(first, proposeRoutine(first, validateRoutineCsv(csv), 'csv-two', 'UTC', new Date('2026-09-22T12:00:00Z')), new Date('2026-09-22T12:00:00Z'), 'UTC');
    expect(second.active?.id).toBe('old');
    expect(second.pending?.id).toBe('csv-two');
});

it('requires a new confirmation when the proposed start has passed before saving', () => {
    const empty: RoutineState = { active: null, pending: null };
    const proposal = proposeRoutine(empty, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-23T09:00:00Z'));
    expect(() => confirmRoutine(empty, proposal, new Date('2026-09-23T10:01:00Z'), 'UTC')).toThrow('Prévia expirada');
});

it('edits only the viewed version and keeps its original anchor and history identity', () => {
    const active = { id: 'old', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const state: RoutineState = { active, pending: { ...active, id: 'pending', startsAt: new Date('2026-09-30T10:00:00Z') } };
    const edited = editRoutine(state, 'pending', validateRoutineCsv(csv), new Date('2026-09-22T12:00:00Z'));
    expect(edited.active).toEqual(active);
    expect(edited.pending).toMatchObject({ id: 'pending', anchorDay: 'Quarta-feira', anchorTime: '10:00' });
    expect(edited.pending?.meals).toHaveLength(1);
});

it('rejects editing a version after the cutover changed which version is visible', () => {
    const pending = { id: 'pending', startsAt: new Date('2026-09-23T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    expect(() => editRoutine({ active: null, pending }, 'old', validateRoutineCsv(csv), new Date('2026-09-23T10:00:00Z'))).toThrow('Versão');
});

it('requires a new preview if the profile timezone or replacement target changes', () => {
    const empty: RoutineState = { active: null, pending: null };
    const proposal = proposeRoutine(empty, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z'));
    expect(() => confirmRoutine(empty, proposal, new Date('2026-09-22T12:00:00Z'), 'America/Sao_Paulo')).toThrow('Prévia expirada');
    const replaced: RoutineState = { active: null, pending: { ...proposal.version, id: 'other' } };
    expect(() => confirmRoutine(replaced, proposal, new Date('2026-09-22T12:00:00Z'), 'UTC')).toThrow('Prévia expirada');
});

it('allows an unchanged preview to confirm before the scheduled start', () => {
    const empty: RoutineState = { active: null, pending: null };
    const proposal = proposeRoutine(empty, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-23T09:00:00Z'));
    expect(confirmRoutine(empty, proposal, new Date('2026-09-23T09:30:00Z'), 'UTC').pending?.id).toBe('csv-one');
});

it('requires reconfirmation if the selected timezone changes while preview is open', () => {
    const empty: RoutineState = { active: null, pending: null };
    const proposal = proposeRoutine(empty, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-23T09:00:00Z'));
    expect(() => confirmRoutine(empty, proposal, new Date('2026-09-23T09:30:00Z'), 'America/Sao_Paulo')).toThrow('Prévia expirada');
});

it('recalculates a preview even when a pending cutover has occurred in another device', () => {
    const pending = { id: 'pending', startsAt: new Date('2026-09-23T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const proposal = proposeRoutine({ active: null, pending }, validateRoutineCsv(csv), 'new', 'UTC', new Date('2026-09-23T09:00:00Z'));
    expect(() => confirmRoutine({ active: null, pending }, proposal, new Date('2026-09-23T10:00:00Z'), 'UTC')).toThrow('Prévia expirada');
});

it('does not duplicate a confirmed import retry and leaves its version immutable', () => {
    const empty: RoutineState = { active: null, pending: null };
    const proposal = proposeRoutine(empty, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z'));
    const saved = confirmRoutine(empty, proposal, new Date('2026-09-22T12:00:00Z'), 'UTC');
    expect(confirmRoutine(saved, proposal, new Date('2026-09-22T12:00:00Z'), 'UTC')).toEqual(saved);
});

it('does not create another pending version when retrying the exact same proposal', () => {
    const empty: RoutineState = { active: null, pending: null };
    const now = new Date('2026-09-22T12:00:00Z');
    const proposal = proposeRoutine(empty, validateRoutineCsv(csv), 'csv-one', 'UTC', now);
    const first = confirmRoutine(empty, proposal, now, 'UTC');
    expect(confirmRoutine(first, proposal, now, 'UTC').pending?.id).toBe('csv-one');
});

it('keeps confirmation idempotent after a network response is lost', () => {
    const empty: RoutineState = { active: null, pending: null };
    const now = new Date('2026-09-22T12:00:00Z');
    const proposal = proposeRoutine(empty, validateRoutineCsv(csv), 'csv-one', 'UTC', now);
    const saved = confirmRoutine(empty, proposal, now, 'UTC');
    expect(confirmRoutine(saved, proposal, now, 'UTC')).toEqual(saved);
});

it('rejects a different CSV if it tries to replace an already-used version identity', () => {
    const empty: RoutineState = { active: null, pending: null };
    const proposal = proposeRoutine(empty, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z'));
    const saved = confirmRoutine(empty, proposal, new Date('2026-09-22T12:00:00Z'), 'UTC');
    const altered = { ...proposal, version: { ...proposal.version, meals: [] } };
    expect(() => confirmRoutine(saved, altered, new Date('2026-09-22T12:00:00Z'), 'UTC')).toThrow('identidade');
});

it('keeps the old version through the cutover and preserves the new active version afterward', () => {
    const old = { id: 'old', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const state = confirmRoutine({ active: old, pending: null },
        proposeRoutine({ active: old, pending: null }, validateRoutineCsv(csv), 'new', 'UTC', new Date('2026-09-22T12:00:00Z')),
        new Date('2026-09-22T12:00:00Z'), 'UTC');
    expect(visibleRoutine(state, new Date('2026-09-23T09:59:59Z')).active?.id).toBe('old');
    expect(visibleRoutine(state, new Date('2026-09-23T10:00:00Z')).active?.id).toBe('new');
    expect(visibleRoutine(state, new Date('2026-09-23T10:00:01Z')).active?.id).toBe('new');
});

it('retires a pending slot at equality without deleting the just-activated version', () => {
    const pending = { id: 'pending', startsAt: new Date('2026-09-23T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    expect(visibleRoutine({ active: null, pending }, new Date('2026-09-23T10:00:00Z'))).toEqual({ active: pending, pending: null });
});

it('shows the next start for a first-row Tuesday imported on a Thursday', () => {
    const tuesday = validateRoutineCsv(`${header}\nTerça-feira;07:00;Café;Ovos;Energia`);
    expect(proposeRoutine({ active: null, pending: null }, tuesday, 'tuesday', 'UTC', new Date('2026-09-24T12:00:00Z')).startsAt.toISOString())
        .toBe('2026-09-29T07:00:00.000Z');
});

it('activates immediately when the first row is exactly now', () => {
    const preview = validateRoutineCsv(csv);
    const now = new Date('2026-09-23T10:00:00Z');
    const proposal = proposeRoutine({ active: null, pending: null }, preview, 'exact', 'UTC', now);
    expect(confirmRoutine({ active: null, pending: null }, proposal, now, 'UTC')).toMatchObject({ active: { id: 'exact' }, pending: null });
});

it('replaces the active version immediately when an import is confirmed at its exact start', () => {
    const old = { id: 'old', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const now = new Date('2026-09-23T10:00:00Z');
    const state: RoutineState = { active: old, pending: null };
    const proposal = proposeRoutine(state, validateRoutineCsv(csv), 'new', 'UTC', now);
    expect(confirmRoutine(state, proposal, now, 'UTC')).toMatchObject({ active: { id: 'new' }, pending: null });
});

it('keeps the historical active snapshot when replacing with a future pending plan', () => {
    const old = { id: 'old', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const now = new Date('2026-09-22T12:00:00Z');
    const state: RoutineState = { active: old, pending: null };
    const next = confirmRoutine(state, proposeRoutine(state, validateRoutineCsv(csv), 'new', 'UTC', now), now, 'UTC');
    expect(next.active).toEqual(old);
    expect(next.pending?.id).toBe('new');
});

it('does not replace an already-active routine until the pending start', () => {
    const active = { id: 'active', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const now = new Date('2026-09-22T12:00:00Z');
    const state = confirmRoutine({ active, pending: null }, proposeRoutine({ active, pending: null }, validateRoutineCsv(csv), 'new', 'UTC', now), now, 'UTC');
    expect(visibleRoutine(state, new Date('2026-09-23T09:59:59Z')).active?.id).toBe('active');
});

it('does not allow more than one pending version after repeated replacements', () => {
    const now = new Date('2026-09-22T12:00:00Z');
    let state: RoutineState = { active: null, pending: null };
    for (const id of ['one', 'two', 'three']) {
        state = confirmRoutine(state, proposeRoutine(state, validateRoutineCsv(csv), id, 'UTC', now), now, 'UTC');
    }
    expect(state.pending?.id).toBe('three');
    expect(state.active).toBeNull();
});

it('does not erase the active version when replacing a pending version', () => {
    const active = { id: 'active', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const now = new Date('2026-09-22T12:00:00Z');
    const state: RoutineState = { active, pending: null };
    const first = confirmRoutine(state, proposeRoutine(state, validateRoutineCsv(csv), 'one', 'UTC', now), now, 'UTC');
    const second = confirmRoutine(first, proposeRoutine(first, validateRoutineCsv(csv), 'two', 'UTC', now), now, 'UTC');
    expect(second.active).toEqual(active);
    expect(second.pending?.id).toBe('two');
});

it('does not move an already-started workout session when a pending routine replaces its model', () => {
    const old = { id: 'old', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const session = { id: 'session-1', workoutId: 'old-workout', startedAt: new Date('2026-09-23T09:00:00Z'), finishedAt: null, sets: [] };
    const now = new Date('2026-09-22T12:00:00Z');
    const state = confirmRoutine({ active: old, pending: null }, proposeRoutine({ active: old, pending: null }, validateRoutineCsv(csv), 'new', 'UTC', now), now, 'UTC');
    expect(visibleRoutine(state, new Date('2026-09-23T10:00:00Z')).active?.id).toBe('new');
    expect(session.workoutId).toBe('old-workout');
});

it('does not alter performed history when editing an active routine version', () => {
    const active = { id: 'active', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const performed = { workoutId: 'historical', repsCompleted: 10 };
    const edited = editRoutine({ active, pending: null }, 'active', validateRoutineCsv(csv), new Date('2026-09-22T12:00:00Z'));
    expect(edited.active?.meals).toHaveLength(1);
    expect(performed).toEqual({ workoutId: 'historical', repsCompleted: 10 });
});

it('rejects editing an unknown version rather than creating a new one', () => {
    expect(() => editRoutine({ active: null, pending: null }, 'missing', validateRoutineCsv(csv), new Date('2026-09-22T12:00:00Z'))).toThrow('Versão visualizada');
});

it('edits a future pending version without propagating changes into its active predecessor', () => {
    const active = { id: 'old', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const pending = { ...active, id: 'new', startsAt: new Date('2026-09-30T10:00:00Z') };
    const result = editRoutine({ active, pending }, 'new', validateRoutineCsv(csv), new Date('2026-09-23T09:00:00Z'));
    expect(result.active?.meals).toEqual([]);
    expect(result.pending?.meals).toHaveLength(1);
});

it('requires reconfirmation if a proposal is held while the profile timezone changes', () => {
    const empty: RoutineState = { active: null, pending: null };
    const proposal = proposeRoutine(empty, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z'));
    expect(() => confirmRoutine(empty, proposal, new Date('2026-09-22T12:00:00Z'), 'America/Sao_Paulo')).toThrow('Prévia expirada');
});

it('does not change an already-active historical start when the profile timezone changes', () => {
    const active = { id: 'old', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const shifted = changeRoutineTimezone({ active, pending: null }, 'America/Sao_Paulo', new Date('2026-09-23T12:00:00Z'));
    expect(shifted.active?.startsAt.toISOString()).toBe('2026-09-16T10:00:00.000Z');
});

it('recomputes future occurrences in the new timezone without changing old occurrence IDs', () => {
    const pending = { id: 'pending', startsAt: new Date('2026-09-30T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const before = occurrenceForRow(pending, 'meal-1', 'Quarta-feira', '10:00', 0);
    const shifted = changeRoutineTimezone({ active: null, pending }, 'America/Sao_Paulo', new Date('2026-09-23T12:00:00Z'));
    expect(before.id).toContain('2026-09-30T10:00:00.000Z');
    expect(occurrenceForRow(shifted.pending!, 'meal-1', 'Quarta-feira', '10:00', 0).at.toISOString()).toBe('2026-09-23T13:00:00.000Z');
});

it('rejects a pending edit that changes the established first-row anchor', () => {
    const pending = { id: 'pending', startsAt: new Date('2026-09-30T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const different = validateRoutineCsv(`${header}\nTerça-feira;09:00;Café;Ovos;Energia`);
    expect(() => editRoutine({ active: null, pending }, 'pending', different, new Date('2026-09-22T12:00:00Z'))).toThrow('âncora');
});


it('preserves the old pending version if the preview is stale during confirmation', () => {
    const empty: RoutineState = { active: null, pending: null };
    const proposal = proposeRoutine(empty, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-23T09:00:00Z'));
    const state = { active: null, pending: { ...proposal.version, id: 'previous-pending' } };
    expect(() => confirmRoutine(state, proposal, new Date('2026-09-23T10:01:00Z'), 'UTC')).toThrow('Prévia expirada');
    expect(state.pending.id).toBe('previous-pending');
});

it('does not replace a newer pending version using a preview from an older pending version', () => {
    const oldPending = { id: 'older', startsAt: new Date('2026-09-30T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const proposed = proposeRoutine({ active: null, pending: oldPending }, validateRoutineCsv(csv), 'candidate', 'UTC', new Date('2026-09-22T12:00:00Z'));
    const newer = { ...oldPending, id: 'newer' };
    expect(() => confirmRoutine({ active: null, pending: newer }, proposed, new Date('2026-09-22T12:00:00Z'), 'UTC')).toThrow('Prévia expirada');
});

it('keeps an active version if the pending version expires during a failed confirmation', () => {
    const active = { id: 'old', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const proposal = proposeRoutine({ active, pending: null }, validateRoutineCsv(csv), 'new', 'UTC', new Date('2026-09-23T09:00:00Z'));
    expect(() => confirmRoutine({ active, pending: null }, proposal, new Date('2026-09-23T10:01:00Z'), 'UTC')).toThrow('Prévia expirada');
    expect(active.id).toBe('old');
});

it('assigns stable row identities to the imported workout and meal for occurrence tracking', () => {
    const proposal = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z'));
    expect(proposal.version.rows?.map((row) => row.id)).toEqual(['csv-one:0', 'csv-one:1']);
});

it('retains row identity across an edit of the viewed version', () => {
    const preview = validateRoutineCsv(csv);
    const imported = confirmRoutine({ active: null, pending: null },
        proposeRoutine({ active: null, pending: null }, preview, 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z')),
        new Date('2026-09-22T12:00:00Z'), 'UTC');
    expect(editRoutine(imported, 'csv-one', preview, new Date('2026-09-22T12:01:00Z')).pending?.rows?.map((row) => row.id))
        .toEqual(['csv-one:0', 'csv-one:1']);
});

it('retains historical model IDs when editing existing exercise and meal rows', () => {
    const preview = validateRoutineCsv(csv);
    const imported = confirmRoutine({ active: null, pending: null },
        proposeRoutine({ active: null, pending: null }, preview, 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z')),
        new Date('2026-09-22T12:00:00Z'), 'UTC');
    const edited = editRoutine(imported, 'csv-one', validateRoutineCsv(csv), new Date('2026-09-22T12:01:00Z'));
    expect(edited.pending?.meals[0].id).toBe(imported.pending?.meals[0].id);
    expect(edited.pending?.workouts[0].id).toBe(imported.pending?.workouts[0].id);
});

it('does not rewrite an active version when editing a pending row at the same index', () => {
    const old = { id: 'old', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const pending = { ...old, id: 'pending', startsAt: new Date('2026-09-30T10:00:00Z') };
    expect(editRoutine({ active: old, pending }, 'pending', validateRoutineCsv(csv), new Date('2026-09-22T12:00:00Z')).active).toEqual(old);
});

it('keeps the original workout ID but does not reuse an exercise ID for a different exercise', () => {
    const before = validateRoutineCsv(`${header}\nQuarta-feira;10:00;Musculação;3x 10 Supino;Peito`);
    const after = validateRoutineCsv(`${header}\nQuarta-feira;10:00;Musculação;3x 12 Agachamento;Pernas`);
    const imported = confirmRoutine({ active: null, pending: null }, proposeRoutine({ active: null, pending: null }, before, 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z')), new Date('2026-09-22T12:00:00Z'), 'UTC');
    const edited = editRoutine(imported, 'csv-one', after, new Date('2026-09-22T12:01:00Z'));
    expect(edited.pending?.workouts[0].id).toBe(imported.pending?.workouts[0].id);
    expect(edited.pending?.workouts[0].exercises[0].id).not.toBe(imported.pending?.workouts[0].exercises[0].id);
});

it('recalculates only future pending starts after a profile timezone change', () => {
    const pending = { id: 'pending', startsAt: new Date('2026-09-30T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const state: RoutineState = { active: null, pending };
    const shifted = changeRoutineTimezone(state, 'America/Sao_Paulo', new Date('2026-09-23T12:00:00Z'));
    expect(shifted.pending?.startsAt.toISOString()).toBe('2026-09-23T13:00:00.000Z');
    expect(state.pending?.startsAt.toISOString()).toBe('2026-09-30T10:00:00.000Z');
});

it('keeps old scheduled instants stable after a timezone change to the active version', () => {
    const active = { id: 'old', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    expect(changeRoutineTimezone({ active, pending: null }, 'America/Sao_Paulo', new Date('2026-09-23T12:00:00Z')).active?.startsAt.toISOString())
        .toBe('2026-09-16T10:00:00.000Z');
});

it('keeps the first activation instant immutable after an edit', () => {
    const preview = validateRoutineCsv(csv);
    const now = new Date('2026-09-22T12:00:00Z');
    const proposal = proposeRoutine({ active: null, pending: null }, preview, 'csv-one', 'UTC', now);
    const saved = confirmRoutine({ active: null, pending: null }, proposal, now, 'UTC');
    expect(editRoutine(saved, 'csv-one', preview, now).pending?.startsAt.toISOString()).toBe(proposal.startsAt.toISOString());
});

it('does not silently alter the active timezone while recalculating pending future dates', () => {
    const active = { id: 'active', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const pending = { ...active, id: 'pending', startsAt: new Date('2026-09-30T10:00:00Z') };
    expect(changeRoutineTimezone({ active, pending }, 'America/Sao_Paulo', new Date('2026-09-23T12:00:00Z')).active?.timezone).toBe('UTC');
});

it('does not change the active version while rescheduling the pending one for a timezone change', () => {
    const active = { id: 'active', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const pending = { ...active, id: 'pending', startsAt: new Date('2026-09-30T10:00:00Z') };
    const shifted = changeRoutineTimezone({ active, pending }, 'America/Sao_Paulo', new Date('2026-09-23T12:00:00Z'));
    expect(shifted.active).toEqual(active);
    expect(shifted.pending?.timezone).toBe('America/Sao_Paulo');
});

it('keeps the pending version ID during a timezone reschedule so retries cannot duplicate it', () => {
    const pending = { id: 'pending', startsAt: new Date('2026-09-30T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    expect(changeRoutineTimezone({ active: null, pending }, 'America/Sao_Paulo', new Date('2026-09-23T12:00:00Z')).pending?.id).toBe('pending');
});

it('preserves the old active start when an edit is made after its initial activation', () => {
    const active = { id: 'active', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    expect(editRoutine({ active, pending: null }, 'active', validateRoutineCsv(csv), new Date('2026-09-23T12:00:00Z')).active?.startsAt.toISOString())
        .toBe('2026-09-16T10:00:00.000Z');
});

it('does not change the pending version when editing the currently viewed active version', () => {
    const active = { id: 'active', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const pending = { ...active, id: 'pending', startsAt: new Date('2026-09-30T10:00:00Z') };
    const result = editRoutine({ active, pending }, 'active', validateRoutineCsv(csv), new Date('2026-09-22T12:00:00Z'));
    expect(result.pending).toEqual(pending);
});

it('keeps pending content unchanged if editing the active version fails due to an anchor change', () => {
    const active = { id: 'active', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const pending = { ...active, id: 'pending', startsAt: new Date('2026-09-30T10:00:00Z') };
    const different = validateRoutineCsv(`${header}\nTerça-feira;07:00;Café;Ovos;Energia`);
    expect(() => editRoutine({ active, pending }, 'active', different, new Date('2026-09-22T12:00:00Z'))).toThrow('âncora');
    expect(pending.meals).toEqual([]);
});

it('does not alter the first-row anchor when editing the viewed active version', () => {
    const active = { id: 'active', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const edited = editRoutine({ active, pending: null }, 'active', validateRoutineCsv(csv), new Date('2026-09-22T12:00:00Z'));
    expect(edited.active?.anchorDay).toBe('Quarta-feira');
    expect(edited.active?.anchorTime).toBe('10:00');
});

it('requires a fresh import rather than silently changing the anchor during an edit', () => {
    const pending = { id: 'pending', startsAt: new Date('2026-09-30T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    expect(() => editRoutine({ active: null, pending }, 'pending', validateRoutineCsv(`${header}\nTerça-feira;10:00;Café;Ovos;Energia`), new Date('2026-09-22T12:00:00Z'))).toThrow('âncora');
});

it('does not invent a Monday anchor when editing the viewed version', () => {
    const active = { id: 'active', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const edited = editRoutine({ active, pending: null }, 'active', validateRoutineCsv(csv), new Date('2026-09-22T12:00:00Z'));
    expect(edited.active?.anchorDay).toBe('Quarta-feira');
});

it('does not accidentally edit both slots when active and pending share the same weekday', () => {
    const active = { id: 'active', startsAt: new Date('2026-09-16T10:00:00Z'), timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [] };
    const pending = { ...active, id: 'pending', startsAt: new Date('2026-09-30T10:00:00Z') };
    const result = editRoutine({ active, pending }, 'pending', validateRoutineCsv(csv), new Date('2026-09-22T12:00:00Z'));
    expect(result.active).toEqual(active);
});

it('keeps the version identity on a metadata-only edit of the viewed version', () => {
    const preview = validateRoutineCsv(csv);
    const now = new Date('2026-09-22T12:00:00Z');
    const proposal = proposeRoutine({ active: null, pending: null }, preview, 'csv-one', 'UTC', now);
    const saved = confirmRoutine({ active: null, pending: null }, proposal, now, 'UTC');
    expect(editRoutine(saved, 'csv-one', preview, now).pending?.id).toBe('csv-one');
});
