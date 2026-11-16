"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Layers,
  Boxes,
  ShoppingCart,
  ShoppingBag,
  Users,
  User,
  Truck,
  CreditCard,
  FileText,
  RotateCcw,
  Percent,
  Building2,
  Home,
  FileEdit,
  Compass,
  Image as ImageIcon,
  Languages,
  Bell,
  BarChart3,
  Shield,
  ShieldCheck,
  Activity,
  Search,
  Settings,
  DatabaseBackup,
  LogOut,
  Plus,
  Check,
  X,
  Menu,
  Download,
  MessageSquare,
  Palette,
  Edit3,
  Eye,
  EyeOff,
  Sparkles,
  Megaphone,
  Footprints,
  Shirt,
  ArrowRight,
  ArrowLeft,
  ArrowRightLeft,
  Clock,
  ChevronDown,
  CheckCircle2,
  Camera,
  Printer,
  Star,
  Trash2,
  Phone,
  Mail,
  MapPin,
  ArrowUpDown,
  MessageCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  Copy,
} from "lucide-react";
import { Language, formatCurrency } from "@/lib/i18n/dictionaries";
import { ThemeSwitcher } from "@/components/store/ThemeSwitcher";
import { matchesBilingualSearch, STANDARD_COLORS, isColorLight } from "@/lib/search";

function AnimatedCounter({
  value,
  isCurrency = false,
  lang = "en",
}: {
  value: number;
  isCurrency?: boolean;
  lang?: Language;
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    if (target === 0) {
      setDisplay(0);
      return;
    }
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(target);
      return;
    }
    let startTime: number | null = null;
    const duration = 550;
    let rafId: number;

    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(target * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        setDisplay(target);
      }
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [value]);

  return (
    <span className="tabular-nums">
      {isCurrency ? formatCurrency(display, lang) : display.toLocaleString()}
    </span>
  );
}

interface AdminPortalProps {
  initialAdmin: any;
  initialLang: Language;
  initialSection?: string;
}

function getOrderDeptType(o: any): "SHOES" | "CLOTHING" | "MIXED" {
  const items = o?.items || [];
  if (!Array.isArray(items) || items.length === 0) return "SHOES";
  let hasShoes = false;
  let hasClothing = false;
  for (const it of items) {
    const type = (it.product_type_snapshot || it.product_type || "").toUpperCase();
    if (type === "CLOTHING") {
      hasClothing = true;
    } else {
      hasShoes = true;
    }
  }
  if (hasShoes && hasClothing) return "MIXED";
  if (hasClothing) return "CLOTHING";
  return "SHOES";
}

