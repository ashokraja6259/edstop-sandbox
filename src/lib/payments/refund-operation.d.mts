export interface RefundReservation {
  refund_id: string;
  provider_refund_id: string | null;
  amount_paise: number;
  status: string;
  idempotent_replay: boolean;
}

export interface ProviderRefundResult {
  ok: boolean;
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

export function executeRefundOperation(
  input: unknown,
  dependencies: {
    reserve(input: unknown): Promise<RefundReservation>;
    createProviderRefund(
      reservation: RefundReservation
    ): Promise<ProviderRefundResult>;
    markUnknown(reservation: RefundReservation): Promise<void>;
    markFailed(reservation: RefundReservation): Promise<void>;
    saveProviderResult(
      reservation: RefundReservation,
      providerRefund: ProviderRefundResult,
      status: string
    ): Promise<void>;
    finalizeIntent(reservation: RefundReservation): Promise<void>;
  }
): Promise<{ httpStatus: number; body: Record<string, unknown> }>;
