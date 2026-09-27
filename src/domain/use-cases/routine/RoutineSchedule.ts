const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

function parts(date: Date, timezone: string) {
    const values = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const read = (type: string) => values.find((item) => item.type === type)?.value ?? '';
    return { year: Number(read('year')), month: Number(read('month')), day: Number(read('day')),
        weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(read('weekday')),
        hour: Number(read('hour')), minute: Number(read('minute')) };
}

function atLocalDay(year: number, month: number, day: number, time: string, timezone: string): Date {
    const [hour, minute] = time.split(':').map(Number);
    const localDay = Date.UTC(year, month - 1, day);
    const start = localDay - 15 * 60 * 60 * 1000;
    let firstAfterGap: Date | null = null;
    for (let timestamp = start; timestamp <= localDay + 39 * 60 * 60 * 1000; timestamp += 60_000) {
        const candidate = new Date(timestamp);
        const local = parts(candidate, timezone);
        if (local.year !== year || local.month !== month || local.day !== day) continue;
        if (local.hour === hour && local.minute === minute) return candidate;
        if (!firstAfterGap && local.hour * 60 + local.minute > hour * 60 + minute) firstAfterGap = candidate;
    }
    if (firstAfterGap) return firstAfterGap;
    throw new Error('Horário local indisponível');
}

export function nextRoutineStart(day: string, time: string, timezone: string, now: Date): Date {
    const target = weekdays.indexOf(day);
    if (target < 0) throw new Error('Dia inválido');
    const local = parts(now, timezone);
    const localDay = new Date(Date.UTC(local.year, local.month - 1, local.day));
    const daysAhead = (target - local.weekday + 7) % 7;
    localDay.setUTCDate(localDay.getUTCDate() + daysAhead);
    let result = atLocalDay(localDay.getUTCFullYear(), localDay.getUTCMonth() + 1, localDay.getUTCDate(), time, timezone);
    if (result.getTime() < now.getTime()) {
        localDay.setUTCDate(localDay.getUTCDate() + 7);
        result = atLocalDay(localDay.getUTCFullYear(), localDay.getUTCMonth() + 1, localDay.getUTCDate(), time, timezone);
    }
    return result;
}

export function occurrenceAt(anchor: Date, day: string, time: string, timezone: string): Date {
    const anchorLocal = parts(anchor, timezone);
    const target = weekdays.indexOf(day);
    if (target < 0) throw new Error('Dia inválido');
    const localDay = new Date(Date.UTC(anchorLocal.year, anchorLocal.month - 1, anchorLocal.day));
    localDay.setUTCDate(localDay.getUTCDate() + (target - anchorLocal.weekday + 7) % 7);
    let result = atLocalDay(localDay.getUTCFullYear(), localDay.getUTCMonth() + 1, localDay.getUTCDate(), time, timezone);
    if (result < anchor) {
        localDay.setUTCDate(localDay.getUTCDate() + 7);
        result = atLocalDay(localDay.getUTCFullYear(), localDay.getUTCMonth() + 1, localDay.getUTCDate(), time, timezone);
    }
    return result;
}
