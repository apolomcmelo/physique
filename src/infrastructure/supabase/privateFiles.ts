import { supabase } from './client';

export async function getPrivateFileUrl(bucket: 'photos' | 'exams', path: string, userId: string): Promise<string> {
    if (path.startsWith('https://')) {
        const marker = `/storage/v1/object/public/${bucket}/`;
        const pathname = new URL(path).pathname;
        if (!pathname.includes(marker)) throw new Error('Invalid private file reference');
        path = decodeURIComponent(pathname.slice(pathname.indexOf(marker) + marker.length));
    }
    if (!path.startsWith(`${userId}/`)) throw new Error('File does not belong to this account');
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) throw new Error(`Failed to open private file: ${error?.message ?? 'missing URL'}`);
    return data.signedUrl;
}
