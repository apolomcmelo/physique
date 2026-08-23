function sanitizeStorageFileName(fileName: string): string {
    const normalized = fileName.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    const cleaned = normalized.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_');
    const trimmed = cleaned.replace(/^_+|_+$/g, '');

    return trimmed || 'exam_file';
}

export function buildExamStoragePath(userId: string, fileName: string, timestamp = Date.now()): string {
    return `${userId}/${timestamp}_${sanitizeStorageFileName(fileName)}`;
}