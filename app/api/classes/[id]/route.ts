import { deleteClass } from '@/lib/application/delete-class';
import { getClass } from '@/lib/application/get-class';
import { updateClass } from '@/lib/application/update-class';
import { SupabaseClassRepository } from '@/lib/infrastructure/supabase/class-repository';
import { supabase } from '@/lib/infrastructure/supabase/client';

const classRepository = new SupabaseClassRepository(supabase);

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	try {
		const classEntity = await getClass(id, {
			classRepository,
		});
		return Response.json(classEntity, { status: 200 });
	} catch (error) {
		if (error instanceof Error && error.message === 'Class not found') {
			return Response.json({ error: 'Class not found' }, { status: 404 });
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
	const { id } = await params;
	try {
		const body = await request.json();

		if (
			typeof body !== 'object' ||
			body === null ||
			typeof body.name !== 'string' ||
			!body.name.trim() ||
			(body.type !== 'GROUP' && body.type !== 'PRIVATE') ||
			(body.status !== 'ACTIVE' && body.status !== 'INACTIVE')
		) {
			return Response.json(
				{ error: 'Invalid class input' },
				{ status: 400 },
			);
		}
		const updatedClass = await updateClass(id, body, { classRepository });
		return Response.json(updatedClass, { status: 200 });
	} catch (error) {
		if (error instanceof Error && error.message === 'Class not found') {
			return Response.json({ error: 'Class not found' }, { status: 404 });
		}
		if (error instanceof SyntaxError)
			return Response.json({ error: 'Invalid JSON' }, { status: 400 });

		return Response.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	try {
		await deleteClass(id, { classRepository });
		return new Response(null, { status: 204 });
	} catch (error) {
		if (error instanceof Error && error.message === 'Class not found') {
			return Response.json({ error: 'Class not found' }, { status: 404 });
		}
		return Response.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
