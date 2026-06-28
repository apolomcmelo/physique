import { IExamRepository } from '../../domain/ports/ExamRepository';
import { Exam, ExamFileType } from '../../domain/entities/Exam';
import { supabase } from '../../infrastructure/supabase/client';

interface ExamRow {
    id: string;
    user_id: string;
    title: string;
    file_url: string;
    uploaded_at: string;
    file_type: ExamFileType;
    created_at: string;
}

function rowToExam(row: ExamRow): Exam {
    return {
        id: row.id,
        userId: row.user_id,
        title: row.title,
        fileUrl: row.file_url,
        uploadedAt: new Date(row.uploaded_at),
        fileType: row.file_type,
    };
}

function examToRow(exam: Exam): Omit<ExamRow, 'created_at'> {
    return {
        id: exam.id,
        user_id: exam.userId,
        title: exam.title,
        file_url: exam.fileUrl,
        uploaded_at: exam.uploadedAt.toISOString(),
        file_type: exam.fileType,
    };
}

export class SupabaseExamRepository implements IExamRepository {
    async getExams(): Promise<Exam[]> {
        const { data, error } = await supabase
            .from('exams')
            .select('*')
            .order('uploaded_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to get exams: ${error.message}`);
        }

        return (data as ExamRow[]).map(rowToExam);
    }

    async saveExam(exam: Exam): Promise<void> {
        const row = {
            ...examToRow(exam),
            created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from('exams').insert(row);

        if (error) {
            throw new Error(`Failed to save exam: ${error.message}`);
        }
    }

    async deleteExam(id: string): Promise<void> {
        const { error } = await supabase.from('exams').delete().eq('id', id);

        if (error) {
            throw new Error(`Failed to delete exam: ${error.message}`);
        }
    }
}
