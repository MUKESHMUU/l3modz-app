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
let lastAuthAttemptAt: string | null = null;
let lastAuthSuccessAt: string | null = null;
let lastAuthStatus: number | null = null;
let lastAuthError: string | null = null;
let lastAuthResponseBody: string | null = null;
let lastAuthEndpoint: string | null = null;

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
  return Math.min(1200, 250 * Math.pow(2, attempt));
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function authenticateShiprocket(force = false): Promise<string> {
  const authEndpoint = `${SHIPROCKET_BASE}/auth/login`;
  const config = validateRuntimeConfig();
  const now = Date.now();
  if (!force && cachedToken && cachedTokenExpiry > now) {
    debugLog('Reusing cached Shiprocket token', { expiresAt: new Date(cachedTokenExpiry).toISOString() });
    return cachedToken;
  }

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
      });

      const res = await fetch(authEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: config.email, password: config.password }),
        cache: 'no-store',
      });

      lastAuthStatus = res.status;

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
      return data.token;
    } catch (error: any) {
      const message = error?.message || String(error);
      lastAuthError = message;
      console.error('[Shiprocket] Auth exception', {
        endpoint: authEndpoint,
        attempt,
        message,
      });

      if (attempt < maxAttempts && /network|fetch|timeout|ECONN|ETIMEDOUT/i.test(message)) {
        await sleep(getRetryDelayMs(attempt));
        continue;
      }

      throw error instanceof Error ? error : new Error(message);
    }
  }

  throw new Error('Shiprocket authentication failed');
}

async function shiprocketRequest<T>(path: string, init: RequestInit = {}, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      debugLog('Shiprocket request start', { path, attempt: attempt + 1, attempts });
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
          status: res.status,
          responseBody: body,
          attempt: attempt + 1,
        });
        throw new Error(`Shiprocket ${path} failed (${res.status}): ${body || res.statusText}`);
      }

      debugLog('Shiprocket request succeeded', { path, attempt: attempt + 1 });
      return (await res.json()) as T;
    } catch (error) {
      lastError = error;
      console.error('[Shiprocket] Request exception', {
        path,
        attempt: attempt + 1,
        message: error instanceof Error ? error.message : String(error),
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

  debugLog('Shiprocket order created', {
    orderId: String(order._id),
    shiprocketOrderId: data?.order_id ? String(data.order_id) : undefined,
    shipmentId: data?.shipment_id ? String(data.shipment_id) : undefined,
  });

  return {
    shiprocketOrderId: data?.order_id ? String(data.order_id) : undefined,
    shipmentId: data?.shipment_id ? String(data.shipment_id) : undefined,
  };
}

export async function assignBestCourier(shipmentId: string): Promise<AssignAwbResult> {
  debugLog('Assigning Shiprocket courier', { shipmentId });
  const data = await shiprocketRequest<any>('/courier/assign/awb', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: shipmentId }),
  });

  return {
    awbCode: data?.response?.data?.awb_code || data?.awb_code,
    courierName:
      data?.response?.data?.courier_name ||
      data?.response?.data?.courier_company_name ||
      data?.courier_name,
  };
}

export async function generateShippingLabel(shipmentId: string): Promise<LabelResult> {
  debugLog('Generating Shiprocket shipping label', { shipmentId });
  const data = await shiprocketRequest<any>('/courier/generate/label', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });

  return {
    labelUrl:
      data?.label_url ||
      data?.response?.label_url ||
      data?.response?.label_created,
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

  const trackingData = data?.tracking_data || data?.data || {};
  const firstShipment = Array.isArray(trackingData?.shipment_track)
    ? trackingData.shipment_track[0]
    : trackingData?.shipment_track || {};

  return {
    trackingUrl: trackingData?.track_url || trackingData?.tracking_url,
    deliveryStatus:
      firstShipment?.current_status ||
      firstShipment?.shipment_status ||
      trackingData?.shipment_status,
    estimatedDelivery:
      firstShipment?.edd ||
      trackingData?.etd ||
      trackingData?.estimated_delivery_date,
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

  const returnShipmentId = data?.shipment_id ? String(data.shipment_id) : undefined;
  const returnAwbCode = data?.awb_code || data?.return_awb_code;

  return {
    returnShipmentId,
    returnAwbCode,
    returnTrackingUrl: data?.tracking_url,
    returnStatus: data?.status || 'return_requested',
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
  };
}
