export type Language = "en" | "ar";

export const DEFAULT_DICTIONARY: Record<string, { en: string; ar: string }> = {
  // Brand & Header
  "brand.name": { en: "U3 STORE", ar: "U3 STORE" },
  "brand.tagline": { en: "LIVE YOURS.", ar: "اصنع أسلوبك الخاص." },
  "nav.shop": { en: "Shop", ar: "المتجر" },
  "nav.new_arrivals": { en: "New Arrivals", ar: "وصل حديثاً" },
  "nav.collections": { en: "Collections", ar: "المجموعات" },
  "nav.track_order": { en: "Track Order", ar: "تتبع الطلب" },
  "nav.search": { en: "Search", ar: "بحث" },
  "nav.wishlist": { en: "Wishlist", ar: "المفضلة" },
  "nav.bag": { en: "Shopping Bag", ar: "حقيبة التسوق" },
  "nav.my_account": { en: "My Account", ar: "حسابي" },
  "nav.admin": { en: "Admin Dashboard", ar: "لوحة الإدارة" },

  // Hero & Homepage
  "hero.headline": { en: "STEP INTO YOUR OWN LANE.", ar: "اخطُ في مسارك الخاص." },
  "hero.subheadline": { en: "DISCOVER THE COLLECTION.", ar: "اكتشف المجموعة الحصرية." },
  "hero.cta": { en: "SHOP NOW", ar: "تسوق الآن" },
  "home.empty_catalog_title": {
    en: "No Products Published Yet",
    ar: "لا توجد منتجات مضافة حالياً",
  },
  "home.empty_catalog_desc": {
    en: "The store catalog starts completely clean. Add your first footwear products, variants, and inventory from the Admin Dashboard.",
    ar: "يبدأ المتجر بقاعدة بيانات نظيفة تماماً بدون منتجات وهمية. قم بإضافة أول حذاء، والمقاسات، والألوان، والمخزون من لوحة الإدارة.",
  },
  "home.open_admin_cta": {
    en: "Open Admin Dashboard",
    ar: "فتح لوحة الإدارة",
  },

  // Shop & Filters
  "shop.title": { en: "FOOTWEAR ARCHIVE", ar: "كتالوج الأحذية" },
  "shop.search_placeholder": { en: "Search by product name, SKU, category...", ar: "ابحث باسم الحذاء، كود SKU، أو الفئة..." },
  "shop.category": { en: "Category", ar: "الفئة" },
  "shop.collection": { en: "Collection", ar: "المجموعة" },
  "shop.size": { en: "Size (EU)", ar: "المقاس (EU)" },
  "shop.color": { en: "Color", ar: "اللون" },
  "shop.price_range": { en: "Price Range", ar: "نطاق السعر" },
  "shop.availability": { en: "Availability", ar: "التوفر" },
  "shop.in_stock_only": { en: "In Stock Only", ar: "المتوفر في المخزون فقط" },
  "shop.sort_by": { en: "Sort By", ar: "ترتيب حسب" },
  "shop.sort.newest": { en: "Newest Arrivals", ar: "الأحدث أولاً" },
  "shop.sort.price_asc": { en: "Price: Low to High", ar: "السعر: من الأقل للأعلى" },
  "shop.sort.price_desc": { en: "Price: High to Low", ar: "السعر: من الأعلى للأقل" },
  "shop.all": { en: "All", ar: "الكل" },
  "shop.clear_filters": { en: "Reset Filters", ar: "إعادة ضبط الفلاتر" },
  "shop.no_results": { en: "No matching footwear found.", ar: "لم يتم العثور على منتجات مطابقة." },

  // Product Details
  "product.select_color": { en: "Select Color", ar: "اختر اللون" },
  "product.select_size": { en: "Select Size (EU)", ar: "اختر المقاس (EU)" },
  "product.size_guide": { en: "Size Guide", ar: "دليل المقاسات" },
  "product.in_stock": { en: "In Stock", ar: "متوفر للتوصيل الفوري" },
  "product.out_of_stock": { en: "Out of Stock", ar: "نفدت الكمية حالياً" },
  "product.units_available": { en: "units available", ar: "قطع متبقية فقط" },
  "product.sku": { en: "SKU", ar: "كود المنتج" },
  "product.add_to_bag": { en: "ADD TO BAG", ar: "أضف للسلة" },
  "product.buy_now": { en: "BUY NOW", ar: "شراء الآن" },
  "product.add_to_wishlist": { en: "Save to Wishlist", ar: "حفظ في المفضلة" },
  "product.remove_wishlist": { en: "Saved in Wishlist", ar: "محفوظ في المفضلة" },
  "product.shipping_policy": { en: "Shipping Across All 27 Egyptian Governorates", ar: "شحن سريع لجميع المحافظات" },
  "product.return_policy": { en: "14-Day Return & Exchange Policy", ar: "معاينة واستبدال سهل خلال 14 يوماً" },
  "product.related": { en: "Related Footwear", ar: "قد يعجبك أيضاً" },

  // Cart / Shopping Bag
  "cart.title": { en: "SHOPPING BAG", ar: "سلة المشتريات" },
  "cart.empty": { en: "Your shopping bag is currently empty.", ar: "سلة مشترياتك فارغة حالياً." },
  "cart.continue_shopping": { en: "Continue Shopping", ar: "مواصلة التسوق" },
  "cart.proceed_checkout": { en: "Proceed to Checkout", ar: "متابعة الشراء" },
  "cart.subtotal": { en: "Subtotal", ar: "المجموع الفرعي" },
  "cart.discount": { en: "Discount", ar: "الخصم" },
  "cart.remove": { en: "Remove", ar: "حذف" },
  "cart.session_isolated_badge": {
    en: "Isolated Device Session — Private to this browser",
    ar: "جلسة تسوق خاصة وآمنة",
  },

  // Checkout
  "checkout.title": { en: "CHECKOUT", ar: "إتمام الشراء" },
  "checkout.mode.guest": { en: "Continue as Guest (No Account Required)", ar: "الشراء السريع كزائر (بدون تسجيل)" },
  "checkout.mode.signin": { en: "Sign In to Account", ar: "تسجيل الدخول" },
  "checkout.mode.register": { en: "Create Account", ar: "إنشاء حساب جديد" },
  "checkout.customer_info": { en: "1. Customer & Delivery Information", ar: "1. بيانات التوصيل والتواصل" },
  "checkout.full_name": { en: "Full Name", ar: "الاسم بالكامل" },
  "checkout.phone": { en: "Phone Number (Egypt)", ar: "رقم الهاتف المحمول" },
  "checkout.email": { en: "Email Address (Optional for Guest)", ar: "البريد الإلكتروني (اختياري)" },
  "checkout.governorate": { en: "Egyptian Governorate", ar: "المحافظة" },
  "checkout.select_governorate": { en: "Select Governorate...", ar: "اختر المحافظة..." },
  "checkout.city": { en: "City", ar: "المدينة" },
  "checkout.select_city": { en: "Select City...", ar: "اختر المدينة..." },
  "checkout.area": { en: "Area / District", ar: "المنطقة / الحي" },
  "checkout.select_area": { en: "Select Area...", ar: "اختر المنطقة..." },
  "checkout.street": { en: "Street Address", ar: "اسم الشارع والعنوان بالتفصيل" },
  "checkout.building": { en: "Building Number", ar: "رقم العمارة / المبنى" },
  "checkout.floor": { en: "Floor", ar: "الدور" },
  "checkout.apartment": { en: "Apartment", ar: "رقم الشقة" },
  "checkout.landmark": { en: "Nearby Landmark", ar: "علامة مميزة" },
  "checkout.notes": { en: "Additional Delivery Notes", ar: "ملاحظات إضافية للتوصيل" },
  "checkout.payment_method": { en: "2. Select Payment Method", ar: "2. طريقة الدفع" },
  "checkout.order_summary": { en: "Order Summary", ar: "ملخص الطلب" },
  "checkout.shipping_fee": { en: "Shipping Fee", ar: "مصاريف الشحن" },
  "checkout.shipping_unconfigured": {
    en: "Shipping rate not configured for this destination yet. Admin must set shipping rate in Dashboard → Shipping.",
    ar: "جاري تحديد تكلفة الشحن لهذه المنطقة.",
  },
  "checkout.total": { en: "Final Total", ar: "الإجمالي" },
  "checkout.place_order": { en: "PLACE ORDER", ar: "تأكيد الطلب الآن" },
  "checkout.coupon_placeholder": { en: "Promo / Coupon Code", ar: "كوبون الخصم" },
  "checkout.apply_coupon": { en: "Apply", ar: "تطبيق" },

  // Order Confirmation & Payment Reporting
  "order.confirmed_title": { en: "ORDER RECEIVED", ar: "تم استلام طلبك بنجاح" },
  "order.number": { en: "Order Number", ar: "رقم الطلب" },
  "order.access_token": { en: "Private Guest Tracking Key", ar: "كود تتبع الطلب الخاص بك" },
  "order.save_token_warning": {
    en: "Save your Order Number and Private Tracking Key to track your order and download your invoice anytime.",
    ar: "احتفظ برقم الطلب ومفتاح التتبع السري لمتابعة حالة طلبك وتحميل الفاتورة في أي وقت.",
  },
  "payment.instructions_title": { en: "Payment Instructions", ar: "تعليمات الدفع والتحويل" },
  "payment.receiving_account": { en: "Official Receiving Wallet / Account", ar: "رقم المحفظة / حساب الاستلام الرسمي" },
  "payment.recipient_name": { en: "Recipient Name", ar: "اسم المستلم" },
  "payment.copy": { en: "Copy Details", ar: "نسخ البيانات" },
  "payment.copied": { en: "Copied!", ar: "تم النسخ!" },
  "payment.i_have_paid": { en: "I HAVE PAID — SUBMIT TRANSFER DETAILS", ar: "لقد قمت بالدفع — إرسال بيانات التحويل" },
  "payment.tx_ref": { en: "Transaction Reference Number", ar: "الرقم المرجعي للعملية (Reference)" },
  "payment.sender_number": { en: "Sender Phone / InstaPay Address", ar: "الرقم المحول منه / عنوان إنستا باي" },
  "payment.transfer_date": { en: "Transfer Date & Time", ar: "تاريخ ووقت التحويل" },
  "payment.transfer_amount": { en: "Transferred Amount (EGP)", ar: "المبلغ المحول (ج.م)" },
  "payment.receipt_upload": { en: "Upload Transfer Screenshot / Receipt (Optional)", ar: "إرفاق صورة إيصال التحويل (اختياري)" },
  "payment.submit_report": { en: "Submit Payment Report for Verification", ar: "إرسال إشعار الدفع للمراجعة" },
  "payment.under_review_notice": {
    en: "Your payment report has been submitted and is currently UNDER REVIEW by U3 STORE administration.",
    ar: "تم إرسال بيانات التحويل بنجاح وهي الآن قيد المراجعة من قبل إدارة U3 STORE.",
  },

  // Invoices
  "invoice.download_pdf": { en: "Download Invoice PDF", ar: "تحميل الفاتورة PDF" },
  "invoice.print": { en: "Print Invoice", ar: "طباعة الفاتورة" },
  "invoice.number": { en: "Invoice Number", ar: "رقم الفاتورة" },

  // Statuses
  "status.order.PENDING_PAYMENT": { en: "Pending Payment", ar: "بانتظار الدفع" },
  "status.order.PAYMENT_UNDER_REVIEW": { en: "Payment Under Review", ar: "الدفع قيد المراجعة" },
  "status.order.CONFIRMED": { en: "Confirmed", ar: "تم التأكيد" },
  "status.order.PROCESSING": { en: "Processing", ar: "جاري التجهيز" },
  "status.order.SHIPPED": { en: "Shipped", ar: "تم الشحن" },
  "status.order.DELIVERED": { en: "Delivered", ar: "تم التوصيل" },
  "status.order.CANCELLED": { en: "Cancelled", ar: "ملغي" },
  "status.order.RETURN_REQUESTED": { en: "Return Requested", ar: "طلب استرجاع" },
  "status.order.RETURNED": { en: "Returned", ar: "مرتجع" },
  "status.order.EXCHANGED": { en: "Exchanged", ar: "تم الاستبدال" },

  "status.payment.AWAITING_PAYMENT": { en: "Awaiting Payment", ar: "بانتظار الدفع" },
  "status.payment.CUSTOMER_REPORTED_PAYMENT": { en: "Customer Reported Payment", ar: "أبلغ العميل بالدفع" },
  "status.payment.UNDER_REVIEW": { en: "Under Review", ar: "قيد المراجعة" },
  "status.payment.PAID": { en: "Paid", ar: "مدفوع" },
  "status.payment.REJECTED": { en: "Rejected / Not Verified", ar: "مرفوض / لم يتم التحقق" },
  "status.payment.PARTIALLY_REFUNDED": { en: "Partially Refunded", ar: "مسترد جزئياً" },
  "status.payment.REFUNDED": { en: "Refunded", ar: "مسترد بالكامل" },
};

export function t(
  lang: Language,
  key: string,
  customOverrides?: Record<string, { en: string; ar: string }>
): string {
  if (customOverrides && customOverrides[key]) {
    const val = customOverrides[key][lang] || customOverrides[key].en;
    if (val) return val;
  }
  const entry = DEFAULT_DICTIONARY[key];
  if (!entry) return key;
  return entry[lang] || entry.en || key;
}

export function formatCurrency(amount: number, lang: Language = "en"): string {
  const formatted = Number(amount || 0).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return lang === "ar" ? `${formatted} ج.م` : `EGP ${formatted}`;
}

