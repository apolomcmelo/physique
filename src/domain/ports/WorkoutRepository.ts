import { Workout } from '../entities/Workout';
import { WorkoutSession } from '../entities/WorkoutSession';

export interface IWorkoutRepository {
    getWorkouts(): Promise<Workout[]>;
    getWorkoutById(id: string): Promise<Workout | null>;
    saveWorkout(workout: Workout): Promise<void>;
    updateWorkout(workout: Workout): Promise<void>;
    deleteWorkout(id: string): Promise<void>;
    saveWorkoutSession(session: WorkoutSession): Promise<void>;
    getWorkoutSessions(workoutId?: string): Promise<WorkoutSession[]>;
}
