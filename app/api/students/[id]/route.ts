import { getStudent } from '@/lib/application/get-student';
import { supabase } from '@/lib/infrastructure/supabase/client';
import { SupabaseStudentRepository } from '@/lib/infrastructure/supabase/student-repository';

const studentRepository = new SupabaseStudentRepository(supabase);

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	try {
		const student = await getStudent(id, {
			studentRepository,
		});
		return Response.json(student, { status: 200 });
	} catch (error) {
		if (error instanceof Error && error.message === 'Student not found') {
			return Response.json(
				{ error: 'Student not found' },
				{ status: 404 },
			);
		}
		return Response.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
