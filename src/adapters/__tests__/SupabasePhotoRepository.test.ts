import { SupabasePhotoRepository } from '../supabase/SupabasePhotoRepository';

const mockFrom = jest.fn();
jest.mock('../../infrastructure/supabase/client', () => ({
    supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));

const baseRow = {
    id: 'p1',
    user_id: 'u1',
    captured_at: '2024-03-01T10:00:00.000Z',
    angle: 'front',
    file_url: 'https://example.com/photo.jpg',
    accelerometer_x: 0.1,
    accelerometer_y: 0.2,
    accelerometer_z: 9.8,
    latitude: null,
    longitude: null,
    luminosity: null,
    month_year: '2024-03',
    created_at: '2024-03-01T10:00:00.000Z',
};

function buildChain(overrides: Record<string, unknown> = {}) {
    const chain: Record<string, jest.Mock> = {};
    chain.select = jest.fn().mockReturnValue(chain);
    chain.eq = jest.fn().mockReturnValue(chain);
    chain.order = jest.fn().mockReturnValue(chain);
    chain.limit = jest.fn().mockReturnValue(chain);
    chain.insert = jest.fn().mockResolvedValue({ error: null });
    chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null, ...overrides });
    mockFrom.mockReturnValue(chain);
    return chain;
}

describe('SupabasePhotoRepository', () => {
    let repo: SupabasePhotoRepository;

    beforeEach(() => {
        jest.clearAllMocks();
        repo = new SupabasePhotoRepository();
    });

    describe('getLatestPhotoByAngle()', () => {
        it('returns null when no photo exists for the angle', async () => {
            buildChain({ data: null, error: null });
            const result = await repo.getLatestPhotoByAngle('front');
            expect(result).toBeNull();
        });

        it('returns a mapped BodyPhoto when a row exists', async () => {
            buildChain({ data: baseRow, error: null });
            const photo = await repo.getLatestPhotoByAngle('front');
            expect(photo).not.toBeNull();
            expect(photo!.id).toBe('p1');
            expect(photo!.angle).toBe('front');
            expect(photo!.monthYear).toBe('2024-03');
        });

        it('throws when Supabase returns an error', async () => {
            buildChain({ data: null, error: { message: 'query failed' } });
            await expect(repo.getLatestPhotoByAngle('back')).rejects.toThrow(
                'Failed to get latest photo by angle: query failed',
            );
        });
    });
});
