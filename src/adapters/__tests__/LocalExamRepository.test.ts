import { LocalExamRepository } from '../local/LocalExamRepository';
import { Exam } from '../../domain/entities/Exam';

let mockStored: string | null = null;
jest.mock('../local/LocalStorage', () => ({
    getItem: jest.fn(async () => mockStored ? JSON.parse(mockStored) : null),
    setItem: jest.fn(async (_key: string, value: unknown) => { mockStored = JSON.stringify(value); }),
}));

it('returns upload dates as Dates after reopening local exams', async () => {
    mockStored = null;
    const exam: Exam = {
        id: 'exam-1', userId: 'user-1', title: 'Blood test', fileUrl: 'local://exam',
        uploadedAt: new Date('2026-09-01T12:30:00.000Z'), fileType: 'pdf',
    };
    await new LocalExamRepository().saveExam(exam);
    const restored = await new LocalExamRepository().getExams();
    expect(restored[0].uploadedAt).toBeInstanceOf(Date);
    expect(restored[0].uploadedAt.toISOString()).toBe('2026-09-01T12:30:00.000Z');
});
