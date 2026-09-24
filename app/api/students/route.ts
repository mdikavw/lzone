import { createStudent } from '@/lib/application/create-student';
import { getClass } from '@/lib/application/get-class';
import { SupabaseClassRepository } from '@/lib/infrastructure/supabase/class-repository';
import { supabase } from '@/lib/infrastructure/supabase/client';
import { SupabaseStudentRepository } from '@/lib/infrastructure/supabase/student-repository';

const studentRepository = new SupabaseStudentRepository(supabase);
const classRepository = new SupabaseClassRepository(supabase);

export async function POST(request: Request) {
	try {
		const body = await request.json();
		if (
			typeof body !== 'object' ||
			body === null ||
			typeof body.name !== 'string' ||
			!body.name.trim() ||
			typeof body.phone !== 'string' ||
			!body.phone.trim() ||
			typeof body.classId !== 'string' ||
			!body.classId.trim()
		) {
			return Response.json(
				{ error: 'Invalid student input' },
				{ status: 400 },
			);
		}
		const student = await createStudent(body, {
			studentRepository,
			classRepository,
		});
		return Response.json(student, { status: 201 });
	} catch (error) {
		if (error instanceof SyntaxError) {
			return Response.json({ error: 'Invalid JSON' }, { status: 400 });
		}
		if (error instanceof Error && error.message === 'Class not found') {
			return Response.json({ error: 'Class not found' }, { status: 404 });
		}

		if (error instanceof Error && error.message === 'Class is inactive') {
			return Response.json(
				{ error: 'Class is inactive' },
				{ status: 400 },
			);
		}
		return Response.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