export function AdminPortalClient({
  initialAdmin,
  initialLang,
  initialSection = "dashboard",
}: AdminPortalProps) {
  const router = useRouter();
  const [admin, setAdmin] = useState<any>(initialAdmin);
  const [lang, setLang] = useState<Language>(initialLang);
  const [activeSection, setActiveSection] = useState(initialSection === "categories" ? "products" : initialSection);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({
    catalog: true,
    sales: true,
    logistics: true,
    storefront: false,
    system: false,
  });

  // Admin Login Form State (Supports Username or Email + Password)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  // Loaded Data Buckets
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [catalogData, setCatalogData] = useState<any>(null);
  const [ordersData, setOrdersData] = useState<any>(null);
  const [paymentsData, setPaymentsData] = useState<any>(null);
  const [customersData, setCustomersData] = useState<any>(null);
  const [shippingData, setShippingData] = useState<any>(null);
  const [invoicesData, setInvoicesData] = useState<any>(null);
  const [returnsDiscountsData, setReturnsDiscountsData] = useState<any>(null);
  const [cmsData, setCmsData] = useState<any>(null);
  const [systemData, setSystemData] = useState<any>(null);
  const [reportsData, setReportsData] = useState<any>(null);
  const [whatsappData, setWhatsappData] = useState<any>(null);
  const [appearanceData, setAppearanceData] = useState<any>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Customer Account Inspection State (View Account & Orders / Operations)
  const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<any>(null);
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  const openCustomerDetails = async (userId?: string, guestId?: string) => {
    setLoadingCustomerDetails(true);
    try {
      const res = await fetch(
        `/api/admin?resource=customer_details&userId=${encodeURIComponent(userId || "")}&guestId=${encodeURIComponent(guestId || "")}`
      );
      const data = await res.json();
      if (res.ok && data.ok) {
        setSelectedCustomerDetails(data);
      } else {
        showNotification(data.error || `Error ${res.status}: Could not load customer details`, "error");
      }
    } catch (e: any) {
      showNotification(`Network error: ${e?.message || "Please check connection"}`, "error");
    } finally {
      setLoadingCustomerDetails(false);
    }
  };

  const toggleOrderExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editVariantId, setEditVariantId] = useState<string>("");
  const [editReason, setEditReason] = useState<string>("Customer requested size exchange before shipping");
  const [exchangingOrderId, setExchangingOrderId] = useState<string | null>(null);
  const [exchangeItemId, setExchangeItemId] = useState<string>("");
  const [exchangeVariantId, setExchangeVariantId] = useState<string>("");
  const [exchangeReason, setExchangeReason] = useState<string>("طلب استبدال المقاس/اللون من قبل العميل");
  const [testWaPhone, setTestWaPhone] = useState<string>("01012345678");
  const [myNewUsername, setMyNewUsername] = useState<string>("");
  const [myCurrentPassword, setMyCurrentPassword] = useState<string>("");
  const [myNewPassword, setMyNewPassword] = useState<string>("");
  const [showMyCurrentPassword, setShowMyCurrentPassword] = useState(false);
  const [showMyNewPassword, setShowMyNewPassword] = useState(false);
  const [showWaToken, setShowWaToken] = useState(false);

  const [globalQuery, setGlobalQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [toast, setToast] = useState<{ message: string; type?: "success" | "error" | "info" } | string | null>(null);
  const [whatsAppModal, setWhatsAppModal] = useState<{
    phone: string;
    url: string;
    messageText: string;
    orderNumber: string;
  } | null>(null);
  const [newOrderAlert, setNewOrderAlert] = useState<{
    id: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    paymentMethod: string;
    createdAt: string;
  } | null>(null);
  const initialOrdersLoadedRef = useRef(false);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const alertedOrderIdRef = useRef<string | null>(null);

  const [productSearchQuery, setProductSearchQuery] = useState("");

  // Forms State: New Product
  const [prodId, setProdId] = useState("");
  const [prodNameEn, setProdNameEn] = useState("");
  const [prodNameAr, setProdNameAr] = useState("");
  const [prodDescEn, setProdDescEn] = useState("");
  const [prodDescAr, setProdDescAr] = useState("");
  const [prodRegularPrice, setProdRegularPrice] = useState("");
  const [prodSalePrice, setProdSalePrice] = useState("");
  const [prodCategoryId, setProdCategoryId] = useState("");
  const [prodCollectionId, setProdCollectionId] = useState("");
  const [prodProductType, setProdProductType] = useState<"SHOES" | "CLOTHING">("SHOES");
  const [prodBrand, setProdBrand] = useState("U3");
  const [prodMaterialEn, setProdMaterialEn] = useState("");
  const [prodMaterialAr, setProdMaterialAr] = useState("");
  const [prodImageUrl, setProdImageUrl] = useState("");
  const [prodImages, setProdImages] = useState<string[]>([]);
  const [prodIsNew, setProdIsNew] = useState(true);
  const [prodIsFeatured, setProdIsFeatured] = useState(true);
  const [prodIsBestSeller, setProdIsBestSeller] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [ordersViewTab, setOrdersViewTab] = useState<
    "ALL" | "ACTIVE" | "UNDER_REVIEW" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED" | "EXCHANGED"
  >("ALL");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersDeptFilter, setOrdersDeptFilter] = useState<"ALL" | "SHOES" | "CLOTHING" | "MIXED">("ALL");
  const [ordersSortBy, setOrdersSortBy] = useState<"NEWEST" | "OLDEST" | "AMOUNT_DESC" | "AMOUNT_ASC">("NEWEST");
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventorySortBy, setInventorySortBy] = useState<"STOCK_DESC" | "STOCK_ASC" | "NAME" | "OUT_OF_STOCK">("STOCK_DESC");
  const [inventoryFilter, setInventoryFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK" | "IN_STOCK">("ALL");
  const [editingInventoryId, setEditingInventoryId] = useState<string | null>(null);
  const [editingInventoryValue, setEditingInventoryValue] = useState<number>(0);
  const [editingInventoryReason, setEditingInventoryReason] = useState<string>("Manual restock from inventory table");
  const [receiptModal, setReceiptModal] = useState<{ url: string; title?: string } | null>(null);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<"ALL" | "PAID" | "PENDING">("PAID");
  const [invoiceSearchQuery, setInvoiceSearchQuery] = useState("");
  const [invoiceMethodFilter, setInvoiceMethodFilter] = useState<"ALL" | "INSTAPAY" | "VODAFONE_CASH" | "CASH_ON_DELIVERY">("ALL");
  const [invoiceSortBy, setInvoiceSortBy] = useState<"NEWEST" | "OLDEST" | "AMOUNT_DESC" | "AMOUNT_ASC">("NEWEST");
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [copiedInvoiceId, setCopiedInvoiceId] = useState<string | null>(null);
  const [prodVariants, setProdVariants] = useState<
    Array<{ id?: string; sku: string; size: string; colorEn: string; colorAr: string; colorHex: string; onHand: number | string }>
  >([]);

  // Category Form
  const [catNameEn, setCatNameEn] = useState("");
  const [catNameAr, setCatNameAr] = useState("");

  // Collection Form
  const [colNameEn, setColNameEn] = useState("");
  const [colNameAr, setColNameAr] = useState("");
  const [colDescEn, setColDescEn] = useState("");
  const [colDescAr, setColDescAr] = useState("");
  const [colProductType, setColProductType] = useState<"SHOES" | "CLOTHING">("SHOES");
  const [colShowOnHomepage, setColShowOnHomepage] = useState(true);
  const [colHomepageSortOrder, setColHomepageSortOrder] = useState("0");
  const [editingColId, setEditingColId] = useState<string | null>(null);

  // Shipping City & Area Form
  const [newCityGovId, setNewCityGovId] = useState("gov-01");
  const [newCityNameEn, setNewCityNameEn] = useState("");
  const [newCityNameAr, setNewCityNameAr] = useState("");
  const [newCityRate, setNewCityRate] = useState("");

  const [newAreaCityId, setNewAreaCityId] = useState("");
  const [newAreaNameEn, setNewAreaNameEn] = useState("");
  const [newAreaNameAr, setNewAreaNameAr] = useState("");
  const [newAreaRate, setNewAreaRate] = useState("");

  // Coupon Form
  const [cpnCode, setCpnCode] = useState("");
  const [cpnType, setCpnType] = useState("PERCENTAGE");
  const [cpnValue, setCpnValue] = useState("");
  const [cpnMinSpend, setCpnMinSpend] = useState("");

  // Shipping Company Form
  const [scNameEn, setScNameEn] = useState("");
  const [scNameAr, setScNameAr] = useState("");
  const [scPhone, setScPhone] = useState("");
  const [scTrackingUrl, setScTrackingUrl] = useState("");

  // Translation Form
  const [trKey, setTrKey] = useState("");
  const [trEn, setTrEn] = useState("");
  const [trAr, setTrAr] = useState("");

  function showNotification(message: string, type: "success" | "error" | "info" = "success") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  const loadSectionData = useCallback(
    async (sec: string) => {
      if (!admin) return;
      if (sec === "dashboard") {
        const r = await fetch("/api/admin?resource=dashboard");
        const d = await r.json();
        if (d.ok) setDashboardData(d);
        fetch("/api/admin?resource=cms").then(res => res.json()).then(cmsRes => { if (cmsRes.ok) setCmsData(cmsRes); }).catch(() => {});
      } else if (["products", "categories", "collections", "inventory"].includes(sec)) {
        const r = await fetch("/api/admin?resource=catalog");
        const d = await r.json();
        if (d.ok) setCatalogData(d);
      } else if (sec === "orders") {
        const r = await fetch(
          `/api/admin?resource=orders&q=${encodeURIComponent(
            globalQuery
          )}&orderStatus=${orderStatusFilter}&paymentStatus=${paymentStatusFilter}`
        );
        const d = await r.json();
        if (d.ok) setOrdersData(d);
      } else if (sec === "payments") {
        const r = await fetch("/api/admin?resource=payments");
        const d = await r.json();
        if (d.ok) setPaymentsData(d);
      } else if (sec === "customers") {
        const r = await fetch("/api/admin?resource=customers");
        const d = await r.json();
        if (d.ok) setCustomersData(d);
      } else if (sec === "shipping") {
        const r = await fetch("/api/admin?resource=shipping");
        const d = await r.json();
        if (d.ok) setShippingData(d);
      } else if (sec === "invoices") {
        const r = await fetch("/api/admin?resource=invoices");
        const d = await r.json();
        if (d.ok) setInvoicesData(d);
      } else if (["returns", "discounts"].includes(sec)) {
        const r = await fetch("/api/admin?resource=returns_discounts");
        const d = await r.json();
        if (d.ok) setReturnsDiscountsData(d);
      } else if (
        [
          "homepage",
          "pages",
          "navigation",
          "media",
          "translations",
          "seo",
          "settings",
          "footer",
          "marquee",
          "sale-campaigns",
        ].includes(sec)
      ) {
        const r = await fetch("/api/admin?resource=cms");
        const d = await r.json();
        if (d.ok) setCmsData(d);
      } else if (["activity-logs", "notifications"].includes(sec)) {
        const r = await fetch("/api/admin?resource=system");
        const d = await r.json();
        if (d.ok) setSystemData(d);
      } else if (sec === "reports") {
        const r = await fetch("/api/admin?resource=reports");
        const d = await r.json();
        if (d.ok) setReportsData(d);
      } else if (sec === "whatsapp") {
        const r = await fetch("/api/admin?resource=whatsapp");
        const d = await r.json();
        if (d.ok) setWhatsappData(d);
      } else if (sec === "appearance") {
        const r = await fetch("/api/admin?resource=appearance");
        const d = await r.json();
        if (d.ok) setAppearanceData(d);
      }
    },
    [admin, globalQuery, orderStatusFilter, paymentStatusFilter]
  );

  useEffect(() => {
    loadSectionData(activeSection);
  }, [activeSection, loadSectionData]);

  // Audio tone generator for real-time new order chime
  const playNewOrderChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const playTone = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration);
      };
      playTone(659.25, 0, 0.25); // E5
      playTone(880.0, 0.15, 0.45); // A5
    } catch {
      // Audio autoplay policy fallback
    }
  }, []);

  // Real-time synchronization for orders & store settings across all devices
  useEffect(() => {
    if (!admin) return;

    const syncAdminState = async () => {
      let serverAckId = "";
      let serverAckList: string[] = [];

      // 1. Sync Store Visibility & Order Acknowledgment across all open devices (phone, laptop, desktop)
      try {
        const setRes = await fetch("/api/admin?resource=settings", { cache: "no-store" });
        const setData = await setRes.json();
        if (setData?.ok && setData.settings) {
          serverAckId = String(setData.settings.last_acknowledged_order_id || "");
          try {
            if (setData.settings.acknowledged_order_ids) {
              serverAckList = JSON.parse(setData.settings.acknowledged_order_ids);
            }
          } catch {}

          // Immediately dismiss alert if any other device acknowledged it
          if (serverAckId || serverAckList.length > 0) {
            setNewOrderAlert((currentAlert) => {
              if (currentAlert && (currentAlert.id === serverAckId || serverAckList.includes(currentAlert.id))) {
                if (typeof window !== "undefined") {
                  localStorage.setItem("u3_admin_last_seen_order_id", currentAlert.id);
                }
                return null;
              }
              return currentAlert;
            });
          }

          if (setData.settings.visible_categories) {
            setCmsData((prev: any) => {
              if (!prev) return prev;
              if (prev.settings?.visible_categories !== setData.settings.visible_categories) {
                return {
                  ...prev,
                  settings: {
                    ...prev.settings,
                    visible_categories: setData.settings.visible_categories,
                  },
                };
              }
              return prev;
            });
          }
        }
      } catch {
        // Silent recovery
      }

      // 2. Sync incoming orders across all open devices
      try {
        const res = await fetch("/api/admin?resource=orders", { cache: "no-store" });
        const data = await res.json();
        if (data?.ok && Array.isArray(data.orders)) {
          // A) If any device (Chrome, Mobile, etc.) acknowledged or accepted/confirmed the order,
          // IMMEDIATELY dismiss the notification banner on this device (Edge, other tabs, etc.)!
          setNewOrderAlert((currentAlert) => {
            if (!currentAlert) return null;
            // 1. Acknowledged in settings
            if (currentAlert.id === serverAckId || serverAckList.includes(currentAlert.id)) {
              if (typeof window !== "undefined") {
                localStorage.setItem("u3_admin_last_seen_order_id", currentAlert.id);
              }
              return null;
            }
            // 2. Order status or payment accepted in orders array
            const matchingOrder = data.orders.find((o: any) => o.id === currentAlert.id);
            if (matchingOrder) {
              const isAccepted =
                matchingOrder.payment_status === "PAID" ||
                !["PENDING_PAYMENT", "PAYMENT_UNDER_REVIEW"].includes(matchingOrder.order_status);
              if (isAccepted) {
                if (typeof window !== "undefined") {
                  localStorage.setItem("u3_admin_last_seen_order_id", currentAlert.id);
                }
                return null;
              }
            }
            return currentAlert;
          });

          // B) Check newest incoming order
          if (data.orders.length > 0) {
            const sorted = [...data.orders].sort(
              (a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
            );
            const latest = sorted[0];
            const lastSeenId = typeof window !== "undefined" ? localStorage.getItem("u3_admin_last_seen_order_id") : null;
            
            // Check if this latest order is already acknowledged or accepted/confirmed by another admin
            const isAlreadyAck = latest && (
              latest.id === serverAckId ||
              serverAckList.includes(latest.id) ||
              latest.payment_status === "PAID" ||
              !["PENDING_PAYMENT", "PAYMENT_UNDER_REVIEW"].includes(latest.order_status)
            );

            // Ring chime and show alert ONCE per order, only if it's genuinely new and not accepted
            if (latest && latest.id !== lastSeenId && latest.id !== alertedOrderIdRef.current) {
              alertedOrderIdRef.current = latest.id;
              if (typeof window !== "undefined") {
                localStorage.setItem("u3_admin_last_seen_order_id", latest.id);
              }

              if (!isAlreadyAck) {
                setNewOrderAlert({
                  id: latest.id,
                  orderNumber: latest.order_number,
                  customerName: latest.customer_name || (lang === "ar" ? "عميل جديد" : "New Customer"),
                  totalAmount: Number(latest.total_amount || 0),
                  paymentMethod:
                    latest.payment_method === "COD"
                      ? (lang === "ar" ? "الدفع عند الاستلام" : "Cash on Delivery")
                      : (latest.payment_method || "InstaPay"),
                  createdAt: latest.created_at,
                });

                playNewOrderChime();
              }
            } else if (latest && isAlreadyAck) {
              // Ensure alert is hidden if order was accepted elsewhere
              setNewOrderAlert((prev) => (prev && prev.id === latest.id ? null : prev));
            }

            setOrdersData(data);

            // Also refresh dashboard statistics
            const dashRes = await fetch("/api/admin?resource=dashboard");
            const dashData = await dashRes.json();
            if (dashData?.ok) setDashboardData(dashData);
          }
        }
      } catch {
        // Silent recovery
      }
    };

    // Cross-tab real-time listener on the same machine
    let bc: BroadcastChannel | null = null;
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key === "u3_last_order_sync") {
        syncAdminState();
      }
    };

    try {
      if (typeof window !== "undefined") {
        window.addEventListener("storage", handleStorageEvent);
        if ("BroadcastChannel" in window) {
          bc = new BroadcastChannel("u3_admin_sync");
          bc.onmessage = (event) => {
            if (event.data?.type === "order_created" || event.data?.type === "new_order") {
              syncAdminState();
            } else if (event.data?.type === "ORDER_ACKNOWLEDGED") {
              const ackId = event.data?.orderId;
              setNewOrderAlert((prev) => {
                if (prev && (!ackId || prev.id === ackId)) {
                  if (typeof window !== "undefined" && prev) {
                    localStorage.setItem("u3_admin_last_seen_order_id", prev.id);
                  }
                  return null;
                }
                return prev;
              });
            } else if (event.data?.type === "VISIBILITY_CHANGED" && event.data.visible_categories) {
              setCmsData((prev: any) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  settings: {
                    ...prev.settings,
                    visible_categories: event.data.visible_categories,
                  },
                };
              });
            }
          };
        }
      }
    } catch {}

    syncAdminState();
    const interval = setInterval(syncAdminState, 1500);
    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorageEvent);
      }
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }, [admin, lang, playNewOrderChime]);

  async function switchAdminLanguage(nextLang: Language) {
    setLang(nextLang);
    await fetch("/api/lang", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: nextLang, scope: "admin" }),
    });
    router.refresh();
  }

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    const res = await fetch("/api/auth/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "login",
        usernameOrEmail: loginEmail,
        email: loginEmail,
        password: loginPassword,
      }),
    });
    const data = await res.json();
    if (!data.ok) {
      setLoginError(data.error || "Invalid credentials");
    } else {
      setAdmin(data.admin);
      router.refresh();
    }
  }

  async function handleAdminLogout() {
    await fetch("/api/auth/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setAdmin(null);
    router.refresh();
  }

  async function postAdminAction(payload: Record<string, any>, successMsg = "Saved successfully") {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.ok) {
        showNotification(data.error || (lang === "ar" ? "تعذر تنفيذ العملية" : "Action failed"), "error");
        return null;
      }
      showNotification(successMsg, "success");

      if (payload.orderId || payload.id) {
        const affectedId = payload.orderId || payload.id;
        setNewOrderAlert((prev) => (prev && prev.id === affectedId ? null : prev));
        try {
          if (typeof window !== "undefined") {
            localStorage.setItem("u3_admin_last_seen_order_id", affectedId);
            localStorage.setItem("u3_last_order_sync", String(Date.now()));
            if ("BroadcastChannel" in window) {
              const syncBc = new BroadcastChannel("u3_admin_sync");
              syncBc.postMessage({ type: "ORDER_ACKNOWLEDGED", orderId: affectedId, timestamp: Date.now() });
              syncBc.close();
            }
          }
        } catch {}
      }

      await loadSectionData(activeSection);
      if (activeSection === "orders" || activeSection === "dashboard") {
        fetch("/api/admin?resource=catalog").then((r) => r.json()).then((d) => {
          if (d.ok) setCatalogData(d);
        }).catch(() => {});
      }
      return data;
    } catch (err: any) {
      showNotification(err?.message || (lang === "ar" ? "خطأ في الاتصال بالخادم" : "Connection error"), "error");
      return null;
    }
  }

  async function handleMediaUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    onUrl?: (u: string) => void
  ) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const file of files) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64Data = String(reader.result || "");
          const res = await postAdminAction(
            { action: "upload_media", fileName: file.name, base64Data },
            files.length === 1 ? (lang === "ar" ? "تم رفع الصورة بنجاح" : "Image uploaded") : undefined
          );
          if (res?.url && onUrl) onUrl(res.url);
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }
    if (files.length > 1) {
      showNotification(
        lang === "ar"
          ? `تم رفع ${files.length} صور بنجاح!`
          : `Uploaded ${files.length} images successfully!`
      );
    }
  }

  const adminModules = [
    {
      id: "dashboard",
      en: "Dashboard Overview",
      ar: "لوحة التحكم الرئيسية",
      icon: LayoutDashboard,
      defaultSection: "dashboard",
      subsections: [],
    },
    {
      id: "catalog",
      en: "Products & Stock",
      ar: "المنتجات والمخزون",
      icon: Package,
      defaultSection: "products",
      subsections: [
        { id: "products", en: "Shoes & Clothing Catalog", ar: "الأحذية والملابس (الكتالوج)" },
        { id: "collections", en: "Collections", ar: "المجموعات" },
        { id: "inventory", en: "Stock Control", ar: "مراقبة المخزون" },
      ],
    },
    {
      id: "sales",
      en: "Orders & Sales",
      ar: "الطلبات والمبيعات",
      icon: ShoppingCart,
      defaultSection: "orders",
      subsections: [
        { id: "orders", en: "Orders & Editing", ar: "الطلبات والتعديل" },
        { id: "invoices", en: "Confirmed Revenue & Invoices", ar: "الإيرادات المؤكدة والفواتير" },
        { id: "returns", en: "Returns & Exchanges", ar: "المرتجعات والفحص" },
        { id: "customers", en: "Customer Directory", ar: "سجل العملاء" },
      ],
    },
    {
      id: "logistics",
      en: "Shipping & Payments",
      ar: "الشحن والمدفوعات",
      icon: Truck,
      defaultSection: "shipping",
      subsections: [
        { id: "shipping", en: "27 Governorates Rates", ar: "أسعار الـ ٢٧ محافظة" },
        { id: "payments", en: "Payment Verifications", ar: "مراجعة إنستاباي وفودافون" },
      ],
    },
    {
      id: "storefront",
      en: "Storefront & Design",
      ar: "تصميم المتجر",
      icon: Palette,
      defaultSection: "appearance",
      subsections: [
        { id: "appearance", en: "Theme & Styling", ar: "المظهر والهوية" },
        { id: "marquee", en: "Marquee Strip", ar: "الشريط الإعلاني" },
        { id: "footer", en: "Footer & Newsletter", ar: "الفوتر والنشرة" },
        { id: "homepage", en: "Homepage Hero", ar: "بنرات الرئيسية" },
        { id: "pages", en: "Policy Pages", ar: "السياسات والصفحات" },
      ],
    },
    {
      id: "system",
      en: "Settings & System",
      ar: "الإعدادات والنظام",
      icon: Settings,
      defaultSection: "settings",
      subsections: [
        { id: "settings", en: "Store Settings", ar: "إعدادات المتجر" },
        { id: "whatsapp", en: "WhatsApp Automation", ar: "واتساب التلقائي" },
        { id: "discounts", en: "Coupons & Discounts", ar: "كوبونات الخصم" },
      ],
    },
  ];

  const sidebarItems = adminModules.flatMap((m) =>
    m.subsections.length > 0
      ? m.subsections.map((s) => ({ id: s.id, group: m.id, en: s.en, ar: s.ar, icon: m.icon }))
      : [{ id: m.id, group: m.id, en: m.en, ar: m.ar, icon: m.icon }]
  );

  const groupLabels: Record<string, { en: string; ar: string }> = {
    dashboard: { en: "OVERVIEW", ar: "لوحة التحكم" },
    catalog: { en: "CATALOG & INVENTORY", ar: "المنتجات والمخزون" },
    sales: { en: "ORDERS & SALES", ar: "الطلبات والمبيعات" },
    logistics: { en: "SHIPPING & PAYMENTS", ar: "الشحن والمدفوعات" },
    storefront: { en: "STOREFRONT DESIGN", ar: "تصميم المتجر" },
    system: { en: "SYSTEM & SETTINGS", ar: "الإعدادات والنظام" },
  };

  // If not authenticated as Admin, render secure Admin Login Screen
  if (!admin) {
    return (
      <div
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="min-h-screen bg-[#0F1012] text-[#F7F7F5] flex items-center justify-center p-4 relative overflow-hidden"
      >
        {/* Subtle Ambient Glowing Spheres */}
        <div className="absolute top-1/4 -start-24 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -end-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-[#181A1D]/90 backdrop-blur-2xl border border-white/10 p-6 sm:p-8 space-y-6 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] relative z-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="U3 STORE"
                className="w-12 h-12 rounded-full object-cover border border-[#BFC2C6]/40 shadow-md"
              />
              <div>
                <h1 className="font-heading text-xl font-bold text-white tracking-wide">{lang === "ar" ? "لوحة تحكم U3 STORE" : "U3 STORE ADMIN"}</h1>
                <p className="text-[10px] tracking-[0.2em] text-[#BFC2C6] uppercase font-mono">
                  {lang === "ar" ? "بوابة الإدارة وفريق العمل" : "STAFF & OWNER PORTAL"}
                </p>
              </div>
            </div>
            <div className="flex border border-white/15 rounded-xl overflow-hidden text-xs font-bold bg-[#111214]">
              <button
                type="button"
                onClick={() => switchAdminLanguage("en")}
                className={`px-3 py-1.5 transition-colors ${lang === "en" ? "bg-white text-[#111214]" : "text-[#BFC2C6] hover:text-white"}`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => switchAdminLanguage("ar")}
                className={`px-3 py-1.5 transition-colors ${lang === "ar" ? "bg-white text-[#111214]" : "text-[#BFC2C6] hover:text-white"}`}
              >
                AR
              </button>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-[#BFC2C6] mb-1.5">
                {lang === "ar" ? "اسم المستخدم أو البريد الإلكتروني *" : "Admin Username or Email *"}
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder={lang === "ar" ? "أدخل اسم المستخدم أو البريد" : "Enter username or email"}
                className="w-full bg-[#111214] border border-white/15 focus:border-white focus:ring-1 focus:ring-white/20 px-4 py-3 rounded-xl text-sm text-white placeholder-neutral-500 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-[#BFC2C6] mb-1.5">
                {lang === "ar" ? "كلمة المرور *" : "Password *"}
              </label>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={lang === "ar" ? "أدخل كلمة المرور" : "Enter password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-[#111214] border border-white/15 focus:border-white focus:ring-1 focus:ring-white/20 px-4 py-3 pe-12 rounded-xl text-sm text-white placeholder-neutral-500 transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute inset-y-0 end-0 px-3.5 flex items-center text-[#BFC2C6] hover:text-white transition-colors"
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                >
                  {showLoginPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="bg-red-950/80 border border-red-500/40 text-red-200 p-3 rounded-xl text-xs font-bold">{loginError}</div>
            )}

            <button
              type="submit"
              className="w-full bg-white hover:bg-[#E1E3E5] active:scale-[0.98] text-[#111214] font-heading text-xs font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-md hover:shadow-xl"
            >
              {lang === "ar" ? "دخول لوحة الإدارة" : "SIGN IN TO ADMIN DASHBOARD"}
            </button>
          </form>

          <div className="text-center">
            <Link href="/" className="text-xs text-[#BFC2C6] hover:text-white underline">
              {lang === "ar" ? "← العودة لواجهة المتجر" : "← Return to Storefront"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentNavItem = sidebarItems.find((i) => i.id === activeSection) || sidebarItems[0];
  const currentModule =
    adminModules.find(
      (m) =>
        m.defaultSection === activeSection ||
        m.subsections.some((s) => s.id === activeSection)
    ) || adminModules[0];

  const handleAcknowledgeOrderAlert = async (orderId: string, openDetails: boolean = false, orderNumber?: string) => {
    // 1. Immediately dismiss alert on this screen
    if (typeof window !== "undefined") {
      localStorage.setItem("u3_admin_last_seen_order_id", orderId);
    }
    setNewOrderAlert(null);

    // 2. Broadcast immediately across open tabs on this machine (0ms)
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const syncBc = new BroadcastChannel("u3_admin_sync");
        syncBc.postMessage({ type: "ORDER_ACKNOWLEDGED", orderId, timestamp: Date.now() });
        syncBc.close();
      }
    } catch {}

    // 3. Notify server so all other devices (phones, laptops, other computers) immediately dismiss this alert!
    try {
      fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "acknowledge_order", orderId }),
      }).catch(() => {});
    } catch {}

    // 4. If admin clicked "استلام ومعاينة الطلب", navigate directly to it
    if (openDetails && orderNumber) {
      setActiveSection("orders");
      setOrdersViewTab("ALL");
      setGlobalQuery(orderNumber);
    }
  };

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className="min-h-screen bg-offwhite dark:bg-[#0E0F11] text-jet dark:text-[#F5F5F5] flex flex-col transition-colors duration-200"
    >
      {/* Top Admin Bar */}
      <header className="sticky top-0 z-40 bg-[#111214] text-white border-b border-[#292B2E] px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 text-[#BFC2C6] hover:text-white shrink-0"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <img
            src="/logo.png"
            alt="U3 STORE"
            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-[#BFC2C6]/40 shrink-0 shadow-sm"
          />
          <div className="truncate">
            <span className="font-heading text-xs sm:text-base font-bold tracking-wider truncate block">
              U3 STORE <span className="hidden sm:inline">{lang === "ar" ? "— لوحة التحكم" : "— ADMIN"}</span>
            </span>
            <span className="hidden sm:inline-block ms-1 text-[10px] bg-[#292B2E] border border-[#BFC2C6]/30 px-2 py-0.5 uppercase tracking-widest text-[#E1E3E5]">
              {lang === "ar" ? admin.roleNameAr : admin.roleNameEn} ({admin.username || admin.email})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3.5 shrink-0">
          <span className="hidden xl:inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{lang === "ar" ? "المتجر يعمل مباشرة" : "Store Live Online"}</span>
          </span>

          <div className="hidden sm:block">
            <ThemeSwitcher scope="admin" lang={lang} />
          </div>

          {/* Independent Admin EN / AR Switcher */}
          <div className="flex border border-white/20 rounded-xl overflow-hidden text-xs font-bold bg-[#1A1C20] p-0.5">
            <button
              type="button"
              onClick={() => switchAdminLanguage("en")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                lang === "en" ? "bg-white text-[#111214] shadow-xs" : "text-[#BFC2C6] hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => switchAdminLanguage("ar")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                lang === "ar" ? "bg-white text-[#111214] shadow-xs" : "text-[#BFC2C6] hover:text-white"
              }`}
            >
              AR
            </button>
          </div>

          <Link
            href="/"
            target="_blank"
            className="text-xs bg-white/10 hover:bg-white hover:text-[#111214] text-white px-3 py-1.5 font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
            title={lang === "ar" ? "عرض واجهة المتجر" : "View Storefront"}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{lang === "ar" ? "معاينة المتجر ↗" : "Storefront ↗"}</span>
          </Link>

          <button
            type="button"
            onClick={handleAdminLogout}
            className="p-2 text-neutral-400 hover:text-rose-400 hover:bg-white/10 rounded-xl transition-colors"
            title={lang === "ar" ? "تسجيل الخروج" : "Logout"}
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Floating Real-Time New Order Notification Banner */}
      {newOrderAlert && (
        <aside
          role="alert"
          aria-live="assertive"
          className="fixed top-20 end-4 sm:end-6 z-50 max-w-sm sm:max-w-md w-[calc(100%-2rem)] bg-[#111214] text-white p-4 sm:p-5 rounded-2xl shadow-2xl border border-white/20 backdrop-blur-xl animate-in slide-in-from-top-4 duration-300 ring-1 ring-black/40"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="font-heading text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                {lang === "ar" ? "أوردر جديد وصل الآن!" : "New Order Received!"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleAcknowledgeOrderAlert(newOrderAlert.id)}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-1.5 text-xs text-neutral-300">
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">{lang === "ar" ? "رقم الطلب:" : "Order:"}</span>
              <strong className="text-white font-mono text-sm tracking-wide">#{newOrderAlert.orderNumber}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">{lang === "ar" ? "العميل:" : "Customer:"}</span>
              <span className="text-white font-semibold">{newOrderAlert.customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">{lang === "ar" ? "الإجمالي:" : "Total:"}</span>
              <strong className="text-emerald-400 font-mono text-sm font-bold">
                {formatCurrency(newOrderAlert.totalAmount, lang)}
              </strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-neutral-400">{lang === "ar" ? "طريقة الدفع:" : "Payment:"}</span>
              <span className="text-neutral-200">{newOrderAlert.paymentMethod}</span>
            </div>
          </div>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleAcknowledgeOrderAlert(newOrderAlert.id, true, newOrderAlert.orderNumber)}
              className="flex-1 bg-white hover:bg-neutral-200 text-[#111214] font-heading font-bold uppercase text-xs py-2.5 px-4 rounded-xl transition-all active:scale-95 text-center shadow-md flex items-center justify-center gap-1.5"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{lang === "ar" ? "استلام ومعاينة الطلب" : "Accept & View Order"}</span>
            </button>
            <button
              type="button"
              onClick={() => handleAcknowledgeOrderAlert(newOrderAlert.id)}
              className="border border-white/20 hover:bg-white/10 text-neutral-300 hover:text-white text-xs font-semibold py-2.5 px-3 rounded-xl transition-colors"
            >
              {lang === "ar" ? "تخطي" : "Dismiss"}
            </button>
          </div>
        </aside>
      )}

      {toast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-6 start-1/2 -translate-x-1/2 sm:start-auto sm:translate-x-0 sm:end-6 z-[100] max-w-sm w-full px-4 animate-in fade-in slide-in-from-bottom-4 duration-300 pointer-events-none"
        >
          <div
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 transition-all ${
              (typeof toast === "object" ? toast?.type : "success") === "error"
                ? "bg-red-950/95 border-red-500/50 text-red-100 shadow-red-950/50"
                : (typeof toast === "object" ? toast?.type : "success") === "info"
                ? "bg-neutral-900/95 border-neutral-700 text-white shadow-neutral-950/50"
                : "bg-[#111214]/95 border-emerald-500/40 text-white shadow-black/60"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold ${
                (typeof toast === "object" ? toast?.type : "success") === "error"
                  ? "bg-red-500/20 text-red-400"
                  : (typeof toast === "object" ? toast?.type : "success") === "info"
                  ? "bg-white/10 text-neutral-300"
                  : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              {(typeof toast === "object" ? toast?.type : "success") === "error" ? (
                <AlertCircle className="w-4 h-4" />
              ) : (typeof toast === "object" ? toast?.type : "success") === "info" ? (
                <Info className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 text-xs font-bold leading-snug">
              {typeof toast === "string" ? toast : toast?.message}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="p-1 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}

      {/* Direct WhatsApp Confirmation Dialog */}
      {whatsAppModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-emerald-500 max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between border-b border-silver/50 pb-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2 py-0.5 border border-emerald-200">
                  {lang === "ar" ? "تأكيد الدفع وإشعار الواتساب" : "WHATSAPP CONFIRMATION"}
                </span>
                <h3 className="font-heading text-lg font-bold text-jet">
                  {lang === "ar"
                    ? `تم تأكيد دفع الطلب #${whatsAppModal.orderNumber}`
                    : `Payment Confirmed for #${whatsAppModal.orderNumber}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWhatsAppModal(null)}
                className="text-neutralgray hover:text-jet p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutralgray">
              {lang === "ar"
                ? "تم تحديث حالة الطلب إلى (مؤكد) والدفع إلى (مدفوع) بنجاح. تم إدراج الإشعار التلقائي للعميل، ويمكنك أيضاً فتح محادثة الواتساب مباشرة بضغطة زر:"
                : "Order is now confirmed and paid. The automated WhatsApp alert was queued. You can also message the customer directly:"}
            </p>

            <div className="bg-offwhite border border-silver/60 p-3 space-y-1.5 text-xs font-mono">
              <p className="text-[11px] font-bold text-neutralgray">
                {lang === "ar" ? "رقم هاتف العميل:" : "Customer Phone:"} +{whatsAppModal.phone}
              </p>
              <div className="bg-white border border-silver/40 p-2.5 max-h-36 overflow-y-auto text-[11px] whitespace-pre-wrap text-jet">
                {whatsAppModal.messageText}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(whatsAppModal.messageText);
                  showNotification(lang === "ar" ? "تم نسخ نص الرسالة!" : "Message copied!");
                }}
                className="border border-silver text-jet hover:bg-offwhite px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors"
              >
                {lang === "ar" ? "نسخ نص الرسالة" : "Copy Text"}
              </button>
              <a
                href={whatsAppModal.url}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{lang === "ar" ? "فتح محادثة الواتساب" : "Open WhatsApp"}</span>
              </a>
              <button
                type="button"
                onClick={() => setWhatsAppModal(null)}
                className="bg-[#111214] hover:bg-[#292B2E] text-white px-4 py-2 text-xs font-bold uppercase tracking-wider"
              >
                {lang === "ar" ? "إغلاق" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Receipt Image Preview Modal with 'X' button */}
      {receiptModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setReceiptModal(null)}
        >
          <div
            className="bg-white border-2 border-jet max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-silver/60 bg-offwhite">
              <h3 className="font-heading font-bold text-sm text-jet truncate flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#73777D]" />
                <span>{receiptModal.title || (lang === "ar" ? "معاينة إيصال التحويل" : "Transfer Receipt Preview")}</span>
              </h3>
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="p-1.5 bg-silver/30 hover:bg-[#111214] hover:text-white text-jet rounded-xs transition-colors cursor-pointer"
                title={lang === "ar" ? "إغلاق (X)" : "Close (X)"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-jet/5 min-h-[300px]">
              <img
                src={receiptModal.url}
                alt="Receipt Preview"
                className="max-h-[70vh] w-auto object-contain border border-silver shadow-md"
              />
            </div>

            <div className="p-3 border-t border-silver/60 flex items-center justify-between bg-white text-xs">
              <a
                href={receiptModal.url}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-jet hover:underline flex items-center gap-1"
              >
                <span>{lang === "ar" ? "فتح الصورة بنافذة خارجية ↗" : "Open in new tab ↗"}</span>
              </a>
              <button
                type="button"
                onClick={() => setReceiptModal(null)}
                className="bg-[#111214] hover:bg-[#292B2E] text-white text-xs font-bold uppercase tracking-wider px-5 py-2 rounded-xs"
              >
                {lang === "ar" ? "إغلاق (X)" : "Close (X)"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex relative">
        {/* Mobile Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-16 bg-black/70 z-20 lg:hidden backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Simplified & Clean 6 Core Modules Sidebar */}
        <aside
          className={`${
            mobileMenuOpen
              ? "block fixed top-16 bottom-0 start-0 z-30 w-72 rounded-e-2xl"
              : "hidden"
          } lg:block lg:static lg:w-64 bg-[#111214] text-[#F7F7F5] border-e border-[#292B2E] overflow-y-auto shrink-0 shadow-2xl`}
        >
          {/* Mobile Drawer Top Banner */}
          {mobileMenuOpen && (
            <div className="lg:hidden flex items-center justify-between p-3.5 border-b border-[#292B2E] bg-[#16181B]">
              <span className="font-heading text-xs font-bold uppercase tracking-wider text-white">
                {lang === "ar" ? "أقسام لوحة التحكم" : "CONTROL MODULES"}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="p-3 border-b border-[#292B2E] hidden lg:block">
            <p className="px-3 text-[10px] font-heading font-bold uppercase tracking-[0.2em] text-[#73777D]">
              {lang === "ar" ? "أقسام لوحة التحكم" : "CONTROL MODULES"}
            </p>
          </div>
          <nav className="p-3 space-y-2">
            {adminModules.map((m) => {
              const Icon = m.icon;
              const isModuleActive = currentModule.id === m.id;
              const hasSub = m.subsections.length > 0;
              const isExpanded = Boolean(expandedModules[m.id]);

              return (
                <div key={m.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (hasSub) {
                        setExpandedModules((prev) => ({
                          ...prev,
                          [m.id]: !prev[m.id],
                        }));
                        if (!isExpanded) {
                          setActiveSection(m.defaultSection);
                        }
                      } else {
                        setActiveSection(m.defaultSection);
                        setMobileMenuOpen(false);
                      }
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs transition-all text-start rounded-xl ${
                      isModuleActive
                        ? "bg-white text-[#111214] font-bold shadow-md border-s-4 border-[#BFC2C6]"
                        : "text-[#BFC2C6] hover:bg-[#1A1C1F] hover:text-white font-medium"
                    }`}
                  >
                    <span className="flex items-center gap-3 truncate">
                      <Icon
                        className={`w-4 h-4 shrink-0 ${
                          isModuleActive ? "text-[#111214]" : "text-[#73777D]"
                        }`}
                      />
                      <span className="truncate">{lang === "ar" ? m.ar : m.en}</span>
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isModuleActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#111214]" />
                      )}
                      {hasSub && (
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? "rotate-180 text-white" : "text-[#73777D]"
                          }`}
                        />
                      )}
                    </div>
                  </button>

                  {/* Dropdown sub-items rendered neatly under each other */}
                  {hasSub && isExpanded && (
                    <div className="ps-4 pe-1 py-1.5 space-y-1 bg-[#16181B] border-s-2 border-[#292B2E] ms-3 rounded-lg animate-in fade-in duration-200">
                      {m.subsections.map((sub) => {
                        const isSubActive = activeSection === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setActiveSection(sub.id);
                              setMobileMenuOpen(false);
                            }}
                            className={`w-full flex items-center justify-between py-2 px-2.5 text-[11px] rounded-lg transition-colors text-start ${
                              isSubActive
                                ? "bg-[#292B2E] text-white font-bold"
                                : "text-[#A7ABB1] hover:text-white hover:bg-[#1E2024]"
                            }`}
                          >
                            <span>{lang === "ar" ? sub.ar : sub.en}</span>
                            {isSubActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-x-hidden max-w-7xl mx-auto w-full space-y-6">
          {/* Elegant Top Context Bar with Smooth Segmented Control */}
          <div className="bg-white border border-silver/60 p-4 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#111214] text-white flex items-center justify-center shrink-0 shadow-xs">
                {React.createElement(currentModule.icon, { className: "w-5 h-5 text-white" })}
              </div>
              <div>
                <div className="flex items-center gap-2 text-[11px] text-[#73777D] font-bold uppercase tracking-wider">
                  <span>{lang === "ar" ? currentModule.ar : currentModule.en}</span>
                  <span>•</span>
                  <span className="text-jet font-black">{lang === "ar" ? currentNavItem.ar : currentNavItem.en}</span>
                </div>
                <p className="text-xs text-neutralgray">
                  {lang === "ar" ? "لوحة الإدارة الشاملة لمتجر U3 STORE" : "U3 STORE Official Control Panel"}
                </p>
              </div>
            </div>

            {/* Clean Segmented Sub-Navigation Pills (if module has subsections) */}
            {currentModule.subsections.length > 0 && (
              <div className="bg-[#F0F1F3] p-1 rounded-xl flex items-center gap-1 border border-silver/30 self-start md:self-auto w-full md:w-auto overflow-x-auto max-w-full">
                {currentModule.subsections.map((sub) => {
                  const isSubActive = activeSection === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setActiveSection(sub.id)}
                      className={`px-3.5 py-1.5 text-xs font-heading font-bold uppercase tracking-wider rounded-lg transition-all ${
                        isSubActive
                          ? "bg-white text-[#111214] shadow-xs font-black"
                          : "text-[#73777D] hover:text-[#111214] hover:bg-white/60"
                      }`}
                    >
                      {lang === "ar" ? sub.ar : sub.en}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 1. DASHBOARD */}
          {activeSection === "dashboard" && dashboardData && (
            <div className="space-y-8 u3-reveal">
              {/* Quick 1-Click Store Display Mode Controller */}
              <div className="bg-[#111214] text-white p-5 rounded-3xl border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center text-emerald-400 shrink-0 ring-1 ring-white/10">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                      <span>{lang === "ar" ? "التحكم في الأقسام المعروضة بالمتجر (STORE VISIBILITY)" : "STORE CATEGORY DISPLAY MODE"}</span>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {cmsData?.settings?.visible_categories || "BOTH"}
                      </span>
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {lang === "ar"
                        ? "تحكم فوري في ظهور الأحذية والملابس عبر المتجر بالكامل (النافبار، الهوم بيج، الفوتر، والبحث)."
                        : "Instantly control which departments are live and accessible across the entire storefront."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {[
                    { id: "BOTH", labelAr: "الأحذية والملابس معاً", labelEn: "Shoes & Clothing (Both)", icon: Layers },
                    { id: "SHOES_ONLY", labelAr: "الأحذية فقط", labelEn: "Shoes Only", icon: Footprints },
                    { id: "CLOTHING_ONLY", labelAr: "الملابس فقط", labelEn: "Clothing Only", icon: Shirt },
                  ].map((m) => {
                    const active = (cmsData?.settings?.visible_categories || "BOTH") === m.id;
                    const IconComp = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={async () => {
                          setCmsData((prev: any) =>
                            prev
                              ? {
                                  ...prev,
                                  settings: {
                                    ...prev.settings,
                                    visible_categories: m.id,
                                  },
                                }
                              : prev
                          );
                          // Instantly broadcast to all other tabs on this machine
                          try {
                            if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                              const bc = new BroadcastChannel("u3_admin_sync");
                              bc.postMessage({ type: "VISIBILITY_CHANGED", visible_categories: m.id });
                              bc.close();
                            }
                          } catch {}

                          await postAdminAction(
                            { action: "save_store_settings", visibleCategories: m.id },
                            lang === "ar" ? `تم تفعيل وضع: ${m.labelAr}` : `Store visibility set to: ${m.labelEn}`
                          );
                        }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-2 border ${
                          active
                            ? "bg-white text-[#111214] border-white shadow-xl ring-2 ring-emerald-400 font-extrabold"
                            : "bg-[#1C1E22] text-[#BFC2C6] border-white/10 hover:bg-[#25282E] hover:text-white"
                        }`}
                      >
                        <IconComp className={`w-4 h-4 ${active ? "text-black" : "text-[#BFC2C6]"}`} />
                        <span>{lang === "ar" ? m.labelAr : m.labelEn}</span>
                        {active && <Check className="w-4 h-4 text-emerald-600 stroke-[3] ms-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-silver/60 dark:border-white/10 pb-4">
                <div>
                  <h1 className="font-heading text-2xl font-bold text-jet dark:text-white">
                    {lang === "ar"
                      ? "لوحة التحكم والإحصائيات المباشرة"
                      : "EXECUTIVE STORE DASHBOARD"}
                  </h1>
                  <p className="text-xs text-neutralgray dark:text-[#A7ABB1]">
                    {lang === "ar"
                      ? "نظرة شاملة وواضحة على المبيعات والطلبات والمخزون الفعلي (مرتبطة مباشرة بقاعدة البيانات)."
                      : "Clear, real-time overview of your store's verified revenue, orders, and inventory."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setProdId("");
                      setProdNameEn("");
                      setProdNameAr("");
                      setProdDescEn("");
                      setProdDescAr("");
                      setProdRegularPrice("");
                      setProdSalePrice("");
                      setProdCategoryId("");
                      setProdCollectionId("");
                      setProdImageUrl("");
                      setProdImages([]);
                      setProdVariants([]);
                      setActiveSection("products");
                    }}
                    className="bg-[#111214] hover:bg-black text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>{lang === "ar" ? "إضافة منتج جديد" : "Add Product"}</span>
                  </button>
                </div>
              </div>

              {/* Primary 4 Animated KPI Cards with Rounded Curves & Sleek Animations */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {/* 1. Paid Revenue - Navigates directly to Invoices & Financial Archive */}
                <button
                  type="button"
                  onClick={() => {
                    setInvoiceStatusFilter("PAID");
                    setInvoiceSearchQuery("");
                    setInvoiceMethodFilter("ALL");
                    setActiveSection("invoices");
                  }}
                  className="bg-gradient-to-br from-[#111214] via-[#181A1D] to-[#111214] text-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-white/10 text-start hover:border-white/30 shadow-md hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between relative overflow-hidden cursor-pointer"
                >
                  <div className="absolute top-0 end-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        {lang === "ar" ? "مؤكد" : "LIVE"}
                      </span>
                    </div>
                    <p className="text-[11px] uppercase tracking-wider text-[#BFC2C6] font-bold">
                      {lang === "ar" ? "الإيرادات المؤكدة" : "Paid Revenue"}
                    </p>
                    <p className="font-heading text-2xl font-bold text-white tracking-tight mt-1">
                      <AnimatedCounter
                        value={dashboardData.stats.paidRevenue}
                        isCurrency
                        lang={lang}
                      />
                    </p>
                  </div>
                  <span className="text-[10px] text-[#73777D] mt-3 block">
                    {lang === "ar" ? "المدفوعات المؤكدة فقط" : "Verified paid orders only"}
                  </span>
                </button>

                {/* 2. Total Orders - Navigates directly to Orders Management */}
                <button
                  type="button"
                  onClick={() => setActiveSection("orders")}
                  className="bg-white dark:bg-[#181A1D] text-jet dark:text-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-silver/60 dark:border-white/10 hover:border-jet dark:hover:border-white/30 text-start shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-jet dark:bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                        <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-sky-400" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-neutralgray dark:text-neutral-300 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10">
                        {lang === "ar" ? "الطلبات" : "ORDERS"}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-neutralgray dark:text-[#A7ABB1] font-bold">
                      {lang === "ar" ? "إجمالي الطلبات" : "Total Orders"}
                    </p>
                    <p className="font-heading text-xl sm:text-2xl font-bold text-jet dark:text-white tracking-tight mt-1">
                      <AnimatedCounter value={dashboardData.stats.totalOrders} lang={lang} />
                    </p>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-neutralgray dark:text-[#73777D] mt-2 sm:mt-3 block truncate">
                    {lang === "ar" ? "اضغط للإدارة" : "Manage orders"}
                  </span>
                </button>

                {/* 3. Total Customers - Navigates directly to Customers */}
                <button
                  type="button"
                  onClick={() => setActiveSection("customers")}
                  className="bg-white dark:bg-[#181A1D] text-jet dark:text-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-silver/60 dark:border-white/10 hover:border-jet dark:hover:border-white/30 text-start shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-neutral-800 dark:bg-white/10 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white dark:text-purple-400" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-neutralgray dark:text-neutral-300 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-white/10">
                        {lang === "ar" ? "العملاء" : "USERS"}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-neutralgray dark:text-[#A7ABB1] font-bold">
                      {lang === "ar" ? "إجمالي العملاء" : "Total Customers"}
                    </p>
                    <p className="font-heading text-xl sm:text-2xl font-bold text-jet dark:text-white tracking-tight mt-1">
                      <AnimatedCounter value={dashboardData.stats.totalCustomers} lang={lang} />
                    </p>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-neutralgray dark:text-[#73777D] mt-2 sm:mt-3 block truncate">
                    {lang === "ar" ? "مسجلين وزوار" : "Registered & guests"}
                  </span>
                </button>

                {/* 4. Low Stock / Out of Stock - Navigates directly to Inventory */}
                <button
                  type="button"
                  onClick={() => setActiveSection("inventory")}
                  className="bg-white dark:bg-[#181A1D] text-jet dark:text-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-amber-200/80 dark:border-amber-500/20 hover:border-amber-400 dark:hover:border-amber-400 text-start shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col justify-between cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5 sm:mb-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20">
                        {lang === "ar" ? "تنبيه" : "STOCK"}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-amber-900 dark:text-amber-400 font-bold">
                      {lang === "ar" ? "مخزون منخفض" : "Low Stock"}
                    </p>
                    <p className="font-heading text-xl sm:text-2xl font-bold text-jet dark:text-white tracking-tight mt-1">
                      <AnimatedCounter
                        value={
                          Number(dashboardData.stats.lowStockCount || 0) +
                          Number(dashboardData.stats.outOfStockCount || 0)
                        }
                        lang={lang}
                      />
                    </p>
                  </div>
                  <span className="text-[9px] sm:text-[10px] text-neutralgray dark:text-[#73777D] mt-2 sm:mt-3 block truncate">
                    {lang === "ar" ? "فحص المخزون" : "Check stock"}
                  </span>
                </button>
              </div>

              {/* Order Pipeline Status Bar with Curved Cards */}
              <div className="bg-white dark:bg-[#181A1D] border border-silver/60 dark:border-white/10 p-6 sm:p-7 space-y-5 rounded-3xl shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-silver/40 dark:border-white/10 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#111214] dark:bg-white/10 text-white flex items-center justify-center shadow-xs">
                      <Layers className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="font-heading text-sm font-bold text-jet dark:text-white tracking-wide">
                        {lang === "ar" ? "مسار ومراحل معالجة الطلبات" : "ORDER FULFILLMENT PIPELINE"}
                      </h2>
                      <p className="text-[11px] text-neutralgray dark:text-[#A7ABB1]">
                        {lang === "ar" ? "تتبع فوري لمراحل دورة حياة الأوردر من الدفع حتى التسليم" : "Live pipeline tracking from payment verification to doorstep delivery"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {lang === "ar" ? "مزامنة لحظية مباشرة" : "Live Real-Time Sync"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
                  {[
                    {
                      step: "01",
                      en: "Awaiting Payment",
                      ar: "بانتظار الدفع",
                      val: dashboardData.stats.pendingPayments,
                      statusFilter: "PENDING_PAYMENT",
                      dotColor: "bg-amber-500",
                      badgeBg: "bg-amber-50 text-amber-700 border-amber-200",
                      activeBorder: "hover:border-amber-400",
                      Icon: Clock,
                    },
                    {
                      step: "02",
                      en: "Under Review",
                      ar: "بانتظار المراجعة",
                      val: dashboardData.stats.paymentsUnderReview,
                      statusFilter: "PAYMENT_UNDER_REVIEW",
                      dotColor: "bg-yellow-500",
                      badgeBg: "bg-yellow-50 text-yellow-700 border-yellow-200",
                      activeBorder: "hover:border-yellow-400",
                      Icon: ShieldCheck,
                    },
                    {
                      step: "03",
                      en: "Confirmed",
                      ar: "مؤكدة للتجهيز",
                      val: dashboardData.stats.confirmedOrders,
                      statusFilter: "CONFIRMED",
                      dotColor: "bg-sky-500",
                      badgeBg: "bg-sky-50 text-sky-700 border-sky-200",
                      activeBorder: "hover:border-sky-400",
                      Icon: CheckCircle2,
                    },
                    {
                      step: "04",
                      en: "Processing",
                      ar: "جاري التجهيز",
                      val: dashboardData.stats.processingOrders,
                      statusFilter: "PROCESSING",
                      dotColor: "bg-indigo-500",
                      badgeBg: "bg-indigo-50 text-indigo-700 border-indigo-200",
                      activeBorder: "hover:border-indigo-400",
                      Icon: Package,
                    },
                    {
                      step: "05",
                      en: "Shipped",
                      ar: "في طريق الشحن",
                      val: dashboardData.stats.shippedOrders,
                      statusFilter: "SHIPPED",
                      dotColor: "bg-purple-500",
                      badgeBg: "bg-purple-50 text-purple-700 border-purple-200",
                      activeBorder: "hover:border-purple-400",
                      Icon: Truck,
                    },
                    {
                      step: "06",
                      en: "Delivered",
                      ar: "تم التسليم",
                      val: dashboardData.stats.deliveredOrders,
                      statusFilter: "DELIVERED",
                      dotColor: "bg-emerald-500",
                      badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      activeBorder: "hover:border-emerald-400",
                      Icon: Sparkles,
                    },
                  ].map((st, idx) => {
                    const hasItems = st.val > 0;
                    const IconComp = st.Icon;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setOrderStatusFilter(st.statusFilter);
                          setPaymentStatusFilter("");
                          setGlobalQuery("");
                          setActiveSection("orders");
                        }}
                        className={`p-4 rounded-2xl text-start transition-all duration-200 group flex flex-col justify-between cursor-pointer border relative overflow-hidden ${
                          hasItems
                            ? "bg-white dark:bg-[#22252A] border-neutral-300 dark:border-white/15 text-jet dark:text-white shadow-xs hover:shadow-md hover:-translate-y-1 " + st.activeBorder
                            : "bg-[#FAFAFA] dark:bg-[#141517] border-silver/60 dark:border-white/5 hover:bg-white dark:hover:bg-[#22252A] hover:border-neutral-400 dark:hover:border-white/20 hover:-translate-y-0.5"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-bold text-neutral-400 dark:text-neutral-300 bg-neutral-100 dark:bg-white/10 px-1.5 py-0.5 rounded-md">
                              {st.step}
                            </span>
                            <span className={`w-2 h-2 rounded-full ${st.dotColor} shrink-0`} />
                          </div>
                          <IconComp className="w-4 h-4 text-neutral-400 dark:text-neutral-400 group-hover:text-jet dark:group-hover:text-white transition-colors" />
                        </div>

                        <div className="space-y-1">
                          <p className="text-[11px] font-bold text-neutral-700 dark:text-neutral-200 truncate">
                            {lang === "ar" ? st.ar : st.en}
                          </p>
                          <div className="flex items-baseline justify-between">
                            <p className="font-heading text-2xl sm:text-3xl font-extrabold text-jet dark:text-white font-mono tracking-tight">
                              <AnimatedCounter value={st.val} lang={lang} />
                            </p>
                            {hasItems && (
                              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-400">
                                {lang === "ar" ? "طلب" : "orders"}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recent Orders & Payment Reports */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#181A1D] border border-silver/60 dark:border-white/10 p-6 space-y-4 rounded-3xl shadow-xs">
                  <div className="flex justify-between items-center border-b border-silver/30 dark:border-white/10 pb-3">
                    <h3 className="font-heading text-sm font-bold uppercase text-jet dark:text-white flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-jet dark:text-white" />
                      <span>{lang === "ar" ? "أحدث الطلبات" : "RECENT ORDERS"}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSection("orders")}
                      className="text-xs text-jet dark:text-neutral-300 hover:underline font-bold cursor-pointer"
                    >
                      {lang === "ar" ? "عرض كل الطلبات ←" : "View All →"}
                    </button>
                  </div>
                  {dashboardData.recentOrders.length === 0 ? (
                    <p className="text-xs text-neutralgray py-8 text-center">
                      {lang === "ar" ? "لا توجد طلبات حتى الآن." : "No orders yet."}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {dashboardData.recentOrders.map((o: any) => {
                        const initial = (o.customer_name || "C").charAt(0).toUpperCase();
                        return (
                          <div
                            key={o.id}
                            onClick={() => {
                              setActiveSection("orders");
                              setGlobalQuery(o.order_number);
                            }}
                            className="border border-silver/50 dark:border-white/10 p-3.5 text-xs flex justify-between items-center bg-[#F9FAFB] dark:bg-[#141517] hover:bg-white dark:hover:bg-[#22252A] hover:border-[#111214] dark:hover:border-white/20 rounded-2xl transition-all shadow-2xs cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-[#111214] dark:bg-white/10 text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                                {initial}
                              </div>
                              <div className="truncate">
                                <p className="font-bold font-mono text-jet dark:text-white text-xs tracking-wide">#{o.order_number}</p>
                                <p className="text-neutralgray dark:text-[#A7ABB1] text-[11px] truncate">{o.customer_name}</p>
                              </div>
                            </div>
                            <div className="text-end shrink-0 ms-2">
                              <p className="font-bold font-mono text-jet dark:text-white text-xs">{formatCurrency(o.total_amount, lang)}</p>
                              <span className="inline-block mt-1 text-[9px] font-bold bg-[#111214] dark:bg-white/10 text-white dark:text-[#E1E3E5] border dark:border-white/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {o.order_status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-[#181A1D] border border-silver/60 dark:border-white/10 p-6 space-y-4 rounded-3xl shadow-xs">
                  <div className="flex justify-between items-center border-b border-silver/30 dark:border-white/10 pb-3">
                    <h3 className="font-heading text-sm font-bold uppercase text-jet dark:text-white flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-500" />
                      <span>{lang === "ar" ? "أحدث إشعارات الدفع" : "RECENT PAYMENT REPORTS"}</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveSection("payments")}
                      className="text-xs text-jet dark:text-neutral-300 hover:underline font-bold cursor-pointer"
                    >
                      {lang === "ar" ? "مراجعة المدفوعات ←" : "Verify Payments →"}
                    </button>
                  </div>
                  {dashboardData.recentPayments.length === 0 ? (
                    <p className="text-xs text-neutralgray dark:text-[#A7ABB1] py-8 text-center">
                      {lang === "ar"
                        ? "لا توجد إشعارات تحويل مرسلة حالياً."
                        : "No payment reports submitted yet."}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {dashboardData.recentPayments.map((ps: any) => (
                        <div
                          key={ps.id}
                          onClick={() => setActiveSection("payments")}
                          className="border border-silver/50 dark:border-white/10 p-3.5 text-xs flex justify-between items-center bg-[#F9FAFB] dark:bg-[#141517] hover:bg-white dark:hover:bg-[#22252A] hover:border-[#111214] dark:hover:border-white/20 rounded-2xl transition-all shadow-2xs cursor-pointer group"
                        >
                          <div className="truncate">
                            <p className="font-bold font-mono text-jet dark:text-white text-xs">
                              #{ps.order_number} <span className="text-neutral-400 dark:text-neutral-400 font-normal">| {ps.transaction_reference ? `Ref: ${ps.transaction_reference}` : (lang === "ar" ? "إيصال مرفوع" : "Receipt Uploaded")}</span>
                            </p>
                            <p className="text-neutralgray dark:text-[#A7ABB1] text-[11px] truncate mt-0.5">
                              {ps.customer_name} ({ps.payment_method_code})
                            </p>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg shrink-0 ms-2 ${
                            ps.status === "CONFIRMED"
                              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30"
                              : "bg-amber-100 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30"
                          }`}>
                            {ps.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 2. PRODUCTS & VARIANTS */}
          {activeSection === "products" && catalogData && (
            <div className="space-y-6">
              {/* Products Section Header with 1-Tap Toggle for Add Shoe Form */}
              <div className="bg-white border border-silver/60 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="font-heading text-xl sm:text-2xl font-bold text-jet">
                    {lang === "ar"
                      ? "إدارة كتالوج الأحذية والملابس"
                      : "SHOES & CLOTHING CATALOG MANAGEMENT"}
                  </h1>
                  <p className="text-xs text-neutralgray mt-0.5">
                    {lang === "ar"
                      ? `إجمالي الأحذية المتاحة: ${catalogData.products.length} حذاء بالمتجر`
                      : `Total Products: ${catalogData.products.length} active in store`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!showProductForm) {
                      setProdId("");
                      setProdNameEn("");
                      setProdNameAr("");
                      setProdDescEn("");
                      setProdDescAr("");
                      setProdRegularPrice("");
                      setProdSalePrice("");
                      setProdCategoryId("");
                      setProdCollectionId("");
                      setProdImageUrl("");
                      setProdImages([]);
                      setProdVariants([]);
                      setProdProductType("SHOES");
                      setProdBrand("U3");
                      setProdMaterialEn("");
                      setProdMaterialAr("");
                    }
                    setShowProductForm(!showProductForm);
                  }}
                  className="w-full sm:w-auto bg-[#111214] hover:bg-black text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  {showProductForm || Boolean(prodId) ? (
                    <>
                      <X className="w-4 h-4 text-neutral-400" />
                      <span>{lang === "ar" ? "إخفاء نموذج الإضافة" : "Hide Form"}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-emerald-400" />
                      <span>{lang === "ar" ? "+ إضافة منتج (حذاء / ملابس)" : "+ Add Product (Shoes / Clothing)"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Create / Edit Product Form (Collapsible on demand) */}
              {(showProductForm || Boolean(prodId)) && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await postAdminAction(
                      {
                        action: "save_product",
                        id: prodId,
                        nameEn: prodNameEn,
                        nameAr: prodNameAr || prodNameEn,
                        descriptionEn: prodDescEn,
                        descriptionAr: prodDescAr || prodDescEn,
                        regularPrice: Number(prodRegularPrice),
                        salePrice: prodSalePrice ? Number(prodSalePrice) : null,
                        categoryId: prodCategoryId || null,
                        collectionId: prodCollectionId || null,
                        productType: prodProductType,
                        brand: prodBrand,
                        materialEn: prodMaterialEn,
                        materialAr: prodMaterialAr,
                        isNewArrival: prodIsNew,
                        isFeatured: prodIsFeatured,
                        isBestSeller: prodIsBestSeller,
                        images:
                          prodImages.length > 0
                            ? prodImages.map((u, idx) => ({ url: u, isMain: idx === 0 }))
                            : prodImageUrl
                            ? [{ url: prodImageUrl, isMain: true }]
                            : [],
                        variants: prodVariants
                          .filter(
                            (v) =>
                              v.size.trim() ||
                              v.colorEn.trim() ||
                              v.colorAr.trim() ||
                              (v.onHand !== "" && Number(v.onHand) > 0)
                          )
                          .map((v) => ({
                            ...v,
                            onHand: Number(v.onHand) || 0,
                          })),
                      },
                      lang === "ar" ? "تم حفظ المنتج والمتغيرات بنجاح" : "Product & variants saved"
                    );
                    setProdId("");
                    setProdNameEn("");
                    setProdNameAr("");
                    setProdDescEn("");
                    setProdDescAr("");
                    setProdRegularPrice("");
                    setProdSalePrice("");
                    setProdCategoryId("");
                    setProdCollectionId("");
                    setProdImageUrl("");
                    setProdImages([]);
                    setProdVariants([]);
                    setProdProductType("SHOES");
                    setProdBrand("U3");
                    setProdMaterialEn("");
                    setProdMaterialAr("");
                    setShowProductForm(false);
                  }}
                  className="bg-white border border-[#E5E7EB] rounded-3xl p-6 sm:p-8 space-y-8 shadow-xl shadow-black/5 relative overflow-hidden transition-all duration-300"
                >
                {/* Decorative Metallic Accent Bar */}
                <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-zinc-900 via-neutral-400 to-zinc-900" />

                {/* Header Banner with Live State Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#111214] text-white flex items-center justify-center shadow-lg shadow-black/20 ring-1 ring-white/10 shrink-0">
                      <ShoppingBag className="w-6 h-6 text-[#E1E3E5]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-heading text-lg sm:text-xl font-bold tracking-tight text-jet">
                          {prodId
                            ? lang === "ar"
                              ? "تعديل بيانات الحذاء"
                              : "EDIT FOOTWEAR PRODUCT"
                            : lang === "ar"
                            ? "إضافة حذاء جديد للكتالوج"
                            : "CREATE NEW FOOTWEAR PRODUCT"}
                        </h2>
                        {prodId ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {lang === "ar" ? "وضع التعديل النشط" : "Editing Active"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                            <Sparkles className="w-3 h-3 text-emerald-500" />
                            {lang === "ar" ? "منتج جديد" : "New Creation"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutralgray mt-0.5">
                        {lang === "ar"
                          ? "أدخل تفاصيل الحذاء والأسعار ومعرض الصور ومصفوفة المقاسات والمخزون"
                          : "Configure product titles, pricing, multi-angle photos, and stock matrix"}
                      </p>
                    </div>
                  </div>

                  {/* Quick Live Preview Tags (Total Stock & Discount preview) */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {Number(prodRegularPrice) > 0 && Number(prodSalePrice) > 0 && Number(prodSalePrice) < Number(prodRegularPrice) && (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>
                          {lang === "ar"
                            ? `خصم ${Math.round(((Number(prodRegularPrice) - Number(prodSalePrice)) / Number(prodRegularPrice)) * 100)}%`
                            : `${Math.round(((Number(prodRegularPrice) - Number(prodSalePrice)) / Number(prodRegularPrice)) * 100)}% OFF`}
                        </span>
                      </div>
                    )}
                    <div className="bg-neutral-100 border border-neutral-200 text-neutral-800 px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 shadow-2xs">
                      <Layers className="w-3.5 h-3.5 text-neutral-500" />
                      <span>
                        {lang === "ar" ? "إجمالي المخزون: " : "Total Stock: "}
                        <strong className="text-black">
                          {prodVariants.reduce((sum, v) => sum + (Number(v.onHand) || 0), 0)}
                        </strong>{" "}
                        {lang === "ar" ? "قطعة" : "pcs"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card 1: Names, Department & Descriptions */}
                <div className="bg-[#FAFBFB] border border-neutral-200/70 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                      {prodProductType === "CLOTHING" ? <Shirt className="w-4 h-4 text-neutral-500" /> : <Footprints className="w-4 h-4 text-neutral-500" />}
                      {lang === "ar" ? "البيانات الأساسية وقسم المنتج" : "Basic Product Details & Department"}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono">EN / AR</span>
                  </div>

                  {/* Department Switcher: Shoes vs Clothing */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                      {lang === "ar" ? "نوع وقسم المنتج *" : "Product Department *"}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setProdProductType("SHOES")}
                        className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          prodProductType === "SHOES"
                            ? "bg-[#111214] text-white border-black shadow-md ring-2 ring-black/10"
                            : "bg-white text-neutral-600 border-neutral-300 hover:border-black"
                        }`}
                      >
                        <Footprints className="w-4 h-4" />
                        <span>{lang === "ar" ? "قسم الأحذية (SHOES)" : "SHOES"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setProdProductType("CLOTHING")}
                        className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          prodProductType === "CLOTHING"
                            ? "bg-[#111214] text-white border-black shadow-md ring-2 ring-black/10"
                            : "bg-white text-neutral-600 border-neutral-300 hover:border-black"
                        }`}
                      >
                        <Shirt className="w-4 h-4" />
                        <span>{lang === "ar" ? "قسم الملابس (CLOTHING)" : "CLOTHING"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Material Fields if Clothing */}
                  {prodProductType === "CLOTHING" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-neutral-100/70 rounded-xl border border-neutral-200">
                      <div>
                        <label className="block text-xs font-bold mb-1.5 text-neutral-700">
                          {lang === "ar" ? "مواصفات الخامة والقماش (English)" : "Fabric & Material (English)"}
                        </label>
                        <input
                          type="text"
                          value={prodMaterialEn}
                          onChange={(e) => setProdMaterialEn(e.target.value)}
                          placeholder="e.g. 100% Egyptian Cotton Heavyweight 320 GSM"
                          className="w-full bg-white border border-neutral-300 focus:border-black focus:ring-4 focus:ring-black/5 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200 shadow-2xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1.5 text-neutral-700">
                          {lang === "ar" ? "مواصفات الخامة والقماش (العربية)" : "Fabric & Material (Arabic)"}
                        </label>
                        <input
                          type="text"
                          value={prodMaterialAr}
                          onChange={(e) => setProdMaterialAr(e.target.value)}
                          placeholder="مثال: قطن مصري فاخر 100% ثقيل معالج ضد الانكماش"
                          className="w-full bg-white border border-neutral-300 focus:border-black focus:ring-4 focus:ring-black/5 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200 shadow-2xs"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-neutral-700">
                        {lang === "ar" ? "اسم الحذاء (بالإنجليزية) *" : "Product Name (English) *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={prodNameEn}
                        onChange={(e) => setProdNameEn(e.target.value)}
                        placeholder="e.g. U3 Air Force 1 Craft"
                        className="w-full bg-white border border-neutral-300 focus:border-black focus:ring-4 focus:ring-black/5 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-neutral-700">
                        {lang === "ar" ? "اسم الحذاء (بالعربية) *" : "Product Name (Arabic) *"}
                      </label>
                      <input
                        type="text"
                        required
                        value={prodNameAr}
                        onChange={(e) => setProdNameAr(e.target.value)}
                        placeholder="مثال: حذاء U3 إير فورس 1"
                        className="w-full bg-white border border-neutral-300 focus:border-black focus:ring-4 focus:ring-black/5 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-neutral-700">
                        {lang === "ar" ? "الوصف بالتفصيل (بالإنجليزية)" : "Description (English)"}
                      </label>
                      <textarea
                        rows={2}
                        value={prodDescEn}
                        onChange={(e) => setProdDescEn(e.target.value)}
                        placeholder={lang === "ar" ? "تفاصيل الخامات والنعل والتصميم..." : "Materials, sole construction, and fit details..."}
                        className="w-full bg-white border border-neutral-300 focus:border-black focus:ring-4 focus:ring-black/5 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-neutral-700">
                        {lang === "ar" ? "الوصف بالتفصيل (بالعربية)" : "Description (Arabic)"}
                      </label>
                      <textarea
                        rows={2}
                        value={prodDescAr}
                        onChange={(e) => setProdDescAr(e.target.value)}
                        placeholder="خامات فاخرة، نعل مريح ومقاوم، تصميم عصري..."
                        className="w-full bg-white border border-neutral-300 focus:border-black focus:ring-4 focus:ring-black/5 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200 shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Card 2: Pricing & Categorization */}
                <div className="bg-[#FAFBFB] border border-neutral-200/70 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-neutral-500" />
                      {lang === "ar" ? "التسعير والتصنيف في المتجر" : "Pricing & Catalog Taxonomy"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-neutral-700">
                        {lang === "ar" ? "السعر الأصلي (ج.م) *" : "Regular Price (EGP) *"}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          value={prodRegularPrice}
                          onChange={(e) => setProdRegularPrice(e.target.value)}
                          placeholder="2500"
                          className="w-full bg-white border border-neutral-300 focus:border-black focus:ring-4 focus:ring-black/5 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none transition-all duration-200 shadow-2xs"
                        />
                        <span className="absolute end-3 top-2.5 text-xs text-neutral-400 font-bold pointer-events-none">
                          {lang === "ar" ? "ج.م" : "EGP"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-neutral-700">
                        {lang === "ar" ? "سعر التخفيض (اختياري)" : "Sale Price (Optional)"}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={prodSalePrice}
                          onChange={(e) => setProdSalePrice(e.target.value)}
                          placeholder="2150"
                          className="w-full bg-white border border-neutral-300 focus:border-black focus:ring-4 focus:ring-black/5 rounded-xl px-3.5 py-2.5 text-sm font-bold outline-none transition-all duration-200 shadow-2xs"
                        />
                        <span className="absolute end-3 top-2.5 text-xs text-neutral-400 font-bold pointer-events-none">
                          {lang === "ar" ? "ج.م" : "EGP"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-neutral-700">
                        {lang === "ar" ? "الفئة / القسم" : "Category"}
                      </label>
                      <select
                        value={prodCategoryId}
                        onChange={(e) => setProdCategoryId(e.target.value)}
                        className="w-full bg-white border border-neutral-300 focus:border-black focus:ring-4 focus:ring-black/5 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200 shadow-2xs"
                      >
                        <option value="">{lang === "ar" ? "-- اختياري --" : "-- Optional --"}</option>
                        {catalogData.categories.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {lang === "ar" ? c.name_ar || c.name_en : c.name_en}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-neutral-700">
                        {lang === "ar" ? "المجموعة (Collection)" : "Collection"}
                      </label>
                      <select
                        value={prodCollectionId}
                        onChange={(e) => setProdCollectionId(e.target.value)}
                        className="w-full bg-white border border-neutral-300 focus:border-black focus:ring-4 focus:ring-black/5 rounded-xl px-3.5 py-2.5 text-sm outline-none transition-all duration-200 shadow-2xs"
                      >
                        <option value="">{lang === "ar" ? "-- بدون مجموعة (اختياري) --" : "-- None (Optional) --"}</option>
                        {catalogData.collections.map((col: any) => (
                          <option key={col.id} value={col.id}>
                            {lang === "ar" ? col.name_ar || col.name_en : col.name_en}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Card 3: Multi-Image Product Gallery Studio */}
                <div className="bg-[#FAFBFB] border border-neutral-200/70 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                        <Camera className="w-4 h-4 text-neutral-500" />
                        {lang === "ar"
                          ? "معرض صور المنتج (زوايا التصوير المتعددة)"
                          : "Product Photo Gallery (Multiple Angles)"}
                      </label>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {lang === "ar"
                          ? "الصورة الأولى رئيسية بالمتجر. الصورة الثانية تظهر كزاوية تفاعلية عند تمرير الماوس."
                          : "First image is main. Second image reveals as hover angle."}
                      </p>
                    </div>

                    <label className="inline-flex items-center gap-2 bg-[#111214] hover:bg-[#292B2E] active:scale-95 text-white text-xs font-bold uppercase px-4 py-2.5 cursor-pointer rounded-xl shadow-md transition-all duration-200">
                      <Camera className="w-4 h-4 text-[#BFC2C6]" />
                      <span>{lang === "ar" ? "رفع صور من جهازك" : "Upload Photos"}</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) =>
                          handleMediaUpload(e, (u) => {
                            setProdImages((prev) => [...prev, u]);
                            if (!prodImageUrl) setProdImageUrl(u);
                          })
                        }
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Drag-and-drop / upload banner */}
                  <label className="border-2 border-dashed border-neutral-300 hover:border-black/50 bg-white hover:bg-neutral-50/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 group">
                    <div className="w-10 h-10 rounded-full bg-neutral-100 group-hover:bg-neutral-200 flex items-center justify-center text-neutral-600 transition-colors">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-bold text-neutral-700">
                      {lang === "ar"
                        ? "اضغط هنا لاختيار صور من جهازك أو اسحب الصور إلى هنا"
                        : "Click to browse images or drag & drop files here"}
                    </span>
                    <span className="text-[10px] text-neutral-400">PNG, JPG, WEBP — High Resolution</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={(e) =>
                        handleMediaUpload(e, (u) => {
                          setProdImages((prev) => [...prev, u]);
                          if (!prodImageUrl) setProdImageUrl(u);
                        })
                      }
                      className="hidden"
                    />
                  </label>

                  {/* Add Image URL directly */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={prodImageUrl}
                      onChange={(e) => setProdImageUrl(e.target.value)}
                      placeholder={lang === "ar" ? "أو الصق رابط صورة خارجي واضغط إضافة..." : "Or paste image URL here and click add..."}
                      className="flex-1 bg-white border border-neutral-300 focus:border-black focus:ring-4 focus:ring-black/5 rounded-xl px-3.5 py-2 text-xs outline-none transition-all shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (prodImageUrl.trim()) {
                          setProdImages((prev) => [...prev, prodImageUrl.trim()]);
                          setProdImageUrl("");
                        }
                      }}
                      className="bg-white hover:bg-neutral-100 active:scale-95 border border-neutral-300 text-jet px-4 py-2 text-xs font-bold uppercase rounded-xl transition-all shadow-2xs shrink-0 cursor-pointer"
                    >
                      {lang === "ar" ? "إضافة للمعرض" : "Add to Gallery"}
                    </button>
                  </div>

                  {/* Gallery Preview Grid with Interactive Controls */}
                  {prodImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-2">
                      {prodImages.map((imgUrl, i) => (
                        <div
                          key={i}
                          className={`group relative bg-white border rounded-2xl p-2 space-y-2 flex flex-col items-center transition-all duration-300 hover:shadow-md ${
                            i === 0
                              ? "border-black ring-2 ring-black/10 shadow-sm"
                              : "border-neutral-200 hover:border-neutral-400"
                          }`}
                        >
                          <div className="w-full aspect-square bg-neutral-100/70 rounded-xl flex items-center justify-center overflow-hidden relative">
                            <img
                              src={imgUrl}
                              alt=""
                              className="w-full h-full object-contain p-1.5 transition-transform duration-300 group-hover:scale-105"
                            />
                            {i === 0 && (
                              <div className="absolute top-1.5 start-1.5 bg-black/85 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-xs">
                                <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                                <span>{lang === "ar" ? "رئيسية" : "Main"}</span>
                              </div>
                            )}
                          </div>

                          <div className="w-full flex items-center justify-between text-[11px] px-0.5">
                            <span className="font-mono text-neutral-400 text-[10px]">#{i + 1}</span>
                            <div className="flex items-center gap-1">
                              {i !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setProdImages((prev) => {
                                      const selected = prev[i];
                                      const rest = prev.filter((_, idx) => idx !== i);
                                      return [selected, ...rest];
                                    });
                                  }}
                                  className="p-1 rounded-md text-neutral-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                  title={lang === "ar" ? "تعيين كصورة رئيسية" : "Set as main"}
                                >
                                  <Star className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() =>
                                  setProdImages((prev) => prev.filter((_, idx) => idx !== i))
                                }
                                className="p-1 rounded-md text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title={lang === "ar" ? "حذف الصورة" : "Remove photo"}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card 4: Merchandising & Marketing Cards (روش وأنيق) */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700">
                    {lang === "ar" ? "شارات التمييز والعرض في المتجر" : "Merchandising Badges"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* New Arrival Card */}
                    <div
                      onClick={() => setProdIsNew(!prodIsNew)}
                      className={`cursor-pointer select-none rounded-2xl p-4 border transition-all duration-200 active:scale-98 flex items-center justify-between ${
                        prodIsNew
                          ? "bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white border-amber-500/40 shadow-sm ring-1 ring-amber-500/30"
                          : "bg-[#FAFBFB] border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                            prodIsNew ? "bg-amber-500 text-white shadow-sm" : "bg-neutral-200/70 text-neutral-500"
                          }`}
                        >
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-jet">
                            {lang === "ar" ? "وصل حديثاً" : "New Arrival"}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            {lang === "ar" ? "شارة برتقالية في المتجر" : "Display badge on card"}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          prodIsNew ? "bg-amber-500 border-amber-500 text-white" : "border-neutral-300 bg-white"
                        }`}
                      >
                        {prodIsNew && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Featured Product Card */}
                    <div
                      onClick={() => setProdIsFeatured(!prodIsFeatured)}
                      className={`cursor-pointer select-none rounded-2xl p-4 border transition-all duration-200 active:scale-98 flex items-center justify-between ${
                        prodIsFeatured
                          ? "bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-white border-blue-500/40 shadow-sm ring-1 ring-blue-500/30"
                          : "bg-[#FAFBFB] border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                            prodIsFeatured ? "bg-blue-600 text-white shadow-sm" : "bg-neutral-200/70 text-neutral-500"
                          }`}
                        >
                          <Star className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-jet">
                            {lang === "ar" ? "منتج مميز" : "Featured Product"}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            {lang === "ar" ? "يظهر في قسم المميز بالرئيسية" : "Showcase in homepage"}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          prodIsFeatured ? "bg-blue-600 border-blue-600 text-white" : "border-neutral-300 bg-white"
                        }`}
                      >
                        {prodIsFeatured && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>

                    {/* Best Seller Card */}
                    <div
                      onClick={() => setProdIsBestSeller(!prodIsBestSeller)}
                      className={`cursor-pointer select-none rounded-2xl p-4 border transition-all duration-200 active:scale-98 flex items-center justify-between ${
                        prodIsBestSeller
                          ? "bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/30"
                          : "bg-[#FAFBFB] border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                            prodIsBestSeller ? "bg-emerald-600 text-white shadow-sm" : "bg-neutral-200/70 text-neutral-500"
                          }`}
                        >
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-jet">
                            {lang === "ar" ? "الأكثر مبيعاً" : "Best Seller"}
                          </p>
                          <p className="text-[10px] text-neutral-500">
                            {lang === "ar" ? "شارة الأكثر طلباً من العملاء" : "Top community pick"}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                          prodIsBestSeller ? "bg-emerald-600 border-emerald-600 text-white" : "border-neutral-300 bg-white"
                        }`}
                      >
                        {prodIsBestSeller && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card 5: Smart Variant & Stock Matrix with 1-Click Fast Presets */}
                <div className="bg-[#FAFBFB] border border-neutral-200/70 rounded-2xl p-5 space-y-4 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-heading text-xs font-bold uppercase tracking-wider text-jet flex items-center gap-2">
                        <Layers className="w-4 h-4 text-neutral-500" />
                        {lang === "ar"
                          ? "مصفوفة المقاسات والألوان والمخزون المستقل"
                          : "VARIANT STOCK MATRIX (SIZE + COLOR + SKU + STOCK)"}
                      </h3>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {lang === "ar"
                          ? "كل مقاس له كمية مخزون خاصة تُخصم تلقائياً عند تأكيد الدفع وتُسترجع عند الإلغاء."
                          : "Each size variant maintains dedicated inventory with automated deduction & restoration."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const last = prodVariants[prodVariants.length - 1];
                        setProdVariants([
                          ...prodVariants,
                          {
                            sku: "",
                            size: "",
                            colorEn: last?.colorEn || "",
                            colorAr: last?.colorAr || "",
                            colorHex: "#111111",
                            onHand: 5,
                          },
                        ]);
                      }}
                      className="text-xs bg-[#111214] hover:bg-[#292B2E] active:scale-95 text-white px-4 py-2 font-bold flex items-center gap-1.5 rounded-xl shadow-md transition-all cursor-pointer shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{lang === "ar" ? "إضافة مقاس/لون مخصص" : "Add Custom Variant"}</span>
                    </button>
                  </div>

                  {/* 1-Click Quick Size Preset Buttons */}
                  <div className="bg-white border border-neutral-200 rounded-xl p-3 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-neutral-600 me-1">
                      <span className="inline-flex items-center gap-1 font-bold text-neutral-700 me-1"><Sparkles className="w-3.5 h-3.5 text-amber-500" /><span>{lang === "ar" ? "إضافة سريعة للمقاسات:" : "1-Click Size Presets:"}</span></span>
                    </span>
                    {(prodProductType === "SHOES"
                      ? ["39", "40", "41", "42", "43", "44", "45", "46"]
                      : ["S", "M", "L", "XL", "2XL", "3XL", "Oversized"]
                    ).map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => {
                          const last = prodVariants[prodVariants.length - 1];
                          setProdVariants([
                            ...prodVariants,
                            {
                              sku: "",
                              size: sz,
                              colorEn: last?.colorEn || "Black",
                              colorAr: last?.colorAr || "أسود",
                              colorHex: last?.colorHex || "#111111",
                              onHand: 5,
                            },
                          ]);
                        }}
                        className="px-2.5 py-1 text-xs font-mono font-bold bg-neutral-100 hover:bg-[#111214] hover:text-white rounded-lg border border-neutral-200 transition-all active:scale-90 cursor-pointer"
                        title={lang === "ar" ? `إضافة مقاس ${sz}` : `Add size ${sz}`}
                      >
                        {prodProductType === "SHOES" ? `EU ${sz}` : sz}
                      </button>
                    ))}
                  </div>

                  {/* 1-Click Quick Color Palette Presets */}
                  <div className="bg-white border border-neutral-200 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-neutral-700 inline-flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{lang === "ar" ? "لوحة الألوان الجاهزة (اضغط لتطبيق اللون):" : "Color Palette Presets (Click to apply):"}</span>
                      </span>

                      {prodVariants.length > 0 && (
                        <span className="text-[10px] text-neutral-500 font-medium bg-neutral-100 px-2 py-0.5 rounded">
                          {lang === "ar" ? "اضغط على أي لون لتطبيقه فوراً على كل المقاسات الحالية" : "Clicking any color applies it to all rows"}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {STANDARD_COLORS.map((col) => {
                        const light = isColorLight(col.hex);
                        return (
                          <button
                            key={col.en}
                            type="button"
                            onClick={() => {
                              if (prodVariants.length === 0) {
                                setProdVariants([
                                  {
                                    sku: "",
                                    size: prodProductType === "SHOES" ? "42" : "M",
                                    colorEn: col.en,
                                    colorAr: col.ar,
                                    colorHex: col.hex,
                                    onHand: 5,
                                  },
                                ]);
                              } else {
                                const updated = prodVariants.map((v) => ({
                                  ...v,
                                  colorEn: col.en,
                                  colorAr: col.ar,
                                  colorHex: col.hex,
                                }));
                                setProdVariants(updated);
                              }
                            }}
                            className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 hover:border-black bg-neutral-50 hover:bg-white text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-2xs hover:shadow-xs"
                            title={lang === "ar" ? `${col.ar} (${col.en})` : `${col.en} (${col.ar})`}
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded-full shadow-inner border shrink-0 ${
                                light ? "border-neutral-300" : "border-black/20"
                              }`}
                              style={{ backgroundColor: col.hex }}
                            />
                            <span className="text-[11px] text-neutral-800">
                              {lang === "ar" ? col.ar : col.en}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Variant Rows List */}
                  <div className="space-y-2.5">
                    {prodVariants.length === 0 ? (
                      <div className="p-8 border-2 border-dashed border-neutral-300 rounded-2xl text-center space-y-2 bg-white">
                        <Footprints className="w-8 h-8 mx-auto text-neutral-400" />
                        <p className="text-xs font-bold text-neutral-700">
                          {lang === "ar"
                            ? "لم يتم إضافة مقاسات أو ألوان لهذا الحذاء بعد"
                            : "No sizes or colors configured for this shoe yet"}
                        </p>
                        <p className="text-[11px] text-neutral-400">
                          {lang === "ar"
                            ? "اضغط على أزرار المقاسات السريعة بالأعلى (EU 40, 41, 42...) لإضافتها بضغطة زر واحدة."
                            : "Click any 1-Click Size button above (EU 40, 41, 42...) to add rows in seconds."}
                        </p>
                      </div>
                    ) : (
                      prodVariants.map((v, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-2 sm:grid-cols-6 gap-2.5 bg-white p-3 border border-neutral-200 hover:border-neutral-400 rounded-xl text-xs items-center transition-all shadow-2xs hover:shadow-xs"
                        >
                          <div>
                            <span className="block text-[10px] text-neutral-400 font-bold mb-0.5">
                              {lang === "ar" ? "كود التخزين" : "SKU"}
                            </span>
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) => {
                                const copy = [...prodVariants];
                                copy[idx].sku = e.target.value;
                                setProdVariants(copy);
                              }}
                              placeholder={lang === "ar" ? "تلقائي" : "Auto SKU"}
                              className="w-full border border-neutral-200 px-2.5 py-1.5 bg-neutral-50/70 focus:bg-white focus:border-black rounded-lg font-mono text-xs outline-none transition-all"
                            />
                          </div>

                          <div>
                            <span className="block text-[10px] text-neutral-400 font-bold mb-0.5">
                              {lang === "ar" ? "المقاس" : "Size"}
                            </span>
                            <input
                              type="text"
                              value={v.size}
                              onChange={(e) => {
                                const copy = [...prodVariants];
                                copy[idx].size = e.target.value;
                                setProdVariants(copy);
                              }}
                              placeholder="42"
                              className="w-full border border-neutral-200 px-2.5 py-1.5 bg-neutral-50/70 focus:bg-white focus:border-black rounded-lg font-bold text-xs outline-none transition-all"
                            />
                          </div>

                          {/* Visual Color Picker & Preset Dropdown */}
                          <div>
                            <span className="block text-[10px] text-neutral-400 font-bold mb-0.5">
                              {lang === "ar" ? "اللون ودرجته" : "Color & Hex"}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <label
                                className="relative w-8 h-8 rounded-lg border border-neutral-300 shadow-2xs cursor-pointer flex items-center justify-center shrink-0 overflow-hidden hover:scale-105 transition-transform"
                                style={{ backgroundColor: v.colorHex || "#111111" }}
                                title={lang === "ar" ? "اضغط لاختيار درجة اللون بدقة (Color Picker)" : "Click to pick exact color"}
                              >
                                <input
                                  type="color"
                                  value={v.colorHex || "#111111"}
                                  onChange={(e) => {
                                    const copy = [...prodVariants];
                                    copy[idx].colorHex = e.target.value;
                                    setProdVariants(copy);
                                  }}
                                  className="absolute opacity-0 inset-0 cursor-pointer w-full h-full"
                                />
                              </label>

                              <select
                                value={v.colorHex || "#111111"}
                                onChange={(e) => {
                                  const hex = e.target.value;
                                  const found = STANDARD_COLORS.find((c) => c.hex.toLowerCase() === hex.toLowerCase());
                                  const copy = [...prodVariants];
                                  copy[idx].colorHex = hex;
                                  if (found) {
                                    copy[idx].colorEn = found.en;
                                    copy[idx].colorAr = found.ar;
                                  }
                                  setProdVariants(copy);
                                }}
                                className="w-full border border-neutral-200 px-1.5 py-1.5 bg-neutral-50/70 focus:bg-white rounded-lg text-[11px] font-bold outline-none cursor-pointer"
                              >
                                <option value={v.colorHex || "#111111"}>
                                  {lang === "ar" ? "ألوان شائعة..." : "Presets..."}
                                </option>
                                {STANDARD_COLORS.map((col) => (
                                  <option key={col.en} value={col.hex}>
                                    {lang === "ar" ? col.ar : col.en}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* Bilingual Color Names */}
                          <div>
                            <span className="block text-[10px] text-neutral-400 font-bold mb-0.5">
                              {lang === "ar" ? "اسم اللون (AR / EN)" : "Color Name"}
                            </span>
                            <div className="grid grid-cols-2 gap-1">
                              <input
                                type="text"
                                value={v.colorAr}
                                onChange={(e) => {
                                  const copy = [...prodVariants];
                                  copy[idx].colorAr = e.target.value;
                                  setProdVariants(copy);
                                }}
                                placeholder="أسود"
                                title="Arabic Color Name"
                                className="w-full border border-neutral-200 px-1.5 py-1.5 bg-neutral-50/70 focus:bg-white focus:border-black rounded-lg text-[11px] outline-none transition-all"
                              />
                              <input
                                type="text"
                                value={v.colorEn}
                                onChange={(e) => {
                                  const copy = [...prodVariants];
                                  copy[idx].colorEn = e.target.value;
                                  setProdVariants(copy);
                                }}
                                placeholder="Black"
                                title="English Color Name"
                                className="w-full border border-neutral-200 px-1.5 py-1.5 bg-neutral-50/70 focus:bg-white focus:border-black rounded-lg text-[11px] outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div>
                            <span className="block text-[10px] text-emerald-600 font-bold mb-0.5">
                              {lang === "ar" ? "الكمية المتاحة" : "In Stock"}
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={v.onHand}
                              onChange={(e) => {
                                const copy = [...prodVariants];
                                copy[idx].onHand = e.target.value === "" ? "" : Number(e.target.value);
                                setProdVariants(copy);
                              }}
                              placeholder="5"
                              className="w-full border border-emerald-300 focus:border-emerald-600 px-2.5 py-1.5 bg-emerald-50/40 focus:bg-white rounded-lg font-mono font-bold text-xs outline-none transition-all"
                            />
                          </div>

                          <div className="pt-3 sm:pt-4 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setProdVariants(prodVariants.filter((_, i) => i !== idx))
                              }
                              className="inline-flex items-center gap-1 text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{lang === "ar" ? "حذف" : "Remove"}</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Form Action Footer */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="bg-[#111214] hover:bg-[#292B2E] active:scale-[0.99] text-white font-heading text-xs font-bold uppercase tracking-widest px-8 py-4 rounded-xl shadow-lg shadow-black/10 hover:shadow-xl transition-all duration-300 flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>
                      {prodId
                        ? lang === "ar"
                          ? "حفظ التعديلات على المنتج"
                          : "UPDATE PRODUCT DETAILS"
                        : lang === "ar"
                        ? "حفظ ونشر المنتج الجديد"
                        : "SAVE PRODUCT & PUBLISH"}
                    </span>
                  </button>

                  {prodId && (
                    <button
                      type="button"
                      onClick={() => {
                        setProdId("");
                        setProdNameEn("");
                        setProdNameAr("");
                        setProdDescEn("");
                        setProdDescAr("");
                        setProdRegularPrice("");
                        setProdSalePrice("");
                        setProdCategoryId("");
                        setProdCollectionId("");
                        setProdImageUrl("");
                        setProdImages([]);
                        setProdVariants([]);
                        setShowProductForm(false);
                      }}
                      className="border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-heading text-xs font-bold uppercase tracking-widest px-6 py-4 rounded-xl transition-all duration-200 cursor-pointer"
                    >
                      {lang === "ar" ? "إلغاء التعديل" : "CANCEL EDIT"}
                    </button>
                  )}
                </div>
              </form>
              )}

              {/* Existing Products List with Full Edit & Delete Control */}
              <div className="bg-white border border-silver/60 p-6 sm:p-8 space-y-5 rounded-2xl shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-silver/40 pb-4">
                  <div>
                    <h3 className="font-heading text-base font-bold text-jet">
                      {lang === "ar" ? "المنتجات والأحذية في المتجر" : "CURRENT CATALOG PRODUCTS"} (
                      {catalogData.products.length})
                    </h3>
                    <p className="text-xs text-neutralgray mt-0.5">
                      {lang === "ar"
                        ? "يمكنك تعديل أي منتج أو صوره أو حذفه بالكامل مع مخزونه"
                        : "Click Edit to update pricing, photos and sizes, or Delete to remove"}
                    </p>
                  </div>

                  <div className="w-full sm:w-72">
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => setProductSearchQuery(e.target.value)}
                      placeholder={lang === "ar" ? "ابحث باسم الحذاء، الموديل أو SKU..." : "Search by product name or SKU..."}
                      className="w-full border border-silver/70 rounded-xl px-3.5 py-2 text-xs bg-[#F7F7F5] focus:bg-white focus:outline-none focus:border-jet"
                    />
                  </div>
                </div>

                {(() => {
                  const visibleProducts = catalogData.products.filter((p: any) => {
                    if (!productSearchQuery.trim()) return true;
                    const variantTokens = (p.variants || []).flatMap((v: any) => [
                      v.sku,
                      v.color_en,
                      v.color_ar,
                      v.size,
                    ]);
                    return matchesBilingualSearch(
                      productSearchQuery,
                      p.name_en,
                      p.name_ar,
                      p.slug,
                      p.brand,
                      p.category_name_en,
                      p.category_name_ar,
                      p.collection_name_en,
                      p.collection_name_ar,
                      ...variantTokens
                    );
                  });

                  if (visibleProducts.length === 0) {
                    return (
                      <p className="text-xs text-neutralgray py-8 text-center">
                        {productSearchQuery
                          ? (lang === "ar" ? "لا توجد نتائج مطابقة لبحثك." : "No products matching your search.")
                          : (lang === "ar" ? "لا توجد منتجات مضافة بعد." : "No products created yet.")}
                      </p>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {visibleProducts.map((p: any) => {
                        const totalAvail = (p.variants || []).reduce(
                          (sum: number, v: any) => sum + Math.max(0, Number(v.on_hand || 0)),
                          0
                        );
                        return (
                          <div
                            key={p.id}
                            className="bg-white border border-[#E5E7EB] hover:border-black p-5 sm:p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 text-xs rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group"
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 min-w-0 w-full lg:w-auto flex-1">
                              {/* Product Thumbnail with hover zoom */}
                              {p.images && p.images[0] ? (
                                <div className="relative shrink-0">
                                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-neutral-100 rounded-2xl p-2 border border-neutral-200/80 overflow-hidden flex items-center justify-center">
                                    <img
                                      src={p.images[0].url || p.images[0].image_url}
                                      alt={p.name_en}
                                      className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-110"
                                    />
                                  </div>
                                  {p.images.length > 1 && (
                                    <span className="absolute -bottom-1 -end-1 bg-[#111214] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xs border border-white/20">
                                      +{p.images.length - 1}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-neutral-100 border border-neutral-200 rounded-2xl flex items-center justify-center shrink-0 text-[10px] text-neutral-400 font-bold">
                                  {lang === "ar" ? "بدون صورة" : "No image"}
                                </div>
                              )}

                              {/* Info Column */}
                              <div className="space-y-2 min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-heading font-bold text-sm sm:text-base text-jet">
                                    {lang === "ar" ? p.name_ar || p.name_en : p.name_en}
                                  </h4>
                                  {lang === "ar" && p.name_en !== p.name_ar && (
                                    <span className="text-neutral-400 font-normal text-xs font-mono">
                                      ({p.name_en})
                                    </span>
                                  )}

                                  {/* Marketing Badges */}
                                  {Boolean(p.is_new_arrival) && (
                                    <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      {lang === "ar" ? "وصل حديثاً" : "New"}
                                    </span>
                                  )}
                                  {Boolean(p.is_featured) && (
                                    <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      {lang === "ar" ? "مميز" : "Featured"}
                                    </span>
                                  )}
                                  {Boolean(p.is_best_seller) && (
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                      {lang === "ar" ? "الأكثر مبيعاً" : "Best Seller"}
                                    </span>
                                  )}
                                </div>

                                {/* Price and Total Stock Pill */}
                                <div className="flex flex-wrap items-center gap-3 text-neutral-600">
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <span className="text-jet text-sm">
                                      {formatCurrency(p.regular_price, lang)}
                                    </span>
                                    {p.sale_price && (
                                      <span className="text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-xs">
                                        {lang === "ar" ? "تخفيض: " : "Sale: "}
                                        {formatCurrency(p.sale_price, lang)}
                                      </span>
                                    )}
                                  </div>

                                  <span className="text-neutral-300">|</span>

                                  {/* Total stock counter */}
                                  <div
                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                      totalAvail <= 0
                                        ? "bg-red-50 text-red-700 border border-red-200"
                                        : totalAvail <= 5
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-neutral-100 text-neutral-800 border border-neutral-200"
                                    }`}
                                  >
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        totalAvail <= 0
                                          ? "bg-red-500"
                                          : totalAvail <= 5
                                          ? "bg-amber-500 animate-pulse"
                                          : "bg-emerald-500"
                                      }`}
                                    />
                                    <span>
                                      {lang === "ar" ? "إجمالي المتوفر: " : "Total Stock: "}
                                      <strong>{totalAvail}</strong> {lang === "ar" ? "قطعة" : "units"}
                                    </span>
                                  </div>

                                  <span className="text-neutral-300 hidden sm:inline">|</span>

                                  <code className="text-[11px] text-neutral-400 font-mono hidden sm:inline">
                                    /products/{p.slug}
                                  </code>
                                </div>

                                {/* Variant Stock Matrix Pills with colored stock indicators */}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {p.variants?.map((v: any) => {
                                    const avail = Math.max(0, Number(v.on_hand || 0));
                                    const isOutOfStock = avail <= 0;
                                    const isLow = avail > 0 && avail <= 3;
                                    return (
                                      <span
                                        key={v.id}
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-xl font-mono border transition-all ${
                                          isOutOfStock
                                            ? "bg-red-50/80 border-red-200 text-red-700 opacity-80"
                                            : isLow
                                            ? "bg-amber-50 border-amber-200 text-amber-800 font-bold"
                                            : "bg-[#F7F7F5] border-neutral-200 text-neutral-800"
                                        }`}
                                      >
                                        <span className="font-bold">
                                          {lang === "ar" ? v.color_ar || v.color_en : v.color_en} {p.product_type === "CLOTHING" || isNaN(Number(v.size)) ? v.size : 'EU ' + v.size}
                                        </span>
                                        <span className="text-neutral-300">•</span>
                                        <span
                                          className={`font-bold ${
                                            isOutOfStock
                                              ? "text-red-600 font-sans"
                                              : isLow
                                              ? "text-amber-700"
                                              : "text-emerald-700"
                                          }`}
                                        >
                                          {isOutOfStock
                                            ? (lang === "ar" ? "نفد المخزون" : "Out of stock")
                                            : isLow
                                            ? `${avail} ${lang === "ar" ? "متبقي" : "left"}`
                                            : `${avail} ${lang === "ar" ? "متاح" : "avail"}`}
                                        </span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-neutral-100">
                              <Link
                                href={`/products/${p.slug}`}
                                target="_blank"
                                className="border border-neutral-300 hover:border-black hover:bg-neutral-50 text-jet px-3.5 py-2 font-bold text-xs rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-2xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                                <span>{lang === "ar" ? "معاينة" : "Preview"}</span>
                              </Link>

                              <button
                                type="button"
                                onClick={() => {
                                  setShowProductForm(true);
                                  setProdId(p.id);
                                  setProdNameEn(p.name_en || "");
                                  setProdNameAr(p.name_ar || "");
                                  setProdDescEn(p.description_en || "");
                                  setProdDescAr(p.description_ar || "");
                                  setProdRegularPrice(String(p.regular_price || ""));
                                  setProdSalePrice(p.sale_price ? String(p.sale_price) : "");
                                  setProdCategoryId(p.category_id || "");
                                  setProdCollectionId(p.collection_id || "");
                                  setProdProductType(p.product_type === "CLOTHING" ? "CLOTHING" : "SHOES");
                                  setProdBrand(p.brand || "U3");
                                  setProdMaterialEn(p.material_en || "");
                                  setProdMaterialAr(p.material_ar || "");
                                  setProdIsNew(Boolean(p.is_new_arrival));
                                  setProdIsFeatured(Boolean(p.is_featured));
                                  setProdIsBestSeller(Boolean(p.is_best_seller));
                                  if (p.images && p.images.length > 0) {
                                    const urls = p.images
                                      .map((img: any) => img.url || img.image_url)
                                      .filter(Boolean);
                                    setProdImages(urls);
                                    setProdImageUrl(urls[0] || "");
                                  } else {
                                    setProdImages([]);
                                    setProdImageUrl("");
                                  }
                                  if (p.variants && p.variants.length > 0) {
                                    setProdVariants(
                                      p.variants.map((v: any) => ({
                                        id: v.id,
                                        sku: v.sku || "",
                                        size: v.size || "",
                                        colorEn: v.color_en || "",
                                        colorAr: v.color_ar || "",
                                        colorHex: v.color_hex || "#111111",
                                        onHand: Number(v.on_hand || 0),
                                      }))
                                    );
                                  }
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="bg-[#111214] hover:bg-[#292B2E] active:scale-95 text-white px-4 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>{lang === "ar" ? "تعديل" : "Edit"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  if (
                                    confirm(
                                      lang === "ar"
                                        ? `هل أنت متأكد من حذف الحذاء "${p.name_ar || p.name_en}" نهائياً من المتجر؟`
                                        : `Are you sure you want to permanently delete "${p.name_en}"?`
                                    )
                                  ) {
                                    await postAdminAction(
                                      { action: "delete_product", id: p.id },
                                      lang === "ar"
                                        ? "تم حذف المنتج بنجاح"
                                        : "Product deleted successfully"
                                    );
                                  }
                                }}
                                className="border border-red-200 hover:border-red-400 bg-red-50/50 hover:bg-red-50 text-red-600 px-3.5 py-2 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{lang === "ar" ? "حذف" : "Delete"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                );
              })()}
              </div>
            </div>
          )}

          {/* 3. COLLECTIONS */}
          {activeSection === "collections" && catalogData && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-silver/60 p-5 rounded-2xl shadow-xs">
                <div>
                  <h1 className="font-heading text-xl sm:text-2xl font-bold text-jet">
                    {lang === "ar" ? "إدارة المجموعات والتصنيفات" : "COLLECTIONS MANAGEMENT"}
                  </h1>
                  <p className="text-xs text-neutralgray mt-0.5">
                    {lang === "ar"
                      ? "إضافة وتعديل وحذف مجموعات الأحذية والملابس والتحكم في ظهورها في الصفحة الرئيسية."
                      : "Create, edit, and organize product collections for shoes and apparel on the homepage."}
                  </p>
                </div>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await postAdminAction({
                    action: "save_collection",
                    id: editingColId || undefined,
                    nameEn: colNameEn,
                    nameAr: colNameAr || colNameEn,
                    descriptionEn: colDescEn,
                    descriptionAr: colDescAr,
                    productType: colProductType,
                    showOnHomepage: colShowOnHomepage,
                    homepageSortOrder: Number(colHomepageSortOrder || 0),
                  }, editingColId ? (lang === "ar" ? "تم تحديث بيانات المجموعة بنجاح" : "Collection updated") : (lang === "ar" ? "تم حفظ المجموعة بنجاح" : "Collection created"));
                  setEditingColId(null);
                  setColNameEn("");
                  setColNameAr("");
                  setColDescEn("");
                  setColDescAr("");
                  setColProductType("SHOES");
                  setColShowOnHomepage(true);
                  setColHomepageSortOrder("0");
                }}
                className="bg-white border border-silver/60 p-6 space-y-4 rounded-3xl shadow-md relative overflow-hidden"
              >
                {/* Form Header with Edit Indicator & Cancel Button */}
                <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm text-jet">
                      {editingColId
                        ? (lang === "ar" ? "تعديل بيانات المجموعة الحالية" : "EDIT COLLECTION")
                        : (lang === "ar" ? "إضافة مجموعة جديدة" : "CREATE NEW COLLECTION")}
                    </span>
                    {editingColId && (
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2 py-0.5 rounded-full animate-pulse">
                        {lang === "ar" ? "وضع التعديل النشط" : "Editing Active"}
                      </span>
                    )}
                  </div>
                  {editingColId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingColId(null);
                        setColNameEn("");
                        setColNameAr("");
                        setColDescEn("");
                        setColDescAr("");
                        setColProductType("SHOES");
                        setColShowOnHomepage(true);
                        setColHomepageSortOrder("0");
                      }}
                      className="text-xs text-neutral-500 hover:text-red-600 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{lang === "ar" ? "إلغاء التعديل" : "Cancel"}</span>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700">{lang === "ar" ? "نوع المجموعة (القسم)" : "Collection Type"}</label>
                    <select
                      value={colProductType}
                      onChange={(e) => setColProductType(e.target.value as any)}
                      className="w-full border border-silver px-3 py-2 text-sm bg-offwhite rounded-xl"
                    >
                      <option value="SHOES">{lang === "ar" ? "أحذية (SHOES)" : "SHOES"}</option>
                      <option value="CLOTHING">{lang === "ar" ? "ملابس (CLOTHING)" : "CLOTHING"}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700">{lang === "ar" ? "اسم المجموعة (إنجليزي) *" : "Collection Name (EN) *"}</label>
                    <input
                      type="text"
                      required
                      value={colNameEn}
                      onChange={(e) => setColNameEn(e.target.value)}
                      placeholder="e.g. Streetwear Essentials"
                      className="w-full border border-silver px-3 py-2 text-sm bg-offwhite rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-neutral-700">{lang === "ar" ? "اسم المجموعة (عربي) *" : "Collection Name (AR) *"}</label>
                    <input
                      type="text"
                      required
                      value={colNameAr}
                      onChange={(e) => setColNameAr(e.target.value)}
                      placeholder="مثال: أساسيات الستريت وير"
                      className="w-full border border-silver px-3 py-2 text-sm bg-offwhite rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-jet">
                    <input
                      type="checkbox"
                      checked={colShowOnHomepage}
                      onChange={(e) => setColShowOnHomepage(e.target.checked)}
                      className="w-4 h-4 rounded text-black focus:ring-black"
                    />
                    <span>{lang === "ar" ? "عرض هذه المجموعة في الصفحة الرئيسية كـ Carousel أفقي" : "Display on Homepage as Horizontal Carousel"}</span>
                  </label>

                  <div className="flex items-center gap-2 text-xs">
                    <label className="font-bold text-neutral-700">{lang === "ar" ? "ترتيب الظهور:" : "Sort Order:"}</label>
                    <input
                      type="number"
                      value={colHomepageSortOrder}
                      onChange={(e) => setColHomepageSortOrder(e.target.value)}
                      className="w-16 border border-silver px-2 py-1 text-xs bg-offwhite rounded-lg text-center"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-[#111214] hover:bg-[#292B2E] text-white font-heading text-xs font-bold uppercase py-2.5 px-6 rounded-xl transition-all active:scale-95 cursor-pointer shadow-sm"
                >
                  {editingColId ? (lang === "ar" ? "تحديث بيانات المجموعة" : "Update Collection") : (lang === "ar" ? "حفظ المجموعة" : "Save Collection")}
                </button>
              </form>

              <div className="bg-white border border-silver/60 p-6 space-y-3 rounded-2xl shadow-xs">
                <h3 className="font-heading text-sm font-bold text-jet uppercase tracking-wider mb-2">
                  {lang === "ar" ? "المجموعات الحالية" : "Active Collections"}
                </h3>
                {catalogData.collections.map((col: any) => (
                  <div
                    key={col.id}
                    className="border border-silver/50 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs bg-offwhite rounded-xl"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        col.product_type === "CLOTHING"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-neutral-100 text-neutral-800 border-neutral-200"
                      }`}>
                        {col.product_type === "CLOTHING" ? "CLOTHING" : "SHOES"}
                      </span>
                      <span>
                        <strong>{col.name_en}</strong> / <strong>{col.name_ar}</strong>
                      </span>
                      {col.show_on_homepage ? (
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                          {lang === "ar" ? "معروض بالرئيسية" : "On Homepage"}
                        </span>
                      ) : (
                        <span className="text-[10px] bg-neutral-100 text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded-full">
                          {lang === "ar" ? "مخفي من الرئيسية" : "Hidden"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingColId(col.id);
                          setColNameEn(col.name_en || "");
                          setColNameAr(col.name_ar || "");
                          setColDescEn(col.description_en || "");
                          setColDescAr(col.description_ar || "");
                          setColProductType(col.product_type || "SHOES");
                          setColShowOnHomepage(Boolean(col.show_on_homepage));
                          setColHomepageSortOrder(String(col.homepage_sort_order || 0));
                          window.scrollTo({ top: 250, behavior: "smooth" });
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-[#111214] hover:text-white border border-silver/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-neutral-500" />
                        <span>{lang === "ar" ? "تعديل" : "Edit"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm(lang === "ar" ? `هل أنت متأكد من حذف مجموعة "${col.name_ar || col.name_en}"؟` : `Delete collection "${col.name_en}"?`)) return;
                          await postAdminAction({ action: "delete_collection", id: col.id }, lang === "ar" ? "تم حذف المجموعة بنجاح" : "Collection deleted");
                        }}
                        className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title={lang === "ar" ? "حذف المجموعة" : "Delete Collection"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <Link
                        href={`/collections/${col.slug}`}
                        target="_blank"
                        className="text-[11px] text-neutral-400 font-mono hover:text-black flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-neutral-100 transition-colors"
                      >
                        <code>/collections/{col.slug}</code>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. INVENTORY MANAGEMENT */}
          {activeSection === "inventory" && catalogData && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="font-heading text-2xl font-bold">
                  {lang === "ar"
                    ? "إدارة المخزون وحركات السحب والحجز"
                    : "VARIANT INVENTORY & STOCK MOVEMENTS"}
                </h1>
              </div>

              {/* Inventory Search & Filters Bar */}
              <div className="bg-white border border-silver/60 p-4 sm:p-5 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-4 gap-3 w-full">
                <div className="sm:col-span-2 relative">
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder={lang === "ar" ? "بحث باسم المنتج، المقاس، اللون، أو كود الصنف SKU..." : "Search by product name, size, color, or SKU..."}
                    className="w-full border border-silver/70 rounded-xl px-3.5 py-2.5 text-xs bg-[#F7F7F5] focus:bg-white focus:outline-none focus:border-jet"
                  />
                  {inventorySearch && (
                    <button
                      type="button"
                      onClick={() => setInventorySearch("")}
                      className="absolute end-3 top-1/2 -translate-y-1/2 text-neutralgray hover:text-jet flex items-center justify-center p-0.5"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={inventoryFilter}
                  onChange={(e: any) => setInventoryFilter(e.target.value)}
                  className="w-full border border-silver/70 rounded-xl px-3 py-2 text-xs bg-[#F7F7F5] focus:bg-white font-medium"
                >
                  <option value="ALL">{lang === "ar" ? "جميع حالات التوفر" : "All Stock Levels"}</option>
                  <option value="IN_STOCK">{lang === "ar" ? "متوفر بالمخزن" : "In Stock"}</option>
                  <option value="LOW_STOCK">{lang === "ar" ? "مخزون منخفض (≤ 3)" : "Low Stock (≤ 3)"}</option>
                  <option value="OUT_OF_STOCK">{lang === "ar" ? "نفد من المخزن (0)" : "Out of Stock (0)"}</option>
                </select>

                <select
                  value={inventorySortBy}
                  onChange={(e: any) => setInventorySortBy(e.target.value)}
                  className="w-full border border-silver/70 rounded-xl px-3 py-2 text-xs bg-[#F7F7F5] focus:bg-white font-medium"
                >
                  <option value="STOCK_DESC">{lang === "ar" ? "الأعلى مخزوناً أولاً" : "Highest Stock First"}</option>
                  <option value="STOCK_ASC">{lang === "ar" ? "الأقل مخزوناً أولاً" : "Lowest Stock First"}</option>
                  <option value="OUT_OF_STOCK">{lang === "ar" ? "المنتهي أولاً (نفد المخزون)" : "Out of Stock First"}</option>
                  <option value="NAME">{lang === "ar" ? "أبجدياً حسب المنتج" : "Alphabetical by Name"}</option>
                </select>
              </div>

              {/* Interactive In-Page Inventory Management (Mobile Cards & Desktop Table) */}
              {(() => {
                const allVariantRows: any[] = [];
                catalogData.products.forEach((p: any) => {
                  (p.variants || []).forEach((v: any) => {
                    allVariantRows.push({
                      ...v,
                      productName: lang === "ar" ? p.name_ar || p.name_en : p.name_en,
                      productNameEn: p.name_en,
                      productNameAr: p.name_ar || p.name_en,
                      colorName: lang === "ar" ? v.color_ar || v.color_en : v.color_en,
                      color_en: v.color_en,
                      color_ar: v.color_ar,
                    });
                  });
                });

                // 1. Search Filter — Full Bilingual Normalization
                let filtered = allVariantRows.filter((item) => {
                  if (!inventorySearch) return true;
                  return matchesBilingualSearch(
                    inventorySearch,
                    item.sku,
                    item.productNameEn,
                    item.productNameAr,
                    item.color_en,
                    item.color_ar,
                    item.size
                  );
                });

                // 2. Stock Level Filter (using physical on_hand)
                filtered = filtered.filter((item) => {
                  const avail = Math.max(0, Number(item.on_hand || 0));
                  if (inventoryFilter === "OUT_OF_STOCK") return avail <= 0;
                  if (inventoryFilter === "LOW_STOCK") return avail > 0 && avail <= 3;
                  if (inventoryFilter === "IN_STOCK") return avail > 0;
                  return true;
                });

                // 3. Sorting
                filtered.sort((a, b) => {
                  const aAvail = Math.max(0, Number(a.on_hand || 0));
                  const bAvail = Math.max(0, Number(b.on_hand || 0));
                  if (inventorySortBy === "STOCK_DESC") return Number(b.on_hand) - Number(a.on_hand);
                  if (inventorySortBy === "STOCK_ASC") return Number(a.on_hand) - Number(b.on_hand);
                  if (inventorySortBy === "OUT_OF_STOCK") return aAvail - bAvail;
                  if (inventorySortBy === "NAME") return String(a.productName).localeCompare(String(b.productName));
                  return 0;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="bg-white border border-silver/60 rounded-2xl p-8 text-center text-xs text-neutralgray">
                      {lang === "ar" ? "لا توجد أصناف تطابق معايير البحث والفلترة." : "No variants match your search filter."}
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    {/* A. Mobile Phone Cards View (< md) */}
                    <div className="md:hidden space-y-3">
                      {filtered.map((v: any) => {
                        const avail = Math.max(0, Number(v.on_hand || 0));
                        const isEditing = editingInventoryId === v.id;
                        return (
                          <div
                            key={`mob-${v.id}`}
                            className={`bg-white border rounded-2xl p-4 space-y-3 shadow-xs transition-all ${
                              avail <= 0 ? "border-red-200 bg-red-50/20" : avail <= 3 ? "border-amber-200 bg-amber-50/20" : "border-silver/60"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono font-bold text-xs bg-[#111214] text-white px-2.5 py-1 rounded-lg">
                                {v.sku}
                              </span>
                              {avail <= 0 ? (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                  {lang === "ar" ? "نفد المخزون (0)" : "Out of Stock"}
                                </span>
                              ) : avail <= 3 ? (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  {lang === "ar" ? "منخفض" : "Low Stock"}
                                </span>
                              ) : (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  {lang === "ar" ? "متوفر" : "In Stock"}
                                </span>
                              )}
                            </div>

                            <div>
                              <h4 className="font-heading font-bold text-sm text-jet leading-snug">{v.productName}</h4>
                              <div className="flex items-center gap-2 mt-1 text-xs">
                                <span className="text-neutral-600 font-medium">{v.colorName}</span>
                                <span className="text-neutral-300">•</span>
                                <span className="font-mono font-bold bg-[#F7F7F5] px-2 py-0.5 rounded-md border border-silver/60">
                                  EU {v.size}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2.5 border-t border-silver/40 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-neutralgray font-medium">
                                  {lang === "ar" ? "الفعلي بالمخزن:" : "On-Hand:"}
                                </span>
                                {isEditing ? (
                                  <input
                                    type="number"
                                    min={0}
                                    autoFocus
                                    value={editingInventoryValue}
                                    onChange={(e) => setEditingInventoryValue(Number(e.target.value))}
                                    className="w-20 border-2 border-jet rounded-lg px-2 py-1 text-center font-bold text-sm bg-white"
                                  />
                                ) : (
                                  <span className="font-heading font-black text-base text-jet">{v.on_hand}</span>
                                )}
                              </div>

                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      postAdminAction({
                                        action: "adjust_inventory",
                                        variantId: v.id,
                                        newOnHand: Math.max(0, Number(editingInventoryValue)),
                                        reason: editingInventoryReason || "Mobile in-page inventory adjustment",
                                      });
                                      setEditingInventoryId(null);
                                    }}
                                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 font-bold text-xs rounded-xl shadow-2xs cursor-pointer"
                                  >
                                    {lang === "ar" ? "حفظ" : "Save"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingInventoryId(null)}
                                    className="border border-silver hover:bg-neutral-100 px-3 py-1.5 text-xs font-bold rounded-xl text-jet cursor-pointer"
                                  >
                                    {lang === "ar" ? "إلغاء" : "Cancel"}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingInventoryId(v.id);
                                    setEditingInventoryValue(Number(v.on_hand));
                                  }}
                                  className="bg-[#111214] hover:bg-[#292B2E] text-white px-3 py-1.5 font-bold text-xs rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95"
                                >
                                  {lang === "ar" ? "تعديل بالمخزن" : "Edit Stock"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* B. Desktop & Tablet Full Table (>= md) */}
                    <div className="hidden md:block bg-white border border-silver/60 rounded-2xl shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-jet text-offwhite">
                              <th className="p-3 text-start">{lang === "ar" ? "كود الصنف SKU" : "SKU"}</th>
                              <th className="p-3 text-start">
                                {lang === "ar" ? "المنتج / المقاس واللون" : "Product / Variant"}
                              </th>
                              <th className="p-3 text-center">
                                {lang === "ar" ? "الفعلي بالمخزن" : "On-Hand"}
                              </th>
                              <th className="p-3 text-center">
                                {lang === "ar" ? "المحجوز" : "Reserved"}
                              </th>
                              <th className="p-3 text-center">
                                {lang === "ar" ? "المتاح للبيع" : "Available"}
                              </th>
                              <th className="p-3 text-center">
                                {lang === "ar" ? "حالة التوفر" : "Status"}
                              </th>
                              <th className="p-3 text-end">
                                {lang === "ar" ? "تعديل المخزون المباشر" : "Direct Edit"}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-silver/40">
                            {filtered.map((v: any) => {
                              const avail = Math.max(0, Number(v.on_hand || 0));
                              const isEditing = editingInventoryId === v.id;

                              return (
                                <tr key={v.id} className={avail <= 0 ? "bg-red-50/40" : avail <= 3 ? "bg-amber-50/30" : ""}>
                                  <td className="p-3 font-mono font-bold text-jet">{v.sku}</td>
                                  <td className="p-3">
                                    <span className="font-bold text-jet">{v.productName}</span> —{" "}
                                    <span className="text-neutral-600">{v.colorName}</span> / <strong className="font-mono">EU {v.size}</strong>
                                  </td>
                                  <td className="p-3 text-center font-bold">
                                    {isEditing ? (
                                      <input
                                        type="number"
                                        min={0}
                                        autoFocus
                                        value={editingInventoryValue}
                                        onChange={(e) => setEditingInventoryValue(Number(e.target.value))}
                                        className="w-20 border-2 border-jet rounded-lg px-2 py-1 text-center font-bold text-sm bg-white"
                                      />
                                    ) : (
                                      <span className="font-heading font-bold text-sm">{v.on_hand}</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center text-neutral-400 font-bold">
                                    {v.reserved || 0}
                                  </td>
                                  <td className="p-3 text-center font-bold text-emerald-800">
                                    {avail}
                                  </td>
                                  <td className="p-3 text-center">
                                    {avail <= 0 ? (
                                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                                        {lang === "ar" ? "نفد المخزون (0)" : "Out of Stock"}
                                      </span>
                                    ) : avail <= 3 ? (
                                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                        {lang === "ar" ? "منخفض" : "Low Stock"}
                                      </span>
                                    ) : (
                                      <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        {lang === "ar" ? "متوفر" : "In Stock"}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-end">
                                    {isEditing ? (
                                      <div className="inline-flex items-center gap-1.5 flex-wrap justify-end">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            postAdminAction({
                                              action: "adjust_inventory",
                                              variantId: v.id,
                                              newOnHand: Math.max(0, Number(editingInventoryValue)),
                                              reason: editingInventoryReason || "In-page inventory adjustment",
                                            });
                                            setEditingInventoryId(null);
                                          }}
                                          className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 font-bold text-xs rounded-lg transition-colors shadow-2xs"
                                        >
                                          {lang === "ar" ? "حفظ" : "Save"}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setEditingInventoryId(null)}
                                          className="border border-silver hover:bg-neutral-100 px-2.5 py-1 text-xs font-bold rounded-lg transition-colors text-jet"
                                        >
                                          {lang === "ar" ? "إلغاء" : "Cancel"}
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingInventoryId(v.id);
                                          setEditingInventoryValue(Number(v.on_hand));
                                        }}
                                        className="bg-[#111214] hover:bg-[#292B2E] text-white px-3 py-1.5 font-bold text-xs rounded-xl transition-all shadow-2xs"
                                      >
                                        {lang === "ar" ? "تعديل بالمخزن" : "Edit Stock"}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="bg-white border border-silver/60 p-6 space-y-3">
                <h3 className="font-heading text-sm font-bold uppercase">
                  {lang === "ar" ? "سجل حركات المخزون" : "INVENTORY MOVEMENT AUDIT LOG"}
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {catalogData.movements.map((m: any) => (
                    <div
                      key={m.id}
                      className="border border-silver/40 p-2.5 text-xs bg-offwhite flex justify-between"
                    >
                      <span>
                        <strong>[{m.movement_type}]</strong> {m.sku} ({m.reason}) — OnHand:{" "}
                        {m.previous_on_hand} → {m.new_on_hand} | Reserved: {m.previous_reserved} →{" "}
                        {m.new_reserved}
                      </span>
                      <span className="text-neutralgray">
                        {new Date(m.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. ORDERS & GLOBAL ADMIN SEARCH */}
          {activeSection === "orders" && ordersData && (
            <div className="space-y-6">
              <h1 className="font-heading text-2xl font-bold">
                {lang === "ar"
                  ? "إدارة الطلبات والبحث الشامل"
                  : "GLOBAL ORDER SEARCH & FULFILLMENT"}
              </h1>

              {/* Department Content Filter Pills (All / Shoes / Clothing / Mixed) */}
              <div className="bg-white border border-silver/60 p-3.5 sm:p-4 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-jet uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-neutral-500" />
                    <span>{lang === "ar" ? "فلترة حسب محتوى الطلب (أحذية / ملابس / مشترك)" : "Filter by Order Department Content"}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {lang === "ar" ? `${ordersData.orders.length} طلب إجمالي` : `${ordersData.orders.length} total orders`}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "ALL", ar: "جميع الطلبات", en: "All Orders", icon: ShoppingCart, count: ordersData.orders.length },
                    { id: "SHOES", ar: "طلبات الأحذية فقط", en: "Shoes Only", icon: Footprints, count: ordersData.orders.filter((o: any) => getOrderDeptType(o) === "SHOES").length },
                    { id: "CLOTHING", ar: "طلبات الملابس فقط", en: "Clothing Only", icon: Shirt, count: ordersData.orders.filter((o: any) => getOrderDeptType(o) === "CLOTHING").length },
                    { id: "MIXED", ar: "طلبات مشتركة (أحذية + ملابس)", en: "Mixed (Shoes + Clothing)", icon: Layers, count: ordersData.orders.filter((o: any) => getOrderDeptType(o) === "MIXED").length },
                  ].map((dept) => {
                    const isDeptActive = ordersDeptFilter === dept.id;
                    const IconDept = dept.icon;
                    return (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => {
                          setOrdersDeptFilter(dept.id as any);
                          setOrdersPage(1);
                        }}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                          isDeptActive
                            ? "bg-[#111214] text-white shadow-sm ring-1 ring-black"
                            : "bg-[#F7F7F5] text-neutral-600 hover:bg-neutral-200/70 border border-silver/70"
                        }`}
                      >
                        <IconDept className={`w-3.5 h-3.5 ${isDeptActive ? "text-emerald-400" : "text-neutral-500"}`} />
                        <span>{lang === "ar" ? dept.ar : dept.en}</span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                          isDeptActive ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"
                        }`}>
                          {dept.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Status Navigation Pills for 1-Tap Mobile & Desktop Filtering */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
                {[
                  { id: "ALL", ar: "الكل", en: "All" },
                  { id: "UNDER_REVIEW", ar: "مراجعة الدفع", en: "Under Review" },
                  { id: "ACTIVE", ar: "الطلبات النشطة", en: "Active" },
                  { id: "CONFIRMED", ar: "مؤكد", en: "Confirmed" },
                  { id: "PROCESSING", ar: "جاري التجهيز", en: "Processing" },
                  { id: "SHIPPED", ar: "تم الشحن", en: "Shipped" },
                  { id: "DELIVERED", ar: "تم التسليم", en: "Delivered" },
                  { id: "CANCELLED", ar: "ملغي", en: "Cancelled" },
                  { id: "RETURNED", ar: "مرتجع", en: "Returned" },
                  { id: "EXCHANGED", ar: "تم الاستبدال", en: "Exchanged" },
                ].map((tab) => {
                  const isActive = ordersViewTab === tab.id;
                  const count =
                    tab.id === "ALL"
                      ? ordersData.orders.length
                      : tab.id === "UNDER_REVIEW"
                      ? ordersData.orders.filter((o: any) => o.payment_status === "UNDER_REVIEW").length
                      : tab.id === "ACTIVE"
                      ? ordersData.orders.filter((o: any) => o.order_status !== "DELIVERED" && o.order_status !== "CANCELLED" && o.order_status !== "RETURNED" && o.order_status !== "EXCHANGED").length
                      : tab.id === "CANCELLED"
                      ? ordersData.orders.filter((o: any) => o.order_status === "CANCELLED").length
                      : tab.id === "RETURNED"
                      ? ordersData.orders.filter((o: any) => o.order_status === "RETURNED").length
                      : tab.id === "EXCHANGED"
                      ? ordersData.orders.filter((o: any) => o.order_status === "EXCHANGED").length
                      : ordersData.orders.filter((o: any) => o.order_status === tab.id).length;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setOrdersViewTab(tab.id as any);
                        setOrdersPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? "bg-[#111214] text-white shadow-xs"
                          : "bg-white text-neutral-600 border border-silver/60 hover:bg-neutral-50"
                      }`}
                    >
                      <span>{lang === "ar" ? tab.ar : tab.en}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                        isActive ? "bg-white/20 text-white" : count > 0 && tab.id === "UNDER_REVIEW" ? "bg-amber-100 text-amber-900" : "bg-neutral-100 text-neutral-500"
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Global Search, Filters & Sorting Bar */}
              <div className="bg-white border border-silver/60 p-4 sm:p-5 rounded-2xl shadow-xs grid grid-cols-1 sm:grid-cols-5 gap-3 w-full max-w-full min-w-0 box-border">
                <input
                  type="text"
                  value={globalQuery}
                  onChange={(e) => setGlobalQuery(e.target.value)}
                  placeholder={lang === "ar" ? "بحث برقم الطلب، الفاتورة، الاسم، الهاتف، SKU..." : "Search Order #, Invoice #, Name, Phone, SKU..."}
                  className="sm:col-span-2 w-full max-w-full min-w-0 box-border border border-silver/70 rounded-xl px-3.5 py-2.5 text-xs bg-[#F7F7F5] focus:bg-white focus:outline-none focus:border-jet"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="w-full max-w-full min-w-0 box-border truncate overflow-hidden border border-silver/70 rounded-xl px-3 py-2 text-xs bg-[#F7F7F5] focus:bg-white"
                >
                  <option value="">{lang === "ar" ? "جميع حالات الطلب" : "All Order Statuses"}</option>
                  <option value="PENDING_PAYMENT">{lang === "ar" ? "قيد انتظار الدفع" : "Pending Payment"}</option>
                  <option value="PAYMENT_UNDER_REVIEW">{lang === "ar" ? "مراجعة الدفع" : "Payment Under Review"}</option>
                  <option value="CONFIRMED">{lang === "ar" ? "مؤكد" : "Confirmed"}</option>
                  <option value="PROCESSING">{lang === "ar" ? "جاري التجهيز" : "Processing"}</option>
                  <option value="SHIPPED">{lang === "ar" ? "تم الشحن" : "Shipped"}</option>
                  <option value="DELIVERED">{lang === "ar" ? "تم التسليم" : "Delivered"}</option>
                  <option value="CANCELLED">{lang === "ar" ? "ملغي" : "Cancelled"}</option>
                  <option value="RETURNED">{lang === "ar" ? "مرتجع" : "Returned"}</option>
                  <option value="EXCHANGED">{lang === "ar" ? "تم الاستبدال" : "Exchanged"}</option>
                </select>
                <select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  className="w-full max-w-full min-w-0 box-border truncate overflow-hidden border border-silver/70 rounded-xl px-3 py-2 text-xs bg-[#F7F7F5] focus:bg-white"
                >
                  <option value="">{lang === "ar" ? "جميع حالات الدفع" : "All Payment Statuses"}</option>
                  <option value="AWAITING_PAYMENT">{lang === "ar" ? "بانتظار الدفع" : "Awaiting Payment"}</option>
                  <option value="UNDER_REVIEW">{lang === "ar" ? "قيد المراجعة" : "Under Review"}</option>
                  <option value="PAID">{lang === "ar" ? "مدفوع" : "Paid"}</option>
                  <option value="REJECTED">{lang === "ar" ? "مرفوض" : "Rejected"}</option>
                </select>
                <select
                  value={ordersSortBy}
                  onChange={(e: any) => setOrdersSortBy(e.target.value)}
                  className="w-full max-w-full min-w-0 box-border truncate overflow-hidden border border-silver/70 rounded-xl px-3 py-2 text-xs bg-[#F7F7F5] focus:bg-white font-medium"
                >
                  <option value="NEWEST">{lang === "ar" ? "الأحدث أولاً" : "Newest First"}</option>
                  <option value="OLDEST">{lang === "ar" ? "الأقدم أولاً" : "Oldest First"}</option>
                  <option value="AMOUNT_DESC">{lang === "ar" ? "الأعلى قيمة" : "Highest Amount"}</option>
                  <option value="AMOUNT_ASC">{lang === "ar" ? "الأقل قيمة" : "Lowest Amount"}</option>
                </select>
              </div>

              {(() => {
                const filtered = ordersData.orders.filter((o: any) => {
                  if (globalQuery && globalQuery.trim()) {
                    const itemTokens = (o.items || []).flatMap((it: any) => [
                      it.product_name_en_snapshot,
                      it.product_name_ar_snapshot,
                      it.sku_snapshot,
                      it.color_en_snapshot,
                      it.color_ar_snapshot,
                      it.size_snapshot,
                    ]);
                    const matches = matchesBilingualSearch(
                      globalQuery,
                      o.order_number,
                      o.customer_name,
                      o.customer_phone,
                      o.customer_email,
                      o.tracking_number,
                      o.shipping_city,
                      o.shipping_address,
                      o.invoice_number,
                      ...itemTokens
                    );
                    if (!matches) return false;
                  }
                  if (ordersViewTab === "ACTIVE")
                    return o.order_status !== "DELIVERED" && o.order_status !== "CANCELLED" && o.order_status !== "RETURNED" && o.order_status !== "EXCHANGED";
                  if (ordersViewTab === "UNDER_REVIEW")
                    return o.payment_status === "UNDER_REVIEW";
                  if (ordersViewTab === "CONFIRMED")
                    return o.order_status === "CONFIRMED";
                  if (ordersViewTab === "PROCESSING")
                    return o.order_status === "PROCESSING";
                  if (ordersViewTab === "SHIPPED")
                    return o.order_status === "SHIPPED" || o.order_status === "OUT_FOR_DELIVERY";
                  if (ordersViewTab === "DELIVERED")
                    return o.order_status === "DELIVERED";
                  if (ordersViewTab === "CANCELLED")
                    return o.order_status === "CANCELLED";
                  if (ordersViewTab === "RETURNED")
                    return o.order_status === "RETURNED";
                  if (ordersViewTab === "EXCHANGED")
                    return o.order_status === "EXCHANGED";
                  return true;
                }).filter((o: any) => {
                  if (ordersDeptFilter === "ALL") return true;
                  return getOrderDeptType(o) === ordersDeptFilter;
                });

                const currentTabOrders = [...filtered].sort((a: any, b: any) => {
                  if (ordersSortBy === "NEWEST") {
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                  }
                  if (ordersSortBy === "OLDEST") {
                    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                  }
                  if (ordersSortBy === "AMOUNT_DESC") {
                    return Number(b.total_amount || 0) - Number(a.total_amount || 0);
                  }
                  if (ordersSortBy === "AMOUNT_ASC") {
                    return Number(a.total_amount || 0) - Number(b.total_amount || 0);
                  }
                  return 0;
                });

                const pageSize = 12;
                const totalPages = Math.ceil(currentTabOrders.length / pageSize) || 1;
                const safePage = Math.min(Math.max(ordersPage, 1), totalPages);
                const pagedOrders = currentTabOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

                return (
                  <div className="space-y-3">
                    {/* Expand All / Collapse All Controls & Count */}
                    {currentTabOrders.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <span className="text-xs text-neutralgray font-medium">
                          {lang === "ar" ? "إجمالي الطلبات المطابقة:" : "Total Matching Orders:"}{" "}
                          <strong className="text-jet font-mono font-bold">{currentTabOrders.length}</strong>{" "}
                          {lang === "ar" ? "طلب" : "orders"}
                          {totalPages > 1 && (
                            <span className="ms-2 text-jet font-bold bg-[#F0F1F3] px-2 py-0.5 rounded-md">
                              {lang === "ar" ? `صفحة ${safePage} من ${totalPages}` : `Page ${safePage} of ${totalPages}`}
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const allOpen = pagedOrders.every((o: any) => expandedOrders[o.id]);
                            const next: Record<string, boolean> = {};
                            if (!allOpen) {
                              pagedOrders.forEach((o: any) => {
                                next[o.id] = true;
                              });
                            }
                            setExpandedOrders(next);
                          }}
                          className="text-xs bg-white border border-silver/70 hover:border-jet px-3 py-1.5 rounded-xl font-bold text-jet transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>{lang === "ar" ? "توسيع / طي الصفحة الحالية" : "Expand / Collapse Page"}</span>
                        </button>
                      </div>
                    )}

                    {currentTabOrders.length === 0 ? (
                      <div className="bg-white border border-silver/60 p-8 text-center text-xs text-neutralgray rounded-2xl">
                        {lang === "ar"
                          ? ordersViewTab === "CANCELLED"
                            ? "لا توجد طلبات ملغية في هذا القسم."
                            : ordersViewTab === "SHIPPED"
                            ? "لا توجد طلبات في مرحلة الشحن حالياً."
                            : ordersViewTab === "PROCESSING"
                            ? "لا توجد طلبات قيد التجهيز حالياً."
                            : ordersViewTab === "CONFIRMED"
                            ? "لا توجد طلبات مؤكدة جديدة بانتظار التجهيز."
                            : ordersViewTab === "DELIVERED"
                            ? "لا توجد طلبات مُسلّمة في السجل حالياً."
                            : ordersViewTab === "UNDER_REVIEW"
                            ? "لا توجد إيصالات أو طلبات بانتظار التدقيق والمراجعة حالياً."
                            : "لا توجد طلبات مطابقة في هذا القسم."
                          : "No orders found in this view."}
                      </div>
                    ) : (
                      pagedOrders.map((o: any) => {
                        const isExpanded = Boolean(expandedOrders[o.id]);

                        return (
                          <div
                            key={o.id}
                            className="bg-white border border-silver/60 rounded-2xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
                          >
                            {/* 1. Compact Order Summary Bar (Single Row with Arrow Button) */}
                            <div
                              onClick={() => toggleOrderExpand(o.id)}
                              className="p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50/80 transition-colors select-none"
                            >
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {/* Toggle Arrow Button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleOrderExpand(o.id);
                                  }}
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-300 ${
                                    isExpanded
                                      ? "bg-[#111214] text-white border-[#111214] rotate-180 shadow-xs"
                                      : "bg-[#F7F7F5] text-jet border-silver/60 hover:bg-[#111214] hover:text-white"
                                  }`}
                                  aria-label={isExpanded ? "Collapse Order Details" : "Expand Order Details"}
                                >
                                  <ChevronDown className="w-4 h-4 transition-transform duration-300" />
                                </button>

                                {/* ID Badge */}
                                <div className="bg-[#111214] text-white px-2.5 sm:px-3 py-1 rounded-xl font-mono font-bold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs">
                                  <span className="text-silver/60 text-xs">{lang === "ar" ? "المعرف:" : "ID:"}</span>
                                  <span className="tracking-wide">#{o.order_number}</span>
                                </div>

                                {/* Order Department Badge (Shoes / Clothing / Mixed) */}
                                {(() => {
                                  const deptType = getOrderDeptType(o);
                                  if (deptType === "CLOTHING") {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-purple-50 text-purple-900 border border-purple-200 shadow-2xs">
                                        <Shirt className="w-3 h-3 text-purple-600" />
                                        <span>{lang === "ar" ? "ملابس فقط" : "CLOTHING"}</span>
                                      </span>
                                    );
                                  }
                                  if (deptType === "MIXED") {
                                    return (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-950 border border-emerald-300 shadow-2xs font-extrabold">
                                        <Layers className="w-3 h-3 text-emerald-600" />
                                        <span>{lang === "ar" ? "مشترك (أحذية + ملابس)" : "MIXED: SHOES + CLOTHING"}</span>
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-300 shadow-2xs">
                                      <Footprints className="w-3 h-3 text-neutral-600" />
                                      <span>{lang === "ar" ? "أحذية فقط" : "SHOES"}</span>
                                    </span>
                                  );
                                })()}

                                {/* Customer Name & Account Status */}
                                <div className="flex items-center gap-2">
                                  <span className="font-heading font-bold text-xs sm:text-sm text-jet">
                                    {o.customer_name}
                                  </span>
                                  {o.user_id || o.customer_type === "REGISTERED" ? (
                                    <span className="hidden md:inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold rounded-lg shadow-xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                      {lang === "ar" ? "عميل مسجل" : "Registered"}
                                    </span>
                                  ) : (
                                    <span className="hidden md:inline-flex items-center gap-1 bg-neutral-100 text-neutral-600 border border-neutral-300 px-2 py-0.5 text-[10px] font-bold rounded-lg shadow-xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                                      {lang === "ar" ? "زائر" : "Guest"}
                                    </span>
                                  )}
                                </div>

                                {/* Status Badges */}
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                      o.payment_status === "PAID"
                                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                        : o.payment_status === "UNDER_REVIEW"
                                        ? "bg-amber-50 text-amber-800 border-amber-300"
                                        : "bg-neutral-100 text-neutral-800 border-neutral-300"
                                    }`}
                                  >
                                    {o.payment_status === "PAID"
                                      ? lang === "ar" ? "مدفوع ومؤكد" : "PAID"
                                      : o.payment_status === "UNDER_REVIEW"
                                      ? lang === "ar" ? "قيد التدقيق" : "UNDER REVIEW"
                                      : lang === "ar" ? "بانتظار الدفع" : "AWAITING PAYMENT"}
                                  </span>

                                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#111214] text-white">
                                    {o.order_status === "DELIVERED"
                                      ? lang === "ar" ? "تم التسليم" : "Delivered"
                                      : o.order_status === "SHIPPED"
                                      ? lang === "ar" ? "تم الشحن" : "Shipped"
                                      : o.order_status === "PROCESSING"
                                      ? lang === "ar" ? "جاري التجهيز" : "Processing"
                                      : o.order_status === "CONFIRMED"
                                      ? lang === "ar" ? "مؤكد" : "Confirmed"
                                      : o.order_status}
                                  </span>
                                </div>
                              </div>

                              {/* Right: Date + Items Count + Total Price */}
                              <div className="flex items-center gap-3 sm:gap-5 ms-auto">
                                <div className="text-end hidden lg:block">
                                  <p className="text-[11px] text-neutralgray">
                                    {new Date(o.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  <p className="text-[10px] text-neutralgray/80 font-mono">
                                    {o.items?.length || 1} {lang === "ar" ? "منتج" : "items"}
                                  </p>
                                </div>

                                <div className="text-end">
                                  <p className="font-heading font-black text-sm sm:text-base text-jet">
                                    {formatCurrency(o.total_amount, lang)}
                                  </p>
                                  <span className="text-[10px] text-neutralgray font-medium">
                                    {o.payment_method_code === "VODAFONE_CASH" ? "Vodafone Cash" : "InstaPay"}
                                  </span>
                                </div>

                                {/* Direct Quick Actions: PDF & WhatsApp */}
                                <div className="flex items-center gap-1.5 ms-1">
                                  <a
                                    href={`/api/invoices?orderNumber=${encodeURIComponent(o.order_number)}&download=1`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-silver/80 hover:border-black bg-white text-jet text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                                    title={lang === "ar" ? "تحميل فاتورة PDF" : "Download PDF Invoice"}
                                  >
                                    <FileText className="w-3.5 h-3.5 text-jet" />
                                    <span className="hidden sm:inline">PDF</span>
                                  </a>
                                  {o.customer_phone && (
                                    <a
                                      href={`https://wa.me/2${o.customer_phone.replace(/^0/, "")}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-emerald-300 hover:border-emerald-600 bg-emerald-50 text-emerald-800 text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-colors shrink-0"
                                      title={lang === "ar" ? "محادثة واتساب" : "WhatsApp Chat"}
                                    >
                                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                      <span className="hidden sm:inline">واتساب</span>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* 2. Full Dropdown Details (يظهر فقط عند الضغط على السهم) */}
                            {isExpanded && (
                              <div className="border-t border-silver/50 p-4 sm:p-6 space-y-5 bg-[#FAFAFA]/70 animate-in fade-in slide-in-from-top-1 duration-200">
                                {/* Sub-Header: Order Timestamps & Logistics */}
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-silver/40 pb-3">
                                  <div className="flex flex-wrap items-center gap-2 text-xs">
                                    <span className="text-neutralgray">
                                      {lang === "ar" ? "تاريخ ووقت الطلب:" : "Order Placed:"}{" "}
                                      <strong className="text-jet">{new Date(o.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</strong>
                                    </span>
                                    {Number(o.revision_number || 1) > 1 && (
                                      <span className="bg-[#292B2E] text-white px-2 py-0.5 text-[10px] font-bold rounded-lg">
                                        REV #{o.revision_number}
                                      </span>
                                    )}
                                    {o.delivered_at && (
                                      <span className="bg-emerald-700 text-white px-2 py-0.5 text-[10px] font-bold rounded-lg flex items-center gap-1">
                                        <Check className="w-3 h-3 text-white inline" />
                                        <span>
                                          {lang === "ar" ? "تاريخ التسليم:" : "Delivered:"}{" "}
                                          {new Date(o.delivered_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}
                                        </span>
                                      </span>
                                    )}
                                  </div>

                                  {o.tracking_number && (
                                    <span className="bg-[#111214] text-white px-3 py-1 rounded-xl text-xs font-mono font-bold">
                                      {lang === "ar" ? "رقم الشحنة:" : "Tracking #:"} {o.tracking_number}
                                    </span>
                                  )}
                                </div>

                                {/* Live Visual Order Progress Stepper */}
                                <div className="bg-[#111214]/[0.02] border border-silver/50 p-4 rounded-2xl space-y-2.5">
                                  <div className="flex items-center justify-between text-[11px] font-bold uppercase text-neutralgray">
                                    <span>{lang === "ar" ? "مسار تقدم الطلب:" : "Order Progression Stepper:"}</span>
                                    <span className="font-mono text-jet flex items-center gap-1.5 font-bold">
                                      {o.order_status === "RETURNED" ? (
                                        <span className="text-orange-700 font-bold">{lang === "ar" ? "طلب مرتجع (تم استرجاع المنتجات للمخزون)" : "Returned (Stock Restored)"}</span>
                                      ) : o.order_status === "EXCHANGED" ? (
                                        <span className="text-blue-700 font-bold">{lang === "ar" ? "تم الاستبدال (تم تحديث المنتجات والمخزون)" : "Exchanged (Stock & Items Updated)"}</span>
                                      ) : o.order_status === "CANCELLED" ? (
                                        <span className="text-red-700 font-bold">{lang === "ar" ? "طلب ملغي" : "Cancelled"}</span>
                                      ) : o.order_status === "DELIVERED" ? (
                                        <>
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600 inline" />
                                          <span className="text-emerald-700">{lang === "ar" ? "تم التسليم بنجاح" : "Delivered Successfully"}</span>
                                        </>
                                      ) : o.order_status === "SHIPPED" ? (
                                        <span className="text-sky-700">{lang === "ar" ? "تم الشحن وفي الطريق للتسليم" : "In Transit"}</span>
                                      ) : o.order_status === "PROCESSING" ? (
                                        <span className="text-amber-700">{lang === "ar" ? "جاري التجهيز والتغليف" : "Processing"}</span>
                                      ) : o.payment_status === "PAID" || o.order_status === "CONFIRMED" ? (
                                        <span className="text-emerald-700">{lang === "ar" ? "تم تأكيد الدفع والطلب" : "Payment Confirmed"}</span>
                                      ) : (
                                        <span className="text-neutralgray">{lang === "ar" ? "بانتظار التحويل ومراجعة الدفع" : "Awaiting Payment"}</span>
                                      )}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px]">
                                    {[
                                      { key: "PLACED", labelAr: "1. استلام الطلب", labelEn: "1. Placed", active: true },
                                      {
                                        key: "PAID",
                                        labelAr: "2. تأكيد الدفع",
                                        labelEn: "2. Paid",
                                        active:
                                          o.payment_status === "PAID" ||
                                          ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.order_status),
                                      },
                                      {
                                        key: "PROCESSING",
                                        labelAr: "3. جاري التجهيز",
                                        labelEn: "3. Processing",
                                        active: ["PROCESSING", "SHIPPED", "DELIVERED"].includes(o.order_status),
                                      },
                                      {
                                        key: "SHIPPED",
                                        labelAr: "4. في الطريق",
                                        labelEn: "4. Shipped",
                                        active: ["SHIPPED", "DELIVERED"].includes(o.order_status),
                                      },
                                      {
                                        key: "DELIVERED",
                                        labelAr: "5. تم التسليم",
                                        labelEn: "5. Delivered",
                                        active: o.order_status === "DELIVERED",
                                      },
                                    ].map((step, sIdx) => (
                                      <div
                                        key={sIdx}
                                        className={`p-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 ${
                                          sIdx === 4 ? "col-span-2 sm:col-span-1" : ""
                                        } ${
                                          step.active
                                            ? "bg-[#111214] text-white shadow-xs"
                                            : "bg-white text-neutralgray border border-silver/40"
                                        }`}
                                      >
                                        {step.active && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
                                        <span>{lang === "ar" ? step.labelAr : step.labelEn}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Return & Exchange Visual Alerts */}
                                {o.order_status === "RETURNED" && (
                                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3.5 flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-600 flex items-center justify-center shrink-0">
                                      <RotateCcw className="w-4 h-4 text-red-600" />
                                    </div>
                                    <div className="space-y-1 flex-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-red-700 text-xs sm:text-sm">
                                          {lang === "ar" ? "طلب مرتجع: تم استرجاع المنتجات والكميات تلقائياً إلى رصيد المخزون" : "Returned Order: Inventory Restocked"}
                                        </span>
                                        <span className="text-[10px] bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-bold">
                                          {lang === "ar" ? "المخزون متاح" : "Restocked"}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-neutral-600">
                                        {lang === "ar"
                                          ? `تم استرجاع كميات جميع منتجات الطلب #${o.order_number} تلقائياً إلى رصيد المستودع، وتحديث حالة الطلب إلى مرتجع.`
                                          : `All items for Order #${o.order_number} have been returned to warehouse inventory.`}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {o.order_status === "EXCHANGED" && (
                                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3.5 flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 flex items-center justify-center shrink-0">
                                      <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-blue-700 text-xs sm:text-sm">
                                          {lang === "ar" ? "طلب مستبدل: تم استرجاع المنتج القديم وخصم البديل من المخزون" : "Exchanged Order: Stock Synced"}
                                        </span>
                                        <span className="text-[10px] bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">
                                          {lang === "ar" ? "تم التبديل بنجاح" : "Exchanged"}
                                        </span>
                                      </div>
                                      {o.revisions && o.revisions.length > 0 && o.revisions[0]?.change_type === "EXCHANGE" ? (
                                        <div className="bg-white/90 rounded-xl p-2.5 border border-blue-200 space-y-1.5 text-[11px]">
                                          <div className="font-bold text-neutral-900">
                                            {o.revisions[0].change_summary}
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[10px]">
                                            <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-amber-900 font-medium flex items-center gap-1.5">
                                              <ArrowLeft className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                                              <div>
                                                <span className="font-bold">{lang === "ar" ? "المنتج القديم:" : "Old Item:"}</span>
                                                {" "}{lang === "ar" ? "أعيد للمخزون (+1) بالمستودع" : "Restocked (+1) to warehouse"}
                                              </div>
                                            </div>
                                            <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-emerald-900 font-medium flex items-center gap-1.5">
                                              <ArrowRight className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                                              <div>
                                                <span className="font-bold">{lang === "ar" ? "المنتج البديل الجديد:" : "New Item:"}</span>
                                                {" "}{lang === "ar" ? "خُصم من المخزون (-1) وجاهز للتسليم" : "Deducted (-1) from warehouse"}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-[11px] text-neutral-600">
                                          {lang === "ar"
                                            ? "تم استبدال منتجات هذا الطلب وتحديث المخزون والفاتورة بنجاح."
                                            : "Exchange completed: Previous product restocked and replacement product dispatched."}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Detailed Customer Contact & Delivery Address Card */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F8F9FA] border border-silver/40 p-4 rounded-2xl">
                        {/* Customer Contact */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-heading font-bold uppercase tracking-wider text-neutralgray">
                            {lang === "ar" ? "بيانات العميل والتواصل" : "CUSTOMER CONTACT"}
                          </p>
                          <p className="font-bold text-jet text-sm">{o.customer_name}</p>
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            <a
                              href={`tel:${o.customer_phone}`}
                              className="font-mono text-xs text-jet hover:underline font-semibold flex items-center gap-1"
                            >
                              <Phone className="w-3.5 h-3.5 text-neutralgray inline" />
                              <span>{o.customer_phone}</span>
                            </a>
                            <a
                              href={`https://wa.me/20${String(o.customer_phone).replace(
                                /^0+/,
                                ""
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] px-2 py-0.5 font-bold rounded-xs flex items-center gap-1 transition-colors"
                            >
                              <MessageSquare className="w-3 h-3 text-white inline" />
                              <span>{lang === "ar" ? "واتساب" : "WhatsApp"}</span>
                            </a>
                          </div>
                          <p className="text-[11px] text-neutralgray flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-neutralgray inline" />
                            <span>{o.customer_email || (lang === "ar" ? "بدون بريد إلكتروني" : "No email")}</span>
                          </p>
                        </div>

                        {/* Detailed Shipping Address */}
                        <div className="space-y-1">
                          <p className="text-[10px] font-heading font-bold uppercase tracking-wider text-neutralgray">
                            {lang === "ar" ? "عنوان التوصيل بالتفصيل" : "DELIVERY ADDRESS IN DETAIL"}
                          </p>
                          <div className="font-bold text-jet flex flex-col gap-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <MapPin className="w-3.5 h-3.5 text-neutralgray inline shrink-0" />
                              <span className="text-black font-bold">
                                {o.governorate_name_ar || o.governorate_name_en}
                                {o.governorate_name_en && o.governorate_name_ar ? ` (${o.governorate_name_en})` : ""}
                              </span>
                              {o.governorate_id && (
                                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-neutral-100 text-neutral-600 rounded">
                                  {o.governorate_id}
                                </span>
                              )}
                            </div>
                            {(o.city_name_ar || o.city_name_en) && (
                              <div className="text-xs text-neutral-700 ps-5 flex items-center gap-1.5 flex-wrap">
                                <span>↳ {o.city_name_ar || o.city_name_en} {o.city_name_en && o.city_name_ar ? `(${o.city_name_en})` : ""}</span>
                                {o.city_id && (
                                  <span className="text-[10px] font-mono px-1 py-0.5 bg-neutral-100 text-neutral-500 rounded">
                                    {o.city_id}
                                  </span>
                                )}
                              </div>
                            )}
                            {(o.area_name_ar || o.area_name_en) && (
                              <div className="text-xs text-neutral-600 ps-8 flex items-center gap-1.5 flex-wrap">
                                <span>↳ {o.area_name_ar || o.area_name_en} {o.area_name_en && o.area_name_ar ? `(${o.area_name_en})` : ""}</span>
                                {o.area_id && (
                                  <span className="text-[10px] font-mono px-1 py-0.5 bg-neutral-100 text-neutral-500 rounded">
                                    {o.area_id}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <p className="text-jet">
                            {lang === "ar" ? "الشارع:" : "Street:"}{" "}
                            <strong>{o.street_address}</strong>
                          </p>
                          <p className="text-[11px] text-neutralgray">
                            {lang === "ar" ? "العمارة:" : "Bldg:"} {o.building_number} |{" "}
                            {lang === "ar" ? "الدور:" : "Floor:"} {o.floor_number || "-"} |{" "}
                            {lang === "ar" ? "الشقة:" : "Apt:"} {o.apartment_number || "-"}
                          </p>
                          {o.landmark && (
                            <p className="text-[11px] text-neutralgray flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5 text-neutralgray inline" />
                              <span>{lang === "ar" ? "علامة مميزة:" : "Landmark:"}{" "}
                              <strong>{o.landmark}</strong></span>
                            </p>
                          )}
                          {o.delivery_notes && (
                            <p className="text-[11px] text-amber-900 bg-amber-50 p-1.5 rounded-xs border border-amber-200 flex items-center gap-1">
                              <FileText className="w-3.5 h-3.5 text-amber-700 inline" />
                              <span>{lang === "ar" ? "ملاحظات العميل:" : "Notes:"}{" "}
                              {o.delivery_notes}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Order Items List + Size/Variant Swap Controls */}
                      {o.items && o.items.length > 0 && (
                        <div className="bg-offwhite border border-silver/40 p-3 space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-bold uppercase text-[10px] tracking-wider text-neutralgray">
                              {lang === "ar" ? "المنتجات والمقاسات المطلوبة" : "Order Items & Size/Variant Swap"}
                            </span>
                            <div className="flex items-center gap-3">
                              {/* Exchange Item Action Button */}
                              {o.order_status !== "CANCELLED" && o.order_status !== "RETURNED" && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setExchangingOrderId(exchangingOrderId === o.id ? null : o.id);
                                    if (exchangingOrderId !== o.id && o.items[0]) {
                                      setExchangeItemId(o.items[0].id);
                                      setExchangeVariantId(o.items[0].variant_id);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 underline"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>
                                    {exchangingOrderId === o.id
                                      ? lang === "ar"
                                        ? "إغلاق الاستبدال"
                                        : "Close Exchange"
                                      : lang === "ar"
                                      ? "استبدال منتج (Exchange)"
                                      : "Exchange Item"}
                                  </span>
                                </button>
                              )}
                              {!["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"].includes(o.order_status) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingOrderId(editingOrderId === o.id ? null : o.id)
                                  }
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-jet underline"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>
                                    {editingOrderId === o.id
                                      ? lang === "ar"
                                        ? "إغلاق التعديل"
                                        : "Close Editor"
                                      : lang === "ar"
                                      ? "تعديل المقاس / بيانات الطلب"
                                      : "Edit Order / Swap Size"}
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                          {o.items.map((it: any) => (
                            <div
                              key={it.id}
                              className="flex flex-wrap items-center justify-between gap-2 border-t border-silver/30 pt-2"
                            >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                  it.product_type_snapshot === "CLOTHING"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : "bg-neutral-100 text-neutral-800 border-neutral-200"
                                }`}>
                                  {it.product_type_snapshot === "CLOTHING" ? "CLOTHING" : "SHOES"}
                                </span>
                                <span>
                                  <strong>{it.product_name_en_snapshot}</strong> — {it.color_en_snapshot} /{" "}
                                  <strong>{it.product_type_snapshot === "CLOTHING" || isNaN(Number(it.size_snapshot)) ? it.size_snapshot : `EU ${it.size_snapshot}`}</strong> × {it.quantity} ({it.sku_snapshot})
                                </span>
                              </div>
                              <span className="font-bold">{formatCurrency(it.line_total, lang)}</span>
                            </div>
                          ))}

                          {exchangingOrderId === o.id && (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                const selectedItemId = String(fd.get("exchangeItemId") || o.items[0]?.id || "");
                                const selectedNewVarId = String(fd.get("exchangeVariantId") || "");
                                const reason = String(fd.get("exchangeReason") || exchangeReason);

                                if (!selectedNewVarId) {
                                  showNotification(lang === "ar" ? "يرجى اختيار المنتج/المقاس البديل" : "Please select a replacement variant", "error");
                                  return;
                                }

                                await postAdminAction(
                                  {
                                    action: "exchange_order_items",
                                    orderId: o.id,
                                    orderItemId: selectedItemId,
                                    newVariantId: selectedNewVarId,
                                    reason,
                                  },
                                  lang === "ar"
                                    ? `تم استبدال المنتج وتحديث المخزون للطلب #${o.order_number} بنجاح`
                                    : `Item exchanged & stock updated for order #${o.order_number}`
                                );
                                setExchangingOrderId(null);
                              }}
                              className="border-2 border-blue-400 rounded-xl p-3.5 mt-2 bg-blue-50/60 space-y-3"
                            >
                              <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                                <span className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                                  <RefreshCw className="w-3.5 h-3.5 text-blue-700" />
                                  <span>{lang === "ar" ? "استبدال منتج من الطلب (إرجاع القديم وخصم الجديد)" : "Exchange Item (Auto Restock & Deduct)"}</span>
                                </span>
                                <span className="text-[10px] text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full font-mono font-bold">
                                  {lang === "ar" ? "لوحة الإدارة" : "Admin Only"}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                <div>
                                  <label className="block text-[11px] font-bold text-neutral-800 mb-1">
                                    {lang === "ar" ? "المنتج المراد استبداله (سيعود للمخزون):" : "Item to Exchange (Returns to Stock):"}
                                  </label>
                                  <select
                                    name="exchangeItemId"
                                    defaultValue={o.items[0]?.id}
                                    className="w-full border border-silver/80 rounded-lg px-2.5 py-2 bg-white text-xs font-medium"
                                  >
                                    {o.items.map((it: any) => (
                                      <option key={it.id} value={it.id}>
                                        {it.product_name_en_snapshot} — {it.color_en_snapshot} / EU {it.size_snapshot} (Qty: {it.quantity})
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[11px] font-bold text-neutral-800 mb-1">
                                    {lang === "ar" ? "المنتج البديل من المخزون (سيُخصم من المخزون):" : "Replacement Variant (Deducts from Stock):"}
                                  </label>
                                  <select
                                    name="exchangeVariantId"
                                    defaultValue={exchangeVariantId || (ordersData.allVariants && ordersData.allVariants[0]?.id)}
                                    className="w-full border border-blue-300 rounded-lg px-2.5 py-2 bg-white text-xs font-medium"
                                  >
                                    {(ordersData.allVariants || []).map((av: any) => (
                                      <option key={av.id} value={av.id} disabled={av.available <= 0}>
                                        {av.product_name_en} — {av.color_en} / {av.size} ({av.available > 0 ? `${av.available} متوفر` : "نفد"})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-1">
                                <div className="sm:col-span-2">
                                  <label className="block text-[10px] font-bold text-neutral-700 mb-1">
                                    {lang === "ar" ? "سبب الاستبدال:" : "Exchange Reason:"}
                                  </label>
                                  <input
                                    name="exchangeReason"
                                    defaultValue={exchangeReason}
                                    placeholder={lang === "ar" ? "مثال: تبديل مقاس 40 إلى 42 بناءً على رغبة العميل" : "e.g. Size swap requested by customer"}
                                    className="w-full border border-silver/80 rounded-lg px-3 py-2 bg-white text-xs"
                                  />
                                </div>

                                <div className="flex gap-2">
                                  <button
                                    type="submit"
                                    className="flex-1 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs py-2 px-3 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{lang === "ar" ? "تأكيد الاستبدال" : "Confirm Exchange"}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setExchangingOrderId(null)}
                                    className="border border-silver/80 text-neutral-600 bg-white font-bold text-xs py-2 px-3 rounded-lg hover:bg-neutral-50 transition-colors"
                                  >
                                    {lang === "ar" ? "إلغاء" : "Cancel"}
                                  </button>
                                </div>
                              </div>
                            </form>
                          )}

                          {editingOrderId === o.id && o.items[0] && (
                            <form
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                await postAdminAction(
                                  {
                                    action: "edit_order",
                                    orderId: o.id,
                                    orderItemId: String(fd.get("orderItemId") || o.items[0].id),
                                    newVariantId: String(fd.get("newVariantId") || ""),
                                    newQuantity: Number(fd.get("newQuantity") || o.items[0].quantity),
                                    streetAddress: String(fd.get("streetAddress") || o.street_address),
                                    reason: String(fd.get("reason") || editReason),
                                  },
                                  lang === "ar"
                                    ? "تم تعديل الطلب وتحديث المخزون وسجل المراجعات"
                                    : "Order edited & stock reservation updated"
                                );
                                setEditingOrderId(null);
                              }}
                              className="border-t border-silver pt-3 mt-2 grid grid-cols-1 sm:grid-cols-5 gap-2 items-end bg-white p-3"
                            >
                              <div>
                                <label className="block text-[10px] font-bold mb-1">{lang === "ar" ? "المنتج المراد تعديله" : "Item to Modify"}</label>
                                <select
                                  name="orderItemId"
                                  defaultValue={o.items[0].id}
                                  className="w-full border border-silver px-2 py-1.5 text-xs"
                                >
                                  {o.items.map((it: any) => (
                                    <option key={it.id} value={it.id}>
                                      {it.product_name_en_snapshot} (EU {it.size_snapshot})
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-[10px] font-bold mb-1">
                                  {lang === "ar" ? "استبدال بمقاس/لون متوفر في المخزون" : "Swap to Replacement Variant / Size (In-Stock)"}
                                </label>
                                <select
                                  name="newVariantId"
                                  defaultValue={editVariantId || o.items[0].variant_id}
                                  onChange={(e) => setEditVariantId(e.target.value)}
                                  className="w-full border border-silver px-2 py-1.5 text-xs"
                                >
                                  {(ordersData.allVariants || []).map((av: any) => (
                                    <option key={av.id} value={av.id} disabled={av.available <= 0}>
                                      {av.product_name_en} — {av.color_en} / EU {av.size} ({av.available} avail)
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold mb-1">{lang === "ar" ? "عنوان الشارع" : "Street Address"}</label>
                                <input
                                  name="streetAddress"
                                  defaultValue={o.street_address}
                                  className="w-full border border-silver px-2 py-1.5 text-xs"
                                />
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold mb-1">{lang === "ar" ? "سبب التعديل *" : "Edit Reason *"}</label>
                                <input
                                  name="reason"
                                  required
                                  defaultValue={editReason}
                                  onChange={(e) => setEditReason(e.target.value)}
                                  className="w-full border border-silver px-2 py-1.5 text-xs"
                                />
                              </div>
                              <div className="sm:col-span-5 flex justify-end">
                                <button
                                  type="submit"
                                  className="bg-[#111214] text-white px-4 py-2 font-bold text-xs uppercase"
                                >
                                  {lang === "ar" ? "تطبيق تعديل الطلب وتحديث المخزون" : "Apply Order Revision & Adjust Stock"}
                                </button>
                              </div>
                            </form>
                          )}

                          {o.editLogs && o.editLogs.length > 0 && (
                            <div className="border-t border-silver/40 pt-2 text-[11px] text-neutralgray space-y-1">
                              <p className="font-bold text-jet">{lang === "ar" ? "سجل تعديلات الطلب:" : "Revision Audit Trail:"}</p>
                              {o.editLogs.map((el: any) => (
                                <p key={el.id}>
                                  • [Rev #{el.revision_number}] {el.new_value} — Reason: {el.note}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Customer Payment Submissions & Transfer Receipt Proof */}
                      {o.submissions && o.submissions.length > 0 ? (
                        <div className="bg-[#111214]/[0.02] border border-silver/60 p-3.5 space-y-2 rounded-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-neutralgray">
                              {lang === "ar"
                                ? "إيصالات وبيانات الدفع المرفوعة من العميل"
                                : "CUSTOMER PAYMENT SUBMISSIONS & RECEIPT"}
                            </span>
                            <span className="text-[10px] font-bold text-neutralgray">
                              {o.submissions.length} {lang === "ar" ? "إشعار تحويل" : "record(s)"}
                            </span>
                          </div>
                          {o.submissions.map((sub: any) => (
                            <div
                              key={sub.id}
                              className="bg-white border border-silver/50 p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-jet">
                                    {sub.payment_method_code === "VODAFONE_CASH"
                                      ? "Vodafone Cash"
                                      : "InstaPay"}
                                  </span>
                                  <span
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-xs ${
                                      sub.status === "CONFIRMED"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : sub.status === "UNDER_REVIEW"
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {sub.status}
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutralgray">
                                  {lang === "ar" ? "المبلغ المُحوّل:" : "Amount:"}{" "}
                                  <strong className="text-jet">
                                    {formatCurrency(sub.transfer_amount, lang)}
                                  </strong>{" "}
                                  | {lang === "ar" ? "المرجع / المحفظة:" : "Sender / Ref:"}{" "}
                                  <strong className="text-jet">
                                    {sub.sender_identifier || sub.transaction_reference}
                                  </strong>
                                </p>
                                <p className="text-[10px] text-neutralgray">
                                  {new Date(sub.created_at).toLocaleString(
                                    lang === "ar" ? "ar-EG" : "en-US"
                                  )}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                {sub.receipt_file_path && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReceiptModal({
                                        url: `/api/receipts?submissionId=${sub.id}`,
                                        title: `${lang === "ar" ? "إيصال تحويل الطلب" : "Receipt for"} #${o.order_number} (${formatCurrency(sub.transfer_amount, lang)})`,
                                      })
                                    }
                                    className="inline-flex items-center gap-1.5 bg-offwhite hover:bg-silver/30 active:scale-95 border border-silver px-3 py-1.5 text-xs font-bold text-jet rounded-xs transition-all cursor-pointer"
                                  >
                                    <Camera className="w-3.5 h-3.5 text-jet inline" />
                                    <span>
                                      {lang === "ar"
                                        ? "معاينة إيصال التحويل (صورة)"
                                        : "View Receipt Image"}
                                    </span>
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-neutral-50 border border-neutral-200 p-2.5 text-[11px] text-neutralgray flex items-center justify-between">
                          <span>
                            {lang === "ar"
                              ? `لم يرفع العميل إيصال تحويل بعد (وسيلة الدفع المختارة: ${
                                  o.payment_method_code === "VODAFONE_CASH"
                                    ? "فودافون كاش"
                                    : "انستاباي"
                                })`
                              : `No payment receipt attached yet (${o.payment_method_code})`}
                          </span>
                        </div>
                      )}

                      {/* Payment Action Bar: Confirm Payment & Auto Send WhatsApp */}
                      {o.payment_status !== "PAID" ? (
                        <div className="bg-emerald-950/[0.04] border border-emerald-400 p-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xs">
                          <div className="space-y-0.5">
                            <p className="font-bold text-jet text-xs flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                              {lang === "ar"
                                ? "في انتظار تأكيد استلام الدفع"
                                : "Awaiting Payment Confirmation"}
                            </p>
                            <p className="text-[11px] text-neutralgray">
                              {lang === "ar"
                                ? "الضغط على الزر يؤكد استلام الدفع، ويحول حالة الطلب إلى (مؤكد)، ويخصم المخزون فورياً، ويرسل رسالة واتساب للعميل برقم التتبع."
                                : "Confirms payment, marks order CONFIRMED, commits inventory, and triggers official WhatsApp confirmation."}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              const res = await postAdminAction(
                                { action: "confirm_order_payment", orderId: o.id },
                                lang === "ar"
                                  ? `تم تأكيد استلام دفع الطلب #${o.order_number} بنجاح!`
                                  : `Payment confirmed for #${o.order_number}!`
                              );
                              if (res && res.whatsApp) {
                                setWhatsAppModal({
                                  ...res.whatsApp,
                                  orderNumber: o.order_number,
                                });
                                window.open(res.whatsApp.url, "_blank");
                              }
                            }}
                            className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-heading font-bold text-xs uppercase tracking-wider px-4 py-2.5 flex items-center gap-2 rounded-xl shadow-xs transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span>
                              {lang === "ar"
                                ? "تم استلام الدفع وتأكيد الطلب"
                                : "Confirm Payment & Send WhatsApp"}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-300 p-3 flex flex-wrap items-center justify-between gap-2 text-xs rounded-xl">
                          <span className="text-emerald-900 font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            {lang === "ar"
                              ? "تم استلام وتأكيد الدفع بنجاح — الطلب مؤكد ومخصوم من المخزون"
                              : "Payment Verified & Order Confirmed"}
                          </span>
                          <a
                            href={`https://wa.me/20${String(o.customer_phone).replace(
                              /^0+/,
                              ""
                            )}?text=${encodeURIComponent(
                              lang === "ar"
                                ? `مرحباً ${o.customer_name}، نؤكد لك استلام دفعتك للطلب #${o.order_number} بقيمة ${o.total_amount} ج.م من U3 STORE بنجاح! جاري التجهيز للشحن.`
                                : `Hello ${o.customer_name}, your payment for order #${o.order_number} at U3 STORE is confirmed!`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5 inline" />
                            <span>
                              {lang === "ar"
                                ? "إرسال رسالة واتساب للعميل"
                                : "Message on WhatsApp"}
                            </span>
                          </a>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 items-center">
                        <select
                          value={o.order_status}
                          onChange={(e) => {
                            const newStatus = e.target.value;
                            postAdminAction(
                              {
                                action: "update_order",
                                orderId: o.id,
                                orderStatus: newStatus,
                              },
                              lang === "ar"
                                ? `تم تحديث حالة الطلب #${o.order_number} بنجاح`
                                : `Order #${o.order_number} status updated successfully`
                            );
                          }}
                          className="border border-silver/70 px-3 py-2.5 bg-offwhite font-bold text-xs rounded-xl outline-none cursor-pointer"
                        >
                          <option value="PENDING_PAYMENT">
                            {lang === "ar" ? "قيد انتظار الدفع" : "Pending Payment"}
                          </option>
                          <option value="PAYMENT_UNDER_REVIEW">
                            {lang === "ar" ? "مراجعة الدفع" : "Payment Under Review"}
                          </option>
                          <option value="CONFIRMED">
                            {lang === "ar" ? "مؤكد" : "Confirmed"}
                          </option>
                          <option value="PROCESSING">
                            {lang === "ar" ? "جاري التجهيز" : "Processing"}
                          </option>
                          <option value="SHIPPED">
                            {lang === "ar" ? "تم الشحن" : "Shipped"}
                          </option>
                          <option value="DELIVERED">
                            {lang === "ar" ? "تم التسليم" : "Delivered"}
                          </option>
                          <option value="CANCELLED">
                            {lang === "ar" ? "ملغي" : "Cancelled"}
                          </option>
                          <option value="RETURNED">
                            {lang === "ar" ? "مرتجع" : "Returned"}
                          </option>
                          <option value="EXCHANGED">
                            {lang === "ar" ? "استبدال" : "Exchanged"}
                          </option>
                        </select>

                        <Link
                          href={`/order-confirmation/${o.order_number}`}
                          className="border border-jet text-jet hover:bg-[#111214] hover:text-white active:scale-95 text-center py-2.5 font-bold text-xs transition-all rounded-xl shadow-2xs"
                        >
                          {lang === "ar" ? "عرض الطلب والبيانات" : "Open Slip"}
                        </Link>

                        <a
                          href={`/api/invoices?orderNumber=${encodeURIComponent(
                            o.order_number
                          )}&token=${encodeURIComponent(o.guest_access_token_plain || "")}&format=html&print=1`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-[#111214] hover:bg-[#292B2E] active:scale-95 text-white text-center py-2.5 px-3 font-bold text-xs transition-all rounded-xl flex items-center justify-center gap-1.5 shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span>{lang === "ar" ? "طباعة الفاتورة" : "Print Invoice"}</span>
                        </a>

                        {o.order_status === "CANCELLED" ? (
                          <div
                            title={lang === "ar" ? "طلب ملغي ومحفوظ في السجلات" : "Cancelled order preserved in records"}
                            className="border border-red-200 bg-red-50 text-red-700 text-center py-2.5 px-3 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-2xs select-none"
                          >
                            <AlertCircle className="w-4 h-4 text-red-600" />
                            <span>{lang === "ar" ? "طلب ملغي" : "Cancelled"}</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={async () => {
                              const promptMsg = lang === "ar"
                                ? `هل أنت متأكد من إلغاء الطلب #${o.order_number}؟\n\n• سيتم تغيير حالة الطلب فورياً إلى (ملغي).\n• سيتم استرجاع كميات ومقاسات المنتجات للمخزون فورياً.\n• سيتم الاحتفاظ بكافة بيانات الطلب وسجلاته بشكل دائم.`
                                : `Are you sure you want to cancel order #${o.order_number}?\n\n• Order will be marked Cancelled.\n• Variant stock will be restored immediately.\n• Order records permanently preserved.`;
                              if (confirm(promptMsg)) {
                                const reason = prompt(
                                  lang === "ar" ? "سبب الإلغاء (اختياري):" : "Cancellation Reason (Optional):",
                                  lang === "ar" ? "إلغاء الطلب بناءً على رغبة العميل" : "Cancelled by customer request"
                                ) || (lang === "ar" ? "إلغاء الطلب من قبل الإدارة" : "Cancelled by store administration");

                                const res = await postAdminAction(
                                  { action: "cancel_order", id: o.id, reason },
                                  lang === "ar"
                                    ? `تم إلغاء الطلب #${o.order_number} واسترجاع المخزون بنجاح`
                                    : `Order #${o.order_number} cancelled and stock restored`
                                );
                                if (res && res.whatsApp) {
                                  if (confirm(lang === "ar" ? "هل ترغب في فتح واتساب لإشعار العميل بإلغاء الطلب الآن؟" : "Open WhatsApp to notify customer?")) {
                                    window.open(res.whatsApp.url, "_blank");
                                  }
                                }
                              }
                            }}
                            className="border border-red-200 hover:border-red-400 bg-red-50/50 hover:bg-red-50 text-red-600 active:scale-95 text-center py-2.5 px-3 font-bold text-xs transition-all rounded-xl shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                            <span>{lang === "ar" ? "إلغاء الطلب" : "Cancel Order"}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Orders Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-silver/50 bg-white p-4 rounded-2xl shadow-xs">
              <div className="text-xs text-neutralgray">
                {lang === "ar"
                  ? `عرض الطلبات ${(safePage - 1) * pageSize + 1} إلى ${Math.min(safePage * pageSize, currentTabOrders.length)} من إجمالي ${currentTabOrders.length} طلب`
                  : `Showing ${(safePage - 1) * pageSize + 1} - ${Math.min(safePage * pageSize, currentTabOrders.length)} of ${currentTabOrders.length} orders`}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-silver disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100 transition-colors"
                >
                  {lang === "ar" ? "السابق" : "Prev"}
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .map((p, idx, arr) => (
                    <React.Fragment key={p}>
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-xs text-neutralgray">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setOrdersPage(p)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                          safePage === p
                            ? "bg-[#111214] text-white shadow-xs"
                            : "border border-silver hover:bg-neutral-100 text-jet"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setOrdersPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-silver disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-100 transition-colors"
                >
                  {lang === "ar" ? "التالي" : "Next"}
                </button>
              </div>
            </div>
          )}
              </div>
            );
          })()}
        </div>
      )}

          {/* 7. CUSTOMERS MANAGEMENT & ACCOUNT OPERATIONS */}
          {activeSection === "customers" && customersData && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="font-heading text-xl sm:text-2xl font-bold text-jet">
                    {lang === "ar"
                      ? "إدارة حسابات العملاء وسجل العمليات والطلبات"
                      : "CUSTOMER DIRECTORY & ORDER OPERATIONS"}
                  </h1>
                  <p className="text-xs text-neutralgray mt-0.5">
                    {lang === "ar"
                      ? "يمكنك الدخول لأي حساب عميل لمعاينة ملفه الشخصي وكافة طلباته وفواتيره وعملياته"
                      : "Inspect any customer account to view full profile, order history, and operations."}
                  </p>
                </div>

                {/* Instant Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-neutralgray absolute start-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder={lang === "ar" ? "بحث بالاسم أو الهاتف أو الإيميل..." : "Search name, phone, email..."}
                    className="w-full bg-white border border-silver/70 rounded-xl px-3 py-2 ps-9 text-xs outline-none focus:border-black"
                  />
                  {customerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearchQuery("")}
                      className="absolute end-2.5 top-1/2 -translate-y-1/2 text-neutralgray hover:text-jet text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Registered Customers Section */}
              {(() => {
                const q = customerSearchQuery.trim();
                const filteredReg = customersData.registered.filter((c: any) => {
                  if (!q) return true;
                  return matchesBilingualSearch(
                    q,
                    c.full_name,
                    c.email,
                    c.phone,
                    c.city,
                    c.governorate_name_en,
                    c.governorate_name_ar
                  );
                });

                const filteredGuests = customersData.guests.filter((g: any) => {
                  if (!q) return true;
                  return matchesBilingualSearch(
                    q,
                    g.full_name,
                    g.phone,
                    g.governorate_name_en,
                    g.governorate_name_ar,
                    g.shipping_address
                  );
                });

                return (
                  <div className="space-y-6">
                    {/* Registered Customers List */}
                    <div className="bg-white border border-silver/60 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-silver/40 pb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-jet" />
                          <h3 className="font-heading text-sm font-bold uppercase text-jet">
                            {lang === "ar" ? "العملاء المسجلون" : "Registered Accounts"}
                          </h3>
                        </div>
                        <span className="bg-[#111214] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          {filteredReg.length}
                        </span>
                      </div>

                      {filteredReg.length === 0 ? (
                        <p className="text-xs text-neutralgray py-4 text-center">
                          {lang === "ar" ? "لا يوجد عملاء مطابقين للبحث." : "No registered customers found."}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredReg.map((c: any) => (
                            <div
                              key={c.id}
                              className="border border-silver/60 rounded-xl p-4 bg-[#FAFBFB] hover:border-black transition-all flex flex-col justify-between gap-3 shadow-2xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-heading font-bold text-sm text-jet truncate">
                                    {c.full_name || "Customer"}
                                  </h4>
                                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {c.status || "ACTIVE"}
                                  </span>
                                </div>
                                <p className="text-xs text-neutralgray truncate flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5 shrink-0" />
                                  <span>{c.email}</span>
                                </p>
                                <p className="text-xs text-neutralgray flex items-center gap-1.5 font-mono">
                                  <Phone className="w-3.5 h-3.5 shrink-0" />
                                  <span>{c.phone}</span>
                                </p>
                              </div>

                              <div className="flex items-center justify-between border-t border-silver/40 pt-2.5 text-xs">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-neutralgray uppercase block">
                                    {lang === "ar" ? "الطلبات والمشتريات" : "Orders & Spent"}
                                  </span>
                                  <span className="font-bold text-jet">
                                    {c.total_orders} {lang === "ar" ? "طلب" : "orders"} •{" "}
                                    <strong className="text-emerald-700">
                                      {formatCurrency(c.total_paid_spending, lang)}
                                    </strong>
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => openCustomerDetails(c.id, undefined)}
                                  className="inline-flex items-center gap-1.5 bg-[#111214] hover:bg-[#292B2E] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 active:scale-95"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{lang === "ar" ? "عرض الحساب والعمليات" : "View Account & Orders"}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Guest Checkout Customers List */}
                    <div className="bg-white border border-silver/60 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-silver/40 pb-3">
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4 text-neutralgray" />
                          <h3 className="font-heading text-sm font-bold uppercase text-jet">
                            {lang === "ar" ? "عملاء طلبات الزوار (بدون حساب)" : "Guest Checkout Customers"}
                          </h3>
                        </div>
                        <span className="bg-neutral-200 text-jet text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                          {filteredGuests.length}
                        </span>
                      </div>

                      {filteredGuests.length === 0 ? (
                        <p className="text-xs text-neutralgray py-4 text-center">
                          {lang === "ar" ? "لا توجد طلبات زوار مطابقة للبحث." : "No guest customers found."}
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {filteredGuests.map((g: any) => (
                            <div
                              key={g.id}
                              className="border border-silver/60 rounded-xl p-4 bg-[#FAFBFB] hover:border-black transition-all flex flex-col justify-between gap-3 shadow-2xs"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="font-heading font-bold text-sm text-jet truncate">
                                    {g.full_name || "Guest Customer"}
                                  </h4>
                                  <span className="bg-neutral-100 text-neutralgray border border-neutral-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    {lang === "ar" ? "زائر" : "GUEST"}
                                  </span>
                                </div>
                                <p className="text-xs text-neutralgray flex items-center gap-1.5 font-mono">
                                  <Phone className="w-3.5 h-3.5 shrink-0" />
                                  <span>{g.phone}</span>
                                </p>
                                {g.email && (
                                  <p className="text-xs text-neutralgray truncate flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 shrink-0" />
                                    <span>{g.email}</span>
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between border-t border-silver/40 pt-2.5 text-xs">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-neutralgray uppercase block">
                                    {lang === "ar" ? "الطلبات والمشتريات" : "Orders & Spent"}
                                  </span>
                                  <span className="font-bold text-jet">
                                    {g.total_orders} {lang === "ar" ? "طلب" : "orders"} •{" "}
                                    <strong className="text-emerald-700">
                                      {formatCurrency(g.total_paid_spending, lang)}
                                    </strong>
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => openCustomerDetails(undefined, g.id)}
                                  className="inline-flex items-center gap-1.5 bg-[#111214] hover:bg-[#292B2E] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 active:scale-95"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>{lang === "ar" ? "عرض العمليات والاوردرات" : "View Orders"}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ======================================================== */}
              {/* CUSTOMER ACCOUNT & ORDERS INSPECTION MODAL               */}
              {/* ======================================================== */}
              {selectedCustomerDetails && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
                  <div className="bg-white rounded-2xl sm:rounded-3xl border border-silver/60 w-full max-w-full sm:max-w-3xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    {/* Modal Header */}
                    <div className="px-5 py-4 bg-[#111214] text-white flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-heading font-bold text-base text-white truncate">
                            {selectedCustomerDetails.customer?.full_name || "Customer Account"}
                          </h3>
                          <p className="text-[11px] text-[#BFC2C6] truncate">
                            {selectedCustomerDetails.customer?.email || "No email"} • {selectedCustomerDetails.customer?.phone}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCustomerDetails(null)}
                        className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs">
                      {/* Customer Quick Stats Bar */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div className="bg-[#FAFBFB] border border-silver/60 p-3 rounded-xl text-center">
                          <span className="text-[10px] text-neutralgray uppercase tracking-wider block">
                            {lang === "ar" ? "عدد الطلبات" : "Total Orders"}
                          </span>
                          <span className="font-heading text-lg font-bold text-jet mt-0.5 block">
                            {selectedCustomerDetails.orders?.length || 0}
                          </span>
                        </div>
                        <div className="bg-[#FAFBFB] border border-silver/60 p-3 rounded-xl text-center">
                          <span className="text-[10px] text-neutralgray uppercase tracking-wider block">
                            {lang === "ar" ? "إجمالي المدفوع" : "Paid Volume"}
                          </span>
                          <span className="font-heading text-base font-bold text-emerald-700 mt-0.5 block">
                            {formatCurrency(
                              (selectedCustomerDetails.orders || []).reduce(
                                (sum: number, o: any) => sum + (o.payment_status === "PAID" ? Number(o.total_amount) : 0),
                                0
                              ),
                              lang
                            )}
                          </span>
                        </div>
                        <div className="bg-[#FAFBFB] border border-silver/60 p-3 rounded-xl text-center">
                          <span className="text-[10px] text-neutralgray uppercase tracking-wider block">
                            {lang === "ar" ? "نوع الحساب" : "Account Type"}
                          </span>
                          <span className="font-bold text-jet mt-0.5 block">
                            {selectedCustomerDetails.customer?.customer_type === "REGISTERED"
                              ? (lang === "ar" ? "حساب مسجل" : "Registered Account")
                              : (lang === "ar" ? "طلب زائر (بدون حساب)" : "Guest Order")}
                          </span>
                        </div>
                        <div className="bg-[#FAFBFB] border border-silver/60 p-3 rounded-xl text-center">
                          <span className="text-[10px] text-neutralgray uppercase tracking-wider block">
                            {lang === "ar" ? "تواصل مباشر" : "Direct Contact"}
                          </span>
                          <a
                            href={`https://wa.me/2${(selectedCustomerDetails.customer?.phone || "").replace(/^0/, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 mt-0.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>واتساب</span>
                          </a>
                        </div>
                      </div>

                      {/* Customer Saved Delivery Addresses */}
                      {selectedCustomerDetails.addresses && selectedCustomerDetails.addresses.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-jet flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{lang === "ar" ? "عناوين التوصيل المسجلة" : "Registered Delivery Addresses"}</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {selectedCustomerDetails.addresses.map((a: any) => (
                              <div key={a.id} className="border border-silver/60 p-3 rounded-xl bg-[#FAFBFB] text-neutralgray space-y-0.5">
                                <p className="font-bold text-jet">{a.label || "Home"} — {a.full_name}</p>
                                <p>{a.street_address}, Bldg {a.building_number} (Floor {a.floor_number}, Apt {a.apartment_number})</p>
                                <p className="font-semibold text-jet">{a.gov_name_ar || a.gov_name_en}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Orders & Operations List (سجل العمليات والاوردرات) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-silver/40 pb-2">
                          <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-jet flex items-center gap-1.5">
                            <ShoppingCart className="w-3.5 h-3.5 text-jet" />
                            <span>
                              {lang === "ar" ? "سجل طلبات وعمليات هذا العميل" : "Customer Orders & Operations History"}
                            </span>
                          </h4>
                          <span className="font-mono font-bold text-neutralgray">
                            {selectedCustomerDetails.orders?.length || 0} {lang === "ar" ? "طلب" : "orders"}
                          </span>
                        </div>

                        {(!selectedCustomerDetails.orders || selectedCustomerDetails.orders.length === 0) ? (
                          <div className="text-center py-8 text-neutralgray border border-dashed border-silver rounded-2xl">
                            {lang === "ar" ? "لا توجد طلبات مسجلة لهذا العميل حتى الآن." : "No orders found for this customer."}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {selectedCustomerDetails.orders.map((o: any) => (
                              <div
                                key={o.id}
                                className="border border-silver/70 rounded-2xl p-4 bg-white hover:border-black transition-all space-y-3 shadow-2xs"
                              >
                                {/* Order Top Row */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-silver/30 pb-2.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-black text-sm text-jet bg-neutral-100 px-2 py-0.5 rounded-lg border border-silver/60">
                                      {o.order_number}
                                    </span>
                                    <span className="text-[11px] text-neutralgray">
                                      {new Date(o.created_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                                      o.order_status === "DELIVERED"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : o.order_status === "CANCELLED"
                                        ? "bg-red-100 text-red-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}>
                                      {o.order_status}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full font-mono ${
                                      o.payment_status === "PAID"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-neutral-200 text-jet"
                                    }`}>
                                      {o.payment_status}
                                    </span>
                                    <span className="font-heading text-sm font-bold text-jet tabular-nums">
                                      {formatCurrency(o.total_amount, lang)}
                                    </span>
                                  </div>
                                </div>

                                {/* Order Items Summary */}
                                <div className="space-y-1">
                                  <span className="text-[10px] text-neutralgray uppercase tracking-wider block font-bold">
                                    {lang === "ar" ? "المنتجات والمقاسات المطلوبة:" : "Items Ordered:"}
                                  </span>
                                  <p className="text-xs text-jet font-medium bg-[#FAFBFB] p-2.5 rounded-xl border border-silver/40">
                                    {o.items_summary || (lang === "ar" ? `${o.item_count} قطع أحذية` : `${o.item_count} footwear item(s)`)}
                                  </p>
                                </div>

                                {/* Quick Actions for Order */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-silver/30">
                                  <span className="text-[11px] text-neutralgray">
                                    {lang === "ar" ? "طريقة الدفع:" : "Payment:"} <strong>{o.payment_method_code}</strong>
                                    {o.delivery_governorate_id ? ` • ${o.delivery_street_address || ""}` : ""}
                                  </span>

                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        window.open(`/api/invoices?orderNumber=${encodeURIComponent(o.order_number)}&download=1`, "_blank");
                                      }}
                                      className="inline-flex items-center gap-1 border border-silver hover:border-black bg-white px-2.5 py-1 rounded-lg text-xs font-bold text-jet transition-colors"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                      <span>{lang === "ar" ? "فاتورة PDF" : "PDF Invoice"}</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedCustomerDetails(null);
                                        setActiveSection("orders");
                                        setExpandedOrders((prev) => ({ ...prev, [o.id]: true }));
                                      }}
                                      className="inline-flex items-center gap-1 bg-[#111214] hover:bg-[#292B2E] text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-colors"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      <span>{lang === "ar" ? "معاينة كاملة للطلب" : "Inspect Order"}</span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 8. COMPLETE EGYPT SHIPPING MANAGEMENT (ALL 27 GOVERNORATES + CITIES + AREAS + RULES) */}
          {activeSection === "shipping" && shippingData && (
            <div className="space-y-8">
              <div>
                <h1 className="font-heading text-2xl font-bold text-jet">
                  {lang === "ar"
                    ? "إدارة الشحن لجميع محافظات مصر الـ 27 والمدن والمناطق"
                    : "EGYPT SHIPPING MANAGEMENT (ALL 27 GOVERNORATES, CITIES, AREAS & PRIORITY RULES)"}
                </h1>
                <p className="text-xs text-neutralgray mt-1">
                  {lang === "ar"
                    ? "الأولوية: سعر المنطقة الخاصة ← سعر المدينة ← سعر المحافظة ← السعر الافتراضي."
                    : "Rate Priority: 1. Area Rate → 2. City Rate → 3. Governorate Rate → 4. Default Rate."}
                </p>
              </div>

              {/* Global Shipping Rules */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  postAdminAction({
                    action: "save_shipping_rules",
                    defaultShippingRate: fd.get("defaultShippingRate"),
                    freeShippingThreshold: fd.get("freeShippingThreshold"),
                    minimumOrderValue: fd.get("minimumOrderValue"),
                    specialHandlingFee: fd.get("specialHandlingFee"),
                  });
                }}
                className="bg-white border border-silver/60 p-6 grid grid-cols-1 sm:grid-cols-5 gap-4 items-end text-xs"
              >
                <div>
                  <label className="block font-bold mb-1">{lang === "ar" ? "سعر الشحن الافتراضي (ج.م)" : "Default Fallback Rate (EGP)"}</label>
                  <input
                    name="defaultShippingRate"
                    type="number"
                    defaultValue={shippingData.rules?.default_shipping_rate ?? ""}
                    placeholder={lang === "ar" ? "اتركه فارغاً إذا كان لكل محافظة سعر" : "Leave empty if per-gov"}
                    className="w-full border border-silver px-3 py-2 bg-offwhite"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">{lang === "ar" ? "شحن مجاني للطلبات فوق (ج.م)" : "Free Shipping Above (EGP)"}</label>
                  <input
                    name="freeShippingThreshold"
                    type="number"
                    defaultValue={shippingData.rules?.free_shipping_threshold ?? ""}
                    placeholder="e.g. 5000"
                    className="w-full border border-silver px-3 py-2 bg-offwhite"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">{lang === "ar" ? "الحد الأدنى للطلب (ج.م)" : "Min Order Value (EGP)"}</label>
                  <input
                    name="minimumOrderValue"
                    type="number"
                    defaultValue={shippingData.rules?.minimum_order_value ?? 0}
                    className="w-full border border-silver px-3 py-2 bg-offwhite"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">{lang === "ar" ? "رسوم تجهيز خاصة (ج.م)" : "Handling Fee (EGP)"}</label>
                  <input
                    name="specialHandlingFee"
                    type="number"
                    defaultValue={shippingData.rules?.special_handling_fee ?? 0}
                    className="w-full border border-silver px-3 py-2 bg-offwhite"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-[#111214] hover:bg-[#292B2E] text-white font-bold uppercase py-2.5 px-4"
                >
                  {lang === "ar" ? "حفظ القواعد" : "Save Rules"}
                </button>
              </form>

              {/* All 27 Egyptian Governorates Table */}
              <div className="bg-white border border-silver/60 p-6 space-y-4">
                <h2 className="font-heading text-base font-bold">
                  {lang === "ar"
                    ? "قائمة محافظات مصر الـ 27 وأسعار الشحن"
                    : "ALL 27 EGYPTIAN GOVERNORATES"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {shippingData.governorates.map((g: any) => (
                    <form
                      key={g.id}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        postAdminAction({
                          action: "update_governorate",
                          id: g.id,
                          shippingRate: fd.get("shippingRate"),
                          estimatedDaysEn: g.estimated_days_en,
                          estimatedDaysAr: g.estimated_days_ar,
                          isEnabled: fd.get("isEnabled") === "on",
                        });
                      }}
                      className="border border-silver/50 p-3 bg-offwhite flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 text-xs rounded-xl"
                    >
                      <div className="w-full sm:w-auto min-w-0 sm:min-w-[130px]">
                        <p className="font-bold text-jet">
                          {g.sort_order}. {g.name_en} ({g.name_ar})
                        </p>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                        <input
                          name="shippingRate"
                          type="number"
                          defaultValue={g.shipping_rate ?? ""}
                          placeholder={lang === "ar" ? "غير محدد (ج.م)" : "Unconfigured (EGP)"}
                          className="w-28 sm:w-32 border border-silver px-2 py-1.5 bg-white font-bold"
                        />
                        <label className="flex items-center gap-1">
                          <input
                            name="isEnabled"
                            type="checkbox"
                            defaultChecked={Boolean(g.is_enabled)}
                          />
                          <span>{lang === "ar" ? "مفعل" : "Active"}</span>
                        </label>
                        <button
                          type="submit"
                          className="bg-jet text-offwhite px-3 py-1.5 font-bold rounded-sm shrink-0"
                        >
                          {lang === "ar" ? "حفظ" : "Save"}
                        </button>
                      </div>
                    </form>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 9. MANUAL PAYMENTS & WALLET VERIFICATION */}
          {activeSection === "payments" && paymentsData && (
            <div className="space-y-8">
              <h1 className="font-heading text-2xl font-bold">
                {lang === "ar"
                  ? "إعدادات إنستا باي وفودافون كاش ومراجعة التحويلات"
                  : "INSTAPAY & VODAFONE CASH MANAGEMENT & VERIFICATION"}
              </h1>

              {/* Configure InstaPay & Vodafone Cash Wallets */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {paymentsData.paymentMethods.map((pm: any) => (
                  <form
                    key={pm.code}
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      postAdminAction({
                        action: "save_payment_method",
                        code: pm.code,
                        isEnabled: fd.get("isEnabled") === "on",
                        recipientName: fd.get("recipientName"),
                        receivingAccount: fd.get("receivingAccount"),
                        instructionsEn: fd.get("instructionsEn"),
                        instructionsAr: fd.get("instructionsAr"),
                      });
                    }}
                    className="bg-white border border-silver/60 p-6 space-y-4 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-silver/50 pb-3">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={pm.code === "VODAFONE_CASH" ? "/vodafone-cash.jpg" : "/instapay.jpg"}
                          alt=""
                          className="w-8 h-8 rounded-xl object-contain bg-white border border-silver p-0.5 shadow-2xs"
                        />
                        <h3 className="font-heading text-base font-bold text-jet">
                          {pm.name_en} ({pm.name_ar})
                        </h3>
                      </div>
                      <label className="flex items-center gap-2 font-bold">
                        <input
                          name="isEnabled"
                          type="checkbox"
                          defaultChecked={Boolean(pm.is_enabled)}
                        />
                        <span>{lang === "ar" ? "مفعل" : "Enabled"}</span>
                      </label>
                    </div>
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "اسم المستلم / صاحب الحساب" : "Recipient Name"}</label>
                      <input
                        name="recipientName"
                        type="text"
                        defaultValue={pm.recipient_name}
                        placeholder={lang === "ar" ? "اسم صاحب الحساب الرسمي" : "U3 STORE OFFICIAL"}
                        className="w-full border border-silver px-3 py-2 bg-offwhite"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">
                        {lang === "ar" ? "رقم المحفظة / معرف إنستاباي للاستلام" : "Official Receiving Wallet Number / InstaPay Address"}
                      </label>
                      <input
                        name="receivingAccount"
                        type="text"
                        defaultValue={pm.receiving_account}
                        placeholder="010xxxxxxxx / u3store@instapay"
                        className="w-full border border-silver px-3 py-2 bg-offwhite font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "تعليمات الدفع (إنجليزي)" : "Instructions (English)"}</label>
                      <textarea
                        name="instructionsEn"
                        rows={2}
                        defaultValue={pm.instructions_en}
                        className="w-full border border-silver px-3 py-2 bg-offwhite"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">تعليمات الدفع (بالعربية)</label>
                      <textarea
                        name="instructionsAr"
                        rows={2}
                        defaultValue={pm.instructions_ar}
                        className="w-full border border-silver px-3 py-2 bg-offwhite"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-jet text-offwhite font-bold uppercase px-6 py-2.5"
                    >
                      Save {pm.name_en} Settings
                    </button>
                  </form>
                ))}
              </div>

              {/* Customer Payment Submissions Verification Queue */}
              <div className="bg-white border border-silver/60 p-6 space-y-4">
                <h2 className="font-heading text-lg font-bold">
                  {lang === "ar"
                    ? "مراجعة وتأكيد تحويلات العملاء"
                    : "CUSTOMER PAYMENT SUBMISSIONS VERIFICATION QUEUE"}
                </h2>
                {paymentsData.submissions.length === 0 ? (
                  <p className="text-xs text-neutralgray">
                    {lang === "ar" ? "لا توجد إشعارات دفع حالياً." : "No payment submissions yet."}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {paymentsData.submissions.map((sub: any) => (
                      <div
                        key={sub.id}
                        className="border border-silver p-4 bg-offwhite flex flex-col sm:flex-row justify-between gap-4 text-xs"
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-jet">
                            {lang === "ar" ? "طلب: " : "Order: "}{sub.order_number} — {sub.customer_name} ({sub.customer_phone})
                          </p>
                          <p>
                            {lang === "ar" ? "الطريقة: " : "Method: "}<strong>{sub.payment_method_code}</strong> | {lang === "ar" ? "المرجع: " : "Reference: "}
                            <code className="font-bold">{sub.transaction_reference}</code> | {lang === "ar" ? "المُرسِل: " : "Sender: "}
                            <strong>{sub.sender_identifier}</strong>
                          </p>
                          <p>
                            {lang === "ar" ? "المبلغ المُحوَّل: " : "Reported Amount: "}
                            <strong>{formatCurrency(sub.transfer_amount, lang)}</strong> | {lang === "ar" ? "إجمالي الطلب: " : "Order Total: "}<strong>{formatCurrency(sub.total_amount, lang)}</strong>
                          </p>
                          {sub.receipt_file_path && (
                            <button
                              type="button"
                              onClick={() =>
                                setReceiptModal({
                                  url: `/api/receipts?submissionId=${sub.id}`,
                                  title: `Order ${sub.order_number} (${formatCurrency(sub.transfer_amount, lang)})`,
                                })
                              }
                              className="inline-block text-jet underline font-bold pt-1 cursor-pointer"
                            >
                              {lang === "ar"
                                ? "معاينة إيصال التحويل (صورة) ←"
                                : "View Transfer Receipt Image →"}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 bg-jet text-white font-bold uppercase">
                            {sub.status}
                          </span>
                          {sub.status === "UNDER_REVIEW" && (
                            <>
                              <button
                                type="button"
                                onClick={() =>
                                  postAdminAction({
                                    action: "verify_payment_submission",
                                    submissionId: sub.id,
                                    decision: "CONFIRM",
                                    adminNotes: "Funds verified in wallet",
                                  })
                                }
                                className="bg-emerald-800 text-white px-4 py-2 font-bold"
                              >
                                {lang === "ar" ? "تأكيد الدفع" : "Confirm Paid"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  postAdminAction({
                                    action: "verify_payment_submission",
                                    submissionId: sub.id,
                                    decision: "REJECT",
                                    adminNotes: "Transfer not found in wallet",
                                  })
                                }
                                className="bg-red-800 text-white px-4 py-2 font-bold"
                              >
                                {lang === "ar" ? "رفض" : "Reject"}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 10. INVOICES */}
          {/* 10. CONFIRMED REVENUE (PREMIUM, SLEEK & CALM) */}
          {activeSection === "invoices" && invoicesData && (() => {
            const allInvoices: any[] = invoicesData.invoices || [];
            // By default show verified paid orders only (confirmed revenue)
            const paidInvoices = allInvoices.filter((i: any) => i.payment_status === "PAID" || i.payment_status === "Paid");
            const displayedInvoices = invoiceStatusFilter === "ALL" ? allInvoices : paidInvoices;

            const totalPaid = paidInvoices.reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);
            const instapayInvoices = paidInvoices.filter((i: any) => i.payment_method_code === "INSTAPAY");
            const vodafoneInvoices = paidInvoices.filter((i: any) => i.payment_method_code === "VODAFONE_CASH");

            const instapayTotal = instapayInvoices.reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);
            const vodafoneTotal = vodafoneInvoices.reduce((sum: number, i: any) => sum + Number(i.total_amount || 0), 0);

            // Filter by method
            let list = displayedInvoices;
            if (invoiceMethodFilter !== "ALL") {
              list = list.filter((i: any) => i.payment_method_code === invoiceMethodFilter);
            }

            // Filter by search query
            const filtered = list.filter((inv: any) => {
              if (!invoiceSearchQuery.trim()) return true;
              const q = invoiceSearchQuery.toLowerCase().trim();
              const num = (inv.invoice_number || "").toLowerCase();
              const ord = (inv.order_number || "").toLowerCase();
              const name = (inv.customer_name || "").toLowerCase();
              const phone = (inv.customer_phone || "").toLowerCase();
              const ref = (inv.transaction_reference || "").toLowerCase();
              return num.includes(q) || ord.includes(q) || name.includes(q) || phone.includes(q) || ref.includes(q);
            });

            return (
              <div className="space-y-6 max-w-5xl mx-auto u3-reveal">
                {/* 1. Sleek Navigation Bar */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setActiveSection("dashboard")}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white hover:bg-neutral-100 border border-silver/70 text-xs font-bold text-neutral-700 transition-all shadow-2xs cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{lang === "ar" ? "العودة للوحة التحكم" : "Back to Dashboard"}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-neutral-500 font-mono font-medium">
                      {lang === "ar" ? `${paidInvoices.length} معاملة مؤكدة` : `${paidInvoices.length} paid orders`}
                    </span>
                  </div>
                </div>

                {/* 2. Signature Luxury Hero Card (Matching the KPI Card aesthetic) */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#111214] via-[#16181B] to-[#111214] text-white p-6 sm:p-7 border border-white/10 shadow-xl">
                  <div className="absolute top-0 end-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 start-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <div className="flex items-center gap-2.5 mb-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-emerald-400">
                          <CreditCard className="w-4 h-4" />
                        </div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                          {lang === "ar" ? "مؤكد وموثق" : "CONFIRMED & LIVE"}
                        </span>
                        <span className="text-xs text-neutral-400">
                          {lang === "ar" ? "المدفوعات المؤكدة فقط" : "Verified paid orders only"}
                        </span>
                      </div>

                      <p className="text-xs uppercase tracking-wider text-[#BFC2C6] font-bold">
                        {lang === "ar" ? "الإيرادات المؤكدة" : "Total Confirmed Revenue"}
                      </p>

                      <p className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                        <AnimatedCounter value={totalPaid} isCurrency lang={lang} />
                      </p>
                    </div>

                    {/* Breakdown Pills inside Hero */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setInvoiceMethodFilter(invoiceMethodFilter === "INSTAPAY" ? "ALL" : "INSTAPAY")}
                        className={`text-start px-4 py-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-md ${
                          invoiceMethodFilter === "INSTAPAY"
                            ? "bg-white/20 border-white/40 ring-2 ring-indigo-400"
                            : "bg-white/5 hover:bg-white/10 border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs text-neutral-300">
                          <img src="/instapay.jpg" alt="" className="w-4 h-4 rounded object-contain" />
                          <span>{lang === "ar" ? "إنستاباي" : "InstaPay"}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">({instapayInvoices.length})</span>
                        </div>
                        <div className="font-mono font-bold text-white text-sm sm:text-base mt-1">
                          {formatCurrency(instapayTotal, lang)}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setInvoiceMethodFilter(invoiceMethodFilter === "VODAFONE_CASH" ? "ALL" : "VODAFONE_CASH")}
                        className={`text-start px-4 py-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-md ${
                          invoiceMethodFilter === "VODAFONE_CASH"
                            ? "bg-white/20 border-white/40 ring-2 ring-rose-400"
                            : "bg-white/5 hover:bg-white/10 border-white/10"
                        }`}
                      >
                        <div className="flex items-center gap-2 text-xs text-neutral-300">
                          <img src="/vodafone-cash.jpg" alt="" className="w-4 h-4 rounded object-contain" />
                          <span>{lang === "ar" ? "فودافون كاش" : "Vodafone Cash"}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">({vodafoneInvoices.length})</span>
                        </div>
                        <div className="font-mono font-bold text-white text-sm sm:text-base mt-1">
                          {formatCurrency(vodafoneTotal, lang)}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Filter Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                    {[
                      { id: "ALL", ar: "جميع المدفوعات", count: paidInvoices.length },
                      { id: "INSTAPAY", ar: "إنستاباي فقط", count: instapayInvoices.length },
                      { id: "VODAFONE_CASH", ar: "فودافون كاش فقط", count: vodafoneInvoices.length },
                    ].map((tab) => {
                      const isActive = invoiceMethodFilter === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setInvoiceMethodFilter(tab.id as any)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 ${
                            isActive
                              ? "bg-jet text-white shadow-xs"
                              : "bg-white text-neutral-600 border border-silver/70 hover:bg-neutral-100"
                          }`}
                        >
                          <span>{tab.ar}</span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                            isActive ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Clean Search Input */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-neutral-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={invoiceSearchQuery}
                      onChange={(e) => setInvoiceSearchQuery(e.target.value)}
                      placeholder={lang === "ar" ? "ابحث برقم الطلب، العميل، أو الهاتف..." : "Search order, name, phone..."}
                      className="w-full bg-white border border-silver/80 rounded-full ps-9 pe-8 py-2 text-xs text-jet placeholder-neutral-400 focus:outline-none focus:border-jet transition-all shadow-2xs"
                    />
                    {invoiceSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setInvoiceSearchQuery("")}
                        className="absolute end-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-jet p-0.5 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 4. Elegant Transactions Ledger */}
                <div className="space-y-3">
                  {filtered.length === 0 ? (
                    <div className="bg-white border border-silver/60 rounded-3xl p-10 text-center text-xs text-neutralgray shadow-xs space-y-2">
                      <p>{lang === "ar" ? "لا توجد معاملات مطابقة للبحث الحالي." : "No matching transactions found."}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setInvoiceMethodFilter("ALL");
                          setInvoiceSearchQuery("");
                        }}
                        className="text-xs font-bold text-jet underline cursor-pointer"
                      >
                        {lang === "ar" ? "إعادة ضبط البحث" : "Reset search"}
                      </button>
                    </div>
                  ) : (
                    filtered.map((inv: any) => {
                      const hasReceipt = Boolean(inv.receipt_file_path && inv.payment_submission_id);

                      return (
                        <div
                          key={inv.id}
                          className="bg-white border border-silver/70 hover:border-jet/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 transition-all shadow-2xs hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          {/* Right side: Icon + Customer & Order info */}
                          <div className="flex items-start gap-3.5 min-w-0">
                            {/* Payment Method Logo Squircle */}
                            <div className="w-10 h-10 rounded-2xl bg-[#F6F7F9] border border-silver/70 flex items-center justify-center shrink-0 p-1">
                              {inv.payment_method_code === "INSTAPAY" ? (
                                <img src="/instapay.jpg" alt="InstaPay" className="w-full h-full object-contain rounded-xl" />
                              ) : inv.payment_method_code === "VODAFONE_CASH" ? (
                                <img src="/vodafone-cash.jpg" alt="Vodafone" className="w-full h-full object-contain rounded-xl" />
                              ) : (
                                <CreditCard className="w-5 h-5 text-neutral-600" />
                              )}
                            </div>

                            {/* Details */}
                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-bold text-sm text-jet">
                                  {inv.customer_name || "عميل متجر"}
                                </span>

                                <span className="text-[11px] font-mono font-bold text-neutral-500 bg-[#F4F5F7] px-2 py-0.5 rounded-md">
                                  #{inv.order_number}
                                </span>

                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>{lang === "ar" ? "مدفوع" : "PAID"}</span>
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500">
                                {inv.customer_phone && (
                                  <span className="font-mono text-[11px] text-neutral-600">
                                    {inv.customer_phone}
                                  </span>
                                )}

                                {inv.governorate_name_ar && (
                                  <span>• {inv.governorate_name_ar}</span>
                                )}

                                {inv.issued_at && (
                                  <span className="text-[11px]">
                                    • {new Date(inv.issued_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                  </span>
                                )}

                                {inv.transaction_reference && (
                                  <span className="font-mono text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                                    {inv.transaction_reference}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Left side: Amount & Calm Actions */}
                          <div className="flex items-center justify-between md:justify-end gap-4 pt-3 md:pt-0 border-t md:border-t-0 border-silver/40">
                            {/* Amount */}
                            <div className="text-end">
                              <span className="font-heading font-black text-base sm:text-lg text-emerald-700 block">
                                {formatCurrency(inv.total_amount, lang)}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-mono">
                                {inv.invoice_number}
                              </span>
                            </div>

                            {/* Clean Action Buttons */}
                            <div className="flex items-center gap-1.5">
                              {hasReceipt && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setReceiptModal({
                                      url: `/api/receipts?submissionId=${inv.payment_submission_id}`,
                                      title: `طلب #${inv.order_number} (${formatCurrency(inv.total_amount, lang)})`,
                                    })
                                  }
                                  title={lang === "ar" ? "معاينة إيصال التحويل (صورة)" : "View receipt"}
                                  className="p-2 rounded-xl border border-silver/80 text-neutral-700 hover:text-jet hover:bg-neutral-100 active:scale-95 transition-all cursor-pointer"
                                >
                                  <Eye className="w-4 h-4 text-emerald-700" />
                                </button>
                              )}

                              <a
                                href={`/api/invoices?invoiceNumber=${encodeURIComponent(
                                  inv.invoice_number
                                )}&format=html&print=1`}
                                target="_blank"
                                rel="noreferrer"
                                title={lang === "ar" ? "طباعة الفاتورة" : "Print invoice"}
                                className="p-2 rounded-xl border border-silver/80 text-neutral-700 hover:text-jet hover:bg-neutral-100 active:scale-95 transition-all cursor-pointer"
                              >
                                <Printer className="w-4 h-4" />
                              </a>

                              <button
                                type="button"
                                onClick={() => {
                                  setGlobalQuery(inv.order_number);
                                  setActiveSection("orders");
                                }}
                                title={lang === "ar" ? "فتح الطلب في لوحة الإدارة" : "View order"}
                                className="p-2 rounded-xl border border-silver/80 text-neutral-700 hover:text-jet hover:bg-neutral-100 active:scale-95 transition-all cursor-pointer"
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}

          {/* 11 & 12. RETURNS & DISCOUNTS */}
          {(activeSection === "returns" || activeSection === "discounts") &&
            returnsDiscountsData && (
              <div className="space-y-8">
                <h1 className="font-heading text-2xl font-bold">
                  {activeSection === "returns"
                    ? "RETURNS & EXCHANGES"
                    : "DISCOUNTS & COUPON CODES"}
                </h1>

                {activeSection === "discounts" && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      await postAdminAction({
                        action: "save_coupon",
                        code: cpnCode,
                        discountType: cpnType,
                        discountValue: Number(cpnValue),
                        minSpend: Number(cpnMinSpend),
                      });
                      setCpnCode("");
                      setCpnValue("");
                      setCpnMinSpend("");
                    }}
                    className="bg-white border border-silver/60 p-6 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end text-xs"
                  >
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "كود الكوبون *" : "Coupon Code *"}</label>
                      <input
                        type="text"
                        required
                        value={cpnCode}
                        onChange={(e) => setCpnCode(e.target.value)}
                        placeholder={lang === "ar" ? "رمز الكوبون (مثال U3VIP10)" : "U3VIP10"}
                        className="w-full border border-silver px-3 py-2 bg-offwhite uppercase font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "نوع الخصم" : "Type"}</label>
                      <select
                        value={cpnType}
                        onChange={(e) => setCpnType(e.target.value)}
                        className="w-full border border-silver px-3 py-2 bg-offwhite"
                      >
                        <option value="PERCENTAGE">{lang === "ar" ? "نسبة مئوية (%)" : "Percentage (%)"}</option>
                        <option value="FIXED">{lang === "ar" ? "مبلغ ثابت (ج.م)" : "Fixed Amount (EGP)"}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "القيمة *" : "Value *"}</label>
                      <input
                        type="number"
                        required
                        value={cpnValue}
                        onChange={(e) => setCpnValue(e.target.value)}
                        placeholder="10"
                        className="w-full border border-silver px-3 py-2 bg-offwhite"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "الحد الأدنى للشراء (ج.م)" : "Min Spend (EGP)"}</label>
                      <input
                        type="number"
                        value={cpnMinSpend}
                        onChange={(e) => setCpnMinSpend(e.target.value)}
                        placeholder="0"
                        className="w-full border border-silver px-3 py-2 bg-offwhite"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-[#111214] hover:bg-[#292B2E] text-white font-bold uppercase py-2.5 px-4 rounded-sm transition-colors"
                    >
                      {lang === "ar" ? "حفظ الكوبون" : "Save Coupon"}
                    </button>
                  </form>
                )}

                {activeSection === "discounts" && (
                  <div className="bg-white border border-silver/60 p-6 space-y-2 text-xs">
                    <h3 className="font-heading text-sm font-bold text-jet mb-2">
                      {lang === "ar" ? "الكوبونات الحالية" : "ACTIVE COUPONS"}
                    </h3>
                    {returnsDiscountsData.coupons.length === 0 ? (
                      <p className="text-neutralgray">
                        {lang === "ar" ? "لا توجد كوبونات خصم حالياً." : "No active coupons."}
                      </p>
                    ) : (
                      returnsDiscountsData.coupons.map((c: any) => (
                        <div
                          key={c.id}
                          className="border border-silver/50 p-3 bg-offwhite flex justify-between items-center rounded-sm"
                        >
                          <div>
                            <span className="font-mono font-bold text-sm text-jet">{c.code}</span>
                            <span className="ms-3 text-neutralgray">
                              {c.discount_type === "PERCENTAGE" ? `${c.discount_value}%` : `${c.discount_value} EGP`} | {lang === "ar" ? "الحد الأدنى:" : "Min:"} {c.min_spend} EGP | {lang === "ar" ? "مرات الاستخدام:" : "Used:"} {c.used_count}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (
                                confirm(
                                  lang === "ar"
                                    ? `هل تريد بالتأكيد حذف الكوبون ${c.code}؟`
                                    : `Are you sure you want to delete coupon ${c.code}?`
                                )
                              ) {
                                await postAdminAction(
                                  { action: "delete_coupon", id: c.id },
                                  lang === "ar" ? "تم حذف الكوبون" : "Coupon deleted"
                                );
                              }
                            }}
                            className="border border-red-300 text-red-600 hover:bg-red-50 px-2.5 py-1 font-bold text-xs rounded-sm transition-colors"
                          >
                            {lang === "ar" ? "حذف" : "Delete"}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeSection === "returns" && (
                  <div className="space-y-6">
                    <div className="bg-[#111214] text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-heading font-bold text-sm">
                          <ShieldCheck className="w-4 h-4 text-emerald-400" />
                          <span>{lang === "ar" ? "نظام إدارة المرتجعات والاستبدالات الآمن" : "SECURE RETURNS & EXCHANGES SYSTEM"}</span>
                        </div>
                        <p className="text-[11px] text-neutral-300 leading-relaxed">
                          {lang === "ar"
                            ? "يتم تسجيل عمليات الإرجاع والاستبدال تلقائياً مع تحديث فوري للمخزون (استرجاع القديم وخصم البديل) وحفظ التعديلات في سجل تدقيق دائم."
                            : "Returns and exchanges are recorded with automated inventory sync (restock old and deduct replacement) and permanent audit trails."}
                        </p>
                      </div>
                      <div className="text-xs bg-white/10 px-3 py-1.5 rounded-xl font-bold shrink-0 text-center">
                        {lang === "ar" ? `العمليات المسجلة: ${returnsDiscountsData.returns.length}` : `Total Logged: ${returnsDiscountsData.returns.length}`}
                      </div>
                    </div>

                    {returnsDiscountsData.returns.length === 0 ? (
                      <div className="bg-white border border-silver/60 rounded-2xl p-12 text-center text-xs text-neutralgray">
                        {lang === "ar" ? "لا توجد عمليات إرجاع أو استبدال مسجلة حالياً." : "No return or exchange records yet."}
                      </div>
                    ) : (
                      returnsDiscountsData.returns.map((r: any) => (
                        <div
                          key={r.id}
                          className="bg-white border border-silver/60 rounded-2xl p-5 space-y-4 hover:border-jet/40 transition-all shadow-2xs"
                        >
                          <div className="flex flex-wrap justify-between items-start gap-3">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg ${
                                  r.request_type === "EXCHANGE"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-red-100 text-red-800"
                                }`}>
                                  {r.return_number}
                                </span>
                                <span className="font-bold text-xs text-jet">
                                  {lang === "ar" ? "طلب رقم:" : "Order:"} #{r.order_number}
                                </span>
                                <span className="text-[11px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>{lang === "ar" ? "المخزون محدّث بالمستودع" : "Stock Synced"}</span>
                                </span>
                              </div>
                              <p className="text-xs text-neutralgray pt-0.5">
                                <span className="font-bold text-jet">{r.customer_name}</span>
                                {r.customer_phone && <span className="ms-2 font-mono">({r.customer_phone})</span>}
                                <span className="ms-3 text-[11px]">
                                  {new Date(r.created_at).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US")}
                                </span>
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/order-confirmation/${r.order_number}`}
                                className="border border-jet text-jet hover:bg-[#111214] hover:text-white px-3 py-1.5 rounded-xl font-bold text-xs transition-colors"
                              >
                                {lang === "ar" ? "معاينة الطلب" : "Open Slip"}
                              </Link>
                              <a
                                href={`/api/invoices?orderNumber=${encodeURIComponent(
                                  r.order_number
                                )}&format=html&print=1`}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-[#111214] hover:bg-[#292B2E] text-white px-3 py-1.5 rounded-xl font-bold text-xs inline-flex items-center gap-1 transition-colors shadow-2xs"
                              >
                                <Printer className="w-3.5 h-3.5 text-amber-400" />
                                <span>{lang === "ar" ? "الفاتورة" : "Invoice"}</span>
                              </a>
                            </div>
                          </div>

                          {/* Reason and Details */}
                          <div className="bg-offwhite border border-silver/50 p-3.5 rounded-xl space-y-2 text-xs">
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-neutral-800 shrink-0">
                                {lang === "ar" ? "تفاصيل العملية:" : "Operation Detail:"}
                              </span>
                              <span className="text-neutral-700">
                                {r.reason}
                              </span>
                            </div>

                            {r.items && r.items.length > 0 && (
                              <div className="pt-2 border-t border-silver/40 space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-neutralgray block">
                                  {lang === "ar" ? "المنتجات المرتبطة بالحركة:" : "AFFECTED ITEMS:"}
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                  {r.items.map((it: any) => (
                                    <div key={it.id} className="bg-white p-2 rounded-lg border border-silver/50 flex items-center justify-between text-[11px]">
                                      <div>
                                        <div className="font-bold text-jet">{it.product_name}</div>
                                        <div className="text-neutralgray text-[10px]">
                                          {lang === "ar" ? "المقاس:" : "Size:"} {it.size} | {lang === "ar" ? "اللون:" : "Color:"} {it.color}
                                        </div>
                                      </div>
                                      <span className="bg-neutral-100 font-bold px-2 py-0.5 rounded text-[10px]">
                                        Qty: {it.quantity}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

          {/* 14–18 & 23–24. CMS, HOMEPAGE EDITOR, PAGES, MEDIA, TRANSLATIONS, SEO, SETTINGS */}
          {["homepage", "pages", "navigation", "media", "translations", "seo", "settings"].includes(
            activeSection
          ) &&
            cmsData && (
              <div className="space-y-8">
                <h1 className="font-heading text-2xl font-bold uppercase">
                  {activeSection} MANAGEMENT
                </h1>

                {activeSection === "homepage" && (
                  <div className="space-y-4">
                    {cmsData.sections.map((sec: any) => (
                      <form
                        key={sec.id}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          postAdminAction({
                            action: "save_website_section",
                            id: sec.id,
                            sectionType: sec.section_type,
                            titleEn: fd.get("titleEn"),
                            titleAr: fd.get("titleAr"),
                            subtitleEn: fd.get("subtitleEn"),
                            subtitleAr: fd.get("subtitleAr"),
                            descriptionEn: fd.get("descriptionEn"),
                            descriptionAr: fd.get("descriptionAr"),
                            buttonTextEn: fd.get("buttonTextEn"),
                            buttonTextAr: fd.get("buttonTextAr"),
                            buttonLink: fd.get("buttonLink"),
                            isVisible: fd.get("isVisible") === "on",
                            sortOrder: Number(fd.get("sortOrder") || sec.sort_order),
                          });
                        }}
                        className="bg-white border border-silver/60 p-6 space-y-3 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-jet">[{sec.section_type}]</span>
                          <label className="flex items-center gap-1.5 font-bold">
                            <input
                              name="isVisible"
                              type="checkbox"
                              defaultChecked={Boolean(sec.is_visible)}
                            />
                            <span>{lang === "ar" ? "ظاهر في الصفحة الرئيسية" : "Visible on Homepage"}</span>
                          </label>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            name="titleEn"
                            defaultValue={sec.title_en}
                            className="border border-silver px-3 py-2 bg-offwhite"
                          />
                          <input
                            name="titleAr"
                            defaultValue={sec.title_ar}
                            className="border border-silver px-3 py-2 bg-offwhite"
                          />
                          <input
                            name="subtitleEn"
                            defaultValue={sec.subtitle_en}
                            className="border border-silver px-3 py-2 bg-offwhite"
                          />
                          <input
                            name="subtitleAr"
                            defaultValue={sec.subtitle_ar}
                            className="border border-silver px-3 py-2 bg-offwhite"
                          />
                          <input
                            name="buttonTextEn"
                            defaultValue={sec.button_text_en}
                            className="border border-silver px-3 py-2 bg-offwhite"
                          />
                          <input
                            name="buttonTextAr"
                            defaultValue={sec.button_text_ar}
                            className="border border-silver px-3 py-2 bg-offwhite"
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-jet text-offwhite px-5 py-2 font-bold"
                        >
                          {lang === "ar" ? "حفظ القسم" : "Save Section"}
                        </button>
                      </form>
                    ))}
                  </div>
                )}

                {activeSection === "pages" && (
                  <div className="space-y-4">
                    {cmsData.pages.map((pg: any) => (
                      <form
                        key={pg.id}
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          postAdminAction({
                            action: "save_website_page",
                            id: pg.id,
                            slug: pg.slug,
                            titleEn: fd.get("titleEn"),
                            titleAr: fd.get("titleAr"),
                            contentEn: fd.get("contentEn"),
                            contentAr: fd.get("contentAr"),
                          });
                        }}
                        className="bg-white border border-silver/60 p-6 space-y-3 text-xs"
                      >
                        <p className="font-mono font-bold text-jet">/{pg.slug}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            name="titleEn"
                            defaultValue={pg.title_en}
                            className="border border-silver px-3 py-2 bg-offwhite font-bold"
                          />
                          <input
                            name="titleAr"
                            defaultValue={pg.title_ar}
                            className="border border-silver px-3 py-2 bg-offwhite font-bold"
                          />
                          <textarea
                            name="contentEn"
                            rows={4}
                            defaultValue={pg.content_en}
                            className="border border-silver px-3 py-2 bg-offwhite"
                          />
                          <textarea
                            name="contentAr"
                            rows={4}
                            defaultValue={pg.content_ar}
                            className="border border-silver px-3 py-2 bg-offwhite"
                          />
                        </div>
                        <button
                          type="submit"
                          className="bg-jet text-offwhite px-5 py-2 font-bold"
                        >
                          {lang === "ar" ? "حفظ الصفحة" : "Save Page"}
                        </button>
                      </form>
                    ))}
                  </div>
                )}

                {activeSection === "media" && (
                  <div className="bg-white border border-silver/60 p-6 space-y-4 rounded-2xl shadow-xs">
                    <label className="inline-block bg-[#111214] hover:bg-[#292B2E] text-white text-xs font-bold uppercase px-6 py-3 cursor-pointer">
                      {lang === "ar" ? "رفع صورة إلى مكتبة الوسائط" : "Upload Image to Media Library"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleMediaUpload(e)}
                        className="hidden"
                      />
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      {cmsData.media.map((m: any) => (
                        <div key={m.id} className="border border-silver p-2 bg-offwhite text-[10px]">
                          <img src={m.url} alt="" className="w-full aspect-square object-cover mb-1" />
                          <code className="block truncate">{m.url}</code>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeSection === "translations" && (
                  <div className="bg-white border border-silver/60 p-6 space-y-4 text-xs">
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        await postAdminAction({
                          action: "save_translation",
                          key: trKey,
                          en: trEn,
                          ar: trAr,
                        });
                        setTrKey("");
                        setTrEn("");
                        setTrAr("");
                      }}
                      className="grid grid-cols-1 sm:grid-cols-4 gap-3"
                    >
                      <input
                        type="text"
                        required
                        value={trKey}
                        onChange={(e) => setTrKey(e.target.value)}
                        placeholder={lang === "ar" ? "المعرف (مثال hero.cta)" : "Key (e.g. hero.cta)"}
                        className="border border-silver px-3 py-2 bg-offwhite"
                      />
                      <input
                        type="text"
                        required
                        value={trEn}
                        onChange={(e) => setTrEn(e.target.value)}
                        placeholder={lang === "ar" ? "النص الإنجليزي" : "English Text"}
                        className="border border-silver px-3 py-2 bg-offwhite"
                      />
                      <input
                        type="text"
                        required
                        value={trAr}
                        onChange={(e) => setTrAr(e.target.value)}
                        placeholder="النص بالعربية"
                        className="border border-silver px-3 py-2 bg-offwhite"
                      />
                      <button type="submit" className="bg-[#111214] hover:bg-[#292B2E] text-white font-bold py-2">
                        {lang === "ar" ? "حفظ الترجمة" : "Save Translation"}
                      </button>
                    </form>
                  </div>
                )}

                {(activeSection === "settings" || activeSection === "seo" || activeSection === "navigation") &&
                  cmsData.settings && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const vc = fd.get("visibleCategories");
                        if (vc) {
                          try {
                            if (typeof window !== "undefined" && "BroadcastChannel" in window) {
                              const bc = new BroadcastChannel("u3_admin_sync");
                              bc.postMessage({ type: "VISIBILITY_CHANGED", visible_categories: vc });
                              bc.close();
                            }
                          } catch {}
                        }
                        postAdminAction({
                          action: "save_store_settings",
                          visibleCategories: fd.get("visibleCategories"),
                          storeNameEn: fd.get("storeNameEn"),
                          storeNameAr: fd.get("storeNameAr"),
                          taglineEn: fd.get("taglineEn"),
                          taglineAr: fd.get("taglineAr"),
                          canonicalUrl: fd.get("canonicalUrl"),
                          contactEmail: fd.get("contactEmail"),
                          contactPhone: fd.get("contactPhone"),
                          whatsappNumber: fd.get("whatsappNumber"),
                          addressEn: fd.get("addressEn"),
                          addressAr: fd.get("addressAr"),
                          seoTitleEn: fd.get("seoTitleEn"),
                          seoTitleAr: fd.get("seoTitleAr"),
                          seoDescriptionEn: fd.get("seoDescriptionEn"),
                          seoDescriptionAr: fd.get("seoDescriptionAr"),
                        });
                      }}
                      className="bg-white border border-silver/60 p-6 space-y-4 text-xs"
                    >
                      {/* STORE DISPLAY SETTINGS (Shoes Only / Clothing Only / Both) */}
                      <div className="bg-gradient-to-r from-neutral-900 to-black text-white p-5 rounded-2xl shadow-md space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <Layers className="w-5 h-5 text-emerald-400" />
                            <h3 className="font-heading font-bold text-sm tracking-wide">
                              {lang === "ar" ? "إعدادات الأقسام المعروضة بالمتجر (STORE DISPLAY MODE)" : "STORE CATEGORY DISPLAY SETTINGS"}
                            </h3>
                          </div>
                          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full">
                            {cmsData.settings?.visible_categories || "BOTH"}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-300">
                          {lang === "ar"
                            ? "تحكم في الأقسام المتاحة للزوار في الهيدر والفوتر والصفحة الرئيسية ومسارات التصفح."
                            : "Choose which departments are live and accessible across navigation, homepage, and routes."}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          {[
                            { value: "BOTH", labelEn: "Shoes + Clothing (Both)", labelAr: "الأحذية والملابس معاً" },
                            { value: "SHOES_ONLY", labelEn: "Shoes Only", labelAr: "الأحذية فقط" },
                            { value: "CLOTHING_ONLY", labelEn: "Clothing Only", labelAr: "الملابس فقط" },
                          ].map((opt) => (
                            <label
                              key={opt.value}
                              className="flex items-center gap-2 p-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer select-none transition-colors"
                            >
                              <input
                                type="radio"
                                name="visibleCategories"
                                value={opt.value}
                                defaultChecked={(cmsData.settings?.visible_categories || "BOTH") === opt.value}
                                className="w-4 h-4 text-emerald-500 focus:ring-emerald-400"
                              />
                              <span className="text-xs font-bold">{lang === "ar" ? opt.labelAr : opt.labelEn}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold mb-1">{lang === "ar" ? "اسم المتجر (إنجليزي)" : "Store Name (EN)"}</label>
                          <input
                            name="storeNameEn"
                            defaultValue={cmsData.settings.store_name_en}
                            className="w-full border border-silver px-3 py-2 bg-offwhite"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">{lang === "ar" ? "اسم المتجر (عربي)" : "Store Name (AR)"}</label>
                          <input
                            name="storeNameAr"
                            defaultValue={cmsData.settings.store_name_ar}
                            className="w-full border border-silver px-3 py-2 bg-offwhite"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">
                            {lang === "ar" ? "رابط الموقع الرسمي (Canonical Store URL)" : "Canonical Store URL / Website Domain"}
                          </label>
                          <input
                            name="canonicalUrl"
                            defaultValue={cmsData.settings.canonical_url || ""}
                            placeholder="https://u3store.com"
                            className="w-full border border-silver px-3 py-2 bg-offwhite font-mono text-xs"
                          />
                          <p className="text-[10px] text-neutralgray mt-1">
                            {lang === "ar"
                              ? "يُستخدم تلقائياً لإنشاء روابط تتبع الطلبات الحقيقية لرسائل الواتساب والفواتير (مثال: https://u3store.com)"
                              : "Used to build production tracking URLs in WhatsApp notifications and invoices."}
                          </p>
                        </div>
                        <div>
                          <label className="block font-bold mb-1">{lang === "ar" ? "البريد الإلكتروني للتواصل" : "Contact Email"}</label>
                          <input
                            name="contactEmail"
                            defaultValue={cmsData.settings.contact_email}
                            className="w-full border border-silver px-3 py-2 bg-offwhite"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">{lang === "ar" ? "هاتف التواصل" : "Contact Phone"}</label>
                          <input
                            name="contactPhone"
                            defaultValue={cmsData.settings.contact_phone}
                            className="w-full border border-silver px-3 py-2 bg-offwhite"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">{lang === "ar" ? "عنوان SEO (إنجليزي)" : "SEO Title (EN)"}</label>
                          <input
                            name="seoTitleEn"
                            defaultValue={cmsData.settings.seo_title_en}
                            className="w-full border border-silver px-3 py-2 bg-offwhite"
                          />
                        </div>
                        <div>
                          <label className="block font-bold mb-1">{lang === "ar" ? "عنوان SEO (عربي)" : "SEO Title (AR)"}</label>
                          <input
                            name="seoTitleAr"
                            defaultValue={cmsData.settings.seo_title_ar}
                            className="w-full border border-silver px-3 py-2 bg-offwhite"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="bg-[#111214] hover:bg-[#292B2E] text-white font-bold uppercase px-6 py-3"
                      >
                        {lang === "ar" ? "حفظ إعدادات المتجر ومحركات البحث" : "Save Store & SEO Settings"}
                      </button>
                    </form>
                  )}

                {activeSection === "settings" && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const res = await fetch("/api/auth/admin", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "update_my_credentials",
                          newUsername: myNewUsername || admin.username,
                          currentPassword: myCurrentPassword,
                          newPassword: myNewPassword,
                        }),
                      });
                      const d = await res.json();
                      if (!d.ok) {
                        showNotification(d.error || (lang === "ar" ? "تعذر تحديث بيانات الحساب" : "Could not update credentials"), "error");
                      } else {
                        showNotification(lang === "ar" ? "تم تحديث اسم المستخدم وكلمة المرور بنجاح" : "Admin username/password updated", "success");
                        setMyCurrentPassword("");
                        setMyNewPassword("");
                      }
                    }}
                    className="bg-white border border-silver/60 p-6 space-y-3 text-xs mt-6"
                  >
                    <h3 className="font-heading text-sm font-bold uppercase">
                      {lang === "ar"
                        ? "تغيير اسم المستخدم وكلمة المرور الخاصة بالإدارة"
                        : "UPDATE ADMIN USERNAME & PASSWORD"}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        value={myNewUsername}
                        onChange={(e) => setMyNewUsername(e.target.value)}
                        placeholder={`New Username (Current: ${admin.username || "u3owner"})`}
                        className="border border-silver px-3 py-2 bg-offwhite"
                      />
                      <div className="relative">
                        <input
                          type={showMyCurrentPassword ? "text" : "password"}
                          required
                          value={myCurrentPassword}
                          onChange={(e) => setMyCurrentPassword(e.target.value)}
                          placeholder={lang === "ar" ? "كلمة المرور الحالية *" : "Current Password *"}
                          className="w-full border border-silver px-3 py-2 pe-9 bg-offwhite"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMyCurrentPassword(!showMyCurrentPassword)}
                          className="absolute inset-y-0 end-0 px-2.5 flex items-center text-neutralgray hover:text-jet"
                          aria-label="Toggle password"
                        >
                          {showMyCurrentPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showMyNewPassword ? "text" : "password"}
                          value={myNewPassword}
                          onChange={(e) => setMyNewPassword(e.target.value)}
                          placeholder={lang === "ar" ? "كلمة المرور الجديدة (اختياري، 6 أحرف على الأقل)" : "New Password (Optional, min 6 chars)"}
                          className="w-full border border-silver px-3 py-2 pe-9 bg-offwhite"
                        />
                        <button
                          type="button"
                          onClick={() => setShowMyNewPassword(!showMyNewPassword)}
                          className="absolute inset-y-0 end-0 px-2.5 flex items-center text-neutralgray hover:text-jet"
                          aria-label="Toggle password"
                        >
                          {showMyNewPassword ? (
                            <EyeOff className="w-3.5 h-3.5" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="bg-[#111214] hover:bg-[#292B2E] text-white px-6 py-2.5 font-bold uppercase"
                    >
                      {lang === "ar" ? "حفظ بيانات الدخول" : "Save My Credentials"}
                    </button>
                  </form>
                )}
              </div>
            )}

          {/* 20. REPORTS & ANALYTICS */}
          {activeSection === "reports" && reportsData && (() => {
            const salesByDate = reportsData.salesByDate || [];
            const salesByProduct = reportsData.salesByProduct || [];
            const salesBySize = reportsData.salesBySize || [];
            const paymentDistribution = reportsData.paymentDistribution || [];

            const totalGross = salesByDate.reduce((acc: number, r: any) => acc + (Number(r.gross_value) || 0), 0);
            const totalPaid = salesByDate.reduce((acc: number, r: any) => acc + (Number(r.paid_revenue) || 0), 0);
            const totalOrders = salesByDate.reduce((acc: number, r: any) => acc + (Number(r.orders_count) || 0), 0);
            const totalUnits = salesByProduct.reduce((acc: number, p: any) => acc + (Number(p.units_sold) || 0), 0);
            const maxUnits = Math.max(1, ...salesByProduct.map((p: any) => Number(p.units_sold) || 0));
            const maxSizeUnits = Math.max(1, ...salesBySize.map((s: any) => Number(s.units_sold) || 0));

            return (
              <div className="space-y-7 animate-in fade-in duration-300">
                {/* Header & Title Bar */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-silver/40 pb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#111214] text-white flex items-center justify-center shadow-md">
                      <BarChart3 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h1 className="font-heading text-xl sm:text-2xl font-black text-jet tracking-wide">
                        {lang === "ar" ? "التقارير المالية والمبيعات" : "FINANCIAL & SALES REPORTS"}
                      </h1>
                      <p className="text-xs text-neutralgray">
                        {lang === "ar"
                          ? "تحليلات دقيقة لحجم الإيرادات، مبيعات كل موديل حذاء، وحركة المقاسات ووسائل الدفع"
                          : "Real-time analytics for revenue volume, footwear model sales, sizing demand, and payment channels"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={() => loadSectionData("reports")}
                      className="border border-neutral-300 hover:bg-neutral-100 text-neutral-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-2xs active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-neutral-600" />
                      <span>{lang === "ar" ? "تحديث التقارير" : "Refresh Data"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSection("orders")}
                      className="bg-[#111214] hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                    >
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{lang === "ar" ? "عرض جميع الطلبات" : "View All Orders"}</span>
                    </button>
                  </div>
                </div>

                {/* Top 2 Clean Executive Metric Cards (Verified Revenue & Total Orders) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {/* Paid / Verified Revenue (Green Luxury Card) */}
                  <div className="bg-gradient-to-br from-emerald-950/95 via-[#0d281a] to-[#081b11] text-white p-6 sm:p-7 rounded-3xl shadow-lg border border-emerald-500/40 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute top-0 end-0 w-32 h-32 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-700" />
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shadow-xs">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-mono font-bold tracking-wider uppercase text-emerald-200 bg-emerald-900/60 border border-emerald-400/40 px-3 py-1 rounded-full shadow-2xs">
                          {totalGross > 0 ? `${Math.round((totalPaid / totalGross) * 100)}% محصل ومؤكد` : "100% مؤكد"}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-emerald-200 uppercase tracking-wider">
                          {lang === "ar" ? "الإيرادات المحصلة والمؤكدة" : "Verified Paid Revenue"}
                        </p>
                        <p className="font-heading text-3xl sm:text-4xl font-black font-mono tracking-tight text-emerald-300">
                          {formatCurrency(totalPaid, lang)}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-300/80 mt-4 pt-3 border-t border-emerald-800/50 flex items-center justify-between">
                      <span>{lang === "ar" ? "مدفوعات تم التحقق منها واعتمادها بنجاح" : "Confirmed & verified receipts in system"}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </p>
                  </div>

                  {/* Orders Count & Average Value */}
                  <div className="bg-white border border-silver/70 p-6 sm:p-7 rounded-3xl shadow-xs hover:border-jet transition-all flex flex-col justify-between group">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#111214] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                          <ShoppingBag className="w-6 h-6 text-emerald-400" />
                        </div>
                        <span className="text-xs font-mono font-bold text-neutral-600 px-3 py-1 rounded-full bg-neutral-100 border border-silver/50">
                          {lang === "ar" ? "الطلبات المسجلة" : "TOTAL ORDERS"}
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-neutralgray uppercase tracking-wider">
                          {lang === "ar" ? "إجمالي عدد الطلبات" : "Total Orders Placed"}
                        </p>
                        <p className="font-heading text-3xl sm:text-4xl font-black font-mono tracking-tight text-jet">
                          {totalOrders} <span className="text-sm font-bold text-neutralgray">{lang === "ar" ? "طلب مسجل" : "orders"}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-neutralgray mt-4 pt-3 border-t border-silver/50 flex items-center justify-between">
                      <span>{lang === "ar" ? "متوسط قيمة الطلب الواحد:" : "Average Order Value:"}</span>
                      <strong className="text-jet font-mono font-bold text-sm">
                        {totalOrders > 0 ? formatCurrency(Math.round(totalGross / totalOrders), lang) : "0"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Two-Column Analytics Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 1. Sales by Sneaker Model (Top Sellers) */}
                  <div className="bg-white border border-silver/60 p-6 sm:p-7 rounded-3xl shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-silver/40 pb-3">
                      <div>
                        <h3 className="font-heading text-sm font-bold text-jet uppercase tracking-wider flex items-center gap-2">
                          <Footprints className="w-4 h-4 text-neutral-600" />
                          <span>{lang === "ar" ? "المبيعات حسب موديل الحذاء" : "Sales by Footwear Model"}</span>
                        </h3>
                        <p className="text-[11px] text-neutralgray mt-0.5">
                          {lang === "ar" ? "ترتيب الموديلات الأكثر مبيعاً والأعلى إيراداً" : "Ranking by units sold and gross revenue"}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full">
                        {salesByProduct.length} {lang === "ar" ? "موديلات" : "models"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {salesByProduct.length === 0 ? (
                        <p className="text-xs text-neutralgray py-8 text-center">
                          {lang === "ar" ? "لا توجد مبيعات مسجلة حتى الآن." : "No product sales recorded yet."}
                        </p>
                      ) : (
                        salesByProduct.map((p: any, i: number) => {
                          const units = Number(p.units_sold) || 0;
                          const pct = Math.round((units / maxUnits) * 100);
                          const name = lang === "ar" ? (p.product_name_ar || p.product_name_en) : (p.product_name_en || p.product_name_ar);
                          return (
                            <div
                              key={i}
                              className="p-3.5 bg-neutral-50/80 hover:bg-neutral-100/80 rounded-2xl border border-silver/40 transition-all space-y-2 group"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className={`w-6 h-6 rounded-full text-[11px] font-mono font-bold flex items-center justify-center shrink-0 ${
                                    i === 0
                                      ? "bg-amber-400 text-black font-extrabold shadow-2xs"
                                      : i === 1
                                      ? "bg-neutral-300 text-black font-bold"
                                      : i === 2
                                      ? "bg-amber-700/20 text-amber-900 font-bold"
                                      : "bg-neutral-200 text-neutral-700"
                                  }`}>
                                    {i + 1}
                                  </span>
                                  <span className="font-heading font-bold text-xs text-jet truncate block">
                                    {name}
                                  </span>
                                </div>
                                <div className="text-end shrink-0">
                                  <span className="font-heading font-black text-xs font-mono text-jet block">
                                    {formatCurrency(p.total_sales, lang)}
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block mt-0.5">
                                    {units} {lang === "ar" ? "قطعة مباعة" : "units"}
                                  </span>
                                </div>
                              </div>

                              {/* Visual Progress Bar */}
                              <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-jet h-full rounded-full transition-all duration-500 group-hover:bg-emerald-600"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* 2. Daily Sales & Revenue Log */}
                  <div className="bg-white border border-silver/60 p-6 sm:p-7 rounded-3xl shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-silver/40 pb-3">
                      <div>
                        <h3 className="font-heading text-sm font-bold text-jet uppercase tracking-wider flex items-center gap-2">
                          <Clock className="w-4 h-4 text-neutral-600" />
                          <span>{lang === "ar" ? "حركة المبيعات اليومية" : "Daily Sales Log"}</span>
                        </h3>
                        <p className="text-[11px] text-neutralgray mt-0.5">
                          {lang === "ar" ? "سجل المبيعات والإيرادات المحصلة لكل يوم" : "Daily revenue breakdown and collection"}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2.5 py-1 rounded-full">
                        {salesByDate.length} {lang === "ar" ? "أيام نشطة" : "days"}
                      </span>
                    </div>

                    <div className="space-y-2.5 max-h-[480px] overflow-y-auto pe-1">
                      {salesByDate.length === 0 ? (
                        <p className="text-xs text-neutralgray py-8 text-center">
                          {lang === "ar" ? "لا توجد بيانات مبيعات يومية بعد." : "No daily sales data yet."}
                        </p>
                      ) : (
                        salesByDate.map((r: any) => {
                          const gross = Number(r.gross_value) || 0;
                          const paid = Number(r.paid_revenue) || 0;
                          return (
                            <div
                              key={r.day}
                              className="p-3.5 bg-neutral-50/80 hover:bg-neutral-100/80 rounded-2xl border border-silver/40 flex flex-wrap items-center justify-between gap-3 transition-colors text-xs"
                            >
                              <div className="space-y-0.5">
                                <span className="font-mono font-bold text-jet text-xs tracking-wide block">
                                  {r.day}
                                </span>
                                <span className="text-[10px] font-bold text-neutral-500 bg-white px-2 py-0.5 rounded-md border border-silver/50 inline-block">
                                  {r.orders_count} {lang === "ar" ? "طلب" : "orders"}
                                </span>
                              </div>

                              <div className="flex items-center gap-4 text-end">
                                <div>
                                  <span className="text-[10px] text-neutralgray block font-bold">
                                    {lang === "ar" ? "إجمالي القيمة" : "Gross"}
                                  </span>
                                  <span className="font-mono font-bold text-neutral-700">
                                    {formatCurrency(gross, lang)}
                                  </span>
                                </div>
                                <div className="ps-3 border-s border-silver/50">
                                  <span className="text-[10px] text-emerald-700 block font-bold">
                                    {lang === "ar" ? "المحصل الفعلي" : "Paid"}
                                  </span>
                                  <span className="font-mono font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 block">
                                    {formatCurrency(paid, lang)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Shoe Sizes Demand & Payment Channels Breakdown */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Sneaker Size Breakdown */}
                  <div className="bg-white border border-silver/60 p-6 sm:p-7 rounded-3xl shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-silver/40 pb-3">
                      <div>
                        <h3 className="font-heading text-sm font-bold text-jet uppercase tracking-wider flex items-center gap-2">
                          <Footprints className="w-4 h-4 text-neutral-600" />
                          <span>{lang === "ar" ? "توزيع مبيعات المقاسات" : "Shoe Sizes Demand"}</span>
                        </h3>
                        <p className="text-[11px] text-neutralgray mt-0.5">
                          {lang === "ar" ? "المقاسات الأكثر طلباً لمعرفة متطلبات إعادة التخزين" : "Demand per size to guide restocking"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {salesBySize.length === 0 ? (
                        <p className="text-xs text-neutralgray py-6 text-center">
                          {lang === "ar" ? "لا توجد بيانات مقاسات بعد." : "No sizing data yet."}
                        </p>
                      ) : (
                        salesBySize.map((s: any, idx: number) => {
                          const units = Number(s.units_sold) || 0;
                          const pct = Math.round((units / maxSizeUnits) * 100);
                          return (
                            <div key={idx} className="space-y-1 text-xs">
                              <div className="flex items-center justify-between font-bold">
                                <span className="bg-neutral-100 text-jet px-2.5 py-0.5 rounded-lg font-mono">
                                  EU {s.size}
                                </span>
                                <span className="font-mono text-jet">
                                  {units} {lang === "ar" ? "قطعة" : "items"}
                                </span>
                              </div>
                              <div className="w-full bg-neutral-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-[#111214] h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Payment Methods Distribution */}
                  <div className="bg-white border border-silver/60 p-6 sm:p-7 rounded-3xl shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-silver/40 pb-3">
                      <div>
                        <h3 className="font-heading text-sm font-bold text-jet uppercase tracking-wider flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-neutral-600" />
                          <span>{lang === "ar" ? "توزيع وسائل الدفع" : "Payment Methods Distribution"}</span>
                        </h3>
                        <p className="text-[11px] text-neutralgray mt-0.5">
                          {lang === "ar" ? "حجم وقيمة المعاملات عبر إنستاباي وفودافون كاش" : "Volume through InstaPay & Vodafone Cash"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {paymentDistribution.length === 0 ? (
                        <p className="text-xs text-neutralgray py-6 text-center">
                          {lang === "ar" ? "لا توجد معاملات دفع بعد." : "No payment distribution data yet."}
                        </p>
                      ) : (
                        paymentDistribution.map((pm: any, idx: number) => {
                          const isInsta = pm.payment_method_code === "INSTAPAY";
                          const label = isInsta
                            ? (lang === "ar" ? "إنستا باي (InstaPay)" : "InstaPay")
                            : (lang === "ar" ? "فودافون كاش (Vodafone Cash)" : "Vodafone Cash");
                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-2xl border border-silver/50 bg-neutral-50 flex items-center justify-between gap-3 text-xs"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                                  isInsta ? "bg-purple-900" : "bg-red-700"
                                }`}>
                                  {isInsta ? "IP" : "VC"}
                                </div>
                                <div>
                                  <p className="font-bold text-jet text-xs">{label}</p>
                                  <p className="text-[11px] text-neutralgray">
                                    {pm.count} {lang === "ar" ? "عمليات دفع" : "transactions"}
                                  </p>
                                </div>
                              </div>
                              <div className="text-end font-mono">
                                <p className="font-bold text-sm text-jet">
                                  {formatCurrency(pm.total_value, lang)}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 19, 21, 22. SYSTEM: NOTIFICATIONS & AUDIT LOGS */}
          {["activity-logs", "notifications"].includes(activeSection) &&
            systemData && (
              <div className="space-y-8">
                <h1 className="font-heading text-xl sm:text-2xl font-bold">
                  {lang === "ar"
                    ? activeSection === "activity-logs"
                      ? "سجل نشاطات النظام والعمليات"
                      : "إشعارات وتنبيهات النظام"
                    : activeSection === "activity-logs"
                    ? "SYSTEM ACTIVITY LOGS"
                    : "SYSTEM NOTIFICATIONS"}
                </h1>

                {activeSection === "activity-logs" && (
                  <div className="bg-white border border-silver/60 p-6 space-y-2 text-xs">
                    {systemData.auditLogs.map((l: any) => (
                      <div
                        key={l.id}
                        className="border border-silver/40 p-2.5 bg-offwhite flex justify-between"
                      >
                        <span>
                          <strong>[{l.action}]</strong> {l.entity_type} ({l.entity_id}) by{" "}
                          {l.admin_email}
                        </span>
                        <span className="text-neutralgray">
                          {new Date(l.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === "notifications" && (
                  <div className="bg-white border border-silver/60 p-6 space-y-2 text-xs">
                    {(systemData.notifications || []).map((n: any) => (
                      <div key={n.id} className="border-s-4 border-[#111214] p-3 bg-offwhite">
                        <p className="font-bold">
                          {lang === "ar" ? n.title_ar : n.title_en}
                        </p>
                        <p className="text-neutralgray">
                          {lang === "ar" ? n.message_ar : n.message_en}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          {/* WHATSAPP BUSINESS INTEGRATION, TEMPLATES, LOGS & INBOX */}
          {activeSection === "whatsapp" && whatsappData && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-silver/60 pb-4">
                <div>
                  <h1 className="font-heading text-2xl font-bold">
                    {lang === "ar"
                      ? "تكامل واتساب للأعمال وإشعارات الطلبات وصندوق المحادثات"
                      : "WHATSAPP BUSINESS CLOUD API, TEMPLATES, LOGS & INBOX"}
                  </h1>
                  <p className="text-xs text-neutralgray">
                    {lang === "ar" ? "حالة الاتصال: " : "Connection Status: "}
                    <strong className="text-jet">
                      {lang === "ar"
                        ? (whatsappData.settings?.connection_status === "CONNECTED"
                            ? "متصل"
                            : whatsappData.settings?.connection_status === "SIMULATED_OUTBOX"
                            ? "صندوق محاكاة (جاهز)"
                            : whatsappData.settings?.connection_status === "ERROR"
                            ? "خطأ في الاتصال"
                            : whatsappData.settings?.connection_status || "غير متصل")
                        : (whatsappData.settings?.connection_status || "NOT_CONFIGURED")}
                    </strong>
                  </p>
                </div>
              </div>

              {/* WhatsApp API Settings & Test Trigger */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    postAdminAction({
                      action: "save_whatsapp_settings",
                      isEnabled: fd.get("isEnabled") === "on",
                      businessPhoneNumber: fd.get("businessPhoneNumber"),
                      phoneNumberId: fd.get("phoneNumberId"),
                      businessAccountId: fd.get("businessAccountId"),
                      accessToken: fd.get("accessToken"),
                      webhookVerifyToken: fd.get("webhookVerifyToken"),
                    });
                  }}
                  className="lg:col-span-2 bg-white border border-silver/60 p-6 space-y-4 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-sm font-bold uppercase">
                      {lang === "ar" ? "إعدادات WhatsApp Cloud API" : "WhatsApp Cloud API Configuration"}
                    </h3>
                    <label className="flex items-center gap-2 font-bold">
                      <input
                        name="isEnabled"
                        type="checkbox"
                        defaultChecked={Boolean(whatsappData.settings?.is_enabled)}
                      />
                      <span>{lang === "ar" ? "تفعيل رسائل واتساب التلقائية" : "Enable WhatsApp Automation"}</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "رقم هاتف النشاط التجاري" : "Business Phone Number"}</label>
                      <input
                        name="businessPhoneNumber"
                        defaultValue={whatsappData.settings?.business_phone_number}
                        placeholder={lang === "ar" ? "+2010xxxxxxxx (رقم الواتساب)" : "+2010xxxxxxxx"}
                        className="w-full border border-silver px-3 py-2 bg-offwhite"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "معرف رقم الهاتف في Meta" : "Meta Phone Number ID"}</label>
                      <input
                        name="phoneNumberId"
                        defaultValue={whatsappData.settings?.phone_number_id}
                        className="w-full border border-silver px-3 py-2 bg-offwhite"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "معرف حساب الأعمال في Meta" : "Business Account ID"}</label>
                      <input
                        name="businessAccountId"
                        defaultValue={whatsappData.settings?.business_account_id}
                        className="w-full border border-silver px-3 py-2 bg-offwhite"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "رمز التحقق للويب هوك" : "Webhook Verify Token"}</label>
                      <input
                        name="webhookVerifyToken"
                        defaultValue={whatsappData.settings?.webhook_verify_token}
                        className="w-full border border-silver px-3 py-2 bg-offwhite font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "رمز الوصول الدائم (Token)" : "Permanent Access Token"}</label>
                    <div className="relative">
                      <input
                        name="accessToken"
                        type={showWaToken ? "text" : "password"}
                        defaultValue={whatsappData.settings?.access_token_encrypted}
                        placeholder="EAAG..."
                        className="w-full border border-silver px-3 py-2 pe-9 bg-offwhite font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowWaToken(!showWaToken)}
                        className="absolute inset-y-0 end-0 px-2.5 flex items-center text-neutralgray hover:text-jet"
                        aria-label="Toggle token visibility"
                      >
                        {showWaToken ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="bg-[#111214] text-white font-bold uppercase px-6 py-2.5"
                  >
                    {lang === "ar" ? "حفظ إعدادات واتساب" : "Save WhatsApp Configuration"}
                  </button>
                </form>

                {/* Send Test Message Box */}
                <div className="bg-white border border-silver/60 p-6 space-y-4 text-xs">
                  <h3 className="font-heading text-sm font-bold uppercase">
                    {lang === "ar" ? "إرسال إشعار تجريبي" : "Send Test Notification"}
                  </h3>
                  <p className="text-neutralgray">
                    {lang === "ar"
                      ? "إرسال رسالة واتساب تجريبية وتسجيلها في صندوق الرسائل الصادرة."
                      : "Queues a test WhatsApp notification and logs it in the Message Outbox."}
                  </p>
                  <input
                    type="tel"
                    value={testWaPhone}
                    onChange={(e) => setTestWaPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full border border-silver px-3 py-2 bg-offwhite"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      postAdminAction(
                        {
                          action: "send_test_whatsapp",
                          recipientPhone: testWaPhone,
                          eventType: "ORDER_RECEIVED",
                          lang,
                        },
                        lang === "ar" ? "تمت جدولة وتسجيل إشعار واتساب التجريبي" : "Test WhatsApp notification queued & logged"
                      )
                    }
                    className="w-full bg-[#292B2E] text-white font-bold uppercase py-2.5"
                  >
                    {lang === "ar" ? "إرسال رسالة واتساب تجريبية" : "Send Test WhatsApp Message"}
                  </button>
                </div>
              </div>

              {/* Direct Test Notification Sender */}

              {/* 15 Bilingual Templates Manager */}
              <div className="bg-white border border-silver/60 p-6 space-y-4 text-xs">
                <h3 className="font-heading text-sm font-bold uppercase">
                  {lang === "ar" ? "15 قالب إشعارات ثنائي اللغة (عربي وإنجليزي)" : "15 Bilingual Notification Templates (EN & AR)"}
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {(whatsappData.templates || []).map((tpl: any) => (
                    <form
                      key={tpl.id}
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        postAdminAction({
                          action: "save_whatsapp_template",
                          id: tpl.id,
                          bodyEn: fd.get("bodyEn"),
                          bodyAr: fd.get("bodyAr"),
                          isActive: fd.get("isActive") === "on",
                        });
                      }}
                      className="border border-silver/50 p-3 bg-offwhite space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-mono font-bold">
                          {tpl.event_type} ({tpl.name})
                        </span>
                        <label className="flex items-center gap-1.5 font-bold">
                          <input
                            name="isActive"
                            type="checkbox"
                            defaultChecked={Boolean(tpl.is_active)}
                          />
                          <span>{lang === "ar" ? "مفعل" : "Active"}</span>
                        </label>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <textarea
                          name="bodyEn"
                          rows={2}
                          defaultValue={tpl.body_en}
                          className="border border-silver p-2 bg-white"
                        />
                        <textarea
                          name="bodyAr"
                          rows={2}
                          defaultValue={tpl.body_ar}
                          className="border border-silver p-2 bg-white"
                        />
                      </div>
                      <button type="submit" className="bg-jet text-white px-4 py-1.5 font-bold">
                        {lang === "ar" ? "حفظ القالب" : "Save Template"}
                      </button>
                    </form>
                  ))}
                </div>
              </div>

              {/* WHATSAPP MESSAGE DELIVERY LOGS */}
              <div className="bg-white border border-silver/60 p-6 space-y-4 text-xs">
                {/* Guide info banner */}
                <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>{lang === "ar" ? "توضيح نظام رسائل الواتساب وإشعارات السيرفر" : "WhatsApp Delivery System & Meta API Guide"}</span>
                  </div>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    {lang === "ar"
                      ? "• التواصل المباشر السريع (1-Click Chat): متاح فوراً في بطاقات كل طلب عبر زر «إرسال رسالة واتساب للعميل»، ويقوم بفتح محادثة واتساب جاهزة بالبيانات دون الحاجة لأي مفاتيح أو اشتراكات سحابية."
                      : "• Direct 1-Click WhatsApp: Available immediately on all order cards via 'Send WhatsApp Message'. Opens pre-filled chat with customer without Meta Cloud API setup."}
                  </p>
                  <p className="text-amber-800 leading-relaxed text-[11px]">
                    {lang === "ar"
                      ? "• الإشعارات التلقائية عبر السيرفر: تتطلب إدخال رقم المعرف (Phone Number ID) ومفتاح الوصول الدائم (Permanent Access Token) بالأعلى ليقوم السيرفر بإرسال التحديثات تلقائياً عبر Meta API بدلًا من ظهور NOT_CONNECTED."
                      : "• Automated Cloud API: Requires Phone Number ID & Permanent Access Token configured above to automatically dispatch and change status from NOT_CONNECTED to SENT."}
                  </p>
                </div>

                <div className="flex items-center justify-between border-b border-silver/50 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-jet">
                      {lang === "ar"
                        ? `سجلات تسليم رسائل الواتساب (${whatsappData.logs?.length || 0})`
                        : `WHATSAPP MESSAGE DELIVERY LOGS (${whatsappData.logs?.length || 0})`}
                    </h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-neutralgray hidden sm:inline">
                      {lang === "ar"
                        ? "آخر 100 إشعار تم جدولتها وإرسالها"
                        : "Last 100 queued & dispatched alerts"}
                    </span>
                    {whatsappData.logs && whatsappData.logs.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(lang === "ar" ? "هل أنت متأكد من مسح جميع سجلات الواتساب؟" : "Clear all WhatsApp delivery logs?")) {
                            postAdminAction(
                              { action: "clear_whatsapp_logs" },
                              lang === "ar" ? "تم مسح سجلات الواتساب بنجاح" : "WhatsApp logs cleared successfully"
                            );
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{lang === "ar" ? "مسح سجلات الاختبار" : "Clear Logs"}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {!whatsappData.logs || whatsappData.logs.length === 0 ? (
                    <div className="p-6 text-center text-neutralgray bg-offwhite border border-silver/40">
                      {lang === "ar"
                        ? "لا توجد سجلات رسائل واتساب حالياً."
                        : "No WhatsApp delivery logs recorded yet."}
                    </div>
                  ) : (
                    whatsappData.logs.map((log: any) => {
                      const isAr = log.language === "ar";
                      return (
                        <div
                          key={log.id}
                          className="border border-silver/50 bg-offwhite p-3.5 space-y-2 rounded"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-silver/30 pb-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-jet">
                                {log.recipient_phone}
                              </span>
                              <span className="text-[10px] bg-neutral-200 text-neutral-800 font-bold px-1.5 py-0.5 rounded uppercase">
                                {log.language || "EN"}
                              </span>
                              <span className="text-neutralgray">|</span>
                              <span className="text-[11px] text-neutralgray">
                                {lang === "ar" ? "الحالة: " : "Status: "}
                                <strong
                                  className={
                                    log.status === "DELIVERED" || log.status === "SENT_ACCEPTED"
                                      ? "text-emerald-600"
                                      : log.status === "NOT_CONNECTED"
                                      ? "text-neutralgray underline"
                                      : "text-amber-600"
                                  }
                                >
                                  {log.status}
                                </strong>
                              </span>
                              <span className="text-neutralgray">→</span>
                              <span className="font-mono font-bold text-[11px] text-jet">
                                [{log.event_type}]
                              </span>
                              {log.related_order_number && (
                                <span className="font-mono text-[10px] text-neutralgray">
                                  #{log.related_order_number}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                postAdminAction(
                                  { action: "retry_whatsapp_message", id: log.id },
                                  lang === "ar"
                                    ? "تمت إعادة المحاولة وجدولة الرسالة"
                                    : "Message retry queued"
                                )
                              }
                              className="px-2.5 py-1 text-[11px] font-bold border border-jet text-jet hover:bg-jet hover:text-white transition-colors rounded self-start sm:self-auto shrink-0"
                            >
                              {lang === "ar" ? `إعادة المحاولة (${log.retry_count || 0})` : `Retry (${log.retry_count || 0})`}
                            </button>
                          </div>

                          <div
                            dir={isAr ? "rtl" : "ltr"}
                            className="bg-white p-3 rounded border border-silver/30 font-sans text-xs leading-relaxed text-jet whitespace-pre-line text-start select-text"
                          >
                            {log.message_body || log.rendered_body}
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-neutralgray pt-1">
                            <span>{lang === "ar" ? "وقت الجدولة: " : "Queued: "}{new Date(log.queued_at).toLocaleString(lang === "ar" ? "ar-EG" : "en-US")}</span>
                            {log.failure_reason && (
                              <span
                                className="text-red-500 truncate max-w-sm"
                                title={log.failure_reason}
                              >
                                {log.failure_reason}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE & BRANDING MANAGEMENT */}
          {activeSection === "appearance" && appearanceData && (
            <div className="space-y-8">
              <div className="flex items-center justify-between border-b border-silver/60 pb-4">
                <div>
                  <h1 className="font-heading text-2xl font-bold">
                    {lang === "ar"
                      ? "إدارة المظهر والهوية البصرية والألوان (U3 Monochrome)"
                      : "APPEARANCE, THEME & MONOCHROMATIC BRANDING"}
                  </h1>
                  <p className="text-xs text-neutralgray">
                    {lang === "ar" ? "نظام الهوية الرسمية لمتجر U3 بالأسود والفضي المعدني." : "Official U3 STORE Black, Charcoal & Metallic Silver Design System."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    postAdminAction(
                      { action: "reset_appearance_defaults" },
                      "Reset to U3 Monochrome defaults"
                    )
                  }
                  className="border border-jet px-4 py-2 text-xs font-bold uppercase"
                >
                  {lang === "ar" ? "استعادة مظهر U3 الافتراضي" : "Reset to Default U3 Theme"}
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  postAdminAction({
                    action: "save_appearance_settings",
                    defaultStorefrontTheme: fd.get("defaultStorefrontTheme"),
                    defaultAdminTheme: fd.get("defaultAdminTheme"),
                    productGridColumnsDesktop: fd.get("productGridColumnsDesktop"),
                    productImageAspectRatio: fd.get("productImageAspectRatio"),
                    announcementBarEnabled: fd.get("announcementBarEnabled") === "on",
                    announcementTextEn: fd.get("announcementTextEn"),
                    announcementTextAr: fd.get("announcementTextAr"),
                  });
                }}
                className="bg-white border border-silver/60 p-6 space-y-4 text-xs"
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "المظهر الافتراضي للمتجر" : "Default Storefront Theme"}</label>
                    <select
                      name="defaultStorefrontTheme"
                      defaultValue={appearanceData.appearance?.default_storefront_theme || "light"}
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    >
                      <option value="light">{lang === "ar" ? "الوضع الفاتح (افتراضي)" : "Light Mode (Default)"}</option>
                      <option value="dark">{lang === "ar" ? "الوضع الليلي (#111214)" : "Dark Mode (#111214)"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "المظهر الافتراضي للوحة التحكم" : "Default Admin Theme"}</label>
                    <select
                      name="defaultAdminTheme"
                      defaultValue={appearanceData.appearance?.default_admin_theme || "light"}
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    >
                      <option value="light">{lang === "ar" ? "الوضع الفاتح" : "Light Mode"}</option>
                      <option value="dark">{lang === "ar" ? "الوضع الليلي" : "Dark Mode"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "عدد أعمدة عرض المنتجات" : "Desktop Grid Columns"}</label>
                    <select
                      name="productGridColumnsDesktop"
                      defaultValue={appearanceData.appearance?.product_grid_columns_desktop || 4}
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    >
                      <option value={3}>{lang === "ar" ? "3 منتجات في الصف" : "3 Products per row"}</option>
                      <option value={4}>{lang === "ar" ? "4 منتجات في الصف" : "4 Products per row"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "أبعاد بطاقة المنتج" : "Product Card Ratio"}</label>
                    <select
                      name="productImageAspectRatio"
                      defaultValue={appearanceData.appearance?.product_image_aspect_ratio || "4:5"}
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    >
                      <option value="4:5">{lang === "ar" ? "4:5 طولي" : "4:5 Portrait"}</option>
                      <option value="1:1">{lang === "ar" ? "1:1 مربع" : "1:1 Square"}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "شريط الإعلانات (إنجليزي)" : "Announcement Bar (EN)"}</label>
                    <input
                      name="announcementTextEn"
                      defaultValue={appearanceData.appearance?.announcement_text_en}
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">شريط الإعلانات العلوي (AR)</label>
                    <input
                      name="announcementTextAr"
                      defaultValue={appearanceData.appearance?.announcement_text_ar}
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 font-bold">
                  <input
                    name="announcementBarEnabled"
                    type="checkbox"
                    defaultChecked={Boolean(appearanceData.appearance?.announcement_bar_enabled ?? 1)}
                  />
                  <span>{lang === "ar" ? "إظهار شريط الإعلانات العلوي" : "Show Top Announcement Bar"}</span>
                </label>

                <button
                  type="submit"
                  className="bg-[#111214] text-white font-bold uppercase px-6 py-3"
                >
                  {lang === "ar" ? "حفظ إعدادات المظهر" : "Save Appearance Settings"}
                </button>
              </form>
            </div>
          )}

          {/* FOOTER, CONTACT & SOCIAL MANAGEMENT */}
          {activeSection === "footer" && cmsData && (
            <div className="space-y-8 u3-reveal">
              <div className="border-b border-silver/60 pb-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="font-heading text-2xl font-bold text-jet">
                    {lang === "ar"
                      ? "إعدادات الفوتر وبيانات التواصل الرسمي"
                      : "FOOTER, CONTACT & OFFICIAL BUSINESS DETAILS"}
                  </h1>
                  <p className="text-xs text-neutralgray mt-0.5">
                    {lang === "ar"
                      ? "تحكم كامل في نصوص الفوتر، وسائل التواصل الاجتماعي الرسمية، خريطة Google Maps، أرقام الهاتف، ورسائل صفحة اتصل بنا."
                      : "Manage official business details, social links, Google Maps embed, newsletter, and customer contact submissions."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    href="/contact"
                    target="_blank"
                    className="border border-[#111214] text-[#111214] hover:bg-[#111214] hover:text-white px-4 py-2 font-bold text-xs uppercase tracking-wider transition-all rounded-lg flex items-center gap-1.5"
                  >
                    <span>{lang === "ar" ? "معاينة صفحة التواصل" : "Preview Contact Page"}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    type="button"
                    onClick={async () => {
                      if (
                        confirm(
                          lang === "ar"
                            ? "هل تريد استعادة البيانات والإعدادات الرسمية الافتراضية للمتجر؟"
                            : "Reset all footer and business details to official defaults?"
                        )
                      ) {
                        await postAdminAction(
                          { action: "reset_footer_settings" },
                          lang === "ar" ? "تمت استعادة الإعدادات الرسمية" : "Restored official defaults"
                        );
                      }
                    }}
                    className="border border-neutral-300 text-neutral-700 hover:bg-neutral-100 px-4 py-2 font-bold text-xs uppercase tracking-wider transition-all rounded-lg"
                  >
                    {lang === "ar" ? "استعادة الافتراضي" : "Reset to Default"}
                  </button>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  postAdminAction(
                    {
                      action: "save_footer_settings",
                      brandSignatureEn: fd.get("brandSignatureEn"),
                      brandSignatureAr: fd.get("brandSignatureAr"),
                      newsletterEnabled: fd.get("newsletterEnabled") === "on",
                      newsletterHeadingEn: fd.get("newsletterHeadingEn"),
                      newsletterHeadingAr: fd.get("newsletterHeadingAr"),
                      newsletterDescEn: fd.get("newsletterDescEn"),
                      newsletterDescAr: fd.get("newsletterDescAr"),
                      newsletterPlaceholderEn: fd.get("newsletterPlaceholderEn"),
                      newsletterPlaceholderAr: fd.get("newsletterPlaceholderAr"),
                      newsletterSuccessEn: fd.get("newsletterSuccessEn"),
                      newsletterSuccessAr: fd.get("newsletterSuccessAr"),
                      newsletterPrivacyNoticeEn: fd.get("newsletterPrivacyNoticeEn"),
                      newsletterPrivacyNoticeAr: fd.get("newsletterPrivacyNoticeAr"),
                      instagramUrl: fd.get("instagramUrl"),
                      tiktokUrl: fd.get("tiktokUrl"),
                      facebookUrl: fd.get("facebookUrl"),
                      telegramUrl: fd.get("telegramUrl"),
                      phoneNumber: fd.get("phoneNumber"),
                      phoneTel: fd.get("phoneTel"),
                      mapsEmbedUrl: fd.get("mapsEmbedUrl"),
                      mapsExternalUrl: fd.get("mapsExternalUrl"),
                      mapsVisibleFooter: fd.get("mapsVisibleFooter") === "on",
                      mapsVisibleContact: fd.get("mapsVisibleContact") === "on",
                      socialInstagramEnabled: fd.get("socialInstagramEnabled") === "on",
                      socialTiktokEnabled: fd.get("socialTiktokEnabled") === "on",
                      socialFacebookEnabled: fd.get("socialFacebookEnabled") === "on",
                      socialTelegramEnabled: fd.get("socialTelegramEnabled") === "on",
                      contactPhoneEnabled: fd.get("contactPhoneEnabled") === "on",
                      copyrightEn: fd.get("copyrightEn"),
                      copyrightAr: fd.get("copyrightAr"),
                      showPaymentIcons: fd.get("showPaymentIcons") === "on",
                    },
                    lang === "ar" ? "تم حفظ ونشر إعدادات الفوتر بنجاح" : "Footer settings saved successfully"
                  );
                }}
                className="space-y-8 text-xs"
              >
                {/* 1. BRAND & IDENTITY */}
                <div className="bg-white border border-silver/60 p-6 rounded-xl space-y-4 shadow-2xs">
                  <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-jet border-b border-silver/40 pb-2">
                    {lang === "ar" ? "1. الهوية وشعار العلامة" : "1. Brand Identity & Tagline"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "شعار البراند (إنجليزي)" : "Brand Tagline (EN)"}</label>
                      <input
                        name="brandSignatureEn"
                        defaultValue={cmsData.footerSettings?.brand_signature_en || "LIVE YOURS."}
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">شعار العلامة (AR)</label>
                      <input
                        name="brandSignatureAr"
                        defaultValue={cmsData.footerSettings?.brand_signature_ar || "LIVE YOURS."}
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. OFFICIAL SOCIAL MEDIA CHANNELS */}
                <div className="bg-white border border-silver/60 p-6 rounded-xl space-y-4 shadow-2xs">
                  <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-jet border-b border-silver/40 pb-2">
                    {lang === "ar" ? "2. الروابط الرسمية لوسائل التواصل" : "2. Official Social Media Profiles"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold">{lang === "ar" ? "رابط إنستغرام" : "Instagram URL"}</label>
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-neutralgray cursor-pointer">
                          <input
                            type="checkbox"
                            name="socialInstagramEnabled"
                            defaultChecked={cmsData.footerSettings?.social_instagram_enabled !== 0}
                          />
                          <span>{lang === "ar" ? "مفعل" : "Active"}</span>
                        </label>
                      </div>
                      <input
                        name="instagramUrl"
                        defaultValue={
                          cmsData.footerSettings?.instagram_url ||
                          "https://www.instagram.com/u3store_/"
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold">{lang === "ar" ? "رابط تيك توك" : "TikTok URL"}</label>
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-neutralgray cursor-pointer">
                          <input
                            type="checkbox"
                            name="socialTiktokEnabled"
                            defaultChecked={cmsData.footerSettings?.social_tiktok_enabled !== 0}
                          />
                          <span>{lang === "ar" ? "مفعل" : "Active"}</span>
                        </label>
                      </div>
                      <input
                        name="tiktokUrl"
                        defaultValue={
                          cmsData.footerSettings?.tiktok_url ||
                          "https://www.tiktok.com/@ahmedyoosrry"
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold">{lang === "ar" ? "رابط فيسبوك" : "Facebook URL"}</label>
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-neutralgray cursor-pointer">
                          <input
                            type="checkbox"
                            name="socialFacebookEnabled"
                            defaultChecked={cmsData.footerSettings?.social_facebook_enabled !== 0}
                          />
                          <span>{lang === "ar" ? "مفعل" : "Active"}</span>
                        </label>
                      </div>
                      <input
                        name="facebookUrl"
                        defaultValue={
                          cmsData.footerSettings?.facebook_url ||
                          "https://www.facebook.com/u3storee/?rdid=OILPbBs5l0s9PlAA"
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white font-mono text-[11px]"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold">{lang === "ar" ? "رابط تيليجرام" : "Telegram URL"}</label>
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-neutralgray cursor-pointer">
                          <input
                            type="checkbox"
                            name="socialTelegramEnabled"
                            defaultChecked={cmsData.footerSettings?.social_telegram_enabled !== 0}
                          />
                          <span>{lang === "ar" ? "مفعل" : "Active"}</span>
                        </label>
                      </div>
                      <input
                        name="telegramUrl"
                        defaultValue={
                          cmsData.footerSettings?.telegram_url || "https://t.me/u3store"
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. CONTACT & LOCATION (GOOGLE MAPS) */}
                <div className="bg-white border border-silver/60 p-6 rounded-xl space-y-4 shadow-2xs">
                  <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-jet border-b border-silver/40 pb-2">
                    {lang === "ar" ? "3. أرقام الاتصال وموقع المتجر على الخريطة" : "3. Direct Contact & Google Maps"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold">{lang === "ar" ? "رقم الهاتف (للعرض المحلي)" : "Phone Number (Local Display)"}</label>
                        <label className="inline-flex items-center gap-1.5 text-[11px] text-neutralgray cursor-pointer">
                          <input
                            type="checkbox"
                            name="contactPhoneEnabled"
                            defaultChecked={cmsData.footerSettings?.contact_phone_enabled !== 0}
                          />
                          <span>{lang === "ar" ? "مفعل" : "Active"}</span>
                        </label>
                      </div>
                      <input
                        name="phoneNumber"
                        defaultValue={cmsData.footerSettings?.phone_number || "01115915388"}
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "الرقم الدولي (للاتصال المباشر)" : "International Tel (Direct Call)"}</label>
                      <input
                        name="phoneTel"
                        defaultValue={cmsData.footerSettings?.phone_tel || "+201115915388"}
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                        <label className="font-bold">{lang === "ar" ? "رابط تضمين خرائط جوجل (iFrame)" : "Google Maps Embed URL"}</label>
                        <div className="flex items-center gap-4 text-[11px] text-neutralgray">
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              name="mapsVisibleFooter"
                              defaultChecked={cmsData.footerSettings?.maps_visible_footer !== 0}
                            />
                            <span>{lang === "ar" ? "عرض بالفوتر" : "Show in Footer"}</span>
                          </label>
                          <label className="inline-flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              name="mapsVisibleContact"
                              defaultChecked={cmsData.footerSettings?.maps_visible_contact !== 0}
                            />
                            <span>{lang === "ar" ? "عرض بصفحة التواصل" : "Show on Contact Page"}</span>
                          </label>
                        </div>
                      </div>
                      <textarea
                        name="mapsEmbedUrl"
                        rows={2}
                        defaultValue={
                          cmsData.footerSettings?.maps_embed_url ||
                          "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3445.136126646367!2d31.749324925755666!3d30.290186106888363!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1457fd0038fe2ba9%3A0xfc9a8129bc1fe6ba!2sU3store!5e0!3m2!1sar!2seg!4v1793792163680!5m2!1sar!2seg"
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white font-mono text-[10px]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-bold mb-1">{lang === "ar" ? "رابط فتح خرائط جوجل المباشر" : "Open in Google Maps Link"}</label>
                      <input
                        name="mapsExternalUrl"
                        defaultValue={
                          cmsData.footerSettings?.maps_external_url ||
                          "https://www.google.com/maps/place/U3store/@30.2901861,31.7493249,17z"
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. NEWSLETTER (STAY IN THE LOOP) */}
                <div className="bg-white border border-silver/60 p-6 rounded-xl space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-silver/40 pb-2">
                    <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-jet">
                      {lang === "ar" ? "4. النشرة البريدية (Stay In The Loop)" : "4. Newsletter & Drops Form"}
                    </h3>
                    <label className="flex items-center gap-2 font-bold cursor-pointer">
                      <input
                        name="newsletterEnabled"
                        type="checkbox"
                        defaultChecked={cmsData.footerSettings?.newsletter_enabled !== 0}
                      />
                      <span>{lang === "ar" ? "تفعيل النموذج" : "Enable Newsletter Form"}</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "العنوان الرئيسي (إنجليزي)" : "Heading (EN)"}</label>
                      <input
                        name="newsletterHeadingEn"
                        defaultValue={
                          cmsData.footerSettings?.newsletter_heading_en || "Stay in the loop"
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">العنوان الرئيسي (AR)</label>
                      <input
                        name="newsletterHeadingAr"
                        defaultValue={
                          cmsData.footerSettings?.newsletter_heading_ar || "ابقَ على اطلاع"
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "الوصف (إنجليزي)" : "Description (EN)"}</label>
                      <input
                        name="newsletterDescEn"
                        defaultValue={
                          cmsData.footerSettings?.newsletter_desc_en ||
                          "Subscribe for exclusive releases, restocks, and private drops."
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">الوصف الفرعي (AR)</label>
                      <input
                        name="newsletterDescAr"
                        defaultValue={
                          cmsData.footerSettings?.newsletter_desc_ar ||
                          "اشترك للحصول على أحدث الإصدارات الحصرية، وإعادة توفر المقاسات، والدروبات الخاصة."
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "رسالة النجاح (إنجليزي)" : "Success Message (EN)"}</label>
                      <input
                        name="newsletterSuccessEn"
                        defaultValue={
                          cmsData.footerSettings?.newsletter_success_en ||
                          "You are now subscribed to U3 STORE private drops."
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">رسالة النجاح بعد الاشتراك (AR)</label>
                      <input
                        name="newsletterSuccessAr"
                        defaultValue={
                          cmsData.footerSettings?.newsletter_success_ar ||
                          "تم اشتراكك بنجاح في قائمة إصدارات U3 STORE الخاصة."
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "نص سياسة الخصوصية (إنجليزي)" : "Privacy Notice Link Text (EN)"}</label>
                      <input
                        name="newsletterPrivacyNoticeEn"
                        defaultValue={
                          cmsData.footerSettings?.newsletter_privacy_notice_en ||
                          "By subscribing, you agree to our Privacy Policy."
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">نص إشعار الخصوصية (AR)</label>
                      <input
                        name="newsletterPrivacyNoticeAr"
                        defaultValue={
                          cmsData.footerSettings?.newsletter_privacy_notice_ar ||
                          "بالاشتراك، أنت توافق على سياسة الخصوصية الخاصة بنا."
                        }
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. BOTTOM BAR & PAYMENT ICONS */}
                <div className="bg-white border border-silver/60 p-6 rounded-xl space-y-4 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-silver/40 pb-2">
                    <h3 className="font-heading font-bold text-sm uppercase tracking-wider text-jet">
                      {lang === "ar" ? "5. الشريط السفلي ووسائل الدفع" : "5. Bottom Bar & Payments"}
                    </h3>
                    <label className="flex items-center gap-2 font-bold cursor-pointer">
                      <input
                        name="showPaymentIcons"
                        type="checkbox"
                        defaultChecked={cmsData.footerSettings?.show_payment_icons !== 0}
                      />
                      <span>{lang === "ar" ? "إظهار وسائل الدفع المفعلة" : "Show Enabled Payment Badges"}</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold mb-1">{lang === "ar" ? "حقوق النشر (إنجليزي)" : "Copyright Text (EN)"}</label>
                      <input
                        name="copyrightEn"
                        defaultValue={cmsData.footerSettings?.copyright_en || "All rights reserved."}
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-bold mb-1">نص حقوق الملكية (AR)</label>
                      <input
                        name="copyrightAr"
                        defaultValue={cmsData.footerSettings?.copyright_ar || "جميع الحقوق محفوظة."}
                        className="w-full border border-silver px-3 py-2 bg-offwhite rounded-lg focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* SUBMIT BUTTON */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="bg-[#111214] hover:bg-black text-white font-bold font-heading uppercase tracking-wider px-8 py-3.5 rounded-xl shadow-xs cursor-pointer transition-all active:scale-98"
                  >
                    {lang === "ar" ? "حفظ ونشر التعديلات" : "Save & Publish Changes"}
                  </button>
                </div>
              </form>

              {/* 6. CONTACT MESSAGES FROM CUSTOMERS */}
              <div className="bg-white border border-silver/60 p-6 rounded-xl space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-silver/40 pb-3">
                  <div>
                    <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-jet">
                      {lang === "ar"
                        ? `رسائل واستفسارات صفحة تواصل معنا (${cmsData.contactMessages?.length || 0})`
                        : `CUSTOMER CONTACT INQUIRIES (${cmsData.contactMessages?.length || 0})`}
                    </h3>
                    <p className="text-[11px] text-neutralgray">
                      {lang === "ar"
                        ? "سجل محمي وخاص للإدارة بكافة الرسائل المرسلة من نموذج صفحة التواصل."
                        : "Private admin audit log of messages submitted through the Contact Us page."}
                    </p>
                  </div>
                </div>

                {!cmsData.contactMessages || cmsData.contactMessages.length === 0 ? (
                  <p className="text-neutralgray text-xs py-4 text-center">
                    {lang === "ar" ? "لا توجد رسائل واردة حتى الآن." : "No customer inquiries received yet."}
                  </p>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {cmsData.contactMessages.map((msg: any) => (
                      <div
                        key={msg.id}
                        className="border border-silver/60 p-4 rounded-xl bg-offwhite/50 space-y-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-silver/30 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-jet">{msg.name}</span>
                            <span className="font-mono text-neutralgray">({msg.contact_info})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                msg.status === "NEW"
                                  ? "bg-amber-100 text-amber-800 border border-amber-300"
                                  : msg.status === "REPLIED"
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                  : "bg-neutral-200 text-neutral-800"
                              }`}
                            >
                              {msg.status}
                            </span>
                            <span className="text-[10px] text-neutralgray">
                              {new Date(msg.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <p className="font-bold text-neutral-800">
                          {lang === "ar" ? "الموضوع:" : "Subject:"} {msg.subject}
                        </p>
                        <p className="text-neutral-700 whitespace-pre-line leading-relaxed bg-white p-3 rounded-lg border border-silver/40">
                          {msg.message}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          {msg.status !== "REPLIED" && (
                            <button
                              type="button"
                              onClick={() =>
                                postAdminAction(
                                  { action: "update_contact_message", id: msg.id, status: "REPLIED" },
                                  lang === "ar" ? "تم تحديد الرسالة كـ تم الرد" : "Marked as replied"
                                )
                              }
                              className="text-[11px] font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                            >
                              <span>{lang === "ar" ? "تحديد كـ تم الرد" : "Mark as Replied"}</span>
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              postAdminAction(
                                { action: "delete_contact_message", id: msg.id },
                                lang === "ar" ? "تمت إزالة الرسالة" : "Deleted message"
                              )
                            }
                            className="text-[11px] font-bold text-red-600 hover:underline ms-auto"
                          >
                            {lang === "ar" ? "حذف" : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 7. REAL NEWSLETTER SUBSCRIBERS LIST */}
              <div className="bg-white border border-silver/60 p-6 rounded-xl space-y-3 text-xs shadow-2xs">
                <h3 className="font-heading text-sm font-bold uppercase text-jet">
                  {lang === "ar"
                    ? `المشتركون في النشرة البريدية (${cmsData.subscribers?.length || 0})`
                    : `NEWSLETTER SUBSCRIBERS (${cmsData.subscribers?.length || 0})`}
                </h3>
                {!cmsData.subscribers || cmsData.subscribers.length === 0 ? (
                  <p className="text-neutralgray">
                    {lang === "ar"
                      ? "لا يوجد مشتركون حتى الآن."
                      : "No newsletter subscribers yet."}
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto">
                    {cmsData.subscribers.map((s: any) => (
                      <div
                        key={s.id}
                        className="border border-silver/50 p-2.5 bg-offwhite flex justify-between items-center rounded-lg"
                      >
                        <span className="font-mono font-bold truncate text-[11px]">{s.email}</span>
                        <span className="text-[10px] bg-[#111214] text-white px-2 py-0.5 uppercase rounded">
                          {s.lang}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CONTINUOUS ANIMATED MARQUEE SETTINGS */}
          {activeSection === "marquee" && cmsData && (
            <div className="space-y-8 u3-reveal">
              <div className="border-b border-silver/60 pb-4">
                <h1 className="font-heading text-2xl font-bold text-jet">
                  {lang === "ar"
                    ? "إعدادات الشريط المتحرك (Continuous Animated Marquee)"
                    : "CONTINUOUS ANIMATED MARQUEE SETTINGS"}
                </h1>
                <p className="text-xs text-neutralgray">
                  {lang === "ar"
                    ? "تحكم في تفعيل الشريط المتحرك، العبارات بالعربية والإنجليزية، السرعة، والنمط البصري."
                    : "Control marquee text segments in English and Arabic, speed, separator, and monochrome visual preset."}
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  postAdminAction(
                    {
                      action: "save_marquee_settings",
                      isEnabled: fd.get("isEnabled") === "on",
                      segmentsEnText: fd.get("segmentsEnText"),
                      segmentsArText: fd.get("segmentsArText"),
                      separatorSymbol: fd.get("separatorSymbol"),
                      speedSeconds: Number(fd.get("speedSeconds") || 28),
                      direction: fd.get("direction"),
                      visualPreset: fd.get("visualPreset"),
                      pauseOnHover: fd.get("pauseOnHover") === "on",
                    },
                    lang === "ar" ? "تم حفظ إعدادات الشريط المتحرك" : "Marquee settings saved"
                  );
                }}
                className="bg-white border border-silver/60 p-6 space-y-5 text-xs"
              >
                <div className="flex flex-wrap gap-6">
                  <label className="flex items-center gap-2 font-bold">
                    <input
                      name="isEnabled"
                      type="checkbox"
                      defaultChecked={cmsData.marqueeSettings?.is_enabled !== 0}
                    />
                    <span>
                      {lang === "ar" ? "تفعيل الشريط المتحرك في الموقع" : "Enable Animated Marquee"}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 font-bold">
                    <input
                      name="pauseOnHover"
                      type="checkbox"
                      defaultChecked={cmsData.marqueeSettings?.pause_on_hover !== 0}
                    />
                    <span>
                      {lang === "ar"
                        ? "إيقاف مؤقت عند مرور الماوس (Pause on Hover)"
                        : "Pause Animation on Pointer Hover"}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-1">
                      {lang === "ar" ? "نصوص الشريط المتحرك بالإنجليزي (مفصولة بفاصلة)" : "English Text Segments (Comma separated)"}
                    </label>
                    <input
                      name="segmentsEnText"
                      defaultValue={(() => {
                        try {
                          return JSON.parse(
                            cmsData.marqueeSettings?.segments_en_json || "[]"
                          ).join(", ");
                        } catch {
                          return "U3 STORE, LIVE YOURS, NEW ARRIVALS, PREMIUM FOOTWEAR, DISCOVER THE COLLECTION";
                        }
                      })()}
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">
                      العبارات بالعربية (مفصولة بفاصلة ,)
                    </label>
                    <input
                      name="segmentsArText"
                      defaultValue={(() => {
                        try {
                          return JSON.parse(
                            cmsData.marqueeSettings?.segments_ar_json || "[]"
                          ).join(", ");
                        } catch {
                          return "U3 STORE, LIVE YOURS, وصل حديثاً, أحذية فاخرة, اكتشف المجموعة";
                        }
                      })()}
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "النمط البصري للشريط المتحرك" : "Visual Preset"}</label>
                    <select
                      name="visualPreset"
                      defaultValue={
                        cmsData.marqueeSettings?.visual_preset || "OPTION_B_BLACK"
                      }
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    >
                      <option value="OPTION_B_BLACK">
                        Option B: Black BG + White Text + Silver Separator
                      </option>
                      <option value="OPTION_A_OFFWHITE">
                        Option A: Off-White BG + Black Text + Silver Separator
                      </option>
                      <option value="MIXED_BADGE">
                        Mixed Badge: Off-White BG + Black Highlight Rectangles
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "رمز الفاصل" : "Separator Symbol"}</label>
                    <select
                      name="separatorSymbol"
                      defaultValue={cmsData.marqueeSettings?.separator_symbol || "✦"}
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    >
                      <option value="✦">{lang === "ar" ? "✦ نجمة" : "✦ Star"}</option>
                      <option value="•">{lang === "ar" ? "• نقطة" : "• Bullet"}</option>
                      <option value="—">{lang === "ar" ? "— شرطة" : "— Dash"}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "سرعة الحركة (بالثواني)" : "Loop Speed (Seconds)"}</label>
                    <input
                      name="speedSeconds"
                      type="number"
                      min={10}
                      max={90}
                      defaultValue={cmsData.marqueeSettings?.speed_seconds || 28}
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "اتجاه الحركة" : "Scroll Direction"}</label>
                    <select
                      name="direction"
                      defaultValue={cmsData.marqueeSettings?.direction || "AUTO"}
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    >
                      <option value="AUTO">{lang === "ar" ? "تلقائي (حسب لغة المتجر)" : "Auto (Follows EN LTR / AR RTL)"}</option>
                      <option value="LEFT">{lang === "ar" ? "من اليمين لليسار" : "Left"}</option>
                      <option value="RIGHT">{lang === "ar" ? "من اليسار لليمين" : "Right"}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-[#111214] text-white font-bold uppercase px-6 py-3"
                >
                  {lang === "ar" ? "حفظ إعدادات الشريط المتحرك" : "Save Marquee Settings"}
                </button>
              </form>
            </div>
          )}

          {/* SALE CAMPAIGNS & REAL COUNTDOWN TIMER */}
          {activeSection === "sale-campaigns" && cmsData && (
            <div className="space-y-8 u3-reveal">
              <div className="border-b border-silver/60 pb-4">
                <h1 className="font-heading text-2xl font-bold text-jet">
                  {lang === "ar"
                    ? "إدارة حملة التخفيضات (Archive Sale) والعداد التنازلي الحقيقي"
                    : "ARCHIVE SALE CAMPAIGN & REAL COUNTDOWN TIMER"}
                </h1>
                <p className="text-xs text-neutralgray">
                  {lang === "ar"
                    ? "عبارة ARCHIVE SALE — LIVE NOW والعداد التنازلي يظهران في المتجر فقط عندما تقوم بتفعيل الحملة وتحديد تاريخ انتهاء حقيقي."
                    : "The 'ARCHIVE SALE — LIVE NOW' message and countdown timer only appear when you enable an active campaign with genuine dates."}
                </p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  postAdminAction(
                    {
                      action: "save_sale_campaign",
                      isActive: fd.get("isActive") === "on",
                      nameEn: fd.get("nameEn"),
                      nameAr: fd.get("nameAr"),
                      messageEn: fd.get("messageEn"),
                      messageAr: fd.get("messageAr"),
                      bannerSubtitleEn: fd.get("bannerSubtitleEn"),
                      bannerSubtitleAr: fd.get("bannerSubtitleAr"),
                      startsAt: fd.get("startsAt"),
                      endsAt: fd.get("endsAt"),
                      showCountdown: fd.get("showCountdown") === "on",
                      showInMarquee: fd.get("showInMarquee") === "on",
                      showInFooter: fd.get("showInFooter") === "on",
                    },
                    lang === "ar" ? "تم حفظ إعدادات الحملة والعداد" : "Sale campaign saved"
                  );
                }}
                className="bg-white border border-silver/60 p-6 space-y-5 text-xs"
              >
                <div className="flex flex-wrap gap-6 bg-offwhite p-4 border border-silver/50">
                  <label className="flex items-center gap-2 font-bold text-sm">
                    <input
                      name="isActive"
                      type="checkbox"
                      defaultChecked={Boolean(cmsData.saleCampaign?.is_active)}
                    />
                    <span>
                      {lang === "ar"
                        ? "تفعيل حملة التخفيضات الآن (Archive Sale Active)"
                        : "Enable Archive Sale Campaign Now"}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 font-bold">
                    <input
                      name="showCountdown"
                      type="checkbox"
                      defaultChecked={cmsData.saleCampaign?.show_countdown !== 0}
                    />
                    <span>
                      {lang === "ar" ? "إظهار العداد التنازلي الحقيقي" : "Show Real Countdown Timer"}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 font-bold">
                    <input
                      name="showInMarquee"
                      type="checkbox"
                      defaultChecked={cmsData.saleCampaign?.show_in_marquee !== 0}
                    />
                    <span>
                      {lang === "ar"
                        ? "إضافة ARCHIVE SALE للشريط المتحرك"
                        : "Inject into Marquee Strip"}
                    </span>
                  </label>
                  <label className="flex items-center gap-2 font-bold">
                    <input
                      name="showInFooter"
                      type="checkbox"
                      defaultChecked={cmsData.saleCampaign?.show_in_footer !== 0}
                    />
                    <span>
                      {lang === "ar" ? "إظهار الرابط في الفوتر" : "Show Archive Sale in Footer"}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "رسالة الحملة (إنجليزي)" : "Campaign Message (EN)"}</label>
                    <input
                      name="messageEn"
                      defaultValue={
                        cmsData.saleCampaign?.message_en || "ARCHIVE SALE — LIVE NOW"
                      }
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">رسالة الحملة (AR)</label>
                    <input
                      name="messageAr"
                      defaultValue={
                        cmsData.saleCampaign?.message_ar || "تخفيضات الأرشيف — متاحة الآن"
                      }
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "النص الفرعي للبانر (إنجليزي)" : "Banner Subtitle (EN)"}</label>
                    <input
                      name="bannerSubtitleEn"
                      defaultValue={
                        cmsData.saleCampaign?.banner_subtitle_en ||
                        "LIMITED TIME ARCHIVE RELEASE"
                      }
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">العنوان الفرعي للبانر (AR)</label>
                    <input
                      name="bannerSubtitleAr"
                      defaultValue={
                        cmsData.saleCampaign?.banner_subtitle_ar ||
                        "إصدارات محدودة لفترة مؤقتة"
                      }
                      className="w-full border border-silver px-3 py-2 bg-offwhite"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "وقت بدء الحملة (ISO)" : "Campaign Start Timestamp (ISO)"}</label>
                    <input
                      name="startsAt"
                      defaultValue={
                        cmsData.saleCampaign?.starts_at || "2026-01-01T00:00:00Z"
                      }
                      className="w-full border border-silver px-3 py-2 bg-offwhite font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold mb-1">{lang === "ar" ? "وقت انتهاء الحملة (ISO)" : "Campaign End Timestamp (ISO)"}</label>
                    <input
                      name="endsAt"
                      defaultValue={
                        cmsData.saleCampaign?.ends_at || "2026-12-31T23:59:59Z"
                      }
                      className="w-full border border-silver px-3 py-2 bg-offwhite font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-[#111214] text-white font-bold uppercase px-6 py-3"
                >
                  {lang === "ar" ? "حفظ إعدادات حملة التخفيضات" : "Save Sale Campaign"}
                </button>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Admin Bottom Navigation Bar (Native App Style) */}
      <nav
        aria-label="Admin Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 bg-[#111214]/95 backdrop-blur-xl border-t border-[#292B2E] text-white py-1.5 px-3 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.6)] lg:hidden no-print"
        style={{ paddingBottom: "max(0.6rem, env(safe-area-inset-bottom, 0.6rem))" }}
      >
        {/* 1. Dashboard */}
        <button
          type="button"
          onClick={() => {
            setActiveSection("dashboard");
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeSection === "dashboard"
              ? "text-emerald-400 font-bold bg-white/10"
              : "text-[#8E9298] hover:text-white"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-wide">
            {lang === "ar" ? "الرئيسية" : "Overview"}
          </span>
        </button>

        {/* 2. Orders */}
        <button
          type="button"
          onClick={() => {
            setActiveSection("orders");
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all relative cursor-pointer ${
            activeSection === "orders"
              ? "text-emerald-400 font-bold bg-white/10"
              : "text-[#8E9298] hover:text-white"
          }`}
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5" />
            {ordersData?.orders?.some(
              (o: any) => o.payment_status === "UNDER_REVIEW" || o.order_status === "PENDING_PAYMENT"
            ) && (
              <span className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-[#111214] animate-pulse" />
            )}
          </div>
          <span className="text-[10px] mt-0.5 tracking-wide">
            {lang === "ar" ? "الطلبات" : "Orders"}
          </span>
        </button>

        {/* 3. Products */}
        <button
          type="button"
          onClick={() => {
            setActiveSection("products");
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeSection === "products"
              ? "text-emerald-400 font-bold bg-white/10"
              : "text-[#8E9298] hover:text-white"
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-wide">
            {lang === "ar" ? "المنتجات" : "Products"}
          </span>
        </button>

        {/* 4. Inventory */}
        <button
          type="button"
          onClick={() => {
            setActiveSection("inventory");
            setMobileMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeSection === "inventory"
              ? "text-emerald-400 font-bold bg-white/10"
              : "text-[#8E9298] hover:text-white"
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-wide">
            {lang === "ar" ? "المخزون" : "Stock"}
          </span>
        </button>

        {/* 5. More Menu */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            mobileMenuOpen
              ? "text-emerald-400 font-bold bg-white/10"
              : "text-[#8E9298] hover:text-white"
          }`}
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 tracking-wide">
            {lang === "ar" ? "المزيد" : "Menu"}
          </span>
        </button>
      </nav>
    </div>
  );
}

