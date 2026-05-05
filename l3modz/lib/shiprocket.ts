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

let cachedToken: string | null = null;
let cachedTokenExpiry = 0;

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
  const now = Date.now();
  if (!force && cachedToken && cachedTokenExpiry > now) {
    return cachedToken;
  }

  const email = getEnv('SHIPROCKET_EMAIL');
  const password = getEnv('SHIPROCKET_PASSWORD');

  const res = await fetch(`${SHIPROCKET_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Shiprocket auth failed: ${errorText || res.statusText}`);
  }

  const data = (await res.json()) as ShiprocketAuthResponse;
  if (!data?.token) {
    throw new Error('Shiprocket auth token missing in response');
  }

  cachedToken = data.token;
  cachedTokenExpiry = now + 8 * 60 * 1000;
  return data.token;
}

async function shiprocketRequest<T>(path: string, init: RequestInit = {}, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
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
        await authenticateShiprocket(true);
        await sleep(getRetryDelayMs(attempt));
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Shiprocket ${path} failed (${res.status}): ${body || res.statusText}`);
      }

      return (await res.json()) as T;
    } catch (error) {
      lastError = error;
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
  const pickupPincode = getEnv('SHIPROCKET_PICKUP_PINCODE');
  const query = new URLSearchParams({
    pickup_postcode: pickupPincode,
    delivery_postcode: params.deliveryPincode,
    cod: params.cod ? '1' : '0',
    weight: String(params.weightKg || 0.5),
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
}

export async function createShiprocketOrder(order: IOrder): Promise<CreateOrderResult> {
  const { name, email, phone } = getOrderCustomer(order);
  const { weightKg, lengthCm, breadthCm, heightCm } = getOrderPackage(order);

  const pickupLocation = getEnv('SHIPROCKET_PICKUP_LOCATION');

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
    billing_pincode: order.shippingAddress?.pincode || '',
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
    shipping_pincode: order.shippingAddress?.pincode || '',
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

  return {
    shiprocketOrderId: data?.order_id ? String(data.order_id) : undefined,
    shipmentId: data?.shipment_id ? String(data.shipment_id) : undefined,
  };
}

export async function assignBestCourier(shipmentId: string): Promise<AssignAwbResult> {
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
  const data = await shiprocketRequest<any>('/courier/generate/pickup', {
    method: 'POST',
    body: JSON.stringify({ shipment_id: [shipmentId] }),
  });
  return data;
}

export async function trackShipmentByAwb(awb: string): Promise<TrackingResult> {
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
