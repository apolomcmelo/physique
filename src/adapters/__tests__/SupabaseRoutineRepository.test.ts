import { SupabaseRoutineRepository } from '../supabase/SupabaseRoutineRepository';
import { proposeRoutine } from '../../domain/use-cases/routine/RoutineVersions';
import { validateRoutineCsv } from '../../domain/use-cases/routine/ValidateRoutineCsv';

const mockRpc = jest.fn();
jest.mock('../../infrastructure/supabase/client', () => ({ supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: { getUser: jest.fn(async () => ({ data: { user: { id: 'owner-a' } }, error: null })) },
} }));

const csv = 'dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo\nQuarta-feira;10:00;Café;Ovos;Energia';

it('confirms one owner-scoped version in a single transaction and surfaces failures', async () => {
    mockRpc.mockResolvedValueOnce({ data: { active: null, pending: null }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'conflict' } });
    const repo = new SupabaseRoutineRepository();
    const proposal = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z'));
    await expect(repo.confirm(proposal, new Date('2026-09-22T12:00:00Z'), 'UTC')).rejects.toThrow('conflict');
    expect(mockRpc).toHaveBeenCalledWith('confirm_routine_version', expect.objectContaining({ p_owner_id: 'owner-a' }));
});

it('does not return a locally imagined state when the server rejects an expired preview', async () => {
    mockRpc.mockReset();
    mockRpc.mockResolvedValueOnce({ data: { active: null, pending: null }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Prévia expirada' } });
    const proposal = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z'));
    await expect(new SupabaseRoutineRepository().confirm(proposal, new Date('2026-09-22T12:00:00Z'), 'UTC')).rejects.toThrow('Prévia expirada');
});

it('reads a persisted pending version with real Date values after reload', async () => {
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: { active: null, pending: { id: 'csv-one', startsAt: '2026-09-23T10:00:00Z', timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [], rows: [] } }, error: null });
    const state = await new SupabaseRoutineRepository().getState();
    expect(state.pending?.startsAt).toBeInstanceOf(Date);
    expect(state.pending?.startsAt.toISOString()).toBe('2026-09-23T10:00:00.000Z');
});

it('does not overwrite the visible active version when editing the pending version fails', async () => {
    mockRpc.mockReset();
    const existing = { id: 'pending', startsAt: '2026-09-30T10:00:00Z', timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [], rows: [] };
    mockRpc.mockResolvedValueOnce({ data: { active: { ...existing, id: 'active' }, pending: existing }, error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'write failed' } });
    await expect(new SupabaseRoutineRepository().edit('pending', validateRoutineCsv('dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo\nQuarta-feira;10:00;Café;Ovos;Energia'), new Date('2026-09-22T12:00:00Z'))).rejects.toThrow('write failed');
    expect(mockRpc).toHaveBeenCalledWith('edit_routine_version', expect.objectContaining({ p_viewed_id: 'pending' }));
});

it('reschedules only the pending version in the new profile timezone', async () => {
    mockRpc.mockReset();
    mockRpc.mockResolvedValueOnce({ data: { active: null, pending: { id: 'pending', startsAt: '2026-09-30T10:00:00Z', timezone: 'UTC', anchorDay: 'Quarta-feira', anchorTime: '10:00', meals: [], workouts: [], rows: [] } }, error: null })
        .mockResolvedValueOnce({ data: null, error: null });
    await new SupabaseRoutineRepository().changeTimezone('America/Sao_Paulo', new Date('2026-09-23T12:00:00Z'));
    expect(mockRpc).toHaveBeenCalledWith('reschedule_pending_routine', expect.objectContaining({ p_owner_id: 'owner-a', p_version: expect.objectContaining({ timezone: 'America/Sao_Paulo' }) }));
});

it('returns an empty state when the authenticated account has no routine rows', async () => {
    mockRpc.mockReset().mockResolvedValue({ data: { active: null, pending: null }, error: null });
    expect(await new SupabaseRoutineRepository().getState()).toEqual({ active: null, pending: null });
});

it('fails closed when a second account tries to confirm another owner’s preview', async () => {
    mockRpc.mockReset().mockResolvedValue({ data: null, error: { message: 'Routine owner mismatch' } });
    const proposal = proposeRoutine({ active: null, pending: null }, validateRoutineCsv(csv), 'csv-one', 'UTC', new Date('2026-09-22T12:00:00Z'));
    await expect(new SupabaseRoutineRepository().confirm(proposal, new Date('2026-09-22T12:00:00Z'), 'UTC')).rejects.toThrow();
});
