export interface Weight {
    kg: number;
    display: string;
}

export function createWeight(kg: number): Weight {
    if (isNaN(kg)) {
        throw new Error('Weight must be a valid number');
    }
    if (kg <= 0) {
        throw new Error('Weight must be greater than 0');
    }
    return {
        kg,
        display: `${kg.toFixed(1)}kg`,
    };
}
