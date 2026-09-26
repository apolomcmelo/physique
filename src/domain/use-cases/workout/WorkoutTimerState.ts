export function resumedTimedSet(startedAt: number, durationSeconds: number, restSeconds: number, now: number) {
    const restDeadline = startedAt + (durationSeconds + restSeconds) * 1000;
    return {
        actualDurationSeconds: durationSeconds,
        restDeadline,
        remainingRestSeconds: Math.max(0, Math.ceil((restDeadline - now) / 1000)),
    };
}
