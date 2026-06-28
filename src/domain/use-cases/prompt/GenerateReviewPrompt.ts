import { User } from '../../entities/User';
import { WeightRecord } from '../../entities/WeightRecord';
import { WorkoutSession } from '../../entities/WorkoutSession';
import { Exam } from '../../entities/Exam';
import { MealPlanEntry } from '../../entities/MealPlan';
import { FoodItem } from '../../entities/FoodItem';

export function generateReviewPrompt(
    user: User,
    weightHistory: WeightRecord[],
    workoutSessions: WorkoutSession[],
    exams: Exam[],
    mealEntries: MealPlanEntry[],
    foodItems: FoodItem[],
): string {
    const sortedWeight = [...weightHistory].sort(
        (a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
    );
    const latestWeight = sortedWeight[0] ?? null;

    const weightHistorySummary = sortedWeight
        .map(
            (w) =>
                `- ${w.recordedAt.toISOString().split('T')[0]}: ${w.weightKg}kg` +
                (w.bodyFatPercentage != null ? `, ${w.bodyFatPercentage}% body fat` : '') +
                (w.proteinPercentage != null ? `, ${w.proteinPercentage}% protein` : ''),
        )
        .join('\n');

    const last7Sessions = [...workoutSessions]
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
        .slice(0, 7);

    const sessionsSummary = last7Sessions.length > 0
        ? last7Sessions
            .map((s) => {
                const duration =
                    s.finishedAt
                        ? Math.round((s.finishedAt.getTime() - s.startedAt.getTime()) / 60000)
                        : null;
                return (
                    `- ${s.startedAt.toISOString().split('T')[0]}: Workout ID ${s.workoutId}, ` +
                    `${s.sets.length} sets completed` +
                    (duration != null ? `, ${duration} min` : '')
                );
            })
            .join('\n')
        : 'No workout sessions recorded.';

    const mealPlanSummary = mealEntries.length > 0
        ? mealEntries
            .map((e) => `- ${e.day} ${e.time} | ${e.activity}: ${e.description} (${e.biologicalObjective})`)
            .join('\n')
        : 'No meal plan entries.';

    const examsSummary = exams.length > 0
        ? exams
            .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
            .map((e) => `- ${e.title} (${e.uploadedAt.toISOString().split('T')[0]})`)
            .join('\n')
        : 'No exams available.';

    const foodSummary = foodItems
        .map(
            (f) =>
                `- ${f.name}: ${f.calories}kcal, ${f.proteinGrams}g protein, ${f.carbsGrams}g carbs, ${f.fatGrams}g fat per ${f.servingSizeGrams}g`,
        )
        .join('\n');

    return `You are a professional nutritionist and personal trainer reviewing the current plan for the following user. Analyze their progress and suggest improvements.

## User Profile
- Name: ${user.name}
- Age: ${user.age} years
- Height: ${user.height} cm
- Current Weight: ${latestWeight ? latestWeight.weightKg : user.currentWeight} kg
- Goal Weight: ${user.goalWeight} kg
- Body Fat Percentage: ${latestWeight?.bodyFatPercentage ?? user.bodyFatPercentage ?? 'Unknown'}%
- Protein Percentage: ${latestWeight?.proteinPercentage ?? user.proteinPercentage ?? 'Unknown'}%
- Objective: ${user.objective}

## Weight History
${weightHistorySummary || 'No weight records available.'}

## Workout History (Last 7 Sessions)
${sessionsSummary}

## Current Meal Plan
${mealPlanSummary}

## Medical Exams
${examsSummary}

## Food Items (Nutritional Data)
${foodSummary || 'No food items registered.'}

## Instructions
Based on the user's progress and current plan:
1. Evaluate the effectiveness of the current nutrition and workout plan
2. Identify areas of improvement
3. Provide an updated 7-day meal plan as CSV (dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo)
4. Suggest workout adjustments if needed
5. Highlight key observations about the user's progress toward their goal of ${user.goalWeight}kg`;
}
