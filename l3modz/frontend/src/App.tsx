import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from "react-hot-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { CartProvider } from '@/hooks/useCart';

import Home from "./pages/Home";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import ProductDetails from "./pages/ProductDetails";
import Products from "./pages/Products";
import Profile from "./pages/Profile";
import AboutUs from "./pages/AboutUs";
import ContactUs from "./pages/ContactUs";
import OurDealers from "./pages/OurDealers";
import AdminLogin from "./pages/AdminLogin";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";
import Register from "./pages/Register";

function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAdminSession() {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch('/api/admin/session', {
          credentials: 'include',
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!cancelled) {
          setIsAllowed(res.ok);
        }
      } catch {
        if (!cancelled) setIsAllowed(false);
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) setIsChecking(false);
      }
    }

    checkAdminSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isChecking) {
    return <div className="py-20 text-center">Authorizing admin access...</div>;
  }

  if (!isAllowed) {
    return <Navigate to="/admin/login" replace />;
  }

  return <>{children}</>;
}

function ProtectedUserRoute({ children }: { children: ReactNode }) {
  const [isChecking, setIsChecking] = useState(true);
  const [isAllowed, setIsAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkUserSession() {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 8000);

      try {
        const res = await fetch('/api/auth/session', {
          credentials: 'include',
          signal: controller.signal,
          cache: 'no-store',
        });
        if (!cancelled) {
          setIsAllowed(res.ok);
        }
      } catch {
        if (!cancelled) setIsAllowed(false);
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) setIsChecking(false);
      }
    }

    checkUserSession();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isChecking) {
    return <div className="py-20 text-center">Checking your account session...</div>;
  }

  if (!isAllowed) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppShell() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  return (
    <div className="min-h-screen flex flex-col antialiased bg-brand-bg text-brand-text">
      {!isAdminRoute && <Header />}
      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/profile" element={<ProtectedUserRoute><Profile /></ProtectedUserRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/dealers" element={<OurDealers />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminPanel />
              </ProtectedAdminRoute>
            }
          />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <WhatsAppFloat />}
      <Toaster position="top-center" />
    </div>
  );
}

function App() {
  return (
    <CartProvider>
      <Router>
        <AppShell />
      </Router>
    </CartProvider>
  )
}

export default App;
