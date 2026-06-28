import React, { createContext, useContext, ReactNode } from 'react';
import { IUserRepository } from '../../domain/ports/UserRepository';
import { IWorkoutRepository } from '../../domain/ports/WorkoutRepository';
import { IMealPlanRepository } from '../../domain/ports/MealPlanRepository';
import { IExamRepository } from '../../domain/ports/ExamRepository';
import { IPhotoRepository } from '../../domain/ports/PhotoRepository';
import { IWeightRepository } from '../../domain/ports/WeightRepository';
import { IFoodItemRepository } from '../../domain/ports/FoodItemRepository';

interface Repositories {
    userRepo: IUserRepository;
    workoutRepo: IWorkoutRepository;
    mealRepo: IMealPlanRepository;
    examRepo: IExamRepository;
    photoRepo: IPhotoRepository;
    weightRepo: IWeightRepository;
    foodRepo: IFoodItemRepository;
}

function createRepositories(): Repositories {
    if (process.env.EXPO_PUBLIC_USE_LOCAL_DB === 'true') {
        const { LocalUserRepository } = require('../../adapters/local/LocalUserRepository');
        const { LocalWorkoutRepository } = require('../../adapters/local/LocalWorkoutRepository');
        const { LocalMealPlanRepository } = require('../../adapters/local/LocalMealPlanRepository');
        const { LocalExamRepository } = require('../../adapters/local/LocalExamRepository');
        const { LocalPhotoRepository } = require('../../adapters/local/LocalPhotoRepository');
        const { LocalWeightRepository } = require('../../adapters/local/LocalWeightRepository');
        const { LocalFoodItemRepository } = require('../../adapters/local/LocalFoodItemRepository');
        return {
            userRepo: new LocalUserRepository() as IUserRepository,
            workoutRepo: new LocalWorkoutRepository() as IWorkoutRepository,
            mealRepo: new LocalMealPlanRepository() as IMealPlanRepository,
            examRepo: new LocalExamRepository() as IExamRepository,
            photoRepo: new LocalPhotoRepository() as IPhotoRepository,
            weightRepo: new LocalWeightRepository() as IWeightRepository,
            foodRepo: new LocalFoodItemRepository() as IFoodItemRepository,
        };
    }
    const { SupabaseUserRepository } = require('../../adapters/supabase/SupabaseUserRepository');
    const { SupabaseWorkoutRepository } = require('../../adapters/supabase/SupabaseWorkoutRepository');
    const { SupabaseMealPlanRepository } = require('../../adapters/supabase/SupabaseMealPlanRepository');
    const { SupabaseExamRepository } = require('../../adapters/supabase/SupabaseExamRepository');
    const { SupabasePhotoRepository } = require('../../adapters/supabase/SupabasePhotoRepository');
    const { SupabaseWeightRepository } = require('../../adapters/supabase/SupabaseWeightRepository');
    const { SupabaseFoodItemRepository } = require('../../adapters/supabase/SupabaseFoodItemRepository');
    return {
        userRepo: new SupabaseUserRepository() as IUserRepository,
        workoutRepo: new SupabaseWorkoutRepository() as IWorkoutRepository,
        mealRepo: new SupabaseMealPlanRepository() as IMealPlanRepository,
        examRepo: new SupabaseExamRepository() as IExamRepository,
        photoRepo: new SupabasePhotoRepository() as IPhotoRepository,
        weightRepo: new SupabaseWeightRepository() as IWeightRepository,
        foodRepo: new SupabaseFoodItemRepository() as IFoodItemRepository,
    };
}

const repos = createRepositories();
const SupabaseContext = createContext<Repositories>(repos);

export const SupabaseProvider = ({ children }: { children: ReactNode }) =>
    React.createElement(SupabaseContext.Provider, { value: repos }, children);

export const useRepositories = (): Repositories => useContext(SupabaseContext);
