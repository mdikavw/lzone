import { getPaymentsByStudent } from '@/lib/application/get-payments-by-student';
import { supabase } from '@/lib/infrastructure/supabase/client';
import { SupabasePaymentRepository } from '@/lib/infrastructure/supabase/payment-repository';

const paymentRepository = new SupabasePaymentRepository(supabase);

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ studentId: string }> },
) {
	const { studentId } = await params;
	try {
		const payments = await getPaymentsByStudent(studentId, {
			paymentRepository,
		});
		return Response.json(payments, { status: 200 });
	} catch (error) {
		return Response.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
