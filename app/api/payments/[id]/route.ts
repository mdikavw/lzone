import { getPayment } from '@/lib/application/get-payment';
import { supabase } from '@/lib/infrastructure/supabase/client';
import { SupabasePaymentRepository } from '@/lib/infrastructure/supabase/payment-repository';

const paymentRepository = new SupabasePaymentRepository(supabase);

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	try {
		const payment = await getPayment(id, { paymentRepository });
		return Response.json(payment, { status: 200 });
	} catch (error) {
		if (error instanceof Error && error.message === 'Payment not found') {
			return Response.json(
				{ error: 'Payment not found' },
				{ status: 404 },
			);
		}
		return Response.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
