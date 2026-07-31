const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmailAddress(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmailAddress(value) {
  return EMAIL_PATTERN.test(normalizeEmailAddress(value));
}

export function getPasswordRecoveryRedirect(configuredSiteUrl, currentOrigin) {
  const candidate = configuredSiteUrl?.trim() || currentOrigin;
  const url = new URL(candidate);

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Password recovery site URL must use HTTP or HTTPS.');
  }

  return `${url.origin}/auth/callback?next=/reset-password`;
}

export function getRecoveryOtpParams(searchParams) {
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!tokenHash || type !== 'recovery') {
    return null;
  }

  return {
    token_hash: tokenHash,
    type: 'recovery',
  };
}
