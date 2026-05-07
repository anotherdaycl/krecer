import { NextRequest, NextResponse } from "next/server";
import { createCustomer, getCustomerByExternalId, findCustomerByEmail, registerCustomer } from "@/lib/flow";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { userId, email, name } = await req.json();

    if (!userId || !email) {
      return NextResponse.json({ error: "userId and email required" }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").trim();
    const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || "https";
    const baseUrl = `${proto}://${host}`;

    const supabase = createServerClient();

    // Reusar customer de Flow si ya está guardado en Supabase
    let flowCustomerId = "";
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("flow_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingSub?.flow_customer_id) {
      flowCustomerId = existingSub.flow_customer_id;
      console.log("[checkout] Reusing stored flowCustomerId:", flowCustomerId);
    } else {
      // 1. Intentar crear customer
      try {
        const customer = await createCustomer(email, name || email.split("@")[0], userId) as { customerId: string };
        flowCustomerId = customer.customerId;
        console.log("[checkout] Created new customer:", flowCustomerId);
      } catch (err) {
        const createError = err instanceof Error ? err.message : String(err);
        console.log("[checkout] createCustomer failed:", createError);

        // Solo recuperar si es error de externalId duplicado
        if (!createError.toLowerCase().includes("externalid")) {
          throw new Error(createError);
        }

        // 2. Intentar /customer/get con externalId
        try {
          const existing = await getCustomerByExternalId(userId) as { customerId: string };
          if (existing?.customerId) {
            flowCustomerId = existing.customerId;
            console.log("[checkout] Found customer by externalId:", flowCustomerId);
          }
        } catch (e) {
          console.log("[checkout] getCustomerByExternalId failed:", e);
        }

        // 3. Fallback: buscar por email en la lista
        if (!flowCustomerId) {
          try {
            const list = await findCustomerByEmail(email);
            console.log("[checkout] customer list:", JSON.stringify(list));
            const customers: { customerId: string; externalId?: string }[] =
              list?.data || list?.items || (Array.isArray(list) ? list : []);
            const found = customers.find((c) => c.externalId === userId) || customers[0];
            if (found?.customerId) {
              flowCustomerId = found.customerId;
              console.log("[checkout] Found customer by email list:", flowCustomerId);
            }
          } catch (e) {
            console.log("[checkout] findCustomerByEmail failed:", e);
          }
        }

        if (!flowCustomerId) {
          throw new Error("No se pudo recuperar el cliente de Flow. Revisa los logs.");
        }
      }

      // Guardar para futuros pagos
      await supabase.from("subscriptions").upsert({
        user_id: userId,
        flow_customer_id: flowCustomerId,
        status: "pending",
        credits: 0,
      });
    }

    const { url } = await registerCustomer(flowCustomerId, baseUrl);
    return NextResponse.json({ url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[checkout] error final:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
