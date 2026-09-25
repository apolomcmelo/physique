import { Exam } from '../../domain/entities/Exam';
import { IExamRepository } from '../../domain/ports/ExamRepository';
import { getItem, setItem } from './LocalStorage';

const KEY = '@physique/exams';

export class LocalExamRepository implements IExamRepository {
    async getExams(): Promise<Exam[]> {
        const exams = await getItem<Exam[]>(KEY);
        return (exams ?? []).map((exam) => ({ ...exam, uploadedAt: new Date(exam.uploadedAt) }));
    }

    async saveExam(exam: Exam): Promise<void> {
        const exams = await this.getExams();
        exams.push(exam);
        await setItem(KEY, exams);
    }

    async deleteExam(id: string): Promise<void> {
        const exams = await this.getExams();
        await setItem(KEY, exams.filter((e) => e.id !== id));
    }
}
