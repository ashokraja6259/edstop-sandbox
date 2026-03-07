import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async (req) => {
  // ✅ CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }

  try {
    const { alertType, promoCode, details, adminEmails } = await req.json();

    if (!alertType || !promoCode || !adminEmails || adminEmails.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const subjectMap: Record<string, string> = {
      redemption_cap: `⚠️ Promo Code Alert: ${promoCode} nearing redemption cap`,
      expired: `🔴 Promo Code Alert: ${promoCode} has expired`,
      expiring_soon: `⏰ Promo Code Alert: ${promoCode} expiring soon`,
      roi_target: `🎯 Promo Code Alert: ${promoCode} hit ROI target`,
    };

    const subject = subjectMap[alertType] || `Promo Code Alert: ${promoCode}`;

    const htmlBody = buildEmailHtml(alertType, promoCode, details);

    const resendPayload = {
      from: "alerts@edstop.com",
      to: adminEmails,
      subject,
      html: htmlBody,
    };

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(resendPayload),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      throw new Error(resendData.message || "Resend API error");
    }

    return new Response(JSON.stringify({ success: true, emailId: resendData.id }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});

function buildEmailHtml(alertType: string, promoCode: string, details: Record<string, any>): string {
  const alertConfigs: Record<string, { color: string; icon: string; title: string; message: string }> = {
    redemption_cap: {
      color: "#f59e0b",
      icon: "⚠️",
      title: "Redemption Cap Alert",
      message: `Promo code <strong>${promoCode}</strong> has reached ${details.currentPct ?? "80"}% of its redemption cap (${details.usedCount ?? 0}/${details.usageLimit ?? 0} uses).`,
    },
    expired: {
      color: "#ef4444",
      icon: "🔴",
      title: "Promo Code Expired",
      message: `Promo code <strong>${promoCode}</strong> has expired as of ${details.expiredAt ?? "now"}.`,
    },
    expiring_soon: {
      color: "#f97316",
      icon: "⏰",
      title: "Expiring Soon",
      message: `Promo code <strong>${promoCode}</strong> will expire in ${details.daysLeft ?? 0} day(s) on ${details.expiresAt ?? ""}.`,
    },
    roi_target: {
      color: "#10b981",
      icon: "🎯",
      title: "ROI Target Reached",
      message: `Promo code <strong>${promoCode}</strong> has hit the ROI target of ${details.roiTarget ?? 200}%. Current ROI: <strong>${details.currentRoi ?? 0}%</strong>.`,
    },
  };

  const cfg = alertConfigs[alertType] || {
    color: "#6366f1",
    icon: "📢",
    title: "Promo Code Alert",
    message: `Alert for promo code <strong>${promoCode}</strong>.`,
  };

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <tr><td style="background:${cfg.color};padding:24px 32px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">${cfg.icon} ${cfg.title}</h1>
          <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">EdStop Admin Notification</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">${cfg.message}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;border-radius:8px;padding:16px;margin:16px 0;">
            <tr><td style="padding:4px 0;"><span style="color:#6b7280;font-size:13px;">Promo Code:</span> <strong style="color:#111827;font-size:13px;font-family:monospace;">${promoCode}</strong></td></tr>
            <tr><td style="padding:4px 0;"><span style="color:#6b7280;font-size:13px;">Alert Type:</span> <strong style="color:#111827;font-size:13px;">${alertType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}</strong></td></tr>
            <tr><td style="padding:4px 0;"><span style="color:#6b7280;font-size:13px;">Triggered At:</span> <strong style="color:#111827;font-size:13px;">${new Date().toLocaleString()}</strong></td></tr>
            ${Object.entries(details).map(([k, v]) => `<tr><td style="padding:4px 0;"><span style="color:#6b7280;font-size:13px;">${k.replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase())}:</span> <strong style="color:#111827;font-size:13px;">${v}</strong></td></tr>`).join("")}
          </table>
          <a href="https://edstop3983.builtwithrocket.new/admin-promo-code-management" style="display:inline-block;background:${cfg.color};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin-top:8px;">View Promo Codes →</a>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">This is an automated alert from EdStop Admin. Manage alert settings in the Admin Promo Code Management panel.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
