import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

export const MAX_REQUEST_BYTES = 64 * 1024;

export function validateEnvironmentValues(values, requireWebhook = false) {
  const { mode, keyId, keySecret, publicKeyId, webhookSecret } = values;
  if (mode !== 'test' && mode !== 'live') {
    throw new Error('Razorpay environment mode is not configured');
  }
  if (!keyId || !keySecret || !publicKeyId) {
    throw new Error('Razorpay server configuration is incomplete');
  }
  const requiredPrefix = mode === 'test' ? 'rzp_test_' : 'rzp_live_';
  if (!keyId.startsWith(requiredPrefix) || !publicKeyId.startsWith(requiredPrefix)) {
    throw new Error('Razorpay credential mode mismatch');
  }
  if (publicKeyId !== keyId) {
    throw new Error('Public and server Razorpay key IDs do not match');
  }
  if (requireWebhook && !webhookSecret) {
    throw new Error('Razorpay webhook configuration is incomplete');
  }
  if (webhookSecret && webhookSecret === keySecret) {
    throw new Error('Razorpay webhook secret must differ from API secret');
  }
  return { mode, keyId, keySecret, publicKeyId, webhookSecret };
}

export function isValidIdentifierValue(value, maxLength = 128) {
  return (
    typeof value === 'string'
    && value.length > 0
    && value.length <= maxLength
    && /^[A-Za-z0-9_-]+$/.test(value)
  );
}

export function rupeesToPaiseValue(value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Invalid monetary value');
  }
  const paise = Math.round(value * 100);
  if (Math.abs(value * 100 - paise) > Number.EPSILON * 100) {
    throw new Error('Fractional paise are not supported');
  }
  return paise;
}

export function verifyHmacHexValue(payload, suppliedSignature, secret) {
  if (!/^[a-f0-9]{64}$/i.test(suppliedSignature)) return false;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest();
  const supplied = Buffer.from(suppliedSignature, 'hex');
  return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

export function fingerprintWebhookValue(rawBody) {
  return crypto.createHash('sha256').update(rawBody).digest('hex');
}
