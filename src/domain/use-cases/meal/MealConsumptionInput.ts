export function formatMealDateInput(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
}

export function formatMealTimeInput(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function parseMealDateTime(dateInput: string, timeInput: string): Date | null {
    const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateInput.trim());
    const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeInput.trim());
    if (!dateMatch || !timeMatch) return null;

    const day = Number(dateMatch[1]);
    const month = Number(dateMatch[2]);
    const year = Number(dateMatch[3]);
    const hour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    if (hour > 23 || minute > 59) return null;

    const result = new Date(year, month - 1, day, hour, minute);
    if (result.getFullYear() !== year || result.getMonth() !== month - 1 || result.getDate() !== day) return null;
    return result;
}
