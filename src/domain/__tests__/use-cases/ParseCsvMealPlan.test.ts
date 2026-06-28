import { parseCsvMealPlan } from '../../use-cases/meal/ParseCsvMealPlan';

describe('parseCsvMealPlan', () => {
    it('parses a valid CSV with 2 entries skipping the header row', () => {
        const csv =
            'dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo\n' +
            '1;08:30;Café da Manhã;Aveia com frutas;Energia para o dia\n' +
            '1;12:00;Almoço;Arroz e feijão;Proteína e carboidratos';

        const entries = parseCsvMealPlan(csv);

        expect(entries).toHaveLength(2);

        expect(entries[0].day).toBe('1');
        expect(entries[0].time).toBe('08:30');
        expect(entries[0].activity).toBe('Café da Manhã');
        expect(entries[0].description).toBe('Aveia com frutas');
        expect(entries[0].biologicalObjective).toBe('Energia para o dia');

        expect(entries[1].day).toBe('1');
        expect(entries[1].time).toBe('12:00');
        expect(entries[1].activity).toBe('Almoço');
        expect(entries[1].description).toBe('Arroz e feijão');
        expect(entries[1].biologicalObjective).toBe('Proteína e carboidratos');
    });

    it('returns empty array for empty CSV', () => {
        const entries = parseCsvMealPlan('');
        expect(entries).toHaveLength(0);
    });

    it('handles CSV with only header row', () => {
        const csv = 'dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo';
        const entries = parseCsvMealPlan(csv);
        expect(entries).toHaveLength(0);
    });

    it('trims whitespace from fields', () => {
        const csv =
            'dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo\n' +
            '  1 ; 08:30 ; Café da Manhã ; Aveia com frutas ; Energia para o dia ';

        const entries = parseCsvMealPlan(csv);

        expect(entries).toHaveLength(1);
        expect(entries[0].day).toBe('1');
        expect(entries[0].time).toBe('08:30');
        expect(entries[0].activity).toBe('Café da Manhã');
        expect(entries[0].description).toBe('Aveia com frutas');
        expect(entries[0].biologicalObjective).toBe('Energia para o dia');
    });
});
