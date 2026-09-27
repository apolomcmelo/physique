import { RoutineProposal, RoutineState, confirmRoutine, editRoutine, changeRoutineTimezone } from '../../domain/use-cases/routine/RoutineVersions';
import { RoutinePreview } from '../../domain/use-cases/routine/ValidateRoutineCsv';
import { getAccountId, getItem, setItemForAccount } from './LocalStorage';

const KEY = '@physique/routine_versions';

function revive(state: RoutineState): RoutineState {
    const version = (value: RoutineState['active']) => value && ({ ...value, startsAt: new Date(value.startsAt),
        workouts: value.workouts.map((workout) => ({ ...workout,
            createdAt: new Date(workout.createdAt), updatedAt: new Date(workout.updatedAt),
            scheduledAt: workout.scheduledAt ? new Date(workout.scheduledAt) : null })) });
    return { active: version(state.active), pending: version(state.pending) };
}

export class LocalRoutineRepository {
    async getState(): Promise<RoutineState> {
        return revive(await getItem<RoutineState>(KEY) ?? { active: null, pending: null });
    }

    async confirm(proposal: RoutineProposal, now: Date, timezone: string): Promise<RoutineState> {
        const account = await getAccountId();
        const next = confirmRoutine(await this.getState(), proposal, now, timezone);
        await setItemForAccount(KEY, next, account);
        return next;
    }

    async edit(viewedId: string, preview: RoutinePreview, now: Date): Promise<RoutineState> {
        const account = await getAccountId();
        const next = editRoutine(await this.getState(), viewedId, preview, now);
        await setItemForAccount(KEY, next, account);
        return next;
    }

    async changeTimezone(timezone: string, now: Date): Promise<RoutineState> {
        const account = await getAccountId();
        const next = changeRoutineTimezone(await this.getState(), timezone, now);
        await setItemForAccount(KEY, next, account);
        return next;
    }
}
