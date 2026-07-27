export function testCheckoutEnabledValue(value) {
  return value === 'true';
}

export function approvedTestUserValue({
  enabled,
  userId,
  role,
  approvedUserIds,
}) {
  if (!testCheckoutEnabledValue(enabled)) return false;
  if (role === 'admin') return true;
  return String(approvedUserIds ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(userId);
}
