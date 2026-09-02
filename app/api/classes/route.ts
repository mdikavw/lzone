import { createClass } from '@/lib/application/create-class';
import { getClasses } from '@/lib/application/get-classes';
import { SupabaseClassRepository } from '@/lib/infrastructure/supabase/class-repository';
import { supabase } from '@/lib/infrastructure/supabase/client';

const classRepository = new SupabaseClassRepository(supabase);

export async function POST(request: Request) {
	try {
		const body = await request.json();

		if (
			typeof body !== 'object' ||
			body === null ||
			typeof body.name !== 'string' ||
			!body.name.trim()
		) {
			return Response.json(
				{ error: 'Invalid class input' },
				{ status: 400 },
			);
		}

		if (
			body.type !== undefined &&
			body.type !== 'GROUP' &&
			body.type !== 'PRIVATE'
		) {
			return Response.json(
				{ error: 'Invalid class type' },
				{ status: 400 },
			);
		}
		const classEntity = await createClass(
			{
				name: body.name,
				type: body.type,
				description: body.description,
			},
			{
				classRepository,
			},
		);
		return Response.json(classEntity, { status: 201 });
	} catch (error) {
		if (error instanceof SyntaxError) {
			return Response.json({ error: 'Invalid JSON' }, { status: 400 });
		}

		return Response.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}

export async function GET(request: Request) {
	try {
		const classes = await getClasses({
			classRepository,
		});
		return Response.json(classes, { status: 200 });
	} catch (error) {
		return Response.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
