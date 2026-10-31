import { NextRequest, NextResponse } from 'next/server';
import {
  getQiCardPaymentStatus,
  settleQiCardPayment,
  QiCardError,
} from '@/lib/qicard';

export const runtime = 'nodejs';

function resultRedirect(request: NextRequest, status: 'success' | 'failed', paymentId?: string, orderId?: string) {
  const url = new URL('/payment-result', request.url);
  url.searchParams.set('status', status);
  if (paymentId) url.searchParams.set('paymentId', paymentId);
  if (orderId) url.searchParams.set('orderId', orderId);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const paymentId = searchParams.get('paymentId');
  const orderId = searchParams.get('orderId') || undefined;

  // The query string is user-controlled: only the paymentId is used, and only
  // as a key for a server-to-server status inquiry.
  if (!paymentId) {
    return resultRedirect(request, 'failed', undefined, orderId);
  }

  try {
    const statusResult = await getQiCardPaymentStatus(paymentId);
    const settled = await settleQiCardPayment({
      paymentId,
      status: statusResult.status,
      amount: statusResult.confirmedAmount ?? statusResult.amount,
      details: statusResult.details,
    });

    const isSuccess = settled.status.toUpperCase() === 'SUCCESS';
    return resultRedirect(request, isSuccess ? 'success' : 'failed', paymentId, orderId);
  } catch (error) {
    console.error('QiCard callback verification error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      paymentId,
    });
    return resultRedirect(request, 'failed', paymentId || undefined, orderId);
  }
}

