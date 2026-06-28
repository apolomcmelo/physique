import { Exam } from '../../domain/entities/Exam';
import { IExamRepository } from '../../domain/ports/ExamRepository';
import { getItem, setItem } from './LocalStorage';

const KEY = '@physique/exams';

export class LocalExamRepository implements IExamRepository {
    async getExams(): Promise<Exam[]> {
        return (await getItem<Exam[]>(KEY)) ?? [];
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
