import crypto from "crypto";

const FLOW_API_KEY = process.env.FLOW_API_KEY!;
const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY!;
const FLOW_API_URL = "https://www.flow.cl/api";
const FLOW_SANDBOX_URL = "https://sandbox.flow.cl/api";

// Usa sandbox en desarrollo, producción en prod
const BASE_URL =
  process.env.NODE_ENV === "production" ? FLOW_API_URL : FLOW_SANDBOX_URL;

/**
 * Firma los parámetros según el protocolo de Flow
 * Flow requiere que todos los params estén ordenados alfabéticamente
 * y firmados con HMAC-SHA256 usando tu secretKey
 */
function signParams(params: Record<string, string>): string {
  const ordered = Object.keys(params)
    .sort()
    .map((key) => `${key}${params[key]}`)
    .join("");

  return crypto
    .createHmac("sha256", FLOW_SECRET_KEY)
    .update(ordered)
    .digest("hex");
}

/**
 * Hace una llamada POST a la API de Flow
 */
async function flowPost(
  endpoint: string,
  params: Record<string, string>
): Promise<any> {
  const allParams = { ...params, apiKey: FLOW_API_KEY };
  const signature = signParams(allParams);

  const body = new URLSearchParams({ ...allParams, s: signature });

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Flow API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Hace una llamada GET a la API de Flow
 */
async function flowGet(
  endpoint: string,
  params: Record<string, string>
): Promise<any> {
  const allParams = { ...params, apiKey: FLOW_API_KEY };
  const signature = signParams(allParams);

  const queryParams = new URLSearchParams({ ...allParams, s: signature });

  const response = await fetch(
    `${BASE_URL}${endpoint}?${queryParams.toString()}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Flow API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Crea un pago único (para primera suscripción)
 */
export async function createPayment(
  amount: number,
  email: string,
  userId: string,
  description: string = "PostPro - Suscripción mensual"
): Promise<{ url: string; token: string }> {
  const commerceOrder = `order_${userId}_${Date.now()}`;

  const result = await flowPost("/payment/create", {
    commerceOrder,
    subject: description,
    currency: "CLP",
    amount: String(amount),
    email,
    urlConfirmation: `${process.env.NEXT_PUBLIC_APP_URL}/api/flow-webhook`,
    urlReturn: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?payment=success`,
    optional: JSON.stringify({ userId }),
  });

  return {
    url: `${result.url}?token=${result.token}`,
    token: result.token,
  };
}

/**
 * Crea un cliente en Flow para suscripciones
 */
export async function createCustomer(
  email: string,
  name: string,
  userId: string
): Promise<any> {
  return flowPost("/customer/create", {
    name,
    email,
    externalId: userId,
  });
}

/**
 * Suscribe un cliente a un plan
 */
export async function createSubscription(
  customerId: string,
  planId: string
): Promise<any> {
  return flowPost("/subscription/create", {
    customerId,
    planId,
  });
}

/**
 * Obtiene el estado de un pago por su token
 */
export async function getPaymentStatus(token: string): Promise<any> {
  return flowGet("/payment/getStatus", { token });
}

/**
 * Obtiene el estado de una suscripción
 */
export async function getSubscriptionStatus(
  subscriptionId: string
): Promise<any> {
  return flowGet("/subscription/get", { subscriptionId });
}

/**
 * Cancela una suscripción
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<any> {
  return flowPost("/subscription/cancel", { subscriptionId });
}
