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
    // On web we prefer system camera via ImagePicker to preserve device camera features.
    if (platformOS === 'web') {
        return false;
    }

    return hasBrowserCameraSupport(platformOS, mediaDevices);
}
