import type { IOrder } from '@/models/Order';

type ShiprocketAuthResponse = {
  token: string;
};

type ServiceabilityParams = {
  deliveryPincode: string;
  cod: boolean;
  weightKg: number;
};

type CreateOrderResult = {
  shiprocketOrderId?: string;
  shipmentId?: string;
};

type AssignAwbResult = {
  awbCode?: string;
  courierName?: string;
};

type LabelResult = {
  labelUrl?: string;
};

type TrackingResult = {
  trackingUrl?: string;
  deliveryStatus?: string;
  estimatedDelivery?: string;
};

type ReturnResult = {
  returnShipmentId?: string;
  returnAwbCode?: string;
  returnTrackingUrl?: string;
  returnStatus?: string;
};

const SHIPROCKET_BASE = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';
const SHIPROCKET_DEBUG_ENABLED = ['1', 'true', 'yes', 'on'].includes(String(process.env.SHIPROCKET_DEBUG || '').toLowerCase());

let cachedToken: string | null = null;
let cachedTokenExpiry = 0;
let tokenRefreshPromise: Promise<string> | null = null;
let lastAuthAttemptAt: string | null = null;
let lastAuthSuccessAt: string | null = null;
let lastAuthStatus: number | null = null;
let lastAuthError: string | null = null;
let lastAuthResponseBody: string | null = null;
let lastAuthEndpoint: string | null = null;
const TOKEN_REFRESH_BUFFER_MS = 90 * 1000;

type EnvInspection = {
  rawPresent: boolean;
  normalizedPresent: boolean;
  rawLength: number;
  normalizedLength: number;
  trimmed: boolean;
  hasControlWhitespace: boolean;
};

function debugLog(message: string, details?: unknown) {
  if (!SHIPROCKET_DEBUG_ENABLED) return;
  if (typeof details === 'undefined') {
    console.log('[Shiprocket]', message);
    return;
  }
  console.log('[Shiprocket]', message, details);
}

function normalizeEnvValue(value: string | undefined | null) {
  return String(value ?? '').replace(/^\uFEFF/, '').trim();
}

function inspectEnvValue(value: string | undefined | null): EnvInspection {
  const raw = String(value ?? '');
  const normalized = normalizeEnvValue(value);
  return {
    rawPresent: raw.length > 0,
    normalizedPresent: normalized.length > 0,
    rawLength: raw.length,
    normalizedLength: normalized.length,
    trimmed: raw !== normalized,
    hasControlWhitespace: /[\r\n\t]/.test(raw) || raw !== raw.trim(),
  };
}

