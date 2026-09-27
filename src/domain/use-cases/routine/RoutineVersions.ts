import { MealPlanEntry } from '../../entities/MealPlan';
import { Workout } from '../../entities/Workout';
import { RoutinePreview } from './ValidateRoutineCsv';
import { nextRoutineStart } from './RoutineSchedule';
import { RoutineCsvRow } from './ReadRoutineCsv';

export interface RoutineVersion {
    id: string;
    sourceId?: string;
    startsAt: Date;
    timezone: string;
    anchorDay: string;
    anchorTime: string;
    meals: MealPlanEntry[];
    workouts: Workout[];
    rows?: RoutineCsvRow[];
}

export interface RoutineState { active: RoutineVersion | null; pending: RoutineVersion | null }

export interface RoutineProposal {
    version: RoutineVersion;
    startsAt: Date;
    replaces: string | null;
    proposedAt: Date;
    activeId: string | null;
    pendingId: string | null;
}

export function visibleRoutine(state: RoutineState, now: Date): RoutineState {
    if (state.pending && state.pending.startsAt <= now) return { active: state.pending, pending: null };
    return state;
}

export function proposeRoutine(state: RoutineState, preview: RoutinePreview, id: string, timezone: string, now: Date): RoutineProposal {
    const visible = visibleRoutine(state, now);
    const startsAt = nextRoutineStart(preview.firstRow.day, preview.firstRow.time, timezone, now);
    return { version: { id, sourceId: id, startsAt, timezone, anchorDay: preview.firstRow.day, anchorTime: preview.firstRow.time,
        meals: preview.meals, workouts: preview.workouts, rows: preview.rows.map((row, index) => ({ ...row, id: `${id}:${index}` })) }, startsAt,
    replaces: startsAt <= now ? visible.active?.id ?? null : visible.pending?.id ?? null,
    proposedAt: now, activeId: visible.active?.id ?? null, pendingId: visible.pending?.id ?? null };
}

export function confirmRoutine(state: RoutineState, proposal: RoutineProposal, now: Date, timezone: string): RoutineState {
    const visible = visibleRoutine(state, now);
    const existing = visible.active?.id === proposal.version.id ? visible.active : visible.pending?.id === proposal.version.id ? visible.pending : null;
    if (existing) {
        if (existing.sourceId !== proposal.version.sourceId || JSON.stringify(existing.rows) !== JSON.stringify(proposal.version.rows) ||
            JSON.stringify(existing.meals.map((meal) => ({ ...meal, id: undefined }))) !== JSON.stringify(proposal.version.meals.map((meal) => ({ ...meal, id: undefined }))) ||
            JSON.stringify(existing.workouts.map((workout) => ({ ...workout, id: undefined, createdAt: undefined, updatedAt: undefined,
                exercises: workout.exercises.map((exercise) => ({ ...exercise, id: undefined })) }))) !==
            JSON.stringify(proposal.version.workouts.map((workout) => ({ ...workout, id: undefined, createdAt: undefined, updatedAt: undefined,
                exercises: workout.exercises.map((exercise) => ({ ...exercise, id: undefined })) })))) {
            throw new Error('A identidade da importação já foi usada para outra versão');
        }
        return visible;
    }
    if ((visible.active?.id ?? null) !== proposal.activeId || (visible.pending?.id ?? null) !== proposal.pendingId) {
        throw new Error('Prévia expirada: versão mudou');
    }
    const recomputed = nextRoutineStart(proposal.version.anchorDay, proposal.version.anchorTime, timezone, now);
    const replaced = proposal.startsAt <= now ? visible.active?.id ?? null : visible.pending?.id ?? null;
    if (timezone !== proposal.version.timezone || recomputed.getTime() !== proposal.startsAt.getTime() || replaced !== proposal.replaces) {
        throw new Error('Prévia expirada: recalcule e confirme novamente');
    }
    return recomputed <= now ? { active: proposal.version, pending: null } : { ...visible, pending: proposal.version };
}

export function editRoutine(state: RoutineState, viewedId: string, preview: RoutinePreview, now: Date): RoutineState {
    const visible = visibleRoutine(state, now);
    const target = visible.active?.id === viewedId ? visible.active : visible.pending?.id === viewedId ? visible.pending : null;
    if (!target) throw new Error('Versão visualizada não encontrada');
    if (preview.firstRow.day !== target.anchorDay || preview.firstRow.time !== target.anchorTime) throw new Error('Edição não pode alterar a âncora; importe uma nova versão');
    const edited = { ...target,
        meals: preview.meals.map((meal, index) => ({ ...meal, id: target.meals[index]?.id ?? meal.id })),
        workouts: preview.workouts.map((workout, index) => ({ ...workout,
            id: target.workouts[index]?.id ?? workout.id,
            exercises: workout.exercises.map((exercise, exerciseIndex) => ({ ...exercise,
                id: target.workouts[index]?.exercises[exerciseIndex]?.name === exercise.name
                    ? target.workouts[index].exercises[exerciseIndex].id : exercise.id })) })),
        rows: preview.rows.map((row, index) => ({ ...row, id: target.rows?.[index]?.id ?? `${target.id}:${index}` })) };
    return visible.active?.id === viewedId ? { ...visible, active: edited } : { ...visible, pending: edited };
}

export function changeRoutineTimezone(state: RoutineState, timezone: string, now: Date): RoutineState {
    const visible = visibleRoutine(state, now);
    if (!visible.pending) return visible;
    return { ...visible, pending: { ...visible.pending, timezone,
        startsAt: nextRoutineStart(visible.pending.anchorDay, visible.pending.anchorTime, timezone, now) } };
}
