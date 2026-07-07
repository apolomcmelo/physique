function digitsOnly(value: string): string {
    return value.replace(/\D/g, '').slice(0, 8);
}

export function formatDateOfBirthInput(value: string): string {
    const digits = digitsOnly(value);

    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;

    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export function formatDateOfBirthDisplay(value: Date): string {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = String(value.getFullYear());

    return `${day}/${month}/${year}`;
}

export function parseDateOfBirthInput(value: string, referenceDate: Date = new Date()): Date | null {
    const digits = digitsOnly(value);
    if (digits.length !== 8) return null;

    const day = Number(digits.slice(0, 2));
    const month = Number(digits.slice(2, 4));
    const year = Number(digits.slice(4, 8));

    const parsed = new Date(year, month - 1, day);
    const isSameCalendarDate = parsed.getFullYear() === year
        && parsed.getMonth() === month - 1
        && parsed.getDate() === day;

    if (!isSameCalendarDate) return null;

    const today = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    if (parsed >= today) return null;

    return parsed;
}