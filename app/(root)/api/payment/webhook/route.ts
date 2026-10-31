import { NextRequest, NextResponse } from 'next/server';
import db from '@/utils/db';
import {
  getQiCardPaymentStatus,
  settleQiCardPayment,
  verifyQiCardSignature,
  QiCardError,
} from '@/lib/qicard';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-signature') || '';
  const body = await request.json().catch(() => null);

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const paymentId = typeof body.paymentId === 'string' ? body.paymentId : undefined;
  const rawStatus = typeof body.status === 'string' ? body.status.slice(0, 32) : undefined;

  if (!paymentId) {
    return NextResponse.json({ error: 'Missing paymentId in webhook payload' }, { status: 400 });
  }

  // A forged webhook cannot mark anything paid (the status is re-queried from
  // QiCard below), but a present-and-invalid signature is still rejected.
  if (signature && !verifyQiCardSignature(body, signature)) {
    console.warn('QiCard webhook signature verification failed for paymentId:', paymentId);
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  try {
    const payment = await db.qiCardPayment.findUnique({ where: { paymentId } });
    if (!payment) {
      return NextResponse.json({ error: 'Unknown payment' }, { status: 404 });
    }

    const webhookEvent = await db.qiCardWebhookEvent.create({
      data: {
        paymentId: payment.id,
        status: rawStatus || 'RECEIVED',
        payload: JSON.parse(JSON.stringify(body)),
      },
    });

    // The body is only a hint. The authoritative status always comes from a
    // server-to-server inquiry; if that fails we let QiCard retry later.
    const inquiry = await getQiCardPaymentStatus(paymentId);

    await settleQiCardPayment({
      paymentId,
      status: inquiry.status,
      amount: inquiry.confirmedAmount ?? inquiry.amount,
      details: inquiry.details,
    });

    await db.qiCardWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: { processedAt: new Date(), status: inquiry.status },
    });

    // The QiCard Payment Gateway requires a 200 OK response
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('QiCard webhook processing failed:', { message, paymentId });
    return NextResponse.json(
      { error: error instanceof QiCardError ? message : 'Webhook processing error' },
      { status: 500 }
    );
  }
}
