export const ROUTINE_CSV_HEADER = 'dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo';

export interface RoutineCsvRow {
    id?: string;
    line: number;
    day: string;
    time: string;
    activity: string;
    description: string;
    focus: string;
}

export function readRoutineCsv(csv: string): RoutineCsvRow[] {
    const records: { line: number; cells: string[] }[] = [];
    let line = 1;
    let recordLine = 1;
    let cells: string[] = [];
    let value = '';
    let quoted = false;
    let closed = false;
    let wasQuoted = false;

    function finishRecord() {
        cells.push(wasQuoted ? value : value.trim());
        if (cells.length > 1 || cells.some((cell) => cell.length > 0)) records.push({ line: recordLine, cells });
        cells = [];
        value = '';
        closed = false;
        wasQuoted = false;
    }

    for (let i = 0; i < csv.length; i += 1) {
        const char = csv[i];
        if (quoted) {
            if (char === '"' && csv[i + 1] === '"') { value += '"'; i += 1; }
            else if (char === '"') { quoted = false; closed = true; }
            else { value += char; if (char === '\n') line += 1; }
        } else if (char === '"') {
            if (value.trim() || closed) throw new Error(`Linha ${recordLine}: aspas inválidas`);
            quoted = true;
            wasQuoted = true;
        } else if (char === ';') {
            cells.push(wasQuoted ? value : value.trim()); value = ''; closed = false; wasQuoted = false;
        } else if (char === '\n') {
            finishRecord(); line += 1; recordLine = line;
        } else if (char === '\r') {
            if (csv[i + 1] !== '\n') throw new Error(`Linha ${recordLine}: quebra de linha inválida`);
        } else {
            if (closed && char.trim()) throw new Error(`Linha ${recordLine}: texto após aspas`);
            value += char;
        }
    }
    if (quoted) throw new Error(`Linha ${recordLine}: aspas não fechadas`);
    if (cells.length || value.trim()) finishRecord();
    if (records[0]?.cells.join(';') !== ROUTINE_CSV_HEADER) throw new Error('CSV: cabeçalho inválido');
    if (records.length === 1) throw new Error('CSV sem atividades');
    return records.slice(1).map(({ line: rowLine, cells: fields }) => {
        if (fields.length !== 5 || fields.some((field) => !field)) throw new Error(`Linha ${rowLine}: são necessários cinco campos preenchidos`);
        if (!/^(Domingo|Segunda-feira|Terça-feira|Quarta-feira|Quinta-feira|Sexta-feira|Sábado)$/i.test(fields[0])) {
            throw new Error(`Linha ${rowLine}: dia da semana inválido`);
        }
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(fields[1])) throw new Error(`Linha ${rowLine}: horário inválido (HH:MM)`);
        return { line: rowLine, day: fields[0], time: fields[1], activity: fields[2], description: fields[3], focus: fields[4] };
    });
}
