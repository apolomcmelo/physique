import { Exercise } from '../../entities/Workout';

export function nextRest(exercise: Exercise, setNumber: number, isLastExercise: boolean): number | null {
    if (setNumber < (exercise.sets ?? 1)) return exercise.restSecondsBetweenSets ?? 60;
    if (isLastExercise) return null;
    return exercise.restSecondsBeforeNextExercise ?? exercise.restSecondsBetweenSets ?? 60;
}
