import React, { createContext, useContext, ReactNode } from 'react';
import { IUserRepository } from '../../domain/ports/UserRepository';
import { IWorkoutRepository } from '../../domain/ports/WorkoutRepository';
import { IMealPlanRepository } from '../../domain/ports/MealPlanRepository';
import { IMealConsumptionRepository } from '../../domain/ports/MealConsumptionRepository';
import { IExamRepository } from '../../domain/ports/ExamRepository';
import { IPhotoRepository } from '../../domain/ports/PhotoRepository';
import { IWeightRepository } from '../../domain/ports/WeightRepository';
import { IWeightGoalRepository } from '../../domain/ports/WeightGoalRepository';
import { IFoodItemRepository } from '../../domain/ports/FoodItemRepository';

interface Repositories {
    userRepo: IUserRepository;
    workoutRepo: IWorkoutRepository;
    mealRepo: IMealPlanRepository;
    mealConsumptionRepo: IMealConsumptionRepository;
    examRepo: IExamRepository;
    photoRepo: IPhotoRepository;
    weightRepo: IWeightRepository;
    weightGoalRepo: IWeightGoalRepository;
    foodRepo: IFoodItemRepository;
}

function createRepositories(): Repositories {
    if (process.env.EXPO_PUBLIC_USE_LOCAL_DB === 'true') {
        const { LocalUserRepository } = require('../../adapters/local/LocalUserRepository');
        const { LocalWorkoutRepository } = require('../../adapters/local/LocalWorkoutRepository');
        const { LocalMealPlanRepository } = require('../../adapters/local/LocalMealPlanRepository');
        const { LocalMealConsumptionRepository } = require('../../adapters/local/LocalMealConsumptionRepository');
        const { LocalExamRepository } = require('../../adapters/local/LocalExamRepository');
        const { LocalPhotoRepository } = require('../../adapters/local/LocalPhotoRepository');
        const { LocalWeightRepository } = require('../../adapters/local/LocalWeightRepository');
        const { LocalWeightGoalRepository } = require('../../adapters/local/LocalWeightGoalRepository');
        const { LocalFoodItemRepository } = require('../../adapters/local/LocalFoodItemRepository');
        return {
            userRepo: new LocalUserRepository() as IUserRepository,
            workoutRepo: new LocalWorkoutRepository() as IWorkoutRepository,
            mealRepo: new LocalMealPlanRepository() as IMealPlanRepository,
            mealConsumptionRepo: new LocalMealConsumptionRepository() as IMealConsumptionRepository,
            examRepo: new LocalExamRepository() as IExamRepository,
            photoRepo: new LocalPhotoRepository() as IPhotoRepository,
            weightRepo: new LocalWeightRepository() as IWeightRepository,
            weightGoalRepo: new LocalWeightGoalRepository() as IWeightGoalRepository,
            foodRepo: new LocalFoodItemRepository() as IFoodItemRepository,
        };
    }
    const { SupabaseUserRepository } = require('../../adapters/supabase/SupabaseUserRepository');
    const { SupabaseWorkoutRepository } = require('../../adapters/supabase/SupabaseWorkoutRepository');
    const { SupabaseMealPlanRepository } = require('../../adapters/supabase/SupabaseMealPlanRepository');
    const { SupabaseMealConsumptionRepository } = require('../../adapters/supabase/SupabaseMealConsumptionRepository');
    const { SupabaseExamRepository } = require('../../adapters/supabase/SupabaseExamRepository');
    const { SupabasePhotoRepository } = require('../../adapters/supabase/SupabasePhotoRepository');
    const { SupabaseWeightRepository } = require('../../adapters/supabase/SupabaseWeightRepository');
    const { SupabaseWeightGoalRepository } = require('../../adapters/supabase/SupabaseWeightGoalRepository');
    const { SupabaseFoodItemRepository } = require('../../adapters/supabase/SupabaseFoodItemRepository');
    return {
        userRepo: new SupabaseUserRepository() as IUserRepository,
        workoutRepo: new SupabaseWorkoutRepository() as IWorkoutRepository,
        mealRepo: new SupabaseMealPlanRepository() as IMealPlanRepository,
        mealConsumptionRepo: new SupabaseMealConsumptionRepository() as IMealConsumptionRepository,
        examRepo: new SupabaseExamRepository() as IExamRepository,
        photoRepo: new SupabasePhotoRepository() as IPhotoRepository,
        weightRepo: new SupabaseWeightRepository() as IWeightRepository,
        weightGoalRepo: new SupabaseWeightGoalRepository() as IWeightGoalRepository,
        foodRepo: new SupabaseFoodItemRepository() as IFoodItemRepository,
    };
}

const repos = createRepositories();
const SupabaseContext = createContext<Repositories>(repos);

export const SupabaseProvider = ({ children }: { children: ReactNode }) =>
    React.createElement(SupabaseContext.Provider, { value: repos }, children);

export const useRepositories = (): Repositories => useContext(SupabaseContext);
