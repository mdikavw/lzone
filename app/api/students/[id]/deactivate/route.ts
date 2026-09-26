import { deactivateStudent } from '@/lib/application/deactivate-student';
import { supabase } from '@/lib/infrastructure/supabase/client';
import { SupabaseStudentRepository } from '@/lib/infrastructure/supabase/student-repository';

const studentRepository = new SupabaseStudentRepository(supabase);

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	try {
		const deactivatedStudent = await deactivateStudent(id, {
			studentRepository,
		});
		return Response.json(deactivatedStudent, { status: 200 });
	} catch (error) {
		if (
			error instanceof Error &&
			error.message === 'Student is already inactive'
		) {
			return Response.json(
				{ error: 'Student is already inactive' },
				{ status: 400 },
			);
		}
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
