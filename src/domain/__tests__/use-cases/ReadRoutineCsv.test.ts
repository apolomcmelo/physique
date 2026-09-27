import { readRoutineCsv } from '../../use-cases/routine/ReadRoutineCsv';

const header = 'dia;horário;atividade/refeição;o que fazer/o que comer;foco/motivo';

it('reads quoted delimiters, escaped quotes and newlines without splitting activities', () => {
    const rows = readRoutineCsv(`${header}\nSegunda-feira;07:00;Café da Manhã;"Pão; ovos ""mexidos""\n e fruta";Energia\n`);
    expect(rows).toEqual([{ line: 2, day: 'Segunda-feira', time: '07:00', activity: 'Café da Manhã',
        description: 'Pão; ovos "mexidos"\n e fruta', focus: 'Energia' }]);
});

it('rejects the entire file with original row numbers for malformed data', () => {
    expect(() => readRoutineCsv(`${header}\nSegunda-feira;07:00;Almoço;Arroz;Energia\nTerça-feira;12:00;Jantar;Salada`))
        .toThrow('Linha 3');
});

it('rejects wrong headers, extra fields and unterminated quotes', () => {
    expect(() => readRoutineCsv('dia;horario;atividade;descrição;foco\nSegunda-feira;07:00;Café;Ovos;Energia'))
        .toThrow('cabeçalho');
    expect(() => readRoutineCsv(`${header}\nSegunda-feira;07:00;Café;Ovos;Energia;extra`))
        .toThrow('Linha 2');
    expect(() => readRoutineCsv(`${header}\nSegunda-feira;07:00;Café;"Ovos;Energia`))
        .toThrow('Linha 2');
});

it('validates Portuguese weekday and HH:MM rather than accepting unknown calendar values', () => {
    expect(() => readRoutineCsv(`${header}\nDia 1;07:00;Café;Ovos;Energia`)).toThrow('Linha 2');
    expect(() => readRoutineCsv(`${header}\nSegunda-feira;24:00;Café;Ovos;Energia`)).toThrow('Linha 2');
    expect(() => readRoutineCsv(`${header}\nSegunda-feira;07:00-08:00;Café;Ovos;Energia`)).toThrow('Linha 2');
});

it('allows CRLF and rejects quotes inside unquoted fields', () => {
    expect(readRoutineCsv(`${header}\r\nTerça-feira;12:00;Almoço;Arroz;Energia\r\n`)).toHaveLength(1);
    expect(() => readRoutineCsv(`${header}\nTerça-feira;12:00;Almoço;Arroz"extra;Energia`)).toThrow('Linha 2');
});

it('rejects a header-only or blank file instead of creating an empty routine', () => {
    expect(() => readRoutineCsv('')).toThrow('cabeçalho');
    expect(() => readRoutineCsv(header)).toThrow('sem atividades');
});

it('rejects bare carriage returns and malformed quoting rather than silently changing line numbers', () => {
    expect(() => readRoutineCsv(`${header}\rSegunda-feira;07:00;Café;Ovos;Energia`)).toThrow('Linha 1');
    expect(() => readRoutineCsv(`${header}\nSegunda-feira;07:00;Café;"Ovos"extra;Energia`)).toThrow('Linha 2');
});

it('preserves whitespace within quoted food descriptions', () => {
    expect(readRoutineCsv(`${header}\nSegunda-feira;07:00;Café;"  Pão; ovos  ";Energia`)[0].description)
        .toBe('  Pão; ovos  ');
});

it('rejects a line containing only delimiters instead of dropping it', () => {
    expect(() => readRoutineCsv(`${header}\n;;;;\nSegunda-feira;07:00;Café;Ovos;Energia`)).toThrow('Linha 2');
});

it('does not accept quoted empty mandatory fields', () => {
    expect(() => readRoutineCsv(`${header}\nSegunda-feira;07:00;Café;"";Energia`)).toThrow('Linha 2');
});

it('recognizes a UTF-8 BOM before the exact header', () => {
    expect(readRoutineCsv(`\uFEFF${header}\nSegunda-feira;07:00;Café;Ovos;Energia`)).toHaveLength(1);
});

it('rejects an extra unquoted semicolon in the description with a row error', () => {
    expect(() => readRoutineCsv(`${header}\nSegunda-feira;07:00;Café;Pão;ovos;Energia`)).toThrow('Linha 2');
});

it('reports the correct physical line after a quoted multiline field', () => {
    expect(() => readRoutineCsv(`${header}\nSegunda-feira;07:00;Café;"Pão\n e ovos";Energia\nTerça-feira;08:00;Café;Ovos`)).toThrow('Linha 4');
});

it('rejects duplicate headers appearing as a data row', () => {
    expect(() => readRoutineCsv(`${header}\n${header}`)).toThrow('Linha 2');
});

it('keeps embedded escaped quotes in a meal label', () => {
    expect(readRoutineCsv(`${header}\nSegunda-feira;07:00;"Café ""especial""";Ovos;Energia`)[0].activity).toBe('Café "especial"');
});

it('rejects an unterminated quoted field on its opening physical line', () => {
    expect(() => readRoutineCsv(`${header}\nSegunda-feira;07:00;Café;"Ovos\n e fruta;Energia`)).toThrow('Linha 2');
});

it('accepts a trailing newline and ignores fully blank lines between valid rows', () => {
    expect(readRoutineCsv(`${header}\n\nSegunda-feira;07:00;Café;Ovos;Energia\n`)).toHaveLength(1);
});

it('rejects an invalid weekday alias rather than guessing its intended day', () => {
    expect(() => readRoutineCsv(`${header}\nQuarta;07:00;Café;Ovos;Energia`)).toThrow('Linha 2');
});

it('requires the same five-column header even when all data rows are otherwise valid', () => {
    expect(() => readRoutineCsv('dia;hora;atividade;descrição;foco\nSegunda-feira;07:00;Café;Ovos;Energia')).toThrow('cabeçalho');
});
