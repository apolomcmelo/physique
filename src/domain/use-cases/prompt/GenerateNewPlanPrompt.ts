import { User, calculateAge } from '../../entities/User';
import { WeightRecord } from '../../entities/WeightRecord';
import { Exam } from '../../entities/Exam';
import { FoodItem } from '../../entities/FoodItem';

export function generateNewPlanPrompt(
    user: User,
    weightRecords: WeightRecord[],
    exams: Exam[],
    foodItems: FoodItem[],
): string {
    const calculatedAge = calculateAge(user.dateOfBirth);

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
- Age: ${calculatedAge} years
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
1. A 7-day combined meal and workout plan formatted as a single CSV with columns:
   dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo

   **CSV formatting rules (strictly follow these):**
   - "dia": integer from 1 (Monday) to 7 (Sunday).
   - "horário": start time only in HH:MM format (e.g. "07:30"). Do NOT use ranges (e.g. "07:30-08:30").
   - "atividade/refeição": for workout sessions use ONLY one of the exact values: Calistenia, HIT, Musculação. For meals use descriptive names (e.g. Café da Manhã, Almoço, Lanche, Jantar). Any other workout name will not be recognised by the system.
   - "o que fazer/o que comer": brief description of the workout routine or meal content.
   - "foco/motivo": biological/fitness objective of that entry.

2. Key recommendations and observations.

Ensure the plan is realistic, achievable, and aligned with the user's goal of reaching ${user.goalWeight}kg.`;
}
