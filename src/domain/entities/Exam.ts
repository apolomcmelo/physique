import { generateId } from '../value-objects/UUID';

export type ExamFileType = 'pdf' | 'image';

export interface Exam {
    id: string;
    userId: string;
    title: string;
    fileUrl: string;
    uploadedAt: Date;
    fileType: ExamFileType;
}

export type CreateExamParams = Omit<Exam, 'id'>;

export function createExam(params: CreateExamParams): Exam {
    if (!params.userId || params.userId.trim().length === 0) {
        throw new Error('User ID is required');
    }
    if (!params.title || params.title.trim().length === 0) {
        throw new Error('Title is required');
    }
    if (!params.fileUrl || params.fileUrl.trim().length === 0) {
        throw new Error('File URL is required');
    }
    if (!['pdf', 'image'].includes(params.fileType)) {
        throw new Error('File type must be pdf or image');
    }
    return {
        ...params,
        id: generateId(),
    };
}
