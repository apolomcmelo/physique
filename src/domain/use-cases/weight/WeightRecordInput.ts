export function formatWeightDateInput(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${date.getFullYear()}`;
}

export function formatWeightTimeInput(date: Date): string {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function parseWeightDateTimeInput(dateText: string, timeText: string): Date | null {
    const dateMatch = dateText.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const timeMatch = timeText.trim().match(/^(\d{2}):(\d{2})$/);
    if (!dateMatch || !timeMatch) return null;

    const [, dayText, monthText, yearText] = dateMatch;
    const [, hourText, minuteText] = timeMatch;
    const day = Number(dayText);
    const month = Number(monthText);
    const year = Number(yearText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    if (year < 1 || month < 1 || month > 12 || hour > 23 || minute > 59) return null;

    const date = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1
        || date.getDate() !== day || date.getHours() !== hour || date.getMinutes() !== minute) return null;
    return date;
}
