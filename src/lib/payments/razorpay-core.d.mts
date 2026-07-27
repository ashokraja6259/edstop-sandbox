export interface EnvironmentValues {
  mode?: string;
  keyId?: string;
  keySecret?: string;
  publicKeyId?: string;
  webhookSecret?: string;
}

export const MAX_REQUEST_BYTES: number;
export function validateEnvironmentValues(
  values: EnvironmentValues,
  requireWebhook?: boolean
): {
  mode: 'test' | 'live';
  keyId: string;
  keySecret: string;
  publicKeyId: string;
  webhookSecret?: string;
};
export function isValidIdentifierValue(
  value: unknown,
  maxLength?: number
): value is string;
export function rupeesToPaiseValue(value: number): number;
export function verifyHmacHexValue(
  payload: string,
  suppliedSignature: string,
  secret: string
): boolean;
export function fingerprintWebhookValue(rawBody: string): string;
