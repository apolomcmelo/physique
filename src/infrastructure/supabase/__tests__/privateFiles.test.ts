import { getPrivateFileUrl } from '../privateFiles';

const mockCreateSignedUrl = jest.fn();
jest.mock('../client', () => ({
    supabase: { storage: { from: jest.fn(() => ({ createSignedUrl: (...args: unknown[]) => mockCreateSignedUrl(...args) })) } },
}));

it('resolves a private owner-scoped file without exposing a public URL', async () => {
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null });
    expect(await getPrivateFileUrl('photos', 'owner-1/2026_front.jpg', 'owner-1'))
        .toBe('https://example.com/signed');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('owner-1/2026_front.jpg', 60);
});

it('rejects paths for another owner before requesting a signed URL', async () => {
    mockCreateSignedUrl.mockClear();
    await expect(getPrivateFileUrl('exams', 'owner-2/exam.pdf', 'owner-1')).rejects.toThrow('File does not belong to this account');
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
});

it('can resolve legacy public links to an existing private object without persisting a public URL', async () => {
    mockCreateSignedUrl.mockClear();
    mockCreateSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null });
    const legacy = 'https://project.supabase.co/storage/v1/object/public/exams/owner-1/old%20exam.pdf';
    expect(await getPrivateFileUrl('exams', legacy, 'owner-1')).toBe('https://example.com/signed');
    expect(mockCreateSignedUrl).toHaveBeenCalledWith('owner-1/old exam.pdf', 60);
});
