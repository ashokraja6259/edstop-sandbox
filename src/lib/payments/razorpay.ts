import 'server-only';

import { Buffer } from 'node:buffer';
import {
  fingerprintWebhookValue,
  isValidIdentifierValue,
  MAX_REQUEST_BYTES,
  rupeesToPaiseValue,
  validateEnvironmentValues,
  verifyHmacHexValue,
} from './razorpay-core.mjs';

export type RazorpayMode = 'test' | 'live';

export interface RazorpayEnvironment {
  keyId: string;
  keySecret: string;
  publicKeyId: string;
  webhookSecret?: string;
  mode: RazorpayMode;
}

const PROVIDER_TIMEOUT_MS = 8_000;

export function validateRazorpayEnvironment(
  requireWebhook = false
): RazorpayEnvironment {
  const mode = process.env.RAZORPAY_MODE;
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const publicKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  return validateEnvironmentValues({
    keyId,
    keySecret,
    publicKeyId,
    webhookSecret,
    mode,
  }, requireWebhook) as RazorpayEnvironment;
}

export async function readJsonBody<T>(request: Request): Promise<T> {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_REQUEST_BYTES) {
    throw new Error('Request body is too large');
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_REQUEST_BYTES) {
    throw new Error('Request body is too large');
  }

  try {
    return JSON.parse(rawBody) as T;
  } catch {
    throw new Error('Invalid request body');
  }
}

export function isValidIdentifier(value: unknown, maxLength = 128): value is string {
  return isValidIdentifierValue(value, maxLength);
}

export function isValidIdempotencyKey(value: unknown): value is string {
  return isValidIdentifier(value, 128);
}

export function rupeesToPaise(value: number): number {
  return rupeesToPaiseValue(value);
}

export function verifyHmacHex(
  payload: string,
  suppliedSignature: string,
  secret: string
): boolean {
  return verifyHmacHexValue(payload, suppliedSignature, secret);
}

export function fingerprintWebhook(rawBody: string): string {
  return fingerprintWebhookValue(rawBody);
}

export async function razorpayFetch(
  path: string,
  environment: RazorpayEnvironment,
  init: RequestInit = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  const authHeader = Buffer
    .from(`${environment.keyId}:${environment.keySecret}`)
    .toString('base64');

  try {
    return await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: {
        Authorization: `Basic ${authHeader}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function publicPaymentError(status: number, message: string) {
  return Response.json({ error: message }, { status });
}
