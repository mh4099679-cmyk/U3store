const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/components/admin/AdminPortalClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add ordersDeptFilter state
if (!content.includes('ordersDeptFilter')) {
  content = content.replace(
    'const [ordersPage, setOrdersPage] = useState(1);',
    'const [ordersPage, setOrdersPage] = useState(1);\n  const [ordersDeptFilter, setOrdersDeptFilter] = useState<"ALL" | "SHOES" | "CLOTHING" | "MIXED">("ALL");'
  );
}

// 2. Add getOrderDeptType helper function before return or at component level
if (!content.includes('function getOrderDeptType(')) {
  const helperCode = `
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
`;
  content = content.replace(
    'const activeModule = currentModule;',
    `${helperCode}\n  const activeModule = currentModule;`
  );
}

// 3. Update Store Visibility Widget at Top of Dashboard: Remove emojis, add Lucide icons, instant UI update
const storeVisWidgetTarget = `                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { id: "BOTH", labelAr: "✨ الأحذية والملابس معاً", labelEn: "✨ Shoes & Clothing" },
                    { id: "SHOES_ONLY", labelAr: "👟 الأحذية فقط", labelEn: "👟 Shoes Only" },
                    { id: "CLOTHING_ONLY", labelAr: "👕 الملابس فقط", labelEn: "👕 Clothing Only" },
                  ].map((m) => {
                    const active = (cmsData?.settings?.visible_categories || "BOTH") === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={async () => {
                          await postAdminAction(
                            { action: "save_store_settings", visibleCategories: m.id },
                            lang === "ar" ? \`تم تفعيل: \${m.labelAr}\` : \`Store visibility set to: \${m.labelEn}\`
                          );
                        }}
                        className={\`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 \${
                          active
                            ? "bg-white text-black shadow-lg ring-2 ring-emerald-400 font-extrabold"
                            : "bg-white/10 text-neutral-300 hover:bg-white/20 hover:text-white"
                        }\`}
                      >
                        {active && <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />}
                        <span>{lang === "ar" ? m.labelAr : m.labelEn}</span>
                      </button>
                    );
                  })}
                </div>`;

const storeVisWidgetReplacement = `                <div className="flex flex-wrap items-center gap-2.5">
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
                          if (cmsData?.settings) {
                            cmsData.settings.visible_categories = m.id;
                          }
                          await postAdminAction(
                            { action: "save_store_settings", visibleCategories: m.id },
                            lang === "ar" ? \`تم تفعيل وضع: \${m.labelAr}\` : \`Store visibility set to: \${m.labelEn}\`
                          );
                        }}
                        className={\`px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-2 border \${
                          active
                            ? "bg-white text-[#111214] border-white shadow-xl ring-2 ring-emerald-400 font-extrabold"
                            : "bg-[#1C1E22] text-[#BFC2C6] border-white/10 hover:bg-[#25282E] hover:text-white"
                        }\`}
                      >
                        <IconComp className={\`w-4 h-4 \${active ? "text-black" : "text-[#BFC2C6]"}\`} />
                        <span>{lang === "ar" ? m.labelAr : m.labelEn}</span>
                        {active && <Check className="w-4 h-4 text-emerald-600 stroke-[3] ms-0.5" />}
                      </button>
                    );
                  })}
                </div>`;

if (content.includes(storeVisWidgetTarget)) {
  content = content.replace(storeVisWidgetTarget, storeVisWidgetReplacement);
}

// 4. Remove emoji from 1-click size preset (line 2443)
content = content.replace(
  '{lang === "ar" ? "⚡ إضافة سريعة بنقرة واحدة:" : "⚡ 1-Click Size Add:"}',
  '<span className="inline-flex items-center gap-1 font-bold text-neutral-700 me-1"><Sparkles className="w-3.5 h-3.5 text-amber-500" /><span>{lang === "ar" ? "إضافة سريعة للمقاسات:" : "1-Click Size Presets:"}</span></span>'
);

// 5. Remove emoji from order notification (line 874)
content = content.replace(
  '{lang === "ar" ? "أوردر جديد وصل الآن! 🎉" : "New Order Received! 🎉"}',
  '{lang === "ar" ? "أوردر جديد وصل الآن!" : "New Order Received!"}'
);

// 6. In Orders view: Add Department Filter Pills Row right above search bar
const ordersViewHeaderTarget = `              {/* Quick Status Navigation Pills for 1-Tap Mobile & Desktop Filtering */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">`;

const ordersDeptFilterPills = `              {/* Department Content Filter Pills (All / Shoes / Clothing / Mixed) */}
              <div className="bg-white border border-silver/60 p-3.5 sm:p-4 rounded-2xl shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-jet uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-neutral-500" />
                    <span>{lang === "ar" ? "فلترة حسب محتوى الطلب (أحذية / ملابس / مشترك)" : "Filter by Order Department Content"}</span>
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    {lang === "ar" ? \`\${ordersData.orders.length} طلب إجمالي\` : \`\${ordersData.orders.length} total orders\`}
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
                        className={\`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 \${
                          isDeptActive
                            ? "bg-[#111214] text-white shadow-sm ring-1 ring-black"
                            : "bg-[#F7F7F5] text-neutral-600 hover:bg-neutral-200/70 border border-silver/70"
                        }\`}
                      >
                        <IconDept className={\`w-3.5 h-3.5 \${isDeptActive ? "text-emerald-400" : "text-neutral-500"}\`} />
                        <span>{lang === "ar" ? dept.ar : dept.en}</span>
                        <span className={\`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold \${
                          isDeptActive ? "bg-white/20 text-white" : "bg-neutral-200 text-neutral-700"
                        }\`}>
                          {dept.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Status Navigation Pills for 1-Tap Mobile & Desktop Filtering */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none no-scrollbar">`;

if (content.includes(ordersViewHeaderTarget)) {
  content = content.replace(ordersViewHeaderTarget, ordersDeptFilterPills);
}

// 7. Filter orders by ordersDeptFilter in filtered orders logic
const filterLogicTarget = `                  if (ordersViewTab === "CANCELLED")
                    return o.order_status === "CANCELLED";
                  return true;
                });`;

const filterLogicReplacement = `                  if (ordersViewTab === "CANCELLED")
                    return o.order_status === "CANCELLED";
                  return true;
                }).filter((o: any) => {
                  if (ordersDeptFilter === "ALL") return true;
                  return getOrderDeptType(o) === ordersDeptFilter;
                });`;

if (content.includes(filterLogicTarget)) {
  content = content.replace(filterLogicTarget, filterLogicReplacement);
}

// 8. Display Department Badge on Order Card
const orderBadgeTarget = `{/* Customer Name & Account Status */}
                                <div className="flex items-center gap-2">`;

const orderBadgeReplacement = `{/* Order Department Badge (Shoes / Clothing / Mixed) */}
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
                                <div className="flex items-center gap-2">`;

if (content.includes(orderBadgeTarget)) {
  content = content.replace(orderBadgeTarget, orderBadgeReplacement);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully applied all user feedback updates to AdminPortalClient.tsx!');

