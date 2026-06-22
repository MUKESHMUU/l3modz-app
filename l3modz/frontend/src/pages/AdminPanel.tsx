import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageSearch, ShoppingBag, Users, IndianRupee, LogOut, RefreshCw, Save, Trash2, Plus, Pencil, XCircle, Eye, Truck, ClipboardList, Package, ShieldCheck, ShieldAlert, Activity } from 'lucide-react';
import Button from '@/components/Button';
import ProductTitle from '@/components/ProductTitle';
import { apiFetch } from '@/lib/api';
import type { ReactNode } from 'react';

type AdminTab = 'dashboard' | 'categories' | 'products' | 'orders' | 'users';
const DELIVERY_PARTNERS = ['Shiprocket', 'India Post', 'Other'] as const;

interface Product {
  _id: string;
  title: string;
  slug: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  stock?: number;
  images?: string[];
  categoryId?: string | { _id?: string; name?: string; slug?: string };
  description?: string;
  features?: string[];
  specs?: {
    sku?: string;
    material?: string;
    installation?: string;
  };
  compatibility?: {
    brand?: string;
    model?: string;
    year?: string;
  }[];
  rating?: number;
  numReviews?: number;
  createdAt?: string;
  updatedAt?: string;
}

interface Order {
  _id: string;
  orderItems?: {
    product: string;
    name: string;
    quantity: number;
    image: string;
    price: number;
  }[];
  guestInfo?: { name?: string; email?: string; phone?: string };
  shippingAddress?: {
    addressLine1?: string;
    addressLine2?: string;
    landmark?: string;
    locality?: string;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  courier_name?: string;
  deliveryPartner?: 'Shiprocket' | 'India Post' | 'Other';
  shipment_id?: string;
  shiprocket_order_id?: string;
  AWB_number?: string;
  tracking_url?: string;
  delivery_status?: string;
  estimated_delivery?: string;
  shipping_label_url?: string;
  shiprocketLastSyncAt?: string;
  shiprocketSyncAttempts?: number;
  shiprocketSyncError?: string;
  shiprocketShipmentCreatedAt?: string;
  shiprocketShipmentUpdatedAt?: string;
  shippingNotificationSentAt?: string;
  shiprocketTrackingHistory?: {
    at: string;
    status: string;
    message?: string;
    trackingUrl?: string;
    awb?: string;
    shipmentId?: string;
    source?: string;
  }[];
  return_shipment_status?: string;
  return_tracking_url?: string;
  paymentMethod?: 'Razorpay' | 'COD';
  paymentResult?: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    status?: string;
  };
  isPaid?: boolean;
  paidAt?: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  user?: { name?: string; email?: string };
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
  createdAt?: string;
  addresses?: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  }[];
}

interface HomeCategory {
  _id?: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
}

interface ShiprocketEnvInspection {
  rawPresent: boolean;
  normalizedPresent: boolean;
  rawLength: number;
  normalizedLength: number;
  trimmed: boolean;
  hasControlWhitespace: boolean;
}

interface ShiprocketDiagnostics {
  debugEnabled?: boolean;
  envs?: {
    SHIPROCKET_EMAIL?: ShiprocketEnvInspection;
    SHIPROCKET_PASSWORD?: ShiprocketEnvInspection;
    SHIPROCKET_PICKUP_PINCODE?: ShiprocketEnvInspection;
    SHIPROCKET_PICKUP_LOCATION?: ShiprocketEnvInspection;
  };
  auth?: {
    ok?: boolean;
    error?: string | null;
    tokenExpiry?: string | null;
    lastAttemptAt?: string | null;
    lastSuccessAt?: string | null;
    lastStatus?: number | null;
    lastError?: string | null;
    lastEndpoint?: string | null;
    lastResponseBody?: string | null;
  };
  serviceability?: {
    ok?: boolean;
    error?: string | null;
    pingOk?: boolean;
    pingMessage?: string | null;
  };
}

// DEFAULT_HOME_CATEGORY_CARDS removed — categories are loaded from API at runtime

interface NewProductForm {
  title: string;
  slug: string;
  price: number;
  originalPrice: number;
  category: string;
  bikeBrand: string;
  bikeModel: string;
  bikeYear: string;
  description: string;
  features: string;
  sku: string;
  material: string;
  installation: string;
  rating: number;
  numReviews: number;
  inStock: boolean;
  stock: number;
}

interface ProductEditorDraft {
  title: string;
  slug: string;
  price: number;
  originalPrice: number;
  imagesText: string;
  category: string;
  description: string;
  featuresText: string;
  sku: string;
  material: string;
  installation: string;
  compatibilityText: string;
  rating: number;
  numReviews: number;
  inStock: boolean;
  stock: number;
}

interface CategoryOption {
  _id: string;
  name: string;
  slug: string;
}

