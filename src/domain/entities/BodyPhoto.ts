import { generateId } from '../value-objects/UUID';

export type BodyPhotoAngle = 'front' | 'back' | 'left' | 'right';

export interface BodyPhoto {
    id: string;
    userId: string;
    capturedAt: Date;
    angle: BodyPhotoAngle;
    fileUrl: string;
    accelerometerX: number;
    accelerometerY: number;
    accelerometerZ: number;
    latitude: number | null;
    longitude: number | null;
    luminosity: number | null;
    monthYear: string;
}

export type CreateBodyPhotoParams = Omit<BodyPhoto, 'id'>;

export function createBodyPhoto(params: CreateBodyPhotoParams): BodyPhoto {
    if (!params.userId || params.userId.trim().length === 0) {
        throw new Error('User ID is required');
    }
    if (!params.fileUrl || params.fileUrl.trim().length === 0) {
        throw new Error('File URL is required');
    }
    if (!['front', 'back', 'left', 'right'].includes(params.angle)) {
        throw new Error('Angle must be front, back, left, or right');
    }
    if (!/^\d{4}-\d{2}$/.test(params.monthYear)) {
        throw new Error('monthYear must be in format YYYY-MM');
    }
    return {
        ...params,
        id: generateId(),
    };
}
