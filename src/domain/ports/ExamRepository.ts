import { Exam } from '../entities/Exam';

export interface IExamRepository {
    getExams(): Promise<Exam[]>;
    saveExam(exam: Exam): Promise<void>;
    deleteExam(id: string): Promise<void>;
}
