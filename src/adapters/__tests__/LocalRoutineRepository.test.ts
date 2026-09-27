import { LocalRoutineRepository } from '../local/LocalRoutineRepository';
import { validateRoutineCsv } from '../../domain/use-cases/routine/ValidateRoutineCsv';
import { proposeRoutine, RoutineState } from '../../domain/use-cases/routine/RoutineVersions';

let mockAccount = 'account-a';
const mockStore = new Map<string, string>();
let mockFail = false;
jest.mock('../local/LocalStorage', () => ({
    getAccountId: jest.fn(async () => mockAccount),
    getItem: jest.fn(async (key: string) => mockStore.has(`${key}/${mockAccount}`) ? JSON.parse(mockStore.get(`${key}/${mockAccount}`)!) : null),
    setItemForAccount: jest.fn(async (key: string, value: unknown, account: string) => {
        if (account !== mockAccount) throw new Error('Account changed');
        if (mockFail) { mockFail = false; throw new Error('quota exceeded'); }
        mockStore.set(`${key}/${account}`, JSON.stringify(value));
    }),
}));

const csv = 'dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo\nQuarta-feira;10:00;Café;Ovos;Energia';

beforeEach(() => { mockStore.clear(); mockAccount = 'account-a'; mockFail = false; });

it('persists a pending version per account without changing the active version on a failed write', async () => {
    const repo = new LocalRoutineRepository();
    const now = new Date('2026-09-22T12:00:00Z');
    const empty: RoutineState = { active: null, pending: null };
    const proposal = proposeRoutine(empty, validateRoutineCsv(csv), 'csv-one', 'UTC', now);
    mockFail = true;
    await expect(repo.confirm(proposal, now, 'UTC')).rejects.toThrow('quota exceeded');
    expect(await repo.getState()).toEqual(empty);
    await repo.confirm(proposal, now, 'UTC');
    expect((await new LocalRoutineRepository().getState()).pending?.id).toBe('csv-one');
    mockAccount = 'account-b';
    expect(await repo.getState()).toEqual(empty);
});

it('retries a confirmed import without duplicating it', async () => {
    const repo = new LocalRoutineRepository();
    const now = new Date('2026-09-22T12:00:00Z');
    const proposal = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', now);
    await repo.confirm(proposal, now, 'UTC');
    await repo.confirm(proposal, now, 'UTC');
    expect((await repo.getState()).pending?.id).toBe('csv-one');
});

it('does not lose the active version when replacing a pending version fails', async () => {
    const repo = new LocalRoutineRepository();
    const now = new Date('2026-09-22T12:00:00Z');
    const first = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'first', 'UTC', now);
    await repo.confirm(first, now, 'UTC');
    const second = proposeRoutine(await repo.getState(), validateRoutineCsv(csv), 'second', 'UTC', now);
    mockFail = true;
    await expect(repo.confirm(second, now, 'UTC')).rejects.toThrow('quota exceeded');
    expect((await repo.getState()).pending?.id).toBe('first');
});

it('keeps a confirmed routine after a lost acknowledgement and a retry', async () => {
    const repo = new LocalRoutineRepository();
    const now = new Date('2026-09-22T12:00:00Z');
    const proposal = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', now);
    await repo.confirm(proposal, now, 'UTC');
    await repo.confirm(proposal, now, 'UTC');
    expect((await repo.getState()).pending?.rows?.map(row => row.id)).toEqual(['csv-one:0']);
});

it('does not re-create a stale proposal when the preview expires before the write', async () => {
    const repo = new LocalRoutineRepository();
    const proposal = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-23T09:00:00Z'));
    await expect(repo.confirm(proposal, new Date('2026-09-23T10:01:00Z'), 'UTC')).rejects.toThrow('Prévia expirada');
    expect(await repo.getState()).toEqual({ active: null, pending: null });
});

it('edits only the viewed pending version while preserving its anchor and active predecessor', async () => {
    const repo = new LocalRoutineRepository();
    const now = new Date('2026-09-22T12:00:00Z');
    const proposal = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', now);
    await repo.confirm(proposal, now, 'UTC');
    const edited = await repo.edit('csv-one', validateRoutineCsv(csv), now);
    expect(edited.pending?.anchorTime).toBe('10:00');
    expect(edited.pending?.rows?.[0].id).toBe('csv-one:0');
});

it('rehydrates the pending version date and workout dates after reopening', async () => {
    const repo = new LocalRoutineRepository();
    const now = new Date('2026-09-22T12:00:00Z');
    const proposal = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', now);
    await repo.confirm(proposal, now, 'UTC');
    const restored = await new LocalRoutineRepository().getState();
    expect(restored.pending?.startsAt).toBeInstanceOf(Date);
    expect(restored.pending?.startsAt.toISOString()).toBe('2026-09-23T10:00:00.000Z');
});

it('does not let account B read account A routine after account switching', async () => {
    const repo = new LocalRoutineRepository();
    const now = new Date('2026-09-22T12:00:00Z');
    await repo.confirm(proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', now), now, 'UTC');
    mockAccount = 'account-b';
    expect(await new LocalRoutineRepository().getState()).toEqual({ active: null, pending: null });
});

it('keeps the previous routine after failed edit and lets the user retry', async () => {
    const repo = new LocalRoutineRepository();
    const now = new Date('2026-09-22T12:00:00Z');
    await repo.confirm(proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', now), now, 'UTC');
    mockFail = true;
    await expect(repo.edit('csv-one', validateRoutineCsv(csv), now)).rejects.toThrow('quota exceeded');
    expect((await repo.getState()).pending?.id).toBe('csv-one');
    await repo.edit('csv-one', validateRoutineCsv(csv), now);
    expect((await repo.getState()).pending?.id).toBe('csv-one');
});

it('keeps the active version when a pending replacement is confirmed later', async () => {
    const repo = new LocalRoutineRepository();
    const now = new Date('2026-09-22T12:00:00Z');
    await repo.confirm(proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'first', 'UTC', now), now, 'UTC');
    const first = await repo.getState();
    await repo.confirm(proposeRoutine(first, validateRoutineCsv(csv), 'second', 'UTC', now), now, 'UTC');
    expect((await repo.getState()).pending?.id).toBe('second');
});

it('persists a recalculated future start after the profile timezone changes', async () => {
    const repo = new LocalRoutineRepository();
    const now = new Date('2026-09-23T12:00:00Z');
    const proposal = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', now);
    await repo.confirm(proposal, now, 'UTC');
    const shifted = await repo.changeTimezone('America/Sao_Paulo', now);
    expect(shifted.pending?.startsAt.toISOString()).toBe('2026-09-23T13:00:00.000Z');
    expect((await new LocalRoutineRepository().getState()).pending?.timezone).toBe('America/Sao_Paulo');
});

it('does not change the stored routine if a timezone reschedule fails', async () => {
    const repo = new LocalRoutineRepository();
    const now = new Date('2026-09-23T12:00:00Z');
    await repo.confirm(proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', now), now, 'UTC');
    mockFail = true;
    await expect(repo.changeTimezone('America/Sao_Paulo', now)).rejects.toThrow('quota exceeded');
    expect((await repo.getState()).pending?.timezone).toBe('UTC');
});

it('retains a confirmed version on reopening after a retry', async () => {
    const repo = new LocalRoutineRepository();
    const now = new Date('2026-09-22T12:00:00Z');
    const proposal = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', now);
    await repo.confirm(proposal, now, 'UTC');
    await new LocalRoutineRepository().confirm(proposal, now, 'UTC');
    expect((await new LocalRoutineRepository().getState()).pending?.rows?.length).toBe(1);
});