function maskEmail(email: string) {
  const [localPart = '', domain = ''] = email.split('@');
  if (!domain) return '***';
  const visibleLocal = localPart.slice(0, 2);
  return `${visibleLocal}${localPart.length > 2 ? '***' : '*'}@${domain}`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPincode(pincode: string) {
  return /^\d{6}$/.test(pincode);
}

function validatePositiveNumber(value: unknown, fallbackLabel: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${fallbackLabel} must be a positive number`);
  }
  return numeric;
}

function isCachedTokenUsable(force = false) {
  if (force) return false;
  if (!cachedToken) return false;
  return cachedTokenExpiry - TOKEN_REFRESH_BUFFER_MS > Date.now();
}

function getStringValue(value: unknown) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function getNestedValue(source: any, path: string) {
  return path.split('.').reduce<any>((current, key) => {
    if (current && typeof current === 'object' && key in current) {
      return current[key];
    }
    return undefined;
  }, source);
}

function pickStringValue(source: any, paths: string[]) {
  for (const path of paths) {
    const value = getStringValue(getNestedValue(source, path));
    if (value) return value;
  }
  return '';
}

function parseShiprocketResponseBody(body: string) {
  const trimmed = String(body || '').trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed);
  } catch {
    return { raw: trimmed };
  }
}

function isRetryableShiprocketStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}

function getRuntimeShiprocketConfig() {
  const rawEmail = process.env.SHIPROCKET_EMAIL;
  const rawPassword = process.env.SHIPROCKET_PASSWORD;
  const rawPickupLocation = process.env.SHIPROCKET_PICKUP_LOCATION;
  const rawPickupPincode = process.env.SHIPROCKET_PICKUP_PINCODE;

  const email = normalizeEnvValue(rawEmail);
  const password = normalizeEnvValue(rawPassword);
  const pickupLocation = normalizeEnvValue(rawPickupLocation);
  const pickupPincode = normalizeEnvValue(rawPickupPincode);

  const emailInspection = inspectEnvValue(rawEmail);
  const passwordInspection = inspectEnvValue(rawPassword);
  const pickupLocationInspection = inspectEnvValue(rawPickupLocation);
  const pickupPincodeInspection = inspectEnvValue(rawPickupPincode);

  return {
    email,
    password,
    pickupLocation,
    pickupPincode,
    emailInspection,
    passwordInspection,
    pickupLocationInspection,
    pickupPincodeInspection,
  };
}

function describeShiprocketAuthFailure(errorMessage: string) {
  const message = String(errorMessage || '').toLowerCase();

  if (message.includes('too many') || message.includes('blocked') || message.includes('temporarily') || message.includes('rate limit')) {
    return 'Shiprocket authentication is temporarily blocked. Please try again later or check the Shiprocket account status.';
  }

  if (message.includes('unauthorized') || message.includes('forbidden') || message.includes('credentials') || message.includes('password') || message.includes('email')) {
    return 'Shiprocket authentication failed. Verify SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in Render.';
  }

  return 'Shiprocket authentication failed. Check Shiprocket credentials and account status in Render.';
}

function validateRuntimeConfig(options: { requirePickupLocation?: boolean; requirePickupPincode?: boolean } = {}) {
  const config = getRuntimeShiprocketConfig();

  if (!config.email || !config.password) {
    throw new Error('Shiprocket credentials are not configured');
  }

  if (!isValidEmail(config.email)) {
    throw new Error('SHIPROCKET_EMAIL is not a valid email address');
  }

  if (options.requirePickupLocation && !config.pickupLocation) {
    throw new Error('SHIPROCKET_PICKUP_LOCATION is not configured');
  }

  if (options.requirePickupPincode && !config.pickupPincode) {
    throw new Error('SHIPROCKET_PICKUP_PINCODE is not configured');
  }

  if (config.pickupPincode && !isValidPincode(config.pickupPincode)) {
    throw new Error('SHIPROCKET_PICKUP_PINCODE must be a 6-digit pincode');
  }

  return config;
}

function getEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

function getRetryDelayMs(attempt: number) {
  return Math.min(5000, 300 * Math.pow(2, attempt));
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function authenticateShiprocket(force = false): Promise<string> {
  const authEndpoint = `${SHIPROCKET_BASE}/auth/login`;
  const config = validateRuntimeConfig();
  if (isCachedTokenUsable(force)) {
    debugLog('Reusing cached Shiprocket token', { expiresAt: new Date(cachedTokenExpiry).toISOString() });
    return cachedToken as string;
  }

  if (tokenRefreshPromise) {
    // Queue concurrent requests behind the in-flight refresh to avoid race conditions.
    console.info('[Shiprocket] Token refresh already in progress, waiting', {
      endpoint: authEndpoint,
      timestamp: new Date().toISOString(),
    });
    return tokenRefreshPromise;
  }

  tokenRefreshPromise = (async () => {
    const now = Date.now();

    const passwordLength = config.password.length;
    const passwordHasWhitespace = config.passwordInspection.trimmed || /[\r\n\t]/.test(String(process.env.SHIPROCKET_PASSWORD || ''));

    debugLog('Shiprocket auth env inspection', {
      emailPresent: config.emailInspection.normalizedPresent,
      emailValid: isValidEmail(config.email),
      emailMasked: maskEmail(config.email),
      emailTrimmed: config.emailInspection.trimmed,
      emailHasWhitespace: config.emailInspection.hasControlWhitespace,
      passwordPresent: config.passwordInspection.normalizedPresent,
      passwordLength,
      passwordTrimmed: config.passwordInspection.trimmed,
      passwordHasWhitespace,
      pickupLocationPresent: config.pickupLocationInspection.normalizedPresent,
      pickupLocationTrimmed: config.pickupLocationInspection.trimmed,
      pickupPincodePresent: config.pickupPincodeInspection.normalizedPresent,
      pickupPincodeValid: !config.pickupPincode || isValidPincode(config.pickupPincode),
      endpoint: authEndpoint,
    });

    lastAuthAttemptAt = new Date().toISOString();
    lastAuthEndpoint = authEndpoint;
    lastAuthError = null;
    lastAuthResponseBody = null;
    lastAuthStatus = null;

    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        debugLog('Authenticating Shiprocket', {
          attempt,
          endpoint: authEndpoint,
          email: maskEmail(config.email),
          passwordLength,
          timestamp: new Date().toISOString(),
        });

        const res = await fetch(authEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: config.email, password: config.password }),
          cache: 'no-store',
        });

        lastAuthStatus = res.status;
        console.info('[Shiprocket] Auth response', {
          endpoint: authEndpoint,
          status: res.status,
          ok: res.ok,
          attempt,
          timestamp: new Date().toISOString(),
        });

        if (!res.ok) {
          const errorText = await res.text();
          lastAuthResponseBody = errorText;
          const safeMessage =
            res.status === 400 || res.status === 401 || res.status === 403
              ? describeShiprocketAuthFailure(errorText)
              : res.status >= 500
                ? 'Shiprocket authentication service is unavailable.'
                : `Shiprocket authentication failed with status ${res.status}`;

          console.error('[Shiprocket] Auth failure', {
            endpoint: authEndpoint,
            status: res.status,
            responseBody: errorText,
            attempt,
            timestamp: new Date().toISOString(),
          });

          if (attempt < maxAttempts && res.status >= 500) {
            await sleep(getRetryDelayMs(attempt));
            continue;
          }

          lastAuthError = safeMessage;
          throw new Error(safeMessage);
        }

        const data = (await res.json()) as ShiprocketAuthResponse;
        if (!data?.token) {
          lastAuthResponseBody = JSON.stringify(data);
          lastAuthError = 'Shiprocket auth token missing in response';
          console.error('[Shiprocket] Auth response missing token', {
            endpoint: authEndpoint,
            responseBody: data,
            timestamp: new Date().toISOString(),
          });
          throw new Error('Shiprocket auth token missing in response');
        }

        cachedToken = data.token;
        cachedTokenExpiry = now + 8 * 60 * 1000;
        lastAuthSuccessAt = new Date().toISOString();
        debugLog('Shiprocket auth succeeded', {
          endpoint: authEndpoint,
          tokenCached: true,
          tokenExpiresAt: new Date(cachedTokenExpiry).toISOString(),
        });
        console.info('[Shiprocket] Auth succeeded', {
          endpoint: authEndpoint,
          tokenExpiresAt: new Date(cachedTokenExpiry).toISOString(),
          timestamp: new Date().toISOString(),
        });
        return data.token;
      } catch (error: any) {
        const message = error?.message || String(error);
        lastAuthError = message;
        console.error('[Shiprocket] Auth exception', {
          endpoint: authEndpoint,
          attempt,
          message,
          timestamp: new Date().toISOString(),
        });

        if (attempt < maxAttempts && /network|fetch|timeout|ECONN|ETIMEDOUT/i.test(message)) {
          await sleep(getRetryDelayMs(attempt));
          continue;
        }

        throw error instanceof Error ? error : new Error(message);
      }
    }

    throw new Error('Shiprocket authentication failed');
  })();

  try {
    return await tokenRefreshPromise;
  } finally {
    tokenRefreshPromise = null;
  }
}

async function shiprocketRequest<T>(path: string, init: RequestInit = {}, attempts = 3): Promise<T> {
  let lastError: unknown;
  const method = String(init.method || 'GET').toUpperCase();

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const startedAt = new Date().toISOString();
      console.info('[Shiprocket] Request start', { path, method, attempt: attempt + 1, attempts, timestamp: startedAt });
      debugLog('Shiprocket request start', { path, method, attempt: attempt + 1, attempts, startedAt });
      const token = await authenticateShiprocket(attempt > 0);
      const res = await fetch(`${SHIPROCKET_BASE}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(init.headers || {}),
        },
        cache: 'no-store',
      });
      console.info('[Shiprocket] Request response', {
        path,
        method,
        status: res.status,
        ok: res.ok,
        attempt: attempt + 1,
        timestamp: new Date().toISOString(),
      });

      if (res.status === 401 && attempt < attempts - 1) {
        debugLog('Shiprocket request returned 401, forcing token refresh', { path, attempt: attempt + 1 });
        await authenticateShiprocket(true);
        await sleep(getRetryDelayMs(attempt));
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        console.error('[Shiprocket] Request failed', {
          path,
          method,
          status: res.status,
          responseBody: body,
          attempt: attempt + 1,
          timestamp: new Date().toISOString(),
        });
        if (attempt < attempts - 1 && isRetryableShiprocketStatus(res.status)) {
          await sleep(getRetryDelayMs(attempt));
          continue;
        }
        throw new Error(`Shiprocket ${path} failed (${res.status}): ${body || res.statusText}`);
      }

      debugLog('Shiprocket request succeeded', { path, attempt: attempt + 1 });
      const responseText = await res.text();
      console.info('[Shiprocket] Request body received', {
        path,
        method,
        status: res.status,
        timestamp: new Date().toISOString(),
      });
      return parseShiprocketResponseBody(responseText) as T;
    } catch (error) {
      lastError = error;
      console.error('[Shiprocket] Request exception', {
        path,
        method,
        attempt: attempt + 1,
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      });
      if (attempt < attempts - 1) {
        await sleep(getRetryDelayMs(attempt));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Shiprocket request failed');
}

function getOrderCustomer(order: IOrder) {
  const name = order.guestInfo?.name || 'Customer';
  const email = order.guestInfo?.email || process.env.SHIPROCKET_DEFAULT_CUSTOMER_EMAIL || 'no-reply@example.com';
  const phone = order.guestInfo?.phone || process.env.SHIPROCKET_DEFAULT_CUSTOMER_PHONE || '9999999999';
  return { name, email, phone };
}

function getOrderPackage(order: IOrder) {
  const defaultWeight = Number(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG || '0.5');
  const defaultLength = Number(process.env.SHIPROCKET_DEFAULT_LENGTH_CM || '20');
  const defaultBreadth = Number(process.env.SHIPROCKET_DEFAULT_BREADTH_CM || '15');
  const defaultHeight = Number(process.env.SHIPROCKET_DEFAULT_HEIGHT_CM || '10');

  const qty = (order.orderItems || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0) || 1;

  const weightKg = order.packageWeightKg || Number((defaultWeight * qty).toFixed(2));
  const lengthCm = order.packageLengthCm || defaultLength;
  const breadthCm = order.packageBreadthCm || defaultBreadth;
  const heightCm = order.packageHeightCm || defaultHeight;

  return { weightKg, lengthCm, breadthCm, heightCm };
}

export async function checkPincodeServiceability(params: ServiceabilityParams) {
  try {
    if (!isValidPincode(params.deliveryPincode)) {
      throw new Error('Delivery pincode must be a 6-digit number');
    }
    const weightKg = validatePositiveNumber(params.weightKg, 'Serviceability weight');
    const { pickupPincode } = validateRuntimeConfig({ requirePickupPincode: true });
    if (!isValidPincode(pickupPincode)) {
      throw new Error('SHIPROCKET_PICKUP_PINCODE must be a 6-digit pincode');
    }

    debugLog('Checking Shiprocket serviceability', {
      deliveryPincode: params.deliveryPincode,
      pickupPincode,
      cod: params.cod,
      weightKg,
    });

    const query = new URLSearchParams({
      pickup_postcode: pickupPincode,
      delivery_postcode: params.deliveryPincode,
      cod: params.cod ? '1' : '0',
      weight: String(weightKg || 0.5),
    });

    const data = await shiprocketRequest<any>(`/courier/serviceability/?${query.toString()}`, { method: 'GET' });
    const availableCouriers = Array.isArray(data?.data?.available_courier_companies)
      ? data.data.available_courier_companies
      : [];

    return {
      serviceable: availableCouriers.length > 0,
      couriers: availableCouriers,
      message: availableCouriers.length > 0 ? 'Service available' : 'Delivery unavailable for this pincode',
    };
  } catch (error: any) {
    console.error('[Shiprocket] checkPincodeServiceability failed:', error?.message || error);
    // Return a safe response rather than throwing so callers can show a user-friendly message
    const errorMessage = String(error?.message || error || '');
    const authFailureMessage = describeShiprocketAuthFailure(errorMessage);
    return {
      serviceable: false,
      couriers: [],
      message: /too many|blocked|temporarily|rate limit|auth|unauthori|forbidden|pickup|email|password|pincode/i.test(errorMessage)
        ? authFailureMessage
        : 'Unable to verify delivery serviceability at this time',
    };
  }
}

export async function simulateShiprocketConcurrentApiCalls() {
  const { pickupPincode } = validateRuntimeConfig({ requirePickupPincode: true });
  if (!pickupPincode) {
    return { ok: false, skipped: true, message: 'Pickup pincode not configured' };
  }

  const query = new URLSearchParams({
    pickup_postcode: pickupPincode,
    delivery_postcode: pickupPincode,
    cod: '0',
    weight: '0.5',
  });

  const startedAt = new Date().toISOString();
  const results = await Promise.allSettled(
    Array.from({ length: 5 }, async (_, index) => {
      console.info('[Shiprocket] Concurrency test request start', { index: index + 1, timestamp: new Date().toISOString() });
      return shiprocketRequest<any>(`/courier/serviceability/?${query.toString()}`, { method: 'GET' }, 1);
    })
  );

  const failures = results.filter((result) => result.status === 'rejected');
  console.info('[Shiprocket] Concurrency test complete', {
    startedAt,
    completedAt: new Date().toISOString(),
    total: results.length,
    failures: failures.length,
  });

  return {
    ok: failures.length === 0,
    total: results.length,
    failures: failures.length,
  };
}

export async function createShiprocketOrder(order: IOrder): Promise<CreateOrderResult> {
  const { name, email, phone } = getOrderCustomer(order);
  const { weightKg, lengthCm, breadthCm, heightCm } = getOrderPackage(order);
  const shippingPincode = String(order.shippingAddress?.pincode || '').trim();

  if (!isValidPincode(shippingPincode)) {
    throw new Error('Shipping pincode must be a 6-digit number');
  }

  const { pickupLocation } = validateRuntimeConfig({ requirePickupLocation: true, requirePickupPincode: true });
  if (!pickupLocation) {
    throw new Error('SHIPROCKET_PICKUP_LOCATION is not configured');
  }
  if (![weightKg, lengthCm, breadthCm, heightCm].every((value) => Number.isFinite(value) && value > 0)) {
    throw new Error('Invalid package dimensions or weight');
  }

  debugLog('Creating Shiprocket order payload', {
    orderId: String(order._id),
    pickupLocation,
    billingPincode: shippingPincode,
    weightKg,
    lengthCm,
    breadthCm,
    heightCm,
  });

  const payload = {
    order_id: String(order._id),
    order_date: new Date(order.createdAt || new Date()).toISOString().slice(0, 19).replace('T', ' '),
    pickup_location: pickupLocation,
    channel_id: '',
    comment: 'Created from L3 MODZ store',
    billing_customer_name: name,
    billing_last_name: '',
    billing_address: order.shippingAddress?.addressLine1 || order.shippingAddress?.street || '',
    billing_address_2: order.shippingAddress?.addressLine2 || '',
    billing_city: order.shippingAddress?.city || '',
    billing_pincode: shippingPincode,
    billing_state: order.shippingAddress?.state || '',
    billing_country: 'India',
    billing_email: email,
    billing_phone: phone,
    shipping_is_billing: true,
    shipping_customer_name: name,
    shipping_last_name: '',
    shipping_address: order.shippingAddress?.addressLine1 || order.shippingAddress?.street || '',
    shipping_address_2: order.shippingAddress?.addressLine2 || '',
    shipping_city: order.shippingAddress?.city || '',
    shipping_pincode: shippingPincode,
    shipping_state: order.shippingAddress?.state || '',
    shipping_country: 'India',
    shipping_email: email,
    shipping_phone: phone,
    order_items: (order.orderItems || []).map((item, index) => ({
      name: item.name,
      sku: `SKU-${index + 1}`,
      units: Number(item.quantity || 1),
      selling_price: Number(item.price || 0),
      discount: 0,
      tax: 0,
      hsn: 0,
    })),
    payment_method: order.isPaid ? 'Prepaid' : 'COD',
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: Number(order.totalPrice || 0),
    length: lengthCm,
    breadth: breadthCm,
    height: heightCm,
    weight: weightKg,
  };

  const data = await shiprocketRequest<any>('/orders/create/adhoc', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const shiprocketOrderId = pickStringValue(data, ['order_id', 'data.order_id', 'response.order_id', 'response.data.order_id']);
  const shipmentId = pickStringValue(data, ['shipment_id', 'data.shipment_id', 'response.shipment_id', 'response.data.shipment_id']);

  debugLog('Shiprocket order created', {
    orderId: String(order._id),
    shiprocketOrderId: shiprocketOrderId || undefined,
    shipmentId: shipmentId || undefined,
  });

  return {
    shiprocketOrderId: shiprocketOrderId || undefined,
    shipmentId: shipmentId || undefined,
  };
}

export async function assignBestCourier(shipmentId: string): Promise<AssignAwbResult> {
  debugLog('Assigning Shiprocket courier', { shipmentId });
  const data = await shiprocketRequest<any>('/courier/assign/awb', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: shipmentId }),
  });

  return {
    awbCode: pickStringValue(data, ['response.data.awb_code', 'data.awb_code', 'awb_code', 'response.awb_code']),
    courierName:
      pickStringValue(data, [
        'response.data.courier_name',
        'response.data.courier_company_name',
        'response.data.courier_company',
        'data.courier_name',
        'courier_name',
      ]) || undefined,
  };
}

