import { parseExercises, parseStrictExercises } from '../../use-cases/workout/ParseCsvWorkouts';

it('retains weight followed by a separate rest annotation', () => {
    expect(parseExercises('3x 10 Supino reto (7kg) (descanso: 20s / 30s transição)')[0]).toMatchObject({
        name: 'Supino reto', weightKg: 7, restSecondsBetweenSets: 20, restSecondsBeforeNextExercise: 30,
    });
});

it('reads a standalone colon duration as seconds rather than repetitions', () => {
    expect(parseExercises('3x 1:20min Prancha')[0]).toMatchObject({ name: 'Prancha', sets: 3, repsPerSet: null, durationSeconds: 80 });
});

it('assigns a standalone rest segment to the preceding exercise, including nonterminal segments', () => {
    const exercises = parseExercises('3x 10 Supino reto + 15s rest + 3x 12 Prancha');
    expect(exercises[0].restSecondsBeforeNextExercise).toBe(15);
    expect(exercises[1].restSecondsBeforeNextExercise).toBeNull();
});

it('does not allow notes-only or silently skipped exercise segments in a strict import', () => {
    expect(() => parseStrictExercises('20 a 25 minutos de treino HIIT ou Tabata')).toThrow('Prescrição');
    expect(() => parseStrictExercises('3x 10 Supino reto + exercício desconhecido')).toThrow('Prescrição');
});

it('requires one timed set for HIT', () => {
    expect(() => parseStrictExercises('3x 10 Supino reto', 'HIT')).toThrow('HIT');
    expect(parseStrictExercises('1x 25min Treino HIT', 'HIT')[0]).toMatchObject({ sets: 1, durationSeconds: 1500, repsPerSet: null, weightKg: null });
});

it('accepts the documented shared-set, alternative, range, decimal kg and zero-rest forms', () => {
    expect(parseStrictExercises('3 séries: 45s prancha + 35s wall sit (2 anilhas de 1.5kg) + 26 shoulder taps')).toHaveLength(3);
    expect(parseStrictExercises('3x 12 Bicep curl (4kg) / KB halo (7.5kg)')[0]).toMatchObject({ repsPerSet: 12, weightKg: 4, notes: 'ou KB halo (7.5kg)' });
    expect(parseStrictExercises('4x 10-12 Flexão declinada (descanso: 0s / 30s transição)')[0]).toMatchObject({ repsPerSet: 10, restSecondsBetweenSets: 0, restSecondsBeforeNextExercise: 30 });
});

it('rejects zero or excessive sets, bad colon seconds and kg precision beyond two decimals', () => {
    expect(() => parseStrictExercises('0x 10 Supino')).toThrow('Prescrição');
    expect(() => parseStrictExercises('101x 10 Supino')).toThrow('Prescrição');
    expect(() => parseStrictExercises('3x 1:99min Prancha')).toThrow('Prescrição');
    expect(() => parseStrictExercises('3x 10 Supino (4.123kg)')).toThrow('Prescrição');
});

it('rejects 1001 repetitions, negative and excessive rest, and malformed weight annotations', () => {
    expect(() => parseStrictExercises('3x 1001 Supino')).toThrow('Prescrição');
    expect(() => parseStrictExercises('3x 10 Supino (descanso: 301s)')).toThrow('Prescrição');
    expect(() => parseStrictExercises('3x 10 Supino (-4kg)')).toThrow('Prescrição');
});

it('does not accept a rest-only segment before any exercise', () => {
    expect(() => parseStrictExercises('15s rest + 3x 10 Supino')).toThrow('Prescrição');
});

it('rejects an invalid rest-only segment after a valid exercise', () => {
    expect(() => parseStrictExercises('3x 10 Supino + 301s rest')).toThrow('Prescrição');
});

it('rejects a missing set count unless a shared set prefix is present', () => {
    expect(() => parseStrictExercises('10 Supino')).toThrow('Prescrição');
    expect(parseStrictExercises('3 séries: 10 Supino')[0].sets).toBe(3);
});

it('rejects an exercise containing only whitespace after the prescription', () => {
    expect(() => parseStrictExercises('3x 10  ')).toThrow('Prescrição');
});

it('rejects an empty exercise segment between plus separators', () => {
    expect(() => parseStrictExercises('3x 10 Supino + + 3x 12 Remada')).toThrow('Prescrição');
});

it('rejects a nonterminal unknown segment even when other exercises are valid', () => {
    expect(() => parseStrictExercises('3x 10 Supino + ????? + 3x 12 Remada')).toThrow('Prescrição');
});

it('keeps the documented duration range as a 60-second target with the range in notes', () => {
    expect(parseStrictExercises('3x 1 a 1:20min Prancha')[0]).toMatchObject({ durationSeconds: 60, notes: '1 a 1:20min' });
});

it('retains two-plate annotations and an alternative in notes', () => {
    expect(parseStrictExercises('3x 35s Wall sit (2 anilhas de 1.5kg)')[0]).toMatchObject({ weightKg: 1.5, notes: '35s (2 anilhas de)' });
    expect(parseStrictExercises('3x 12 Bicep curl (4kg) / KB halo (7.5kg)')[0].notes).toContain('KB halo (7.5kg)');
});

