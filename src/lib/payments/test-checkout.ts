import 'server-only';
import {
  approvedTestUserValue,
  testCheckoutEnabledValue,
} from './test-checkout-core.mjs';

export function isRazorpayTestCheckoutEnabled() {
  return testCheckoutEnabledValue(
    process.env.RAZORPAY_TEST_CHECKOUT_ENABLED
  );
}

export function isApprovedRazorpayTestUser(userId: string, role?: string | null) {
  return approvedTestUserValue({
    enabled: process.env.RAZORPAY_TEST_CHECKOUT_ENABLED,
    userId,
    role,
    approvedUserIds: process.env.RAZORPAY_TEST_USER_IDS,
  });
}
