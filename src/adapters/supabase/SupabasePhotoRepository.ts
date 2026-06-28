import { IPhotoRepository } from '../../domain/ports/PhotoRepository';
import { BodyPhoto, BodyPhotoAngle } from '../../domain/entities/BodyPhoto';
import { supabase } from '../../infrastructure/supabase/client';

interface BodyPhotoRow {
    id: string;
    user_id: string;
    captured_at: string;
    angle: BodyPhotoAngle;
    file_url: string;
    accelerometer_x: number;
    accelerometer_y: number;
    accelerometer_z: number;
    latitude: number | null;
    longitude: number | null;
    luminosity: number | null;
    month_year: string;
    created_at: string;
}

function rowToBodyPhoto(row: BodyPhotoRow): BodyPhoto {
    return {
        id: row.id,
        userId: row.user_id,
        capturedAt: new Date(row.captured_at),
        angle: row.angle,
        fileUrl: row.file_url,
        accelerometerX: row.accelerometer_x,
        accelerometerY: row.accelerometer_y,
        accelerometerZ: row.accelerometer_z,
        latitude: row.latitude,
        longitude: row.longitude,
        luminosity: row.luminosity,
        monthYear: row.month_year,
    };
}

function bodyPhotoToRow(photo: BodyPhoto): Omit<BodyPhotoRow, 'created_at'> {
    return {
        id: photo.id,
        user_id: photo.userId,
        captured_at: photo.capturedAt.toISOString(),
        angle: photo.angle,
        file_url: photo.fileUrl,
        accelerometer_x: photo.accelerometerX,
        accelerometer_y: photo.accelerometerY,
        accelerometer_z: photo.accelerometerZ,
        latitude: photo.latitude,
        longitude: photo.longitude,
        luminosity: photo.luminosity,
        month_year: photo.monthYear,
    };
}

export class SupabasePhotoRepository implements IPhotoRepository {
    async getBodyPhotos(): Promise<BodyPhoto[]> {
        const { data, error } = await supabase
            .from('body_photos')
            .select('*')
            .order('captured_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to get body photos: ${error.message}`);
        }

        return (data as BodyPhotoRow[]).map(rowToBodyPhoto);
    }

    async getLatestPhotoByAngle(angle: BodyPhotoAngle): Promise<BodyPhoto | null> {
        const { data, error } = await supabase
            .from('body_photos')
            .select('*')
            .eq('angle', angle)
            .order('captured_at', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            throw new Error(`Failed to get latest photo by angle: ${error.message}`);
        }

        if (!data) {
            return null;
        }

        return rowToBodyPhoto(data as BodyPhotoRow);
    }

    async saveBodyPhoto(photo: BodyPhoto): Promise<void> {
        const row = {
            ...bodyPhotoToRow(photo),
            created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('body_photos').insert(row);

        if (error) {
            throw new Error(`Failed to save body photo: ${error.message}`);
        }
    }

    async getPhotosForMonth(monthYear: string): Promise<BodyPhoto[]> {
        const { data, error } = await supabase
            .from('body_photos')
            .select('*')
            .eq('month_year', monthYear)
            .order('captured_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to get photos for month: ${error.message}`);
        }

        return (data as BodyPhotoRow[]).map(rowToBodyPhoto);
    }
}
