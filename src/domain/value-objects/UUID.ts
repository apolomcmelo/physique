export function generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function isValidId(id: string): boolean {
    return typeof id === 'string' && id.trim().length > 0;
}
