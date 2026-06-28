import { User } from '../entities/User';
import { Workout } from '../entities/Workout';
import { MealPlanEntry } from '../entities/MealPlan';
import { BodyPhoto } from '../entities/BodyPhoto';
import { WeightRecord } from '../entities/WeightRecord';

export const mockUser: User = {
    id: 'user-1',
    name: 'John Doe',
    age: 30,
    height: 180,
    currentWeight: 80,
    goalWeight: 75,
    bodyFatPercentage: 15,
    proteinPercentage: 20,
    objective: 'Lose weight and build muscle',
    createdAt: new Date(2024, 0, 1),
    updatedAt: new Date(2024, 0, 1),
};

export const mockWorkout: Workout = {
    id: 'workout-1',
    name: 'Upper Body Strength',
    type: 'Weightlifting',
    exercises: [
        {
            id: 'exercise-1',
            name: 'Bench Press',
            sets: 3,
            repsPerSet: 10,
            weightKg: 60,
            notes: null,
        },
        {
            id: 'exercise-2',
            name: 'Pull Up',
            sets: 3,
            repsPerSet: 8,
            weightKg: null,
            notes: 'Bodyweight',
        },
    ],
    scheduledAt: new Date(2024, 0, 1, 10, 0),
    createdAt: new Date(2024, 0, 1),
    updatedAt: new Date(2024, 0, 1),
};

export const mockMealEntries: MealPlanEntry[] = [
    {
        id: 'meal-1',
        day: '1',
        time: '08:30',
        activity: 'Café da Manhã',
        description: 'Aveia com frutas',
        biologicalObjective: 'Energia para o dia',
    },
    {
        id: 'meal-2',
        day: '1',
        time: '12:00',
        activity: 'Almoço',
        description: 'Arroz e feijão',
        biologicalObjective: 'Proteína e carboidratos',
    },
    {
        id: 'meal-3',
        day: '1',
        time: '18:00',
        activity: 'Jantar',
        description: 'Frango grelhado com legumes',
        biologicalObjective: 'Recuperação muscular',
    },
];

export const mockBodyPhoto: BodyPhoto = {
    id: 'photo-1',
    userId: 'user-1',
    capturedAt: new Date(2024, 0, 1),
    angle: 'front',
    fileUrl: 'https://example.com/photo.jpg',
    accelerometerX: 0.1,
    accelerometerY: 0.2,
    accelerometerZ: 9.8,
    latitude: -23.5,
    longitude: -46.6,
    luminosity: 100,
    monthYear: '2024-01',
};

export const mockWeightRecord: WeightRecord = {
    id: 'weight-1',
    userId: 'user-1',
    weightKg: 80,
    bodyFatPercentage: 15,
    proteinPercentage: 20,
    recordedAt: new Date(2024, 0, 1),
};
