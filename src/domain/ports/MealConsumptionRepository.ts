import { MealConsumption } from '../entities/MealConsumption';

export interface IMealConsumptionRepository {
    getMealConsumptions(): Promise<MealConsumption[]>;
    saveMealConsumption(consumption: MealConsumption): Promise<void>;
    deleteMealConsumption(id: string): Promise<void>;
}
