export function formatDecimal(value: number): string {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

export function formatSignedKg(value: number): string {
    const rounded = Math.round(value * 10) / 10;
    return `${rounded > 0 ? '+' : ''}${formatDecimal(rounded)} kg`;
}

export function formatDate(date: Date): string {
    return date.toLocaleDateString('pt-BR');
}

export function formatTime(date: Date): string {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function startOfDay(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function formatDayLabel(date: Date, now: Date): string {
    const days = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
    if (days === 0) return 'Hoje';
    if (days === 1) return 'Amanhã';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function formatMinutesUntil(date: Date, now: Date): string {
    const diff = Math.round((date.getTime() - now.getTime()) / 60000);
    if (diff === 0) return 'Agora';
    if (diff < 0) return `Há ${Math.abs(diff)} minutos`;
    if (diff < 60) return `Em ${diff} minutos`;
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `Em ${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
}
