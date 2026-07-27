export async function executeRefundOperation(input, dependencies) {
  let reservation;
  try {
    reservation = await dependencies.reserve(input);
  } catch {
    return {
      httpStatus: 409,
      body: { error: 'Refund exceeds refundable amount' },
    };
  }

  if (reservation.idempotent_replay) {
    return {
      httpStatus: 200,
      body: {
        success: true,
        refundId: reservation.refund_id,
        providerRefundId: reservation.provider_refund_id,
        amountPaise: reservation.amount_paise,
        status: reservation.status,
        idempotentReplay: true,
      },
    };
  }

  let providerRefund;
  try {
    providerRefund = await dependencies.createProviderRefund(reservation);
  } catch {
    await dependencies.markUnknown(reservation);
    return {
      httpStatus: 503,
      body: {
        error: 'Refund result requires reconciliation',
        refundId: reservation.refund_id,
        status: 'manual_review',
      },
    };
  }

  if (
    !providerRefund.ok
    || typeof providerRefund.id !== 'string'
    || Number(providerRefund.amount) !== Number(reservation.amount_paise)
    || providerRefund.currency !== 'INR'
  ) {
    await dependencies.markFailed(reservation);
    return {
      httpStatus: 502,
      body: { error: 'Refund request failed' },
    };
  }

  const status =
    providerRefund.status === 'processed' ? 'processed' : 'refund_pending';
  await dependencies.saveProviderResult(reservation, providerRefund, status);
  if (status === 'processed') {
    await dependencies.finalizeIntent(reservation);
  }

  return {
    httpStatus: 200,
    body: {
      success: true,
      refundId: reservation.refund_id,
      providerRefundId: providerRefund.id,
      amountPaise: Number(reservation.amount_paise),
      status,
      idempotentReplay: false,
    },
  };
}
