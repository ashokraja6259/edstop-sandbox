export function normalizeEmailAddress(value: unknown): string;
export function isValidEmailAddress(value: unknown): boolean;
export function getPasswordRecoveryRedirect(
  configuredSiteUrl: string | undefined,
  currentOrigin: string
): string;
export function getRecoveryOtpParams(searchParams: URLSearchParams): {
  token_hash: string;
  type: 'recovery';
} | null;
