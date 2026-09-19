import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// nigarbapp holds the Paystack secret key and the hardened payments pipeline
// (payments/paystack_transactions tables, record_paystack_payment RPC) --
// it's the shared payment service for the NCAA ecosystem. Since every app
// shares one Postgres database, creating the payment row itself is a direct
// RPC call (create_external_payment, see nigarbapp/scripts/059_*.sql); only
// the actual Paystack transaction/checkout-link step needs a cross-app HTTP
// call, since that's the one step that needs the secret key.
const NIGARBAPP_URL = import.meta.env.VITE_NIGARBAPP_URL || process.env.VITE_NIGARBAPP_URL || "https://app.ncaaweb.com.ng";

async function initiateExternalPayment(context: any, purpose: "seminar_fee" | "compliance_fine", referenceId: string) {
  const { data: paymentId, error } = await context.supabase.rpc("create_external_payment" as never, {
    p_source_app: "ncaalearn",
    p_purpose: purpose,
    p_reference_id: referenceId,
  } as never);
  if (error) throw new Error((error as { message: string }).message);

  const { data: sessionData } = await context.supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Not authenticated");

  const res = await fetch(`${NIGARBAPP_URL}/api/payments/initialize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ payment_id: paymentId }),
  });
  const body = (await res.json()) as { authorization_url?: string; reference?: string; error?: string };
  if (!res.ok || !body.authorization_url) throw new Error(body.error || "Failed to start payment");

  return { authorizationUrl: body.authorization_url, reference: body.reference ?? "" };
}

export const initiateSeminarPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ registrationId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => initiateExternalPayment(context, "seminar_fee", data.registrationId));

export const initiateComplianceFinePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => initiateExternalPayment(context, "compliance_fine", context.userId));