export async function generateShippingLabel(shipmentId: string): Promise<LabelResult> {
  debugLog('Generating Shiprocket shipping label', { shipmentId });
  const data = await shiprocketRequest<any>('/courier/generate/label', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });

  const labelUrl = pickStringValue(data, [
    'label_url',
    'response.label_url',
    'response.data.label_url',
    'data.label_url',
    'pdf_url',
    'response.pdf_url',
  ]);

  return {
    labelUrl: labelUrl || undefined,
  };
}

export async function generatePickup(shipmentId: string) {
  debugLog('Generating Shiprocket pickup', { shipmentId });
  const data = await shiprocketRequest<any>('/courier/generate/pickup', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
  return data;
}

export async function trackShipmentByAwb(awb: string): Promise<TrackingResult> {
  debugLog('Tracking Shiprocket shipment', { awbMasked: awb ? `${String(awb).slice(0, 3)}***` : '' });
  const data = await shiprocketRequest<any>(`/courier/track/awb/${encodeURIComponent(awb)}`, {
    method: 'GET',
  });

  const trackingData = data?.tracking_data || data?.data || data?.response?.tracking_data || data?.response?.data || {};
  const firstShipment = Array.isArray(trackingData?.shipment_track)
    ? trackingData.shipment_track[0]
    : trackingData?.shipment_track || {};

  return {
    trackingUrl: pickStringValue(trackingData, ['track_url', 'tracking_url', 'response.track_url', 'response.tracking_url']) || undefined,
    deliveryStatus:
      pickStringValue(firstShipment, ['current_status', 'shipment_status', 'status']) ||
      pickStringValue(trackingData, ['shipment_status', 'current_status', 'status']) ||
      undefined,
    estimatedDelivery:
      pickStringValue(firstShipment, ['edd', 'estimated_delivery_date']) ||
      pickStringValue(trackingData, ['etd', 'estimated_delivery_date', 'edd']) ||
      undefined,
  };
}

export async function createReturnShipment(order: IOrder): Promise<ReturnResult> {
  if (!order.shipment_id) {
    throw new Error('Cannot create return pickup without shipment_id');
  }

  debugLog('Creating Shiprocket return shipment', {
    orderId: String(order._id),
    shipmentId: order.shipment_id,
  });

  const data = await shiprocketRequest<any>('/orders/create/return', {
    method: 'POST',
    body: JSON.stringify({
      order_id: String(order._id),
      shipment_id: order.shipment_id,
      channel_id: '',
      comment: 'Return pickup requested from admin panel',
    }),
  });

  const returnShipmentId = pickStringValue(data, ['shipment_id', 'data.shipment_id', 'response.shipment_id']) || undefined;
  const returnAwbCode = pickStringValue(data, ['awb_code', 'return_awb_code', 'data.awb_code', 'response.awb_code']) || undefined;

  return {
    returnShipmentId,
    returnAwbCode,
    returnTrackingUrl: pickStringValue(data, ['tracking_url', 'track_url', 'data.tracking_url', 'response.tracking_url']) || undefined,
    returnStatus: pickStringValue(data, ['status', 'return_status', 'data.status']) || 'return_requested',
  };
}

export async function getShiprocketDiagnostics() {
  const config = getRuntimeShiprocketConfig();
  const envs = {
    SHIPROCKET_EMAIL: config.emailInspection,
    SHIPROCKET_PASSWORD: config.passwordInspection,
    SHIPROCKET_PICKUP_PINCODE: config.pickupPincodeInspection,
    SHIPROCKET_PICKUP_LOCATION: config.pickupLocationInspection,
  };

  let authOk = false;
  let authError: string | null = null;
  let tokenExpiry: string | null = null;

  try {
    // Try to authenticate (will reuse cached token when valid)
    await authenticateShiprocket(false);
    authOk = !!cachedToken;
    tokenExpiry = cachedTokenExpiry ? new Date(cachedTokenExpiry).toISOString() : null;
  } catch (err: any) {
    authError = err?.message || String(err);
  }

  let serviceabilityOk = false;
  let serviceabilityError: string | null = null;
  try {
    if (config.pickupPincode && isValidPincode(config.pickupPincode)) {
      const probe = await checkPincodeServiceability({
        deliveryPincode: config.pickupPincode,
        cod: false,
        weightKg: 0.5,
      });
      serviceabilityOk = !!probe.serviceable;
      serviceabilityError = probe.serviceable ? null : probe.message;
    } else {
      serviceabilityError = 'SHIPROCKET_PICKUP_PINCODE is missing or invalid';
    }
  } catch (err: any) {
    serviceabilityError = err?.message || String(err);
  }

  // Attempt a lightweight connectivity/ping using serviceability (safe read-only call)
  let pingOk = false;
  let pingMessage: string | null = null;
  try {
    const pickup = config.pickupPincode;
    if (!pickup) {
      pingOk = false;
      pingMessage = 'SHIPROCKET_PICKUP_PINCODE not configured';
    } else {
      const q = new URLSearchParams({
        pickup_postcode: pickup,
        delivery_postcode: pickup,
        cod: '0',
        weight: '0.5',
      });
      // Use a single attempt for ping to keep diagnostics quick
      await shiprocketRequest<any>(`/courier/serviceability/?${q.toString()}`, { method: 'GET' }, 1);
      pingOk = true;
      pingMessage = 'Serviceability ping succeeded';
    }
  } catch (err: any) {
    pingOk = false;
    pingMessage = err?.message || String(err);
  }

  let concurrencyTest: { ok: boolean; total?: number; failures?: number; skipped?: boolean; message?: string } | null = null;
  if (['1', 'true', 'yes', 'on'].includes(String(process.env.SHIPROCKET_RUN_CONCURRENCY_TEST || '').toLowerCase())) {
    try {
      concurrencyTest = await simulateShiprocketConcurrentApiCalls();
    } catch (err: any) {
      concurrencyTest = {
        ok: false,
        message: err?.message || String(err),
      };
    }
  } else {
    concurrencyTest = {
      ok: false,
      skipped: true,
      message: 'Set SHIPROCKET_RUN_CONCURRENCY_TEST=true to run the 5-request concurrency test',
    };
  }

  return {
    debugEnabled: SHIPROCKET_DEBUG_ENABLED,
    envs,
    auth: {
      ok: authOk,
      error: authError,
      tokenExpiry,
      lastAttemptAt: lastAuthAttemptAt,
      lastSuccessAt: lastAuthSuccessAt,
      lastStatus: lastAuthStatus,
      lastError: lastAuthError,
      lastEndpoint: lastAuthEndpoint,
      lastResponseBody: lastAuthResponseBody,
    },
    serviceability: {
      ok: serviceabilityOk,
      error: serviceabilityError,
      pingOk,
      pingMessage,
    },
    concurrencyTest,
  };
}
