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
   - "dia": Portuguese weekday name (e.g. "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo").
   - "horário": start time only in HH:MM format (e.g. "07:30"). Do NOT use ranges (e.g. "07:30-08:30").
   - "atividade/refeição": for workout sessions use ONLY one of the exact values: "Calistenia", "HIT", or "Musculação". For meals use descriptive names (e.g. "Café da Manhã", "Almoço", "Lanche da Tarde", "Jantar", "Ceia").
   - "o que fazer/o que comer":
     - For meals: describe foods, ingredients, and portion sizes (e.g. "2 fatias de pão integral + 3 ovos mexidos + 1 banana").
     - For workouts: list exercises separated by "+". Follow the prescription syntax:
       * Rep-based: "<sets>x <reps> <Nome do Exercício>" (e.g. "4x 10-12 Flexão declinada", "3x 10 Supino reto").
       * Time-based: "<sets>x <duração>s ou min <Nome>" (e.g. "4x 45s Wall sit", "3x 1:20min Prancha").
       * Weight / load: include in parentheses with kg (e.g. "(7kg)", "(4.5kg)").
       * Rest intervals: include rest between series and rest before next exercise (e.g. "(descanso: 15s / 30s transição)", "(rest: 15s, 30s proximo)", or trailing "+ 15s rest").
       * Shared sets prefix: "3 séries: 45s prancha + 35s wall sit (4.5kg) + 26 shoulder taps".
       * Alternatives: separate with "/" (e.g. "3x 12-15 Bicep curl (4kg) / KB halo (7.5kg)").
       * Free-text / HIIT: for video/circuit sessions without fixed reps, provide descriptive text (e.g. "20 a 25 minutos de treino HIIT ou Tabata").
   - "foco/motivo": for workouts, the muscle group / workout focus (e.g. "Peitoral e Tríceps", "Core & Estabilidade"). For meals, the biological/nutritional objective (e.g. "Aporte proteico e fibras", "Recuperação pós-treino").

2. Key recommendations and observations.

Ensure the plan is realistic, achievable, and aligned with the user's goal of reaching ${user.goalWeight}kg.`;
}
