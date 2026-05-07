import crypto from "crypto";

const FLOW_API_KEY = process.env.FLOW_API_KEY!;
const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY!;
const FLOW_API_URL = "https://www.flow.cl/api";
const FLOW_SANDBOX_URL = "https://sandbox.flow.cl/api";
const TIMEOUT_MS = 30000;

// FLOW_SANDBOX=true para usar sandbox aunque estemos en producción
const BASE_URL =
  process.env.FLOW_SANDBOX === "true" ? FLOW_SANDBOX_URL : FLOW_API_URL;

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

function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}

async function flowPost(
  endpoint: string,
  params: Record<string, string>
): Promise<unknown> {
  if (!FLOW_API_KEY) throw new Error("FLOW_API_KEY not set in environment variables");
  if (!FLOW_SECRET_KEY) throw new Error("FLOW_SECRET_KEY not set in environment variables");
  const allParams = { ...params, apiKey: FLOW_API_KEY };
  const signature = signParams(allParams);

  const body = new URLSearchParams({ ...allParams, s: signature });

  const response = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
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

async function flowGet(
  endpoint: string,
  params: Record<string, string>
): Promise<unknown> {
  const allParams = { ...params, apiKey: FLOW_API_KEY };
  const signature = signParams(allParams);

  const queryParams = new URLSearchParams({ ...allParams, s: signature });

  const response = await fetchWithTimeout(
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
  description: string = "Kreati - 10 créditos",
  baseUrl?: string,
  promoCodeId?: string | null
): Promise<{ url: string; token: string }> {
  const appUrl = (baseUrl || process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (!appUrl) throw new Error("App URL not configured");

  const commerceOrder = `u${userId.replace(/-/g, "")}`;
  const optional: Record<string, string> = { userId };
  if (promoCodeId) optional.promoCodeId = promoCodeId;

  const result = await flowPost("/payment/create", {
    commerceOrder,
    subject: description,
    currency: "CLP",
    amount: String(amount),
    email,
    urlConfirmation: `${appUrl}/api/flow-webhook`,
    urlReturn: `${appUrl}/api/flow-return`,
    optional: JSON.stringify(optional),
  }) as { url: string; token: string };

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
 * Obtiene el estado del registro de tarjeta y el customerId
 * Flow envía el token al url_registration, luego lo usamos aquí
 */
export async function getRegisterStatus(token: string): Promise<any> {
  return flowGet("/customer/getRegisterStatus", { token });
}

/**
 * Obtiene un cliente por externalId (= userId de Supabase)
 */
export async function getCustomerByExternalId(externalId: string): Promise<any> {
  return flowGet("/customer/get", { externalId });
}

/**
 * Busca customers en Flow (fallback cuando ya existe por externalId)
 */
export async function findCustomerByEmail(email: string): Promise<any> {
  return flowGet("/customer/list", { filter: email, start: "0", limit: "10" });
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
 * Registra la tarjeta de un cliente para suscripciones
 */
export async function registerCustomer(
  customerId: string,
  baseUrl: string
): Promise<{ url: string; token: string }> {
  const result = await flowPost("/customer/register", {
    customerId,
    url_registration: `${baseUrl}/api/flow-register-webhook`,
    url_return: `${baseUrl}/api/flow-return`,
  }) as { url: string; token: string };
  return {
    url: `${result.url}?token=${result.token}`,
    token: result.token,
  };
}

/**
 * Obtiene los datos de un cliente de Flow
 */
export async function getCustomer(customerId: string): Promise<any> {
  return flowGet("/customer/get", { customerId });
}

/**
 * Cancela una suscripción
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<any> {
  return flowPost("/subscription/cancel", { subscriptionId });
}