it('rejects an unrecognized parenthesized annotation rather than silently discarding it', () => {
    expect(() => parseStrictExercises('3x 10 Supino (???)')).toThrow('Prescrição');
});

it('rejects a rest segment containing a negative duration', () => {
    expect(() => parseStrictExercises('3x 10 Supino (descanso: -10s)')).toThrow('Prescrição');
});

it('rejects malformed rest-only text rather than interpreting it as an exercise', () => {
    expect(() => parseStrictExercises('3x 10 Supino + 15 segundos descansoo')).toThrow('Prescrição');
});

it('accepts a transition-only annotation', () => {
    expect(parseStrictExercises('3x 10 Supino (transição: 30s)')[0].restSecondsBeforeNextExercise).toBe(30);
});

it('retains the documented trailing rest only on the preceding exercise', () => {
    const exercises = parseStrictExercises('3x 10 Supino + 15s rest + 3x 12 Remada');
    expect(exercises.map((exercise) => exercise.restSecondsBeforeNextExercise)).toEqual([15, null]);
});

it('rejects a bare 26 reps outside the documented shared-set syntax', () => {
    expect(() => parseStrictExercises('26 shoulder taps')).toThrow('Prescrição');
});

it('rejects a standalone rest greater than the supported 300 seconds', () => {
    expect(() => parseStrictExercises('3x 10 Supino + 301s rest')).toThrow('Prescrição');
});

it('accepts the upper bounds and rejects a duration above 3 hours', () => {
    expect(parseStrictExercises('100x 1000 Supino (descanso: 300s)')[0]).toMatchObject({ sets: 100, repsPerSet: 1000, restSecondsBetweenSets: 300 });
    expect(() => parseStrictExercises('1x 181min Prancha')).toThrow('Prescrição');
});

it('rejects weight values above a sensible 1000kg bound', () => {
    expect(() => parseStrictExercises('3x 10 Supino (1001kg)')).toThrow('Prescrição');
});

it('rejects an explicit HIT load even when its duration and set count are valid', () => {
    expect(() => parseStrictExercises('1x 25min Treino HIT (7kg)', 'HIT')).toThrow('HIT');
});

it('accepts an explicitly zero-weight exercise without treating zero as missing', () => {
    expect(parseStrictExercises('3x 10 Supino (0kg)')[0].weightKg).toBe(0);
});

it('rejects a standalone colon duration with seconds outside 00–59', () => {
    expect(() => parseStrictExercises('3x 1:60min Prancha')).toThrow('Prescrição');
});

it('accepts a 45-second timed set without inventing repetitions', () => {
    expect(parseStrictExercises('4x 45s Wall sit')[0]).toMatchObject({ sets: 4, repsPerSet: null, durationSeconds: 45 });
});

it('rejects a range whose upper bound is lower than its prescribed lower bound', () => {
    expect(() => parseStrictExercises('3x 12-10 Supino')).toThrow('Prescrição');
});

it('does not accept a zero lower bound in a repetition range', () => {
    expect(() => parseStrictExercises('3x 0-10 Supino')).toThrow('Prescrição');
});

it('accepts a rep range at the upper bound and retains its lower target', () => {
    expect(parseStrictExercises('3x 999-1000 Supino')[0].repsPerSet).toBe(999);
});

it('rejects an excessive transition rest independently of the between-set rest', () => {
    expect(() => parseStrictExercises('3x 10 Supino (descanso: 20s / 301s transição)')).toThrow('Prescrição');
});

it('requires a valid duration rather than silently reading a malformed colon', () => {
    expect(() => parseStrictExercises('3x 1:2min Prancha')).toThrow('Prescrição');
});

it('rejects an unknown annotation attached to a valid exercise', () => {
    expect(() => parseStrictExercises('3x 10 Supino (magia)')).toThrow('Prescrição');
});

it('rejects an empty weight annotation that has no numeric kg value', () => {
    expect(() => parseStrictExercises('3x 10 Supino (kg)')).toThrow('Prescrição');
});

it('rejects a weight written with more than two decimal places', () => {
    expect(() => parseStrictExercises('3x 10 Supino (4,567kg)')).toThrow('Prescrição');
});

it('accepts a comma decimal load without truncating the fraction', () => {
    expect(parseStrictExercises('3x 10 Supino (12,5kg)')[0].weightKg).toBe(12.5);
});

it('keeps the weight annotation when it precedes an explicit transition-only annotation', () => {
    expect(parseStrictExercises('3x 10 Supino (7kg) (transição: 30s)')[0]).toMatchObject({ weightKg: 7, restSecondsBeforeNextExercise: 30 });
});

it('rejects a rest-only segment without a preceding exercise even if another segment follows', () => {
    expect(() => parseStrictExercises('30s rest + 3x 10 Supino')).toThrow('Prescrição');
});
