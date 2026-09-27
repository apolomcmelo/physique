import { RoutineProposal, RoutineState, confirmRoutine, editRoutine, changeRoutineTimezone } from '../../domain/use-cases/routine/RoutineVersions';
import { RoutinePreview } from '../../domain/use-cases/routine/ValidateRoutineCsv';
import { supabase } from '../../infrastructure/supabase/client';
import { requireAuthUserId } from './currentAuthUser';

export class SupabaseRoutineRepository {
    async getState(): Promise<RoutineState> {
        const { data, error } = await supabase.rpc('get_routine_versions');
        if (error) throw new Error(error.message);
        const revive = (value: RoutineState['active']) => value && ({ ...value, startsAt: new Date(value.startsAt),
            workouts: value.workouts.map((workout) => ({ ...workout,
                createdAt: new Date(workout.createdAt), updatedAt: new Date(workout.updatedAt),
                scheduledAt: workout.scheduledAt ? new Date(workout.scheduledAt) : null })) });
        return { active: revive(data?.active ?? null), pending: revive(data?.pending ?? null) };
    }

    async confirm(proposal: RoutineProposal, now: Date, timezone: string): Promise<RoutineState> {
        const owner = await requireAuthUserId();
        const next = confirmRoutine(await this.getState(), proposal, now, timezone);
        const { error } = await supabase.rpc('confirm_routine_version', { p_owner_id: owner, p_state: next, p_proposal: proposal });
        if (error) throw new Error(error.message);
        return next;
    }

    async edit(viewedId: string, preview: RoutinePreview, now: Date): Promise<RoutineState> {
        const owner = await requireAuthUserId();
        const next = editRoutine(await this.getState(), viewedId, preview, now);
        const { error } = await supabase.rpc('edit_routine_version', { p_owner_id: owner, p_viewed_id: viewedId, p_version: next.active?.id === viewedId ? next.active : next.pending });
        if (error) throw new Error(error.message);
        return next;
    }

    async changeTimezone(timezone: string, now: Date): Promise<RoutineState> {
        const owner = await requireAuthUserId();
        const next = changeRoutineTimezone(await this.getState(), timezone, now);
        if (next.pending) {
            const { error } = await supabase.rpc('reschedule_pending_routine', { p_owner_id: owner, p_version: next.pending });
            if (error) throw new Error(error.message);
        }
        return next;
    }
}
