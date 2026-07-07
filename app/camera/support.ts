type BrowserMediaDevices = {
    getUserMedia?: unknown;
} | null | undefined;

export function isCameraSupported(platform: string, mediaDevices: BrowserMediaDevices): boolean {
    if (platform !== 'web') {
        return true;
    }

    return typeof mediaDevices?.getUserMedia === 'function';
}