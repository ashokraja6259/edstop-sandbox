const DEFAULT_AUTH_REDIRECT = '/student-dashboard';

export function getSafeAuthRedirect(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return DEFAULT_AUTH_REDIRECT;
  }

  if (value.startsWith('//') || value.includes('\\')) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const parsed = new URL(value, 'https://edstop.local');

    if (parsed.origin !== 'https://edstop.local') {
      return DEFAULT_AUTH_REDIRECT;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}
