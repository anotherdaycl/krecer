import { NextRequest, NextResponse } from "next/server";
import { createCustomer, findCustomerByEmail, registerCustomer } from "@/lib/flow";
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
      console.log("[checkout] Reusing existing flowCustomerId:", flowCustomerId);
    } else {
      // Intentar crear customer en Flow
      let createError = "";
      try {
        const customer = await createCustomer(
          email,
          name || email.split("@")[0],
          userId
        ) as { customerId: string };
        flowCustomerId = customer.customerId;
        console.log("[checkout] Created new Flow customer:", flowCustomerId);
      } catch (err) {
        createError = err instanceof Error ? err.message : String(err);
        console.log("[checkout] createCustomer failed:", createError);
      }

      // Si falló por duplicado, buscar el customer existente por email
      if (!flowCustomerId && createError.toLowerCase().includes("externalid")) {
        console.log("[checkout] Searching existing customer by email:", email);
        const list = await findCustomerByEmail(email);
        console.log("[checkout] findCustomerByEmail result:", JSON.stringify(list));

        // Intentar match por externalId primero, luego por email
        const customers: { customerId: string; externalId?: string }[] =
          (list as any).data || (list as any).items || (Array.isArray(list) ? list : []);

        const found =
          customers.find((c) => c.externalId === userId) || customers[0];

        if (found?.customerId) {
          flowCustomerId = found.customerId;
          console.log("[checkout] Found existing customer:", flowCustomerId);
        } else {
          throw new Error(`createCustomer falló: ${createError}`);
        }
      } else if (!flowCustomerId) {
        throw new Error(`createCustomer falló: ${createError}`);
      }

      // Guardar el customerId para futuros pagos
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
    console.error("[checkout] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
