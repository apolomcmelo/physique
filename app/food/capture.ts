export function hasBrowserCameraSupport(
    platformOS: string,
    mediaDevices: { getUserMedia?: unknown } | undefined,
): boolean {
    if (platformOS !== 'web') return true;
    return typeof mediaDevices?.getUserMedia === 'function';
}

export function shouldOpenInAppCamera(
    platformOS: string,
    mediaDevices: { getUserMedia?: unknown } | undefined,
): boolean {
    return platformOS === 'web' && hasBrowserCameraSupport(platformOS, mediaDevices);
}
