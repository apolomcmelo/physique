import { User } from '../../entities/User';
import { WeightRecord } from '../../entities/WeightRecord';
import { Exam } from '../../entities/Exam';
import { FoodItem } from '../../entities/FoodItem';

export function generateNewPlanPrompt(
    user: User,
    weightRecords: WeightRecord[],
    exams: Exam[],
    foodItems: FoodItem[],
): string {
    const latestWeight = weightRecords.length > 0
        ? weightRecords.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime())[0]
        : null;

    const lastThreeExams = exams
        .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
        .slice(0, 3);

    const foodSummary = foodItems
        .map(
            (f) =>
                `- ${f.name}${f.brandOrSource ? ` (${f.brandOrSource})` : ''}: ${f.calories}kcal, ${f.proteinGrams}g protein, ${f.carbsGrams}g carbs, ${f.fatGrams}g fat per ${f.servingSizeGrams}g serving`,
        )
        .join('\n');

    const examsSummary = lastThreeExams.length > 0
        ? lastThreeExams.map((e) => `- ${e.title} (${e.uploadedAt.toISOString().split('T')[0]})`).join('\n')
        : 'No exams available.';

    return `You are a professional nutritionist and personal trainer. Create a complete personalized nutrition and workout plan for the following user.

## User Profile
- Name: ${user.name}
- Age: ${user.age} years
- Height: ${user.height} cm
- Current Weight: ${latestWeight ? latestWeight.weightKg : user.currentWeight} kg
- Goal Weight: ${user.goalWeight} kg
- Body Fat Percentage: ${latestWeight?.bodyFatPercentage ?? user.bodyFatPercentage ?? 'Unknown'}%
- Protein Percentage: ${latestWeight?.proteinPercentage ?? user.proteinPercentage ?? 'Unknown'}%
- Objective: ${user.objective}

## Recent Medical Exams (last 3)
${examsSummary}

## Available Food Items (Nutritional Data)
${foodSummary || 'No food items registered.'}

## Instructions
Based on the user's profile, objective, and available food items, create:
1. A 7-day meal plan with specific meals and times, formatted as CSV with columns: dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo
2. A weekly workout plan appropriate for the user's objective
3. Key recommendations and observations

Ensure the plan is realistic, achievable, and aligned with the user's goal of reaching ${user.goalWeight}kg.`;
}