export default function AdminPanelPage() {
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [editingProductId, setEditingProductId] = useState('');
  const [message, setMessage] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productModalMode, setProductModalMode] = useState<'view' | 'edit' | null>(null);
  const [productDraft, setProductDraft] = useState<ProductEditorDraft | null>(null);
  const [savingProductDetails, setSavingProductDetails] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [shippingActionLoading, setShippingActionLoading] = useState(false);
  const [deliveryPartnerDraft, setDeliveryPartnerDraft] = useState<'Shiprocket' | 'India Post' | 'Other'>('Shiprocket');
  const [customCourierDraft, setCustomCourierDraft] = useState('');
  const [awbDraft, setAwbDraft] = useState('');
  const [trackingUrlDraft, setTrackingUrlDraft] = useState('');
  const [availableCategories, setAvailableCategories] = useState<CategoryOption[]>([]);
  const [adminCategories, setAdminCategories] = useState<CategoryOption[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categoriesError, setCategoriesError] = useState('');

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [productStockFilter, setProductStockFilter] = useState<'all' | 'in' | 'out'>('all');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');

  const [newProduct, setNewProduct] = useState<NewProductForm>({
    title: '',
    slug: '',
    price: 0,
    originalPrice: 0,
    category: '',
    bikeBrand: '',
    bikeModel: '',
    bikeYear: 'All',
    description: '',
    features: '',
    sku: '',
    material: '',
    installation: '',
    rating: 0,
    numReviews: 0,
    inStock: true,
    stock: 0,
  });
  const [newProductImages, setNewProductImages] = useState<string[]>(['/file.svg']);
  const [uploadingImageIndex, setUploadingImageIndex] = useState<number | null>(null);
  const [categoryCards, setCategoryCards] = useState<HomeCategory[]>([]);
  const [categorySavingId, setCategorySavingId] = useState('');
  const [categoryUploadingIndex, setCategoryUploadingIndex] = useState<number | null>(null);
  const [shiprocketDiagnostics, setShiprocketDiagnostics] = useState<ShiprocketDiagnostics | null>(null);
  const [shiprocketDiagnosticsLoading, setShiprocketDiagnosticsLoading] = useState(false);

  const navigate = useNavigate();

  const fetchAdminData = async () => {
    setLoading(true);
    setMessage('');

    try {
      const [sessionRes, productsRes, ordersRes, usersRes, categoriesRes, diagnosticsRes] = await Promise.all([
        apiFetch('/api/admin/session', { credentials: 'include' }),
        apiFetch('/api/products', { credentials: 'include' }),
        apiFetch('/api/admin/orders', { credentials: 'include' }),
        apiFetch('/api/admin/users', { credentials: 'include' }),
        apiFetch('/api/categories', { credentials: 'include' }),
        apiFetch('/api/admin/diagnostics', { credentials: 'include' }),
      ]);

      if (!sessionRes.ok) {
        navigate('/admin/login', { replace: true });
        return;
      }

      const sessionData = await sessionRes.json();
      setCurrentAdminId(String(sessionData?.user?.id || ''));

      if (!ordersRes.ok || !usersRes.ok) {
        throw new Error('You are not authorized to access admin resources.');
      }

      const [productsData, ordersData, usersData, categoriesData] = await Promise.all([
        productsRes.json(),
        ordersRes.json(),
        usersRes.json(),
        categoriesRes.ok ? categoriesRes.json() : Promise.resolve([]),
      ]);

      if (diagnosticsRes.ok) {
        const diagnosticsData = await diagnosticsRes.json();
        setShiprocketDiagnostics(diagnosticsData?.shiprocket || null);
      } else {
        setShiprocketDiagnostics(null);
      }

      setProducts(Array.isArray(productsData) ? productsData : []);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      const cats = Array.isArray(categoriesData) ? categoriesData : [];
      setAvailableCategories(cats);
      setAdminCategories(cats);
      setCategoryCards(
        Array.isArray(categoriesData)
          ? categoriesData.map((item: HomeCategory) => ({
              _id: item._id,
              name: item.name || '',
              slug: item.slug || '',
              image: item.image || '',
              description: item.description || '',
            }))
          : []
      );
    } catch (err: any) {
      setMessage(err.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  // Separate small helper to refresh admin categories (used after create/update/delete)
  const fetchAdminCategories = async () => {
    try {
      const res = await fetch('/api/categories', { credentials: 'include' });
      const data = await res.json();
      setAdminCategories(Array.isArray(data) ? data : (data.data ?? []));
    } catch {
      setAdminCategories([]);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchAdminCategories();
  }, []);

  const stats = useMemo(() => {
    const revenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const completedOrders = orders.filter((o) => (o.status || 'Pending') === 'Delivered').length;
    const pendingOrders = orders.filter((o) => (o.status || 'Pending') === 'Pending').length;
    const shippedOrders = orders.filter((o) => (o.status || 'Pending') === 'Shipped').length;
    const confirmedOrders = orders.filter((o) => (o.status || 'Pending') === 'Confirmed').length;
    const activeProducts = products.filter((p) => p.inStock).length;
    return {
      revenue,
      orders: orders.length,
      completedOrders,
      pendingOrders,
      shippedOrders,
      confirmedOrders,
      products: products.length,
      activeProducts,
      outOfStockProducts: products.length - activeProducts,
      users: users.length,
      adminUsers: users.filter((u) => u.role === 'admin').length,
    };
  }, [orders, products, users]);

  const recentOrders = useMemo(() => orders.slice(0, 5), [orders]);
  const recentProducts = useMemo(() => products.slice(0, 5), [products]);

  const logout = async () => {
    await apiFetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    navigate('/admin/login', { replace: true });
  };

  const refreshShiprocketDiagnostics = async () => {
    setShiprocketDiagnosticsLoading(true);
    try {
      const res = await apiFetch('/api/admin/diagnostics', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Failed to load diagnostics');
      }
      const data = await res.json();
      setShiprocketDiagnostics(data?.shiprocket || null);
    } catch (err: any) {
      setMessage(err.message || 'Failed to refresh diagnostics');
    } finally {
      setShiprocketDiagnosticsLoading(false);
    }
  };

  const createProduct = async () => {
    setMessage('');

    const title = newProduct.title.trim();
    const slug = (newProduct.slug.trim() || slugify(newProduct.title)).trim();
    const description = newProduct.description.trim();
    const bikeBrand = newProduct.bikeBrand.trim();
    const bikeModel = newProduct.bikeModel.trim();
    const bikeYear = newProduct.bikeYear.trim() || 'All';

    const cleanedImages = newProductImages.map((img) => img.trim()).filter(Boolean);

    if (!newProduct.category) {
      setMessage('Category is required.');
      return;
    }

    const selectedCategory = adminCategories.find((cat) => cat._id === newProduct.category);
    if (!selectedCategory) {
      setMessage('Selected category is invalid. Please choose a valid category.');
      return;
    }

    if (!title || !slug || !description || newProduct.price <= 0 || !bikeBrand || !bikeModel) {
      setMessage('Title, slug, positive price, description, bike brand, and bike model are required.');
      return;
    }

    try {
      const selectedCategory = adminCategories.find((cat) => cat._id === newProduct.category);
      const payload = {
        title,
        slug,
        price: Number(newProduct.price),
        originalPrice: Number(newProduct.originalPrice) > 0 ? Number(newProduct.originalPrice) : Number(newProduct.price),
        images: cleanedImages.length > 0 ? cleanedImages : ['/file.svg'],
        categoryId: selectedCategory?._id,
        description,
        features: newProduct.features
          .split(',')
          .map((f) => f.trim())
          .filter(Boolean),
        specs: {
          sku: newProduct.sku.trim() || `SKU-${Date.now()}`,
          material: newProduct.material.trim() || 'Steel',
          installation: newProduct.installation.trim() || 'Bolt-on',
        },
        compatibility: [
          {
            brand: bikeBrand,
            model: bikeModel,
            year: bikeYear,
          },
        ],
        rating: Math.max(0, Math.min(5, Number(newProduct.rating) || 0)),
        numReviews: Math.max(0, Number(newProduct.numReviews) || 0),
        inStock: newProduct.inStock,
        stock: Math.max(0, Number(newProduct.stock) || 0),
      };

      const res = await apiFetch('/api/products', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create product');

      setProducts((prev) => [data, ...prev]);
      setNewProduct({
        title: '',
        slug: '',
        price: 0,
        originalPrice: 0,
        category: '',
        bikeBrand: '',
        bikeModel: '',
        bikeYear: 'All',
        description: '',
        features: '',
        sku: '',
        material: '',
        installation: '',
        rating: 0,
        numReviews: 0,
        inStock: true,
        stock: 0,
      });
      setNewProductImages(['/file.svg']);
      setMessage('Product created successfully.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to create product');
    }
  };

  const saveProduct = async (product: Product) => {
    setSavingId(product._id);
    setMessage('');

    try {
      const res = await apiFetch(`/api/products/${product._id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: product.title,
          price: Number(product.price),
          inStock: product.inStock,
          stock: Math.max(0, Number(product.stock) || 0),
          images: (product.images || []).map((img) => img.trim()).filter(Boolean),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update product');
      
      // Update the local products list with the returned data
      setProducts((prev) => prev.map((p) => (p._id === product._id ? data : p)));
      
      setMessage('Product updated successfully.');
      setEditingProductId('');
    } catch (err: any) {
      setMessage(err.message || 'Failed to update product');
    } finally {
      setSavingId('');
    }
  };

  const startEditProduct = (id: string) => {
    setEditingProductId(id);
    setMessage('');
  };

  const cancelEditProduct = async (id: string) => {
    setSavingId(id);
    setMessage('');
    try {
      const res = await apiFetch(`/api/products/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to reload product');
      const fresh = await res.json();
      setProducts((prev) => prev.map((p) => (p._id === id ? fresh : p)));
      setEditingProductId('');
    } catch {
      setMessage('Could not cancel edit right now. Try refresh.');
    } finally {
      setSavingId('');
    }
  };

  const deleteProduct = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    setSavingId(id);
    setMessage('');

    try {
      const res = await apiFetch(`/api/products/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete product');

      setProducts((prev) => prev.filter((p) => p._id !== id));
      setMessage('Product deleted.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to delete product');
    } finally {
      setSavingId('');
    }
  };

  const updateOrderStatus = async (
    orderId: string,
    status: string,
    shippingDetails?: {
      deliveryPartner?: 'Shiprocket' | 'India Post' | 'Other';
      courierName?: string;
      awbNumber?: string;
      trackingUrl?: string;
    }
  ) => {
    setSavingId(orderId);
    setMessage('');

    const previousOrder = orders.find((order) => order._id === orderId);
    const optimisticUpdate = {
      status,
      ...(shippingDetails?.deliveryPartner ? { deliveryPartner: shippingDetails.deliveryPartner } : {}),
      ...(typeof shippingDetails?.courierName === 'string' ? { courier_name: shippingDetails.courierName } : {}),
      ...(typeof shippingDetails?.awbNumber === 'string' ? { AWB_number: shippingDetails.awbNumber } : {}),
      ...(typeof shippingDetails?.trackingUrl === 'string' ? { tracking_url: shippingDetails.trackingUrl } : {}),
    };

    if (previousOrder) {
      setOrders((prev) => prev.map((order) => (order._id === orderId ? { ...order, ...optimisticUpdate } : order)));
      if (selectedOrder?._id === orderId) {
        setSelectedOrder({ ...previousOrder, ...optimisticUpdate });
      }
    }

    try {
      const res = await apiFetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          deliveryPartner: shippingDetails?.deliveryPartner,
          courierName: shippingDetails?.courierName,
          awbNumber: shippingDetails?.awbNumber,
          trackingUrl: shippingDetails?.trackingUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update order');

      setOrders((prev) => prev.map((o) => (o._id === orderId ? data : o)));
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(data);
      }
      setMessage('Order status updated.');
    } catch (err: any) {
      if (previousOrder) {
        setOrders((prev) => prev.map((order) => (order._id === orderId ? previousOrder : order)));
        if (selectedOrder?._id === orderId) {
          setSelectedOrder(previousOrder);
        }
      }
      setMessage(err.message || 'Failed to update order');
    } finally {
      setSavingId('');
    }
  };

  const updateOrderPartner = async (
    orderId: string,
    deliveryPartner: 'Shiprocket' | 'India Post' | 'Other',
    courierName?: string
  ) => {
    setSavingId(orderId);
    setMessage('');

    const previousOrder = orders.find((order) => order._id === orderId);
    const optimisticUpdate = {
      deliveryPartner,
      ...(deliveryPartner === 'Other'
        ? { courier_name: (courierName || previousOrder?.courier_name || '').trim() }
        : {}),
    };

    if (previousOrder) {
      setOrders((prev) => prev.map((order) => (order._id === orderId ? { ...order, ...optimisticUpdate } : order)));
      if (selectedOrder?._id === orderId) {
        setSelectedOrder({ ...previousOrder, ...optimisticUpdate });
      }
    }

    try {
      const res = await apiFetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryPartner,
          courierName: deliveryPartner === 'Other' ? (courierName || '').trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update courier partner');

      setOrders((prev) => prev.map((order) => (order._id === orderId ? data : order)));
      if (selectedOrder?._id === orderId) {
        setSelectedOrder(data);
      }
      setMessage('Courier partner updated.');
    } catch (err: any) {
      if (previousOrder) {
        setOrders((prev) => prev.map((order) => (order._id === orderId ? previousOrder : order)));
        if (selectedOrder?._id === orderId) {
          setSelectedOrder(previousOrder);
        }
      }
      console.error('Partner update failed:', err);
      setMessage(err.message || 'Failed to update courier partner');
    } finally {
      setSavingId('');
    }
  };

  const updateUserRole = async (userId: string, role: 'user' | 'admin') => {
    setSavingId(userId);
    setMessage('');

    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update user role');

      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role } : u)));
      setMessage('User role updated.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to update user role');
    } finally {
      setSavingId('');
    }
  };

  const statusOptions = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

  const updateNewImageAt = (index: number, value: string) => {
    setNewProductImages((prev) => prev.map((img, i) => (i === index ? value : img)));
  };

  const addNewImageField = () => {
    setNewProductImages((prev) => [...prev, '']);
  };

  const addCategoryCard = () => {
    setCategoryCards((prev) => [
      ...prev,
      { name: '', slug: '', image: '', description: '' },
    ]);
  };

  const updateCategoryCard = (index: number, updates: Partial<HomeCategory>) => {
    setCategoryCards((prev) => prev.map((item, idx) => (idx === index ? { ...item, ...updates } : item)));
  };

  const removeCategoryCard = async (index: number) => {
    const target = categoryCards[index];
    if (!target) return;

    if (!target._id) {
      setCategoryCards((prev) => prev.filter((_, idx) => idx !== index));
      return;
    }

    if (!window.confirm('Delete this shop category card?')) return;
    setCategorySavingId(target._id);
    setMessage('');

    try {
      const res = await fetch(`/api/categories/${target._id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete category');
      setCategoryCards((prev) => prev.filter((_, idx) => idx !== index));
      setMessage('Category card deleted.');
      fetchAdminCategories();
    } catch (err: any) {
      setMessage(err.message || 'Failed to delete category');
    } finally {
      setCategorySavingId('');
    }
  };

  const createDefaultCategoryCards = async () => {
    if (categoryCards.length > 0) {
      setMessage('Category cards already exist. You can edit them directly.');
      return;
    }

    setCategorySavingId('seed-default-categories');
    setMessage('');

    try {
      const responses = await Promise.all(
        categoryCards.map((card) =>
          apiFetch('/api/categories', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: card.name, image: card.image, description: card.description }),
          })
        )
      );

      const failed = responses.find((res) => !res.ok);
      if (failed) {
        const data = await failed.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create default category cards');
      }

      const created = await Promise.all(responses.map((res) => res.json()));
      setCategoryCards(created);
      setMessage('Default category cards created. You can now edit names and images.');
      fetchAdminCategories();
    } catch (err: any) {
      setMessage(err.message || 'Failed to create default category cards');
    } finally {
      setCategorySavingId('');
    }
  };

  const saveCategoryCard = async (index: number) => {
    const item = categoryCards[index];
    if (!item) return;

    const name = item.name.trim();
    const image = (item.image || '').trim();
    const description = (item.description || '').trim();

    if (!name) {
      setMessage('Category name is required.');
      return;
    }

    setCategorySavingId(item._id || `new-${index}`);
    setMessage('');

    try {
      const isEdit = !!item._id;
      const res = await apiFetch(isEdit ? `/api/categories/${item._id}` : '/api/categories', {
        method: isEdit ? 'PUT' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, image, description }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save category');

      setCategoryCards((prev) => prev.map((card, idx) => (idx === index ? data : card)));
      setMessage('Category card saved successfully.');
      fetchAdminCategories();
    } catch (err: any) {
      setMessage(err.message || 'Failed to save category');
    } finally {
      setCategorySavingId('');
    }
  };

  const uploadCategoryImage = async (index: number, file: File | null) => {
    if (!file) return;
    setCategoryUploadingIndex(index);
    setMessage('');

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await apiFetch('/api/admin/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Category image upload failed');

      updateCategoryCard(index, { image: data.url });
      setMessage('Category image uploaded to Cloudinary. Save card to publish.');
    } catch (err: any) {
      setMessage(err.message || 'Category image upload failed');
    } finally {
      setCategoryUploadingIndex(null);
    }
  };

  const removeNewImageField = (index: number) => {
    setNewProductImages((prev) => {
      if (prev.length === 1) return [''];
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadImageAtIndex = async (index: number, file: File | null) => {
    if (!file) return;
    setMessage('');
    setUploadingImageIndex(index);

    try {
      const form = new FormData();
      form.append('file', file);

      const res = await apiFetch('/api/admin/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Image upload failed');

      updateNewImageAt(index, data.url);
      setMessage('Image uploaded to Cloudinary and URL added.');
    } catch (err: any) {
      setMessage(err.message || 'Image upload failed');
    } finally {
      setUploadingImageIndex(null);
    }
  };

  const categoryOptions = useMemo(() => {
    return ['all', ...availableCategories.map((cat) => cat.slug)];
  }, [availableCategories]);

  const openProductDetails = async (id: string, mode: 'view' | 'edit') => {
    setMessage('');
    try {
      const res = await fetch(`/api/products/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load product details');
      const data = await res.json();
      setSelectedProduct(data);
      setProductModalMode(mode);
      if (mode === 'edit') {
        setProductDraft(buildProductDraft(data));
        
        // Fetch categories when entering edit mode
        setLoadingCategories(true);
        setCategoriesError('');
        try {
          const categoriesRes = await fetch('/api/categories', { credentials: 'include' });
          if (!categoriesRes.ok) throw new Error('Failed to fetch categories');
          const categoriesData = await categoriesRes.json();
          setAvailableCategories(Array.isArray(categoriesData) ? categoriesData : []);
        } catch (err: any) {
          setCategoriesError('Failed to load categories. Please try again.');
          console.error('Category fetch error:', err);
        } finally {
          setLoadingCategories(false);
        }
      } else {
        setProductDraft(null);
        setAvailableCategories([]);
        setCategoriesError('');
      }
    } catch (err: any) {
      setMessage(err.message || 'Failed to open product details');
    }
  };

  const closeProductDetails = () => {
    setSelectedProduct(null);
    setProductModalMode(null);
    setProductDraft(null);
    setSavingProductDetails(false);
    setAvailableCategories([]);
    setCategoriesError('');
  };

  const saveDetailedProduct = async () => {
    if (!selectedProduct || !productDraft) return;
    setSavingProductDetails(true);
    setMessage('');

    try {
      const categoryId = adminCategories.find((cat) => cat._id === productDraft.category)?._id;
      if (!categoryId) {
        throw new Error('Selected category is invalid. Please choose a valid category.');
      }
      const payload = buildProductPayload(productDraft, categoryId);
      
      const res = await apiFetch(`/api/products/${selectedProduct._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update product');
      }

      // Update products list
      setProducts((prev) => prev.map((p) => (p._id === selectedProduct._id ? data : p)));
      
      // Update selected product with fresh data
      setSelectedProduct(data);
      
      // Clear productDraft to force fresh state
      setProductDraft(null);
      
      // Set mode to view - this will show the updated selectedProduct data
      setProductModalMode('view');
      setEditingProductId('');
      
      setMessage('Product updated successfully.');
    } catch (err: any) {
      console.error('[Save Product Details] Error:', err);
      setMessage(err.message || 'Failed to update product');
    } finally {
      setSavingProductDetails(false);
    }
  };

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setDeliveryPartnerDraft(order.deliveryPartner || 'Shiprocket');
    setCustomCourierDraft(order.deliveryPartner === 'Other' ? (order.courier_name || '') : '');
    setAwbDraft(order.AWB_number || '');
    setTrackingUrlDraft(order.tracking_url || '');
    setMessage('');
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
    setDeliveryPartnerDraft('Shiprocket');
    setCustomCourierDraft('');
    setAwbDraft('');
    setTrackingUrlDraft('');
  };

  useEffect(() => {
    if (!selectedOrder) return;
    const freshOrder = orders.find((order) => order._id === selectedOrder._id);
    if (freshOrder && freshOrder !== selectedOrder) {
      setSelectedOrder(freshOrder);
      setDeliveryPartnerDraft(freshOrder.deliveryPartner || 'Shiprocket');
      setCustomCourierDraft(freshOrder.deliveryPartner === 'Other' ? (freshOrder.courier_name || '') : '');
      setAwbDraft(freshOrder.AWB_number || '');
      setTrackingUrlDraft(freshOrder.tracking_url || '');
    }
  }, [orders, selectedOrder]);

  const indiaPostMissingAwb = (deliveryPartnerDraft === 'India Post' || deliveryPartnerDraft === 'Other') && !awbDraft.trim();
  const customCourierMissing = deliveryPartnerDraft === 'Other' && !customCourierDraft.trim();

  const shipOrderWithPartner = async (order: Order) => {
    const trimmedAwb = awbDraft.trim();
    const trimmedTracking = trackingUrlDraft.trim();
    const trimmedCustomCourier = customCourierDraft.trim();

    if ((deliveryPartnerDraft === 'India Post' || deliveryPartnerDraft === 'Other') && !trimmedAwb) {
      setMessage('Tracking/AWB number is required before marking as shipped.');
      return;
    }

    if (deliveryPartnerDraft === 'Other' && !trimmedCustomCourier) {
      setMessage('Please enter the custom courier partner name.');
      return;
    }

    let courierName = 'Shiprocket';
    if (deliveryPartnerDraft === 'India Post') {
      courierName = 'India Post';
    } else if (deliveryPartnerDraft === 'Other') {
      courierName = trimmedCustomCourier;
    } else {
      courierName = order.courier_name || 'Shiprocket';
    }

    await updateOrderStatus(order._id, 'Shipped', {
      deliveryPartner: deliveryPartnerDraft,
      courierName,
      awbNumber: trimmedAwb,
      trackingUrl: trimmedTracking,
    });
  };

  const refreshOrderTracking = async (orderId: string) => {
    setShippingActionLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/tracking`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to refresh tracking');

      setOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
      setSelectedOrder(data.order);
      setMessage('Tracking refreshed successfully.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to refresh tracking');
    } finally {
      setShippingActionLoading(false);
    }
  };

  const createReturnPickupForOrder = async (orderId: string) => {
    setShippingActionLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/return-pickup`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create return pickup');

      setOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
      setSelectedOrder(data.order);
      setMessage('Return pickup created successfully.');
    } catch (err: any) {
      setMessage(err.message || 'Failed to create return pickup');
    } finally {
      setShippingActionLoading(false);
    }
  };

  const retryShiprocketShipment = async (orderId: string) => {
    setShippingActionLoading(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/retry-shipment`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to retry shipment');

      setOrders((prev) => prev.map((o) => (o._id === orderId ? data.order : o)));
      setSelectedOrder(data.order);
      setMessage(data.ok ? 'Shipment retried successfully.' : (data.message || 'Shipment retry attempted.'));
    } catch (err: any) {
      setMessage(err.message || 'Failed to retry shipment');
    } finally {
      setShippingActionLoading(false);
    }
  };

  const openUserDetails = (user: User) => {
    setSelectedUser(user);
    setMessage('');
  };

  const closeUserDetails = () => {
    setSelectedUser(null);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = productSearch.trim().toLowerCase();
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q);
      const matchesStock = productStockFilter === 'all' || (productStockFilter === 'in' ? p.inStock : !p.inStock);
      const productSlug =
        typeof p.categoryId === 'string'
          ? p.categoryId
          : p.categoryId?.slug || '';
      const matchesCategory = productCategoryFilter === 'all' || productSlug.toLowerCase() === productCategoryFilter.toLowerCase();
      return matchesSearch && matchesStock && matchesCategory;
    });
  }, [products, productSearch, productStockFilter, productCategoryFilter]);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = orderSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        o._id.toLowerCase().includes(q) ||
        o._id.slice(-8).toLowerCase().includes(q) ||
        (o.user?.name || '').toLowerCase().includes(q) ||
        (o.user?.email || '').toLowerCase().includes(q) ||
        (o.guestInfo?.name || '').toLowerCase().includes(q) ||
        (o.guestInfo?.email || '').toLowerCase().includes(q) ||
        (o.guestInfo?.phone || '').includes(q);
      const matchesStatus = orderStatusFilter === 'all' || (o.status || 'Pending') === orderStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = userSearch.trim().toLowerCase();
      const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, userSearch, userRoleFilter]);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Admin Management</h1>
          <p className="text-sm text-gray-500">Authorization-protected panel for products, orders, and users.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAdminData}>
            <RefreshCw size={16} className="mr-2" /> Refresh
          </Button>
          <Button variant="danger" onClick={logout}>
            <LogOut size={16} className="mr-2" /> Logout
          </Button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Revenue" value={`₹${stats.revenue.toLocaleString('en-IN')}`} icon={<IndianRupee size={18} />} />
        <StatCard label="Orders" value={String(stats.orders)} icon={<ShoppingBag size={18} />} />
        <StatCard label="Products" value={String(stats.products)} icon={<PackageSearch size={18} />} />
        <StatCard label="Users" value={String(stats.users)} icon={<Users size={18} />} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>Dashboard</TabButton>
        <TabButton active={tab === 'categories'} onClick={() => setTab('categories')}>Categories</TabButton>
        <TabButton active={tab === 'products'} onClick={() => setTab('products')}>Products</TabButton>
        <TabButton active={tab === 'orders'} onClick={() => setTab('orders')}>Orders</TabButton>
        <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Users</TabButton>
      </div>

      {message && <p className="mb-4 rounded-xl border border-brand-border bg-white px-4 py-3 text-sm text-gray-700">{message}</p>}

      {loading ? (
        <div className="rounded-2xl border border-brand-border bg-white p-10 text-center">Loading admin data...</div>
      ) : (
        <>
          {tab === 'dashboard' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-border bg-white p-6">
                <h2 className="text-lg font-semibold">Management Summary</h2>
                <p className="mt-2 text-sm text-gray-600">Use Products to edit stock/pricing, Orders to update fulfillment status, and Users to monitor registered accounts.</p>
              </div>

              <div className="rounded-2xl border border-brand-border bg-white p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold">Shiprocket Diagnostics</h2>
                    <p className="mt-1 text-sm text-gray-600">Runtime auth and serviceability health from the backend. No secrets are shown.</p>
                  </div>
                  <Button variant="outline" onClick={refreshShiprocketDiagnostics} disabled={shiprocketDiagnosticsLoading}>
                    <RefreshCw size={16} className={shiprocketDiagnosticsLoading ? 'mr-2 animate-spin' : 'mr-2'} /> Refresh
                  </Button>
                </div>

                {shiprocketDiagnostics ? (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-brand-border bg-brand-bg/40 p-4">
                      <div className="flex items-center gap-2">
                        {shiprocketDiagnostics.auth?.ok ? (
                          <ShieldCheck size={18} className="text-green-600" />
                        ) : (
                          <ShieldAlert size={18} className="text-red-600" />
                        )}
                        <h3 className="font-semibold text-brand-text">Authentication</h3>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-gray-700">
                        <div className="flex justify-between gap-4"><span>Status</span><span className="font-semibold">{shiprocketDiagnostics.auth?.ok ? 'OK' : 'Failed'}</span></div>
                        <div className="flex justify-between gap-4"><span>Last attempt</span><span className="font-semibold">{shiprocketDiagnostics.auth?.lastAttemptAt ? new Date(shiprocketDiagnostics.auth.lastAttemptAt).toLocaleString() : 'N/A'}</span></div>
                        <div className="flex justify-between gap-4"><span>Last success</span><span className="font-semibold">{shiprocketDiagnostics.auth?.lastSuccessAt ? new Date(shiprocketDiagnostics.auth.lastSuccessAt).toLocaleString() : 'N/A'}</span></div>
                        <div className="flex justify-between gap-4"><span>HTTP status</span><span className="font-semibold">{shiprocketDiagnostics.auth?.lastStatus ?? 'N/A'}</span></div>
                        <div className="flex justify-between gap-4"><span>Token expiry</span><span className="font-semibold">{shiprocketDiagnostics.auth?.tokenExpiry ? new Date(shiprocketDiagnostics.auth.tokenExpiry).toLocaleString() : 'N/A'}</span></div>
                        <p className="rounded-lg bg-white/80 p-3 text-xs text-gray-600">{shiprocketDiagnostics.auth?.error || shiprocketDiagnostics.auth?.lastError || 'No auth error reported.'}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-brand-border bg-brand-bg/40 p-4">
                      <div className="flex items-center gap-2">
                        <Activity size={18} className={shiprocketDiagnostics.serviceability?.pingOk ? 'text-green-600' : 'text-amber-600'} />
                        <h3 className="font-semibold text-brand-text">Connectivity</h3>
                      </div>
                      <div className="mt-3 space-y-2 text-sm text-gray-700">
                        <div className="flex justify-between gap-4"><span>Serviceability probe</span><span className="font-semibold">{shiprocketDiagnostics.serviceability?.ok ? 'OK' : 'Failed'}</span></div>
                        <div className="flex justify-between gap-4"><span>Ping</span><span className="font-semibold">{shiprocketDiagnostics.serviceability?.pingOk ? 'OK' : 'Failed'}</span></div>
                        <p className="rounded-lg bg-white/80 p-3 text-xs text-gray-600">{shiprocketDiagnostics.serviceability?.error || shiprocketDiagnostics.serviceability?.pingMessage || 'No connectivity issues reported.'}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-brand-border bg-brand-bg/40 p-4 lg:col-span-2">
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} className="text-brand-primary" />
                        <h3 className="font-semibold text-brand-text">Environment Inspection</h3>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {(['SHIPROCKET_EMAIL', 'SHIPROCKET_PASSWORD', 'SHIPROCKET_PICKUP_PINCODE', 'SHIPROCKET_PICKUP_LOCATION'] as const).map((key) => {
                          const item = shiprocketDiagnostics.envs?.[key];
                          return (
                            <div key={key} className="rounded-lg border border-white bg-white p-3 text-sm">
                              <div className="flex items-center justify-between gap-3">
                                <span className="font-semibold text-brand-text">{key}</span>
                                <span className={`text-xs font-semibold ${item?.normalizedPresent ? 'text-green-600' : 'text-red-600'}`}>
                                  {item?.normalizedPresent ? 'Present' : 'Missing'}
                                </span>
                              </div>
                              <div className="mt-2 space-y-1 text-xs text-gray-600">
                                <div>Raw length: {item?.rawLength ?? 'N/A'}</div>
                                <div>Normalized length: {item?.normalizedLength ?? 'N/A'}</div>
                                <div>Trimmed: {item?.trimmed ? 'Yes' : 'No'}</div>
                                <div>Whitespace/newline: {item?.hasControlWhitespace ? 'Yes' : 'No'}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-3 text-xs text-gray-500">Debug mode: {shiprocketDiagnostics.debugEnabled ? 'Enabled' : 'Disabled'}.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-brand-border bg-brand-bg/30 p-4 text-sm text-gray-600">
                    Diagnostics are not loaded yet. Click Refresh to fetch the current Shiprocket auth and connectivity status.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusChip label="Delivered" value={stats.completedOrders} tone="green" />
                <StatusChip label="Confirmed" value={stats.confirmedOrders} tone="blue" />
                <StatusChip label="Pending" value={stats.pendingOrders} tone="amber" />
                <StatusChip label="Shipped" value={stats.shippedOrders} tone="cyan" />
                <StatusChip label="In Stock" value={stats.activeProducts} tone="green" />
                <StatusChip label="Out of Stock" value={stats.outOfStockProducts} tone="red" />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
                <StatCard label="Completed Orders" value={String(stats.completedOrders)} icon={<ClipboardList size={18} />} />
                <StatCard label="Pending Orders" value={String(stats.pendingOrders)} icon={<PackageSearch size={18} />} />
                <StatCard label="Shipped Orders" value={String(stats.shippedOrders)} icon={<Truck size={18} />} />
                <StatCard label="Active Products" value={String(stats.activeProducts)} icon={<Package size={18} />} />
                <StatCard label="Out of Stock" value={String(stats.outOfStockProducts)} icon={<PackageSearch size={18} />} />
                <StatCard label="Admins" value={String(stats.adminUsers)} icon={<Users size={18} />} />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-brand-border bg-white p-6">
                  <h3 className="font-semibold text-brand-text mb-3">Order Status Snapshot</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between"><span>Confirmed</span><span className="font-semibold">{stats.confirmedOrders}</span></div>
                    <div className="flex justify-between"><span>Delivered / Completed</span><span className="font-semibold">{stats.completedOrders}</span></div>
                    <div className="flex justify-between"><span>Pending</span><span className="font-semibold">{stats.pendingOrders}</span></div>
                    <div className="flex justify-between"><span>Shipped</span><span className="font-semibold">{stats.shippedOrders}</span></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-brand-border bg-white p-6">
                  <h3 className="font-semibold text-brand-text mb-3">Catalog Snapshot</h3>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex justify-between"><span>Total Products</span><span className="font-semibold">{stats.products}</span></div>
                    <div className="flex justify-between"><span>In Stock</span><span className="font-semibold">{stats.activeProducts}</span></div>
                    <div className="flex justify-between"><span>Out of Stock</span><span className="font-semibold">{stats.outOfStockProducts}</span></div>
                    <div className="flex justify-between"><span>Registered Users</span><span className="font-semibold">{stats.users}</span></div>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-brand-border bg-white p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-brand-text">Recent Orders</h3>
                    <button className="text-sm font-semibold text-brand-primary hover:underline" onClick={() => setTab('orders')}>View all</button>
                  </div>
                  <div className="space-y-3">
                    {recentOrders.length > 0 ? recentOrders.map((order) => (
                      <button key={order._id} onClick={() => openOrderDetails(order)} className="w-full rounded-xl border border-brand-border p-3 text-left transition hover:border-brand-primary hover:bg-brand-bg">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-brand-text">{order.user?.name || order.user?.email || 'Guest'} • {order._id.slice(-8)}</p>
                            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-brand-text">₹{(order.totalPrice || 0).toLocaleString('en-IN')}</p>
                            <p className="text-xs text-gray-500">{order.status || 'Pending'}</p>
                          </div>
                        </div>
                      </button>
                    )) : (
                      <p className="text-sm text-gray-500">No recent orders yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-brand-border bg-white p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-brand-text">Recent Products</h3>
                    <button className="text-sm font-semibold text-brand-primary hover:underline" onClick={() => setTab('products')}>View all</button>
                  </div>
                  <div className="space-y-3">
                    {recentProducts.length > 0 ? recentProducts.map((product) => (
                      <button key={product._id} onClick={() => openProductDetails(product._id, 'view')} className="w-full rounded-xl border border-brand-border p-3 text-left transition hover:border-brand-primary hover:bg-brand-bg">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <ProductTitle title={product.title} variant="table" showTooltip={true} className="block" />
                            <p className="text-xs text-gray-500 mt-1">{product.slug}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-brand-text">₹{Number(product.price || 0).toLocaleString('en-IN')}</p>
                            <p className="text-xs text-gray-500">{product.inStock ? 'In stock' : 'Out of stock'}</p>
                          </div>
                        </div>
                      </button>
                    )) : (
                      <p className="text-sm text-gray-500">No products found.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {(tab === 'products' || tab === 'categories') && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-border bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-semibold">Shop by Category Cards</h3>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={createDefaultCategoryCards}
                      disabled={categorySavingId === 'seed-default-categories' || categoryCards.length > 0}
                      className="text-xs font-semibold text-brand-primary hover:underline disabled:text-gray-400"
                    >
                      {categorySavingId === 'seed-default-categories' ? 'Creating defaults...' : 'Create Default Category Cards'}
                    </button>
                    <button
                      type="button"
                      onClick={addCategoryCard}
                      className="text-xs font-semibold text-brand-primary hover:underline"
                    >
                      + Add Category Card
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {categoryCards.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-brand-border p-4 text-sm text-gray-600">
                      <p>No category cards are stored yet.</p>
                      <p className="mt-1">Click Create Default Category Cards to load the existing home section cards and start editing names/images.</p>
                    </div>
                  ) : (
                    categoryCards.map((card, idx) => {
                      const savingKey = card._id || `new-${idx}`;
                      const isSaving = categorySavingId === savingKey;
                      return (
                        <div key={card._id || `new-card-${idx}`} className="rounded-xl border border-brand-border p-3">
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                            <input
                              placeholder="Name (e.g. Footrests)"
                              value={card.name || ''}
                              onChange={(e) => updateCategoryCard(idx, { name: e.target.value })}
                              className="rounded-lg border border-brand-border px-3 py-2"
                            />
                            <input
                              placeholder="Slug (e.g. footrest)"
                              value={card.slug || ''}
                              onChange={(e) => updateCategoryCard(idx, { slug: slugify(e.target.value) })}
                              className="rounded-lg border border-brand-border px-3 py-2"
                            />
                            <input
                              placeholder="Image URL"
                              value={card.image || ''}
                              onChange={(e) => updateCategoryCard(idx, { image: e.target.value })}
                              className="rounded-lg border border-brand-border px-3 py-2 md:col-span-2"
                            />
                            <textarea
                              placeholder="Description (optional)"
                              value={card.description || ''}
                              onChange={(e) => updateCategoryCard(idx, { description: e.target.value })}
                              rows={2}
                              className="rounded-lg border border-brand-border px-3 py-2 md:col-span-3"
                            />
                            <div className="flex items-center gap-2 md:col-span-1">
                              <label className="cursor-pointer rounded-lg border border-brand-border px-3 py-2 text-xs font-semibold text-brand-primary hover:bg-brand-bg">
                                {categoryUploadingIndex === idx ? 'Uploading...' : 'Upload Image'}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,image/webp"
                                  className="hidden"
                                  disabled={categoryUploadingIndex !== null}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    uploadCategoryImage(idx, file);
                                    e.currentTarget.value = '';
                                  }}
                                />
                              </label>
                              <Button size="sm" onClick={() => saveCategoryCard(idx)} disabled={isSaving}>
                                <Save size={14} className="mr-1" /> {isSaving ? 'Saving...' : 'Save'}
                              </Button>
                              <Button size="sm" variant="danger" onClick={() => removeCategoryCard(idx)} disabled={isSaving}>
                                <Trash2 size={14} className="mr-1" /> Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  These cards control Home page Shop by Category images and links. Image upload uses Cloudinary via admin upload API.
                </p>
              </div>

              <div className="rounded-2xl border border-brand-border bg-white p-4">
                <h3 className="mb-3 text-base font-semibold">Create Product</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                  <input
                    placeholder="Title"
                    value={newProduct.title}
                    onChange={(e) =>
                      setNewProduct((prev) => ({ ...prev, title: e.target.value, slug: prev.slug || slugify(e.target.value) }))
                    }
                    className="w-full rounded-lg border border-brand-border px-3 py-2 whitespace-normal overflow-auto"
                  />
                  <input
                    placeholder="Slug"
                    value={newProduct.slug}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, slug: slugify(e.target.value) }))}
                    className="w-full rounded-lg border border-brand-border px-3 py-2"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Selling Price"
                    value={newProduct.price === 0 ? '' : newProduct.price}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, price: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-brand-border px-3 py-2"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="MRP"
                    value={newProduct.originalPrice === 0 ? '' : newProduct.originalPrice}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, originalPrice: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-brand-border px-3 py-2"
                  />
                  <select
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-brand-border px-3 py-2"
                  >
                    <option value="">No category</option>
                    {adminCategories.map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                  <input
                    placeholder="Bike Brand (e.g. Bajaj)"
                    value={newProduct.bikeBrand}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, bikeBrand: e.target.value }))}
                    className="w-full rounded-lg border border-brand-border px-3 py-2"
                  />
                  <input
                    placeholder="Bike Model (e.g. Dominar 400)"
                    value={newProduct.bikeModel}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, bikeModel: e.target.value }))}
                    className="w-full rounded-lg border border-brand-border px-3 py-2"
                  />
                  <input
                    placeholder="Bike Year (e.g. 2023 or All)"
                    value={newProduct.bikeYear}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, bikeYear: e.target.value }))}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  />
                  <label className="inline-flex items-center gap-2 rounded-lg border border-brand-border px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={newProduct.inStock}
                      onChange={(e) => setNewProduct((prev) => ({ ...prev, inStock: e.target.checked }))}
                    />
                    In Stock
                  </label>
                  <input
                    placeholder="Rating (0 to 5)"
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={newProduct.rating === 0 ? '' : newProduct.rating}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  />
                  <input
                    placeholder="No. of Reviews"
                    type="number"
                    min={0}
                    value={newProduct.numReviews === 0 ? '' : newProduct.numReviews}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, numReviews: Number(e.target.value) }))}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  />
                  <input
                    placeholder="SKU (optional)"
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, sku: e.target.value }))}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  />
                  <input
                    placeholder="Material (optional)"
                    value={newProduct.material}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, material: e.target.value }))}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  />
                  <input
                    placeholder="Installation (optional)"
                    value={newProduct.installation}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, installation: e.target.value }))}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  />
                  <input
                    type="number"
                    min={0}
                    placeholder="Stock Quantity"
                    value={newProduct.stock === 0 ? '' : newProduct.stock}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, stock: Number(e.target.value) || 0 }))}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  />
                </div>

                <div className="mt-3 rounded-xl border border-brand-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-brand-text">Product Images</p>
                    <button
                      type="button"
                      onClick={addNewImageField}
                      className="text-xs font-semibold text-brand-primary hover:underline"
                    >
                      + Add image
                    </button>
                  </div>
                  <div className="space-y-2">
                    {newProductImages.map((img, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          placeholder={`Image URL ${idx + 1}`}
                          value={img}
                          onChange={(e) => updateNewImageAt(idx, e.target.value)}
                          className="w-full rounded-lg border border-brand-border px-3 py-2"
                        />
                        <label className="cursor-pointer rounded-lg border border-brand-border px-3 py-2 text-xs font-semibold text-brand-primary hover:bg-brand-bg">
                          {uploadingImageIndex === idx ? 'Uploading...' : 'Upload'}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            disabled={uploadingImageIndex !== null}
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              uploadImageAtIndex(idx, file);
                              e.currentTarget.value = '';
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeNewImageField(idx)}
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <textarea
                  placeholder="Description"
                  value={newProduct.description}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="mt-3 w-full rounded-lg border border-brand-border px-3 py-2"
                />
                <input
                  placeholder="Features (comma separated, e.g. Direct Fit, Powder Coated, Top Box Ready)"
                  value={newProduct.features}
                  onChange={(e) => setNewProduct((prev) => ({ ...prev, features: e.target.value }))}
                  className="mt-3 w-full rounded-lg border border-brand-border px-3 py-2"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Categories are loaded dynamically from the database and used throughout product creation, filtering, and editing.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Field guide: Selling Price = current sale price, MRP = strikethrough/original price, Rating = stars on product card/detail, No. of Reviews = review count shown near stars, SKU = internal product code.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Image plan: paste URL manually or use Upload to auto-send image to Cloudinary and fill URL.
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Recommended image size: 1600x1000 px (or 2400x1500 px) with 8:5 ratio for best product page fit and zoom clarity.
                </p>
                <div className="mt-3">
                  <Button onClick={createProduct}>
                    <Plus size={14} className="mr-1" /> Create Product
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-brand-border bg-white p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <input
                    placeholder="Search title or slug"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  />
                  <select
                    value={productStockFilter}
                    onChange={(e) => setProductStockFilter(e.target.value as 'all' | 'in' | 'out')}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  >
                    <option value="all">All Stock</option>
                    <option value="in">In Stock</option>
                    <option value="out">Out of Stock</option>
                  </select>
                  <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt === 'all' ? 'All Categories' : opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white">
                <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Selling Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Images</th>
                    <th className="px-4 py-3">In Stock</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => (
                    <tr key={p._id} className="border-t border-brand-border">
                      {(() => {
                        const isEditing = editingProductId === p._id;
                        const isSaving = savingId === p._id;
                        return (
                          <>
                      <td className="px-4 py-3">
                        <input
                          value={p.title}
                          onChange={(e) => setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, title: e.target.value } : x)))}
                          disabled={!isEditing}
                          title={p.title}
                          className="w-full rounded-lg border border-brand-border px-3 py-2"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={p.price}
                          onChange={(e) => setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, price: Number(e.target.value) } : x)))}
                          disabled={!isEditing}
                          className="w-32 rounded-lg border border-brand-border px-3 py-2"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          value={p.stock || 0}
                          onChange={(e) => setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, stock: Number(e.target.value) || 0 } : x)))}
                          disabled={!isEditing}
                          className="w-20 rounded-lg border border-brand-border px-3 py-2"
                        />
                      </td>
                      <td className="px-4 py-3 min-w-[260px]">
                        <textarea
                          value={(p.images || []).join('\n')}
                          disabled={!isEditing}
                          onChange={(e) => {
                            const nextImages = e.target.value
                              .split('\n')
                              .map((line) => line.trim())
                              .filter(Boolean);
                            setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, images: nextImages } : x)));
                          }}
                          rows={3}
                          placeholder="One image URL per line"
                          className="w-full rounded-lg border border-brand-border px-3 py-2 text-xs"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!p.inStock}
                            disabled={!isEditing}
                            onChange={(e) => setProducts((prev) => prev.map((x) => (x._id === p._id ? { ...x, inStock: e.target.checked } : x)))}
                          />
                          {p.inStock ? 'Yes' : 'No'}
                        </label>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openProductDetails(p._id, 'view')}>
                            <Eye size={14} className="mr-1" /> View
                          </Button>
                          {isEditing ? (
                            <>
                              <Button size="sm" onClick={() => saveProduct(p)} disabled={isSaving}>
                                <Save size={14} className="mr-1" /> Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => cancelEditProduct(p._id)} disabled={isSaving}>
                                <XCircle size={14} className="mr-1" /> Cancel
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => startEditProduct(p._id)}>
                              <Pencil size={14} className="mr-1" /> Edit
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => openProductDetails(p._id, 'edit')}>
                            <ClipboardList size={14} className="mr-1" /> Full Edit
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => deleteProduct(p._id)} disabled={isSaving}>
                            <Trash2 size={14} className="mr-1" /> Delete
                          </Button>
                        </div>
                      </td>
                          </>
                        );
                      })()}
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'orders' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-border bg-white p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    placeholder="Search by Order ID, email, or phone number"
                    value={orderSearch}
                    onChange={(e) => {
                      setOrderSearch(e.target.value);
                      const val = e.target.value.trim();
                      // MongoDB ObjectId is 24 hex characters
                      if (val.length === 24 && /^[a-f0-9]{24}$/i.test(val)) {
                        const match = orders.find((o) => o._id === val);
                        if (match) openOrderDetails(match);
                      }
                      // Also match on last-8 suffix shown in the table
                      if (val.length === 8) {
                        const match = orders.find((o) => o._id.slice(-8).toLowerCase() === val.toLowerCase());
                        if (match) openOrderDetails(match);
                      }
                    }}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  />
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  >
                    <option value="all">All Statuses</option>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {orderSearch.trim() && filteredOrders.length > 0 && (
                <p className="text-sm text-gray-600 px-1">
                  {filteredOrders.length} order{filteredOrders.length > 1 ? 's' : ''} found
                  {filteredOrders.length > 1 ? ' — showing full order history' : ''}
                </p>
              )}
              {orderSearch.trim() && filteredOrders.length === 0 && (
                <p className="text-sm text-red-500 px-1">
                  No orders found for this search.
                </p>
              )}

              <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white">
                <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Partner</th>
                    <th className="px-4 py-3">Partner / Courier / AWB</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o._id} className="border-t border-brand-border">
                      <td className="px-4 py-3 font-mono text-xs">{o._id.slice(-8)}</td>
                      <td className="px-4 py-3">{o.user?.name || o.user?.email || 'Guest'}</td>
                      <td className="px-4 py-3">₹{(o.totalPrice || 0).toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status || 'Pending'}
                          onChange={(e) => updateOrderStatus(o._id, e.target.value, { deliveryPartner: o.deliveryPartner })}
                          className="rounded-lg border border-brand-border px-3 py-2"
                          disabled={savingId === o._id}
                        >
                          {statusOptions.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={o.deliveryPartner || ''}
                          onChange={(e) => {
                            const nextPartner = e.target.value as 'Shiprocket' | 'India Post' | 'Other';
                            void updateOrderPartner(
                              o._id,
                              nextPartner,
                              nextPartner === 'Other' ? o.courier_name : undefined
                            );
                          }}
                          className="rounded-lg border border-brand-border px-3 py-2"
                          disabled={savingId === o._id}
                        >
                          <option value="" disabled>Select partner</option>
                          {DELIVERY_PARTNERS.map((partner) => (
                            <option key={partner} value={partner}>{partner}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <p className="font-semibold text-gray-700">{o.deliveryPartner || '-'}</p>
                        <p className="font-medium text-gray-700">{o.courier_name || '-'}</p>
                        <p className="font-mono text-gray-500">{o.AWB_number || '-'}</p>
                        {o.shiprocketSyncError && <p className="mt-1 text-[11px] font-semibold text-red-600">Sync failed</p>}
                      </td>
                      <td className="px-4 py-3">{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => openOrderDetails(o)}>
                          <Eye size={14} className="mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-brand-border bg-white p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <input
                    placeholder="Search name or email"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  />
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value as 'all' | 'admin' | 'user')}
                    className="rounded-lg border border-brand-border px-3 py-2"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admins</option>
                    <option value="user">Users</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-brand-border bg-white">
                <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="border-t border-brand-border">
                      <td className="px-4 py-3">{u.name}</td>
                      <td className="px-4 py-3">{u.email}</td>
                      <td className="px-4 py-3">{u.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          disabled={savingId === u._id || u._id === currentAdminId}
                          onChange={(e) => updateUserRole(u._id, e.target.value as 'user' | 'admin')}
                          className="rounded-lg border border-brand-border px-2 py-1.5 capitalize"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                        {u._id === currentAdminId && (
                          <p className="mt-1 text-xs text-gray-500">Current account</p>
                        )}
                      </td>
                      <td className="px-4 py-3">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3">
                        <Button size="sm" variant="outline" onClick={() => openUserDetails(u)}>
                          <Eye size={14} className="mr-1" /> View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedProduct && productModalMode && (
            <Modal onClose={closeProductDetails} title={productModalMode === 'edit' ? 'Edit Product Details' : 'Product Details'}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-brand-border bg-brand-bg p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-brand-primary mb-3">
                      <Package size={16} /> Core Info
                    </div>
                    {productModalMode === 'edit' && productDraft ? (
                      <div className="grid grid-cols-1 gap-3">
                        <input value={productDraft.title} onChange={(e) => setProductDraft({ ...productDraft, title: e.target.value })} className="w-full rounded-lg border border-brand-border px-3 py-2 text-base whitespace-normal overflow-auto" placeholder="Title" />
                        <input value={productDraft.slug} onChange={(e) => setProductDraft({ ...productDraft, slug: slugify(e.target.value) })} className="w-full rounded-lg border border-brand-border px-3 py-2" placeholder="Slug" />
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" min={0} value={productDraft.price} onChange={(e) => setProductDraft({ ...productDraft, price: Number(e.target.value) })} className="w-full rounded-lg border border-brand-border px-3 py-2" placeholder="Selling Price" />
                          <input type="number" min={0} value={productDraft.originalPrice} onChange={(e) => setProductDraft({ ...productDraft, originalPrice: Number(e.target.value) })} className="w-full rounded-lg border border-brand-border px-3 py-2" placeholder="MRP" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" min={0} max={5} step={0.1} value={productDraft.rating} onChange={(e) => setProductDraft({ ...productDraft, rating: Number(e.target.value) })} className="w-full rounded-lg border border-brand-border px-3 py-2" placeholder="Rating" />
                          <input type="number" min={0} value={productDraft.numReviews} onChange={(e) => setProductDraft({ ...productDraft, numReviews: Number(e.target.value) })} className="w-full rounded-lg border border-brand-border px-3 py-2" placeholder="No. of Reviews" />
                        </div>
                        <input type="number" min={0} value={productDraft.stock} onChange={(e) => setProductDraft({ ...productDraft, stock: Number(e.target.value) || 0 })} className="rounded-lg border border-brand-border px-3 py-2" placeholder="Stock Quantity" />
                        <label className="inline-flex items-center gap-2 rounded-lg border border-brand-border bg-white px-3 py-2 text-sm">
                          <input type="checkbox" checked={productDraft.inStock} onChange={(e) => setProductDraft({ ...productDraft, inStock: e.target.checked })} />
                          In Stock
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm text-gray-700">
                        <div><span className="font-semibold">Title:</span> <ProductTitle title={selectedProduct.title} variant="modal" showTooltip={true} className="ml-2 font-normal" /></div>
                        <p><span className="font-semibold">Slug:</span> {selectedProduct.slug}</p>
                        <p><span className="font-semibold">Selling Price:</span> ₹{selectedProduct.price.toLocaleString('en-IN')}</p>
                        <p><span className="font-semibold">MRP:</span> ₹{Number(selectedProduct.originalPrice || selectedProduct.price).toLocaleString('en-IN')}</p>
                        <p><span className="font-semibold">Stock Quantity:</span> {selectedProduct.stock || 0} units</p>
                        <p><span className="font-semibold">Status:</span> {selectedProduct.inStock ? 'In Stock' : 'Out of Stock'}</p>
                        <p><span className="font-semibold">Rating:</span> {selectedProduct.rating || 0} / 5</p>
                        <p><span className="font-semibold">Reviews:</span> {selectedProduct.numReviews || 0}</p>
                        <p><span className="font-semibold">Created:</span> {selectedProduct.createdAt ? new Date(selectedProduct.createdAt).toLocaleString() : '-'}</p>
                        <p><span className="font-semibold">Updated:</span> {selectedProduct.updatedAt ? new Date(selectedProduct.updatedAt).toLocaleString() : '-'}</p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-brand-border bg-white p-4">
                    <h4 className="mb-3 font-semibold text-brand-text">Description</h4>
                    {productModalMode === 'edit' && productDraft ? (
                      <textarea value={productDraft.description} onChange={(e) => setProductDraft({ ...productDraft, description: e.target.value })} rows={6} className="w-full rounded-lg border border-brand-border px-3 py-2" />
                    ) : (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{selectedProduct.description || '-'}</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-brand-border bg-white p-4">
                    <h4 className="mb-3 font-semibold text-brand-text">Images</h4>
                    {productModalMode === 'edit' && productDraft ? (
                      <textarea value={productDraft.imagesText} onChange={(e) => setProductDraft({ ...productDraft, imagesText: e.target.value })} rows={5} className="w-full rounded-lg border border-brand-border px-3 py-2 text-xs" placeholder="One image URL per line" />
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {(selectedProduct.images || []).map((img, idx) => (
                          <img key={idx} src={img} alt={selectedProduct.title} className="h-24 w-full rounded-xl object-cover border border-brand-border" />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-brand-border bg-white p-4">
                    <h4 className="mb-3 font-semibold text-brand-text">Catalog Details</h4>
                    {productModalMode === 'edit' && productDraft ? (
                      <div className="space-y-3">
                        {loadingCategories ? (
                          <div className="w-full rounded-lg border border-brand-border px-3 py-2 text-sm text-gray-500">
                            Loading categories...
                          </div>
                        ) : categoriesError ? (
                          <div className="w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
                            {categoriesError}
                          </div>
                        ) : (
                          <select value={productDraft.category} onChange={(e) => setProductDraft({ ...productDraft, category: e.target.value })} className="w-full rounded-lg border border-brand-border px-3 py-2">
                            <option value="">No category</option>
                            {adminCategories.map((cat) => (
                              <option key={cat._id} value={cat._id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        )}
                        <input value={productDraft.featuresText} onChange={(e) => setProductDraft({ ...productDraft, featuresText: e.target.value })} className="w-full rounded-lg border border-brand-border px-3 py-2" placeholder="Features (comma separated)" />
                        <input value={productDraft.sku} onChange={(e) => setProductDraft({ ...productDraft, sku: e.target.value })} className="w-full rounded-lg border border-brand-border px-3 py-2" placeholder="SKU" />
                        <input value={productDraft.material} onChange={(e) => setProductDraft({ ...productDraft, material: e.target.value })} className="w-full rounded-lg border border-brand-border px-3 py-2" placeholder="Material" />
                        <input value={productDraft.installation} onChange={(e) => setProductDraft({ ...productDraft, installation: e.target.value })} className="w-full rounded-lg border border-brand-border px-3 py-2" placeholder="Installation" />
                        <textarea value={productDraft.compatibilityText} onChange={(e) => setProductDraft({ ...productDraft, compatibilityText: e.target.value })} rows={6} className="w-full rounded-lg border border-brand-border px-3 py-2 text-xs" placeholder="Compatibility lines: Brand | Model | Year" />
                      </div>
                    ) : (
                      <div className="space-y-2 text-sm text-gray-700">
                        <p><span className="font-semibold">Category:</span> {typeof selectedProduct.categoryId === 'string' ? selectedProduct.categoryId : selectedProduct.categoryId?.name || selectedProduct.categoryId?.slug || '-'}</p>
                        <p><span className="font-semibold">Features:</span> {(selectedProduct.features || []).join(', ') || '-'}</p>
                        <p><span className="font-semibold">SKU:</span> {selectedProduct.specs?.sku || '-'}</p>
                        <p><span className="font-semibold">Material:</span> {selectedProduct.specs?.material || '-'}</p>
                        <p><span className="font-semibold">Installation:</span> {selectedProduct.specs?.installation || '-'}</p>
                        <div>
                          <p className="font-semibold mb-1">Compatibility:</p>
                          <div className="space-y-1 text-xs text-gray-600">
                            {(selectedProduct.compatibility || []).length > 0 ? selectedProduct.compatibility?.map((item, idx) => (
                              <p key={idx}>{item.brand} • {item.model} • {item.year}</p>
                            )) : <p>-</p>}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {productModalMode === 'edit' && productDraft && (
                    <div className="flex gap-3">
                      <Button onClick={saveDetailedProduct} disabled={savingProductDetails}>
                        <Save size={14} className="mr-1" /> {savingProductDetails ? 'Saving...' : 'Save Full Details'}
                      </Button>
                      <Button variant="outline" onClick={() => setProductModalMode('view')}>
                        <Eye size={14} className="mr-1" /> Back to View
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Modal>
          )}

          {selectedOrder && (
            <Modal onClose={closeOrderDetails} title={`Order Details • ${selectedOrder._id.slice(-8)}`}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-brand-border bg-white p-4">
                    <h4 className="mb-3 font-semibold text-brand-text">Order Summary</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p><span className="font-semibold">Order ID:</span> {selectedOrder._id}</p>
                      <p><span className="font-semibold">Status:</span> {selectedOrder.status}</p>
                      <p><span className="font-semibold">Payment:</span> {selectedOrder.paymentMethod || '-'}</p>
                      <p><span className="font-semibold">Paid:</span> {selectedOrder.isPaid ? 'Yes' : 'No'}</p>
                      <p><span className="font-semibold">Total:</span> ₹{(selectedOrder.totalPrice || 0).toLocaleString('en-IN')}</p>
                      <p><span className="font-semibold">Created:</span> {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                      <p><span className="font-semibold">Paid At:</span> {selectedOrder.paidAt ? new Date(selectedOrder.paidAt).toLocaleString() : '-'}</p>
                      <p><span className="font-semibold">Delivery Status:</span> {selectedOrder.delivery_status || '-'}</p>
                      <p><span className="font-semibold">Shiprocket Sync:</span> {selectedOrder.shiprocketSyncAttempts ? `${selectedOrder.shiprocketSyncAttempts} attempt(s)` : '0 attempts'}</p>
                      <p><span className="font-semibold">Sync Error:</span> {selectedOrder.shiprocketSyncError || '-'}</p>
                      <p><span className="font-semibold">Delivery Partner:</span> {deliveryPartnerDraft || selectedOrder.deliveryPartner || '-'}</p>
                      <p><span className="font-semibold">Courier:</span> {(deliveryPartnerDraft === 'Other' ? customCourierDraft : selectedOrder.courier_name) || selectedOrder.courier_name || '-'}</p>
                      <p><span className="font-semibold">AWB:</span> {selectedOrder.AWB_number || '-'}</p>
                      <p><span className="font-semibold">Estimated Delivery:</span> {selectedOrder.estimated_delivery ? new Date(selectedOrder.estimated_delivery).toLocaleDateString() : '-'}</p>
                    </div>
                    {selectedOrder.shiprocketTrackingHistory?.length ? (
                      <div className="mt-4 space-y-2 border-t border-brand-border pt-4 text-xs text-gray-600">
                        <p className="font-semibold text-gray-700">Recent Shipment Events</p>
                        {selectedOrder.shiprocketTrackingHistory.slice(-3).reverse().map((entry, index) => (
                          <div key={`${entry.at}-${index}`} className="rounded-lg bg-gray-50 p-2">
                            <p className="font-semibold text-gray-700">{entry.status}</p>
                            <p>{new Date(entry.at).toLocaleString()}</p>
                            {entry.message && <p>{entry.message}</p>}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-brand-border bg-white p-4">
                    <h4 className="mb-3 font-semibold text-brand-text">Customer Info</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p><span className="font-semibold">Name:</span> {selectedOrder.user?.name || selectedOrder.guestInfo?.name || 'Guest'}</p>
                      <p><span className="font-semibold">Email:</span> {selectedOrder.user?.email || selectedOrder.guestInfo?.email || '-'}</p>
                      <p><span className="font-semibold">Phone:</span> {selectedOrder.guestInfo?.phone || '-'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-brand-border bg-white p-4">
                    <h4 className="mb-3 font-semibold text-brand-text">Shipping Address</h4>
                    <div className="space-y-2 text-sm text-gray-700">
                      <p>{selectedOrder.shippingAddress?.addressLine1 || selectedOrder.shippingAddress?.street || '-'}</p>
                      <p>{selectedOrder.shippingAddress?.addressLine2 || '-'}</p>
                      <p><span className="font-semibold">Landmark:</span> {selectedOrder.shippingAddress?.landmark || '-'}</p>
                      <p><span className="font-semibold">Area / Locality:</span> {selectedOrder.shippingAddress?.locality || '-'}</p>
                      <p><span className="font-semibold">City:</span> {selectedOrder.shippingAddress?.city || '-'}</p>
                      <p><span className="font-semibold">State:</span> {selectedOrder.shippingAddress?.state || '-'}</p>
                      <p><span className="font-semibold">Pincode:</span> {selectedOrder.shippingAddress?.pincode || '-'}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-brand-border bg-white p-4">
                    <h4 className="mb-3 font-semibold text-brand-text">Items</h4>
                    <div className="space-y-3">
                      {(selectedOrder.orderItems || []).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-3 rounded-xl border border-brand-border p-3">
                          <img src={item.image} alt={item.name} className="h-14 w-14 rounded-lg object-cover border border-brand-border" />
                          <div className="min-w-0 flex-1 text-sm">
                            <p className="font-semibold text-brand-text line-clamp-1">{item.name}</p>
                            <p className="text-gray-600">Qty: {item.quantity} • ₹{item.price.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedOrder.paymentResult?.razorpay_order_id && (
                    <div className="rounded-2xl border border-brand-border bg-white p-4">
                      <h4 className="mb-3 font-semibold text-brand-text">Payment Gateway Details</h4>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p><span className="font-semibold">Razorpay Order ID:</span> {selectedOrder.paymentResult.razorpay_order_id}</p>
                        <p><span className="font-semibold">Razorpay Payment ID:</span> {selectedOrder.paymentResult.razorpay_payment_id || '-'}</p>
                        <p><span className="font-semibold">Gateway Status:</span> {selectedOrder.paymentResult.status || '-'}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-3">
                    <select
                      value={deliveryPartnerDraft || 'Shiprocket'}
                      onChange={(e) => {
                        const nextPartner = e.target.value as 'Shiprocket' | 'India Post' | 'Other';
                        setDeliveryPartnerDraft(nextPartner);
                        // When switching to Other, pre-fill with existing courier name or keep the draft
                        if (nextPartner === 'Other') {
                          setCustomCourierDraft(customCourierDraft || selectedOrder.courier_name || '');
                        } else {
                          setCustomCourierDraft('');
                        }
                        // Save the partner change immediately; courier name saves on "Mark As Shipped"
                        void updateOrderPartner(selectedOrder._id, nextPartner, undefined);
                      }}
                      className="rounded-lg border border-brand-border px-3 py-2"
                      disabled={shippingActionLoading}
                    >
                      <option value="Shiprocket">Shiprocket</option>
                      <option value="India Post">India Post</option>
                      <option value="Other">Other (Custom Courier)</option>
                    </select>
                    {deliveryPartnerDraft === 'Other' && (
                      <input
                        value={customCourierDraft}
                        onChange={(e) => setCustomCourierDraft(e.target.value)}
                        placeholder="Enter Courier Partner (e.g., DTDC, BlueDart)"
                        className="min-w-[220px] rounded-lg border border-brand-border px-3 py-2"
                        disabled={shippingActionLoading}
                      />
                    )}
                    {(deliveryPartnerDraft === 'India Post' || deliveryPartnerDraft === 'Other') && (
                      <input
                        value={awbDraft}
                        onChange={(e) => setAwbDraft(e.target.value)}
                        placeholder="Tracking / AWB Number"
                        className="min-w-[220px] rounded-lg border border-brand-border px-3 py-2"
                        disabled={shippingActionLoading}
                      />
                    )}
                    <input
                      value={trackingUrlDraft}
                      onChange={(e) => setTrackingUrlDraft(e.target.value)}
                      placeholder="Tracking URL (optional)"
                      className="min-w-[260px] rounded-lg border border-brand-border px-3 py-2"
                      disabled={shippingActionLoading}
                    />
                    <Button onClick={() => shipOrderWithPartner(selectedOrder)} disabled={shippingActionLoading || indiaPostMissingAwb || customCourierMissing}>
                      <Truck size={14} className="mr-1" /> Mark As Shipped
                    </Button>
                    <Button variant="outline" onClick={() => refreshOrderTracking(selectedOrder._id)} disabled={shippingActionLoading || deliveryPartnerDraft !== 'Shiprocket'}>
                      <RefreshCw size={14} className="mr-1" /> Refresh Tracking
                    </Button>
                    <Button variant="outline" onClick={() => retryShiprocketShipment(selectedOrder._id)} disabled={shippingActionLoading || deliveryPartnerDraft !== 'Shiprocket'}>
                      <RefreshCw size={14} className="mr-1" /> Retry Shipment
                    </Button>
                    <Button variant="outline" onClick={() => createReturnPickupForOrder(selectedOrder._id)} disabled={shippingActionLoading || deliveryPartnerDraft !== 'Shiprocket'}>
                      <Truck size={14} className="mr-1" /> Create Return Pickup
                    </Button>
                  </div>
                  {selectedOrder.shiprocketSyncError && (
                    <p className="mt-2 text-sm text-red-600">
                      Last Shiprocket error: {selectedOrder.shiprocketSyncError}
                    </p>
                  )}
                  {indiaPostMissingAwb && (
                    <p className="mt-2 text-sm text-amber-700">
                      India Post requires a tracking/AWB number before you can mark the order as shipped.
                    </p>
                  )}

                  {selectedOrder.return_shipment_status && (
                    <div className="rounded-2xl border border-brand-border bg-white p-4">
                      <h4 className="mb-3 font-semibold text-brand-text">Return Shipment</h4>
                      <div className="space-y-2 text-sm text-gray-700">
                        <p><span className="font-semibold">Status:</span> {selectedOrder.return_shipment_status}</p>
                        <p><span className="font-semibold">Tracking:</span> {selectedOrder.return_tracking_url || '-'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Modal>
          )}

          {selectedUser && (
            <Modal onClose={closeUserDetails} title={`User Details • ${selectedUser.name}`}>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-brand-border bg-white p-4 space-y-2 text-sm text-gray-700">
                  <h4 className="mb-3 font-semibold text-brand-text">Profile</h4>
                  <p><span className="font-semibold">Name:</span> {selectedUser.name}</p>
                  <p><span className="font-semibold">Email:</span> {selectedUser.email}</p>
                  <p><span className="font-semibold">Phone:</span> {selectedUser.phone || '-'}</p>
                  <p><span className="font-semibold">Role:</span> {selectedUser.role}</p>
                  <p><span className="font-semibold">Joined:</span> {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleString() : '-'}</p>
                </div>

                <div className="rounded-2xl border border-brand-border bg-white p-4">
                  <h4 className="mb-3 font-semibold text-brand-text">Saved Addresses</h4>
                  <div className="space-y-3">
                    {(selectedUser.addresses || []).length > 0 ? selectedUser.addresses?.map((addr, idx) => (
                      <div key={idx} className="rounded-xl border border-brand-border p-3 text-sm text-gray-700">
                        <p>{addr.street}</p>
                        <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                        <p className="text-xs text-gray-500 mt-1">{addr.isDefault ? 'Default address' : 'Saved address'}</p>
                      </div>
                    )) : (
                      <p className="text-sm text-gray-500">No saved addresses found.</p>
                    )}
                  </div>
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-brand-primary text-white' : 'border border-brand-border bg-white text-gray-700 hover:border-brand-primary'
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-2xl border border-brand-border bg-white p-4">
      <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-bg text-brand-primary">
        {icon}
      </div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-brand-text">{value}</p>
    </div>
  );
}

function StatusChip({ label, value, tone }: { label: string; value: number; tone: 'green' | 'blue' | 'amber' | 'cyan' | 'red' }) {
  const toneClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  }[tone];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses}`}>
      {label}
      <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px]">{value}</span>
    </span>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-10">
      <div className="w-full max-w-6xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
          <h3 className="text-lg font-bold text-brand-text">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-brand-text" aria-label="Close details">
            <XCircle size={20} />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function buildProductDraft(product: Product): ProductEditorDraft {
  const categorySlug =
    product.categoryId && typeof product.categoryId !== 'string'
      ? product.categoryId.slug
      : typeof product.categoryId === 'string'
      ? product.categoryId
      : '';

  return {
    title: product.title || '',
    slug: product.slug || '',
    price: Number(product.price) || 0,
    originalPrice: Number(product.originalPrice) || 0,
    imagesText: (product.images || []).join('\n'),
    category: categorySlug || '',
    description: product.description || '',
    featuresText: (product.features || []).join(', '),
    sku: product.specs?.sku || '',
    material: product.specs?.material || '',
    installation: product.specs?.installation || '',
    compatibilityText: (product.compatibility || [])
      .map((item) => `${item.brand || ''} | ${item.model || ''} | ${item.year || ''}`.trim())
      .filter(Boolean)
      .join('\n'),
    rating: Number(product.rating) || 0,
    numReviews: Number(product.numReviews) || 0,
    inStock: !!product.inStock,
    stock: Number(product.stock) || 0,
  };
}

function buildProductPayload(draft: ProductEditorDraft, categoryId?: string) {
  const images = draft.imagesText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const features = draft.featuresText
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const compatibility = draft.compatibilityText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [brand = '', model = '', year = ''] = line.split('|').map((part) => part.trim());
      return { brand, model, year };
    })
    .filter((item) => item.brand || item.model || item.year);

  return {
    title: draft.title.trim(),
    slug: draft.slug.trim(),
    price: Number(draft.price) || 0,
    originalPrice: Number(draft.originalPrice) > 0 ? Number(draft.originalPrice) : Number(draft.price) || 0,
    images: images.length > 0 ? images : ['/file.svg'],
    categoryId,
    description: draft.description.trim(),
    features,
    specs: {
      sku: draft.sku.trim(),
      material: draft.material.trim(),
      installation: draft.installation.trim(),
    },
    compatibility,
    rating: Math.max(0, Math.min(5, Number(draft.rating) || 0)),
    numReviews: Math.max(0, Number(draft.numReviews) || 0),
    inStock: draft.inStock,
    stock: Math.max(0, Number(draft.stock) || 0),
  };
}

function slugify(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
