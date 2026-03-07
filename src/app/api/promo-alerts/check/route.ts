// FILE: src/app/api/promo-alerts/check/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: promoCodes, error: promoError } = await supabase
      .from('promo_codes')
      .select('*');

    if (promoError) throw promoError;

    const { data: thresholds, error: thresholdError } = await supabase
      .from('promo_alert_thresholds')
      .select('*')
      .limit(1)
      .single();

    if (thresholdError || !thresholds) {
      return NextResponse.json(
        { error: 'No alert thresholds configured' },
        { status: 400 }
      );
    }

    if (!thresholds.alert_emails?.length) {
      return NextResponse.json({
        message: 'No admin emails configured',
        triggered: [],
      });
    }

    const now = new Date();
    const triggered: string[] = [];

    for (const promo of promoCodes || []) {
      // ================= REDEMPTION CAP =================
      if (promo.usage_limit && promo.used_count > 0) {
        const pct = (promo.used_count / promo.usage_limit) * 100;

        if (pct >= thresholds.redemption_cap_pct) {
          const alreadySent = await recentlyAlerted(
            supabase,
            promo.id,
            'redemption_cap'
          );

          if (!alreadySent) {
            await triggerAlert({
              alertType: 'redemption_cap',
              promoCode: promo.code,
              details: {
                currentPct: Math.round(pct),
                usedCount: promo.used_count,
                usageLimit: promo.usage_limit,
              },
              adminEmails: thresholds.alert_emails,
            });

            await logAlert(supabase, promo, 'redemption_cap', {
              currentPct: Math.round(pct),
            });

            triggered.push(`${promo.code}:redemption_cap`);
          }
        }
      }

      // ================= EXPIRY =================
      if (promo.expires_at) {
        const expiresAt = new Date(promo.expires_at);
        const daysLeft = Math.ceil(
          (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (expiresAt < now) {
          const alreadySent = await recentlyAlerted(
            supabase,
            promo.id,
            'expired'
          );

          if (!alreadySent) {
            await triggerAlert({
              alertType: 'expired',
              promoCode: promo.code,
              details: { expiredAt: expiresAt.toLocaleDateString() },
              adminEmails: thresholds.alert_emails,
            });

            await logAlert(supabase, promo, 'expired', {
              expiredAt: expiresAt.toLocaleDateString(),
            });

            triggered.push(`${promo.code}:expired`);
          }
        } else if (
          daysLeft <= thresholds.expiry_days_before &&
          daysLeft > 0
        ) {
          const alreadySent = await recentlyAlerted(
            supabase,
            promo.id,
            'expiring_soon'
          );

          if (!alreadySent) {
            await triggerAlert({
              alertType: 'expiring_soon',
              promoCode: promo.code,
              details: { daysLeft },
              adminEmails: thresholds.alert_emails,
            });

            await logAlert(supabase, promo, 'expiring_soon', {
              daysLeft,
            });

            triggered.push(`${promo.code}:expiring_soon`);
          }
        }
      }

      // ================= ROI =================
      const avgDiscount =
        promo.discount_type === 'flat'
          ? promo.discount_value
          : (promo.discount_value / 100) *
            (promo.min_order_amount || 100);

      const discountGiven = avgDiscount * promo.used_count;
      const revenueInfluenced =
        (promo.min_order_amount || 100) * 1.5 * promo.used_count;

      const currentRoi =
        discountGiven > 0
          ? Math.round(
              ((revenueInfluenced - discountGiven) / discountGiven) * 100
            )
          : 0;

      if (
        currentRoi >= thresholds.roi_target_pct &&
        promo.used_count > 0
      ) {
        const alreadySent = await recentlyAlerted(
          supabase,
          promo.id,
          'roi_target'
        );

        if (!alreadySent) {
          await triggerAlert({
            alertType: 'roi_target',
            promoCode: promo.code,
            details: { currentRoi },
            adminEmails: thresholds.alert_emails,
          });

          await logAlert(supabase, promo, 'roi_target', {
            currentRoi,
          });

          triggered.push(`${promo.code}:roi_target`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      triggered,
      count: triggered.length,
    });

  } catch (error: any) {
    console.error('Promo alert error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    );
  }
}

// ================= HELPERS =================

async function recentlyAlerted(
  supabase: any,
  promoId: string,
  type: string
) {
  const { data } = await supabase
    .from('promo_alert_logs')
    .select('id')
    .eq('promo_code_id', promoId)
    .eq('alert_type', type)
    .gte(
      'sent_at',
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    )
    .limit(1);

  return data && data.length > 0;
}

async function logAlert(
  supabase: any,
  promo: any,
  type: string,
  details: any
) {
  await supabase.from('promo_alert_logs').insert({
    promo_code_id: promo.id,
    alert_type: type,
    promo_code: promo.code,
    details,
  });
}

async function triggerAlert(payload: {
  alertType: string;
  promoCode: string;
  details: Record<string, any>;
  adminEmails: string[];
}) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(
    `${supabaseUrl}/functions/v1/send-promo-alert`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    console.error('Edge function error:', await res.text());
  }
}