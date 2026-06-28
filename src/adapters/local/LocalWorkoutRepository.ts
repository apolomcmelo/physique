import { Workout } from '../../domain/entities/Workout';
import { WorkoutSession, CompletedSet } from '../../domain/entities/WorkoutSession';
import { IWorkoutRepository } from '../../domain/ports/WorkoutRepository';
import { getItem, setItem } from './LocalStorage';

const WORKOUTS_KEY = '@physique/workouts';
const SESSIONS_KEY = '@physique/workout_sessions';

function parseWorkout(raw: Workout): Workout {
    return {
        ...raw,
        scheduledAt: raw.scheduledAt ? new Date(raw.scheduledAt) : null,
        createdAt: new Date(raw.createdAt),
        updatedAt: new Date(raw.updatedAt),
    };
}

function parseSession(raw: WorkoutSession): WorkoutSession {
    return {
        ...raw,
        startedAt: new Date(raw.startedAt),
        finishedAt: raw.finishedAt ? new Date(raw.finishedAt) : null,
        sets: raw.sets.map((s: CompletedSet) => ({
            ...s,
            completedAt: new Date(s.completedAt),
        })),
    };
}

export class LocalWorkoutRepository implements IWorkoutRepository {
    async getWorkouts(): Promise<Workout[]> {
        const raw = await getItem<Workout[]>(WORKOUTS_KEY);
        return (raw ?? []).map(parseWorkout);
    }

    async getWorkoutById(id: string): Promise<Workout | null> {
        const workouts = await this.getWorkouts();
        return workouts.find((w) => w.id === id) ?? null;
    }

    async saveWorkout(workout: Workout): Promise<void> {
        const workouts = await getItem<Workout[]>(WORKOUTS_KEY) ?? [];
        workouts.push(workout);
        await setItem(WORKOUTS_KEY, workouts);
    }

    async updateWorkout(workout: Workout): Promise<void> {
        const workouts = await getItem<Workout[]>(WORKOUTS_KEY) ?? [];
        const index = workouts.findIndex((w) => w.id === workout.id);
        if (index !== -1) {
            workouts[index] = workout;
        } else {
            workouts.push(workout);
        }
        await setItem(WORKOUTS_KEY, workouts);
    }

    async deleteWorkout(id: string): Promise<void> {
        const workouts = await getItem<Workout[]>(WORKOUTS_KEY) ?? [];
        await setItem(WORKOUTS_KEY, workouts.filter((w) => w.id !== id));
    }

    async saveWorkoutSession(session: WorkoutSession): Promise<void> {
        const sessions = await getItem<WorkoutSession[]>(SESSIONS_KEY) ?? [];
        sessions.push(session);
        await setItem(SESSIONS_KEY, sessions);
    }

    async getWorkoutSessions(workoutId?: string): Promise<WorkoutSession[]> {
        const raw = await getItem<WorkoutSession[]>(SESSIONS_KEY);
        const sessions = (raw ?? []).map(parseSession);
        if (workoutId) {
            return sessions.filter((s) => s.workoutId === workoutId);
        }
        return sessions;
    }
}
