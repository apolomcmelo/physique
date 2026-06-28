import { BodyPhoto } from '../../domain/entities/BodyPhoto';
import { IPhotoRepository } from '../../domain/ports/PhotoRepository';
import { getItem, setItem } from './LocalStorage';

const KEY = '@physique/photos';

function parsePhoto(raw: BodyPhoto): BodyPhoto {
    return {
        ...raw,
        capturedAt: new Date(raw.capturedAt),
    };
}

export class LocalPhotoRepository implements IPhotoRepository {
    async getBodyPhotos(): Promise<BodyPhoto[]> {
        const raw = await getItem<BodyPhoto[]>(KEY);
        return (raw ?? []).map(parsePhoto);
    }

    async getLatestPhotoByAngle(angle: BodyPhoto['angle']): Promise<BodyPhoto | null> {
        const photos = await this.getBodyPhotos();
        const filtered = photos.filter((p) => p.angle === angle);
        if (filtered.length === 0) return null;
        return filtered.reduce((latest, p) =>
            p.capturedAt > latest.capturedAt ? p : latest,
        );
    }

    async saveBodyPhoto(photo: BodyPhoto): Promise<void> {
        const raw = await getItem<BodyPhoto[]>(KEY) ?? [];
        raw.push(photo);
        await setItem(KEY, raw);
    }

    async getPhotosForMonth(monthYear: string): Promise<BodyPhoto[]> {
        const photos = await this.getBodyPhotos();
        return photos.filter((p) => p.monthYear === monthYear);
    }
}
