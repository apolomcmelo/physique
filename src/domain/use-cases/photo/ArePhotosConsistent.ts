import { BodyPhoto } from '../../entities/BodyPhoto';

type PhotoSensorData = Pick<
    BodyPhoto,
    'accelerometerX' | 'accelerometerY' | 'accelerometerZ' | 'latitude' | 'longitude' | 'luminosity'
>;

const ACCELEROMETER_TOLERANCE = 0.3;
const DISTANCE_TOLERANCE_M = 50;
const LUMINOSITY_TOLERANCE = 30;

function haversineDistanceMeters(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
): number {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function arePhotosConsistent(
    current: PhotoSensorData,
    previous: PhotoSensorData,
): { consistent: boolean; reasons: string[] } {
    const reasons: string[] = [];

    if (Math.abs(current.accelerometerX - previous.accelerometerX) > ACCELEROMETER_TOLERANCE) {
        reasons.push(
            `Accelerometer X differs by more than ${ACCELEROMETER_TOLERANCE} (current: ${current.accelerometerX}, previous: ${previous.accelerometerX})`,
        );
    }
    if (Math.abs(current.accelerometerY - previous.accelerometerY) > ACCELEROMETER_TOLERANCE) {
        reasons.push(
            `Accelerometer Y differs by more than ${ACCELEROMETER_TOLERANCE} (current: ${current.accelerometerY}, previous: ${previous.accelerometerY})`,
        );
    }
    if (Math.abs(current.accelerometerZ - previous.accelerometerZ) > ACCELEROMETER_TOLERANCE) {
        reasons.push(
            `Accelerometer Z differs by more than ${ACCELEROMETER_TOLERANCE} (current: ${current.accelerometerZ}, previous: ${previous.accelerometerZ})`,
        );
    }

    if (
        current.latitude !== null &&
        current.longitude !== null &&
        previous.latitude !== null &&
        previous.longitude !== null
    ) {
        const distance = haversineDistanceMeters(
            previous.latitude,
            previous.longitude,
            current.latitude,
            current.longitude,
        );
        if (distance > DISTANCE_TOLERANCE_M) {
            reasons.push(
                `Location differs by ${Math.round(distance)}m (tolerance: ${DISTANCE_TOLERANCE_M}m)`,
            );
        }
    }

    if (current.luminosity !== null && previous.luminosity !== null) {
        if (Math.abs(current.luminosity - previous.luminosity) > LUMINOSITY_TOLERANCE) {
            reasons.push(
                `Luminosity differs by more than ${LUMINOSITY_TOLERANCE} (current: ${current.luminosity}, previous: ${previous.luminosity})`,
            );
        }
    }

    return { consistent: reasons.length === 0, reasons };
}
