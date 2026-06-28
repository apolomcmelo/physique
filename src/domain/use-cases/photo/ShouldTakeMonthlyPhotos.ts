import { BodyPhoto, BodyPhotoAngle } from '../../entities/BodyPhoto';

const ALL_ANGLES: BodyPhotoAngle[] = ['front', 'back', 'left', 'right'];

export function shouldTakeMonthlyPhotos(photos: BodyPhoto[], now: Date): boolean {
    if (now.getDate() !== 1) {
        return false;
    }

    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const photosThisMonth = photos.filter((p) => p.monthYear === currentMonthYear);
    const anglesThisMonth = new Set(photosThisMonth.map((p) => p.angle));

    return ALL_ANGLES.some((angle) => !anglesThisMonth.has(angle));
}
