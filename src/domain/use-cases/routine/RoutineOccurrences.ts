import { RoutineVersion } from './RoutineVersions';
import { occurrenceAt, nextRoutineStart } from './RoutineSchedule';

export type OccurrenceOutcome = 'completed' | 'skipped';
export interface RoutineOccurrence { id: string; at: Date }
export interface OccurrenceRecord { occurrenceId: string; outcome: OccurrenceOutcome }

export function occurrenceForRow(version: RoutineVersion, rowId: string, day: string, time: string, weekIndex: number): RoutineOccurrence {
    if (!Number.isInteger(weekIndex) || weekIndex < 0) throw new Error('Semana inválida');
    let anchor = version.startsAt;
    for (let week = 0; week < weekIndex; week += 1) {
        anchor = nextRoutineStart(version.anchorDay, version.anchorTime, version.timezone, new Date(anchor.getTime() + 60_000));
    }
    const at = occurrenceAt(anchor, day, time, version.timezone);
    return { id: `${version.id}:${rowId}:${at.toISOString()}`, at };
}

export function occurrenceStatus(records: OccurrenceRecord[], occurrence: RoutineOccurrence): OccurrenceOutcome | 'unrecorded' {
    return records.find((record) => record.occurrenceId === occurrence.id)?.outcome ?? 'unrecorded';
}

export function markOccurrence(records: OccurrenceRecord[], occurrence: RoutineOccurrence, outcome: OccurrenceOutcome): OccurrenceRecord[] {
    return [...records.filter((record) => record.occurrenceId !== occurrence.id), { occurrenceId: occurrence.id, outcome }];
}
