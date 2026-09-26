import { getStudent } from '@/lib/application/get-student';
import { updateStudent } from '@/lib/application/update-student';
import { SupabaseClassRepository } from '@/lib/infrastructure/supabase/class-repository';
import { supabase } from '@/lib/infrastructure/supabase/client';
import { SupabaseStudentRepository } from '@/lib/infrastructure/supabase/student-repository';

const studentRepository = new SupabaseStudentRepository(supabase);
const classRepository = new SupabaseClassRepository(supabase);

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

export async function PUT(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	let body: unknown;
	const { id } = await params;
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 });
	}
	if (typeof body !== 'object' || body === null || Array.isArray(body)) {
		return Response.json(
			{ error: 'Invalid student input' },
			{ status: 400 },
		);
	}

	const input = body as Record<string, unknown>;
	if (
		typeof body !== 'object' ||
		body === null ||
		typeof input.name !== 'string' ||
		!input.name.trim() ||
		typeof input.phone !== 'string' ||
		!input.phone.trim() ||
		typeof input.classId !== 'string' ||
		!input.classId.trim() ||
		typeof input.status !== 'string' ||
		!['ACTIVE', 'INACTIVE'].includes(input.status)
	) {
		return Response.json(
			{ error: 'Invalid student input' },
			{ status: 400 },
		);
	}
	try {
		const updatedStudent = await updateStudent(
			id,
			input as {
				name: string;
				phone: string;
				email?: string;
				classId: string;
				status: 'ACTIVE' | 'INACTIVE';
			},
			{
				studentRepository,
				classRepository,
			},
		);
		return Response.json(updatedStudent, { status: 200 });
	} catch (error) {
		if (error instanceof Error && error.message === 'Student not found') {
			return Response.json(
				{ error: 'Student not found' },
				{ status: 404 },
			);
		}
		if (
			error instanceof Error &&
			error.message === 'New class is not found'
		) {
			return Response.json(
				{ error: 'New class is not found' },
				{ status: 404 },
			);
		}
		if (
			error instanceof Error &&
			error.message === 'New class is inactive'
		) {
			return Response.json(
				{ error: 'New class is inactive' },
				{ status: 400 },
			);
		}
		return Response.json(
			{
				error: 'Internal server error',
			},
			{ status: 500 },
		);
	}
}
