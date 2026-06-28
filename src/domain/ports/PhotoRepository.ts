import { BodyPhoto } from '../entities/BodyPhoto';

export interface IPhotoRepository {
    getBodyPhotos(): Promise<BodyPhoto[]>;
    getLatestPhotoByAngle(angle: BodyPhoto['angle']): Promise<BodyPhoto | null>;
    saveBodyPhoto(photo: BodyPhoto): Promise<void>;
    getPhotosForMonth(monthYear: string): Promise<BodyPhoto[]>;
}
