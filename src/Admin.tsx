import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Check, CheckCircle2,
  ChefHat, ChevronDown, Clock, Command, Eye, EyeOff, Flame, LayoutDashboard,
  LogOut, MapPin, Package, Receipt, Search, ShieldCheck, Truck,
  UtensilsCrossed, Wallet, X,
} from "lucide-react";
import "./admin.css";

export interface KitchenOrder {
  id: string;
  createdAt: number;
  status: string;
  total: number;
  address: string;
  items: { name: string; qty: number }[];
}

export interface KitchenItem {
  id: string;
  name: string;
  category: string;
  price: number;
  available: boolean;
  image: string;
}

interface AdminProps {
  orders: KitchenOrder[];
  items: KitchenItem[];
  onStatus: (id: string, status: string) => void;
  onAvailability: (id: string) => void;
  onExit: () => void;
}

const FLOW = ["placed", "preparing", "out_for_delivery", "delivered"] as const;
const STATUS_META: Record<string, { label: string; action?: string; icon: React.ReactNode }> = {
  placed: { label: "New", action: "Start preparing", icon: <Receipt size={14} aria-hidden="true" /> },
  preparing: { label: "Preparing", action: "Send out for delivery", icon: <Flame size={14} aria-hidden="true" /> },
  out_for_delivery: { label: "On the way", action: "Mark delivered", icon: <Truck size={14} aria-hidden="true" /> },
  delivered: { label: "Delivered", icon: <CheckCircle2 size={14} aria-hidden="true" /> },
};

// Public, local demo credentials. This gate is not authentication or access control.
const DEMO_EMAIL = "owner@delivr.demo";
const DEMO_PASSWORD = "atelier";
const money = (n: number) => n.toLocaleString("en-IN", {
  style: "currency", currency: "INR", maximumFractionDigits: 0,
});
const number = (n: number) => n.toLocaleString("en-IN");
type Range = "today" | "week" | "month";
type Section = "overview" | "queue" | "inventory";
const RANGE_LABEL: Record<Range, string> = { today: "Today", week: "Last 7 days", month: "Last 30 days" };

function dayStart(ts: number, offset = 0) {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.getTime();
}

function timeAgo(ts: number, now: number) {
  const minutes = Math.max(0, Math.floor((now - ts) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function matchesOrder(order: KitchenOrder, query: string) {
  return `${order.id} ${order.address} ${order.items.map((item) => item.name).join(" ")}`
    .toLowerCase().includes(query.toLowerCase().trim().replace(/^#/, ""));
}

export default function Admin({ orders, items, onStatus, onAvailability, onExit }: AdminProps) {
  const [authenticated, setAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [range, setRange] = useState<Range>("today");
  const [section, setSection] = useState<Section>("overview");
  const [filter, setFilter] = useState("active");
  const [orderQuery, setOrderQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [chartMode, setChartMode] = useState<"revenue" | "count">("revenue");
  const [chartPoint, setChartPoint] = useState<number | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [notice, setNotice] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const overviewRef = useRef<HTMLElement>(null);
  const queueRef = useRef<HTMLElement>(null);
  const inventoryRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => { setNow(Date.now()); }, [orders]);

  useEffect(() => {
    if (authenticated) overviewRef.current?.focus({ preventScroll: true });
    else emailRef.current?.focus({ preventScroll: true });
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    function onKey(event: KeyboardEvent) {
      const target = event.target;
      const typing = target instanceof HTMLElement && (
        target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      );
      if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") ||
        (event.key === "/" && !typing && !event.altKey && !event.ctrlKey && !event.metaKey)) {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        setCommandQuery("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authenticated]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (paletteOpen && authenticated) {
      if (!dialog.open) dialog.showModal();
      commandInputRef.current?.focus();
    } else if (dialog.open) dialog.close();
  }, [paletteOpen, authenticated]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const rangeStart = dayStart(now, range === "week" ? -6 : range === "month" ? -29 : 0);
  const periodOrders = useMemo(() => orders.filter((order) =>
    order.createdAt >= rangeStart && order.createdAt <= now,
  ), [orders, rangeStart, now]);
  const revenue = periodOrders.reduce((sum, order) => sum + order.total, 0);
  const activeOrders = orders.filter((order) => FLOW.slice(0, 3).some((status) => status === order.status));
  const delivered = periodOrders.filter((order) => order.status === "delivered").length;
  const available = items.filter((item) => item.available).length;
  const counts: Record<string, number> = { all: orders.length, active: activeOrders.length };
  FLOW.forEach((status) => { counts[status] = orders.filter((order) => order.status === status).length; });

  const buckets = useMemo(() => {
    const size = range === "today" ? 8 : range === "week" ? 7 : 30;
    return Array.from({ length: size }, (_, index) => {
      const date = new Date(rangeStart);
      if (range === "today") date.setHours(index * 3);
      else date.setDate(date.getDate() + index);
      const end = new Date(date);
      if (range === "today") end.setHours(end.getHours() + 3);
      else end.setDate(end.getDate() + 1);
      const bucketOrders = periodOrders.filter((order) => order.createdAt >= date.getTime() && order.createdAt < end.getTime());
      return {
        label: range === "today" ? date.toLocaleTimeString(undefined, { hour: "numeric" }) :
          date.toLocaleDateString(undefined, range === "week" ? { weekday: "short" } : { month: "short", day: "numeric" }),
        title: range === "today" ? `${date.toLocaleTimeString(undefined, { hour: "numeric" })} – ${end.toLocaleTimeString(undefined, { hour: "numeric" })}` :
          date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        revenue: bucketOrders.reduce((sum, order) => sum + order.total, 0),
        count: bucketOrders.length,
      };
    });
  }, [range, rangeStart, periodOrders]);

  const chartValues = buckets.map((bucket) => bucket[chartMode]);
  const peak = Math.max(1, ...chartValues);
  const chartPoints = chartValues.map((value, index) => ({ x: 12 + index / (buckets.length - 1) * 676, y: 172 - value / peak * 148 }));
  const line = chartPoints.map((point) => `${point.x},${point.y}`).join(" ");
  const inspected = chartPoint === null ? null : buckets[chartPoint];
  const visibleOrders = orders.filter((order) =>
    (filter === "all" || (filter === "active" ? activeOrders.includes(order) : order.status === filter)) && matchesOrder(order, orderQuery),
  ).sort((a, b) => a.createdAt - b.createdAt);
  const categories = Array.from(new Set(items.map((item) => item.category)));
  const visibleItems = items.filter((item) =>
    (category === "all" || item.category === category) &&
    (availability === "all" || (availability === "available" ? item.available : !item.available)) &&
    `${item.name} ${item.category}`.toLowerCase().includes(itemQuery.trim().toLowerCase()),
  );

  function goTo(next: Section) {
    setSection(next);
    setPaletteOpen(false);
    if (dialogRef.current?.open) dialogRef.current.close();
    const refs = { overview: overviewRef, queue: queueRef, inventory: inventoryRef };
    refs[next].current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    refs[next].current?.focus({ preventScroll: true });
  }

  function changeRange(next: Range) { setRange(next); setChartPoint(null); }

  function signOut() {
    setAuthenticated(false); setPassword(""); setEmail(""); setShowPassword(false); setLoginError("");
    setPaletteOpen(false); setCommandQuery(""); setOrderQuery(""); setItemQuery(""); setFilter("active");
    setCategory("all"); setAvailability("all"); setSection("overview"); setNotice(""); changeRange("today"); setChartMode("revenue");
  }

  const commands = [
    { title: "Go to overview", hint: "Your business at a glance", icon: <LayoutDashboard size={18} />, keywords: "dashboard revenue metrics", run: () => goTo("overview") },
    { title: "Open order queue", hint: `${activeOrders.length} active orders`, icon: <Receipt size={18} />, keywords: "kitchen operations", run: () => goTo("queue") },
    { title: "Review new orders", hint: `${counts.placed} waiting to be prepared`, icon: <Flame size={18} />, keywords: "placed awaiting pending", run: () => { setFilter("placed"); setOrderQuery(""); goTo("queue"); } },
    { title: "Manage menu availability", hint: `${available} of ${items.length} dishes available`, icon: <UtensilsCrossed size={18} />, keywords: "inventory stock dishes", run: () => goTo("inventory") },
    { title: "Show unavailable dishes", hint: `${items.length - available} paused dishes`, icon: <Package size={18} />, keywords: "inventory sold out", run: () => { setAvailability("unavailable"); setCategory("all"); setItemQuery(""); goTo("inventory"); } },
    ...(["today", "week", "month"] as Range[]).map((value) => ({ title: `View ${RANGE_LABEL[value].toLowerCase()}`, hint: "Change the reporting period", icon: <BarChart3 size={18} />, keywords: "time filter revenue", run: () => { changeRange(value); goTo("overview"); } })),
  ];
  const normalizedCommand = commandQuery.trim().toLowerCase();
  const matchingCommands = commands.filter((command) => `${command.title} ${command.keywords}`.toLowerCase().includes(normalizedCommand));
  const matchingOrders = normalizedCommand ? orders.filter((order) => matchesOrder(order, normalizedCommand)).slice(0, 3) : [];
  const matchingItems = normalizedCommand ? items.filter((item) => item.name.toLowerCase().includes(normalizedCommand)).slice(0, 3) : [];

  if (!authenticated) return (
    <div className="admin-root admin-login">
      <div className="admin-login-story">
        <a className="admin-wordmark" href="#" onClick={(event) => { event.preventDefault(); onExit(); }} aria-label="Delivr storefront">
          <span className="admin-logo"><UtensilsCrossed size={21} aria-hidden="true" /></span> delivr<span className="admin-wordmark-dot">.</span><span className="admin-brand-tag">FOR OWNERS</span>
        </a>
        <div className="admin-login-copy">
          <p className="admin-eyebrow"><span className="admin-dot" /> THE OWNER’S WORKSPACE</p>
          <h1>Great service.<br />Clear perspective.</h1>
          <p>Your kitchen, your menu, your next move.<br />Everything you need to run a better service.</p>
          <div className="admin-login-visual" aria-hidden="true">
            <div className="admin-orbit admin-orbit-one" /><div className="admin-orbit admin-orbit-two" />
            <div className="admin-orbit-center"><ChefHat size={38} strokeWidth={1.2} /></div>
            <div className="admin-orbit-tag admin-orbit-tag-one"><Receipt size={16} /> Orders in focus <span className="admin-dot" /></div>
            <div className="admin-orbit-tag admin-orbit-tag-two"><CheckCircle2 size={16} /> Every detail, connected</div><span className="admin-orbit-node" />
          </div>
        </div>
        <div className="admin-login-story-foot"><span>Made for the people behind the food.</span><span>DELIVR / OWNER CONSOLE</span></div>
      </div>
      <main className="admin-login-form-side">
        <button className="admin-back-link" type="button" onClick={onExit}><ArrowLeft size={16} aria-hidden="true" /> Back to storefront</button>
        <div className="admin-login-card">
          <span className="admin-login-icon"><ShieldCheck size={25} strokeWidth={1.5} aria-hidden="true" /></span>
          <p className="admin-eyebrow">OWNER ACCESS</p><h2>Welcome back.</h2><p className="admin-login-description">Step into your command center.</p>
          <form onSubmit={(event) => {
            event.preventDefault();
            if (email.trim().toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) { setLoginError(""); setNow(Date.now()); setAuthenticated(true); }
            else setLoginError("Use the demo email and password shown below to enter.");
          }}>
            <label htmlFor="admin-email">Email address</label>
            <input ref={emailRef} id="admin-email" type="email" autoComplete="username" placeholder="owner@delivr.demo" value={email} required aria-invalid={!!loginError} aria-describedby={loginError ? "admin-login-error" : undefined} onChange={(event) => { setEmail(event.target.value); setLoginError(""); }} />
            <label htmlFor="admin-password">Password <span>Local demo</span></label>
            <div className="admin-password-field">
              <input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter demo password" value={password} required aria-invalid={!!loginError} aria-describedby={loginError ? "admin-login-error" : undefined} onChange={(event) => { setPassword(event.target.value); setLoginError(""); }} />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((show) => !show)}>{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}</button>
            </div>
            {loginError && <p className="admin-login-error" id="admin-login-error" role="alert">{loginError}</p>}
            <button className="admin-btn admin-btn-primary admin-login-submit" type="submit">Enter command center <ArrowRight size={17} aria-hidden="true" /></button>
          </form>
          <div className="admin-demo-access">
            <div><span className="admin-demo-label">TRY THE OWNER DEMO</span><span className="admin-demo-pill">Demo only</span></div>
            <p><span>Email</span><code>{DEMO_EMAIL}</code></p><p><span>Password</span><code>{DEMO_PASSWORD}</code></p>
            <button type="button" onClick={() => { setEmail(DEMO_EMAIL); setPassword(DEMO_PASSWORD); setLoginError(""); emailRef.current?.focus(); }}>Fill demo credentials <ArrowUpRight size={15} aria-hidden="true" /></button>
          </div>
          <p className="admin-demo-disclosure">This is a local demo gate, not secure authentication. No account is created and no credentials are sent to a server.</p>
        </div>
        <p className="admin-login-footer">A little more clarity. A lot more control.</p>
      </main>
    </div>
  );

  return (
    <div className="admin-root admin-console">
      <aside className="admin-sidebar" aria-label="Owner navigation">
        <div className="admin-wordmark"><span className="admin-logo"><UtensilsCrossed size={20} aria-hidden="true" /></span> delivr<span className="admin-wordmark-dot">.</span></div>
        <p className="admin-sidebar-label">OWNER WORKSPACE</p>
        <nav>{([
          { key: "overview", label: "Overview", icon: <LayoutDashboard size={18} /> },
          { key: "queue", label: "Order queue", icon: <Receipt size={18} /> },
          { key: "inventory", label: "Menu & inventory", icon: <UtensilsCrossed size={18} /> },
        ] as const).map((nav) => <button key={nav.key} type="button" aria-current={section === nav.key ? "page" : undefined} onClick={() => goTo(nav.key)}><span aria-hidden="true">{nav.icon}</span><span>{nav.label}</span>{nav.key === "queue" && <span className="admin-nav-count">{activeOrders.length}</span>}</button>)}</nav>
        <div className="admin-sidebar-note"><span className="admin-dot" /><span>One view.<br /><strong>A smoother service.</strong></span><p>Keep your queue moving and your menu up to date.</p></div>
        <div className="admin-sidebar-bottom">
          <button className="admin-store-link" type="button" onClick={onExit}><ArrowUpRight size={17} aria-hidden="true" /> Open storefront</button>
          <div className="admin-owner"><span className="admin-avatar">O</span><div><strong>Demo owner</strong><span>Local demo session</span></div><button type="button" aria-label="Sign out of owner demo" title="Sign out" onClick={signOut}><LogOut size={17} aria-hidden="true" /></button></div>
        </div>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">Workspace <span>/</span> <strong>Owner overview</strong></div>
          <button className="admin-command-trigger" type="button" aria-haspopup="dialog" onClick={() => { setCommandQuery(""); setPaletteOpen(true); }}><Search size={16} aria-hidden="true" /><span>Search or run a command</span><kbd>Ctrl / ⌘ K</kbd></button>
          <span className="admin-demo-pill">Local demo</span><button className="admin-mobile-signout" type="button" aria-label="Sign out of owner demo" onClick={signOut}><LogOut size={18} aria-hidden="true" /></button>
        </header>
        <main className="admin-main">
          <section ref={overviewRef} tabIndex={-1} className="admin-overview" aria-labelledby="admin-title">
            <div className="admin-page-heading">
              <div><p className="admin-eyebrow">A CLEARER VIEW OF YOUR BUSINESS</p><h1 id="admin-title">Command center<span>.</span></h1><p className="admin-heading-description">Every order. Every detail. All in one place.</p></div>
              <div className="admin-heading-tools"><div className="admin-clock"><span className="admin-dot" /><time dateTime={new Date(now).toISOString()}>{new Date(now).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</time><span>LOCAL TIME</span></div><label className="admin-range"><Clock size={15} aria-hidden="true" /><span className="admin-sr-only">Reporting period</span><select value={range} onChange={(event) => changeRange(event.target.value as Range)}>{Object.entries(RANGE_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><ChevronDown size={14} aria-hidden="true" /></label></div>
            </div>
            <div className="admin-metrics" aria-label={`Key metrics, ${RANGE_LABEL[range].toLowerCase()}`}>{[
              { label: "Order revenue", value: money(revenue), note: `${RANGE_LABEL[range]} · all order totals`, icon: <Wallet size={18} /> },
              { label: "Total orders", value: number(periodOrders.length), note: `${delivered} delivered in this period`, icon: <Receipt size={18} /> },
              { label: "Average order", value: money(periodOrders.length ? revenue / periodOrders.length : 0), note: periodOrders.length ? "Revenue ÷ orders in this period" : "Waiting for your first order", icon: <BarChart3 size={18} /> },
              { label: "Active now", value: number(activeOrders.length), note: `${counts.placed} new · across the entire queue`, icon: <ChefHat size={18} /> },
            ].map((tile, index) => <article className={`admin-metric${index === 0 ? " admin-metric-featured" : ""}`} key={tile.label}><div className="admin-metric-top"><p>{tile.label}</p><span aria-hidden="true">{tile.icon}</span></div><p className="admin-metric-value">{tile.value}</p><p className="admin-metric-note">{tile.note}</p></article>)}</div>
            <div className="admin-insights">
              <section className="admin-panel admin-revenue" aria-labelledby="admin-revenue-title">
                <div className="admin-panel-head"><div><p className="admin-eyebrow">PERFORMANCE</p><h2 id="admin-revenue-title">{chartMode === "revenue" ? "Revenue" : "Order"} overview</h2></div><div className="admin-segment" role="group" aria-label="Chart metric">{(["revenue", "count"] as const).map((mode) => <button key={mode} type="button" aria-pressed={chartMode === mode} onClick={() => setChartMode(mode)}>{mode === "revenue" ? "Revenue" : "Orders"}</button>)}</div></div>
                <div className="admin-chart-summary"><strong>{chartMode === "revenue" ? money(inspected?.revenue ?? revenue) : number(inspected?.count ?? periodOrders.length)}</strong><span>{inspected?.title ?? RANGE_LABEL[range]} <span className="admin-chart-summary-dot">·</span> {inspected ? `${inspected.count} orders` : chartMode === "revenue" ? "Order totals, including active orders" : "Orders placed in this period"}</span></div>
                <div className="admin-chart" onMouseLeave={() => setChartPoint(null)}>
                  <div className="admin-chart-scale"><span>{chartMode === "revenue" ? money(Math.max(0, ...chartValues)) : number(Math.max(0, ...chartValues))}</span><span>0</span></div>
                  <div className="admin-chart-plot"><svg viewBox="0 0 700 190" preserveAspectRatio="none" role="img" aria-label={`${chartMode === "revenue" ? "Revenue" : "Orders"} for ${RANGE_LABEL[range].toLowerCase()}`}>
                    <title>{chartMode === "revenue" ? "Order revenue" : "Order count"} by {range === "today" ? "3-hour interval" : "day"}</title><desc>{buckets.map((bucket) => `${bucket.title}: ${money(bucket.revenue)}, ${bucket.count} orders`).join("; ")}</desc>
                    <defs><linearGradient id="admin-revenue-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#c9ee80" stopOpacity="0.3" /><stop offset="100%" stopColor="#c9ee80" stopOpacity="0" /></linearGradient></defs>
                    {[24, 73, 123, 172].map((y) => <line key={y} x1="0" x2="700" y1={y} y2={y} className="admin-chart-grid" />)}<polygon points={`12,172 ${line} 688,172`} fill="url(#admin-revenue-fill)" /><polyline points={line} className="admin-chart-line" />
                    {chartPoint !== null && chartPoints[chartPoint] && <line x1={chartPoints[chartPoint].x} x2={chartPoints[chartPoint].x} y1="18" y2="172" className="admin-chart-cursor" />}{chartPoints.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={chartPoint === index ? 5 : 2.5} className="admin-chart-dot" />)}
                  </svg><div className="admin-chart-hitareas">{buckets.map((bucket, index) => <button key={index} type="button" title={`${bucket.title}: ${money(bucket.revenue)}, ${bucket.count} orders`} aria-label={`Inspect ${bucket.title}: ${money(bucket.revenue)}, ${bucket.count} orders`} aria-pressed={chartPoint === index} onFocus={() => setChartPoint(index)} onBlur={() => setChartPoint(null)} onMouseEnter={() => setChartPoint(index)} onClick={() => setChartPoint(index)} />)}</div>{periodOrders.length === 0 && <div className="admin-chart-empty"><BarChart3 size={22} aria-hidden="true" /><strong>A fresh start.</strong><span>Order activity will appear here as it arrives.</span></div>}</div>
                </div>
                <div className={`admin-chart-labels admin-chart-labels-${range}`}>{buckets.map((bucket, index) => <span key={index}>{range !== "month" || index % 7 === 0 || index === 29 ? bucket.label : ""}</span>)}</div><p className="admin-chart-foot"><span className="admin-dot" /> Based on your actual orders <span>{range === "today" ? "3-hour intervals" : "Daily totals"}</span></p>
              </section>
              <section className="admin-panel admin-service" aria-labelledby="admin-service-title">
                <div className="admin-panel-head"><div><p className="admin-eyebrow">RIGHT NOW</p><h2 id="admin-service-title">Service flow</h2></div><ChefHat size={20} aria-hidden="true" /></div><div className="admin-service-summary"><strong>{activeOrders.length}</strong><div><span>active orders</span><p>{activeOrders.length ? "Keep the good food moving." : "You’re all caught up."}</p></div></div>
                <div className="admin-flow">{FLOW.map((status, index) => <button className={`admin-flow-row admin-flow-${status}`} key={status} type="button" onClick={() => { setFilter(status); setOrderQuery(""); goTo("queue"); }}><span className="admin-flow-step">0{index + 1}</span><span className="admin-flow-name">{STATUS_META[status].icon}{STATUS_META[status].label}</span><strong>{counts[status]}</strong><ArrowUpRight size={14} aria-hidden="true" /></button>)}</div><p className="admin-service-foot"><Clock size={13} aria-hidden="true" /> Entire queue · select a stage to review</p>
              </section>
            </div>
          </section>
          <div className="admin-operations">
            <section ref={queueRef} tabIndex={-1} className="admin-panel admin-queue" aria-labelledby="admin-queue-title">
              <div className="admin-panel-head"><div><p className="admin-eyebrow">OPERATIONS</p><h2 id="admin-queue-title">Order queue <span className="admin-heading-count">{orders.length}</span></h2><p className="admin-sub">Oldest first. Give the next order your attention.</p></div><span className="admin-panel-icon"><Receipt size={18} aria-hidden="true" /></span></div>
              <div className="admin-search-field"><Search size={16} aria-hidden="true" /><input type="search" aria-label="Search orders" placeholder="Search order, dish or address…" value={orderQuery} onChange={(event) => setOrderQuery(event.target.value)} /></div>
              <div className="admin-filters" role="group" aria-label="Filter orders by status">{[{ key: "active", label: "Active" }, { key: "all", label: "All" }, ...FLOW.map((status) => ({ key: status, label: STATUS_META[status].label }))].map((entry) => <button key={entry.key} type="button" aria-pressed={filter === entry.key} onClick={() => setFilter(entry.key)}>{entry.label}<span>{counts[entry.key]}</span></button>)}</div>
              {visibleOrders.length ? <ul className="admin-orders">{visibleOrders.map((order) => {
                const meta = STATUS_META[order.status];
                const index = FLOW.indexOf(order.status as (typeof FLOW)[number]);
                const next = index >= 0 && index < FLOW.length - 1 ? FLOW[index + 1] : null;
                return <li className="admin-order" key={order.id}><div className="admin-order-top"><div><strong title={order.id}>#{order.id.slice(-6).toUpperCase()}</strong><span><Clock size={12} aria-hidden="true" />{timeAgo(order.createdAt, now)}</span></div><span className={`admin-status admin-status-${order.status}`}>{meta?.icon}{meta?.label ?? order.status.replace(/_/g, " ")}</span></div><ul className="admin-order-lines">{order.items.map((item, itemIndex) => <li key={`${item.name}-${itemIndex}`}><span>{item.qty}×</span>{item.name}</li>)}</ul><p className="admin-address"><MapPin size={13} aria-hidden="true" />{order.address || "No address provided"}</p><div className="admin-order-foot"><strong>{money(order.total)}</strong>{next && meta?.action ? <button className="admin-btn admin-btn-primary" type="button" aria-label={`${meta.action} for order ${order.id.slice(-6).toUpperCase()}`} onClick={() => { onStatus(order.id, next); setNotice(`Order #${order.id.slice(-6).toUpperCase()} moved to ${STATUS_META[next].label.toLowerCase()}.`); }}>{meta.action}<ArrowRight size={14} aria-hidden="true" /></button> : order.status === "delivered" ? <span className="admin-order-complete"><Check size={14} aria-hidden="true" /> Service complete</span> : null}</div></li>;
              })}</ul> : <div className="admin-empty"><span><ChefHat size={27} strokeWidth={1.5} aria-hidden="true" /></span><h3>{!orders.length ? "Ready for the first order." : orderQuery ? "No matching orders." : filter === "active" ? "A clear queue. A good feeling." : "No orders in this stage."}</h3><p>{!orders.length ? "Customer orders will arrive here, ready for your next move." : "Search another dish or select a different stage to see more."}</p>{!!orders.length && <button type="button" className="admin-btn admin-btn-ghost" onClick={() => { setFilter("all"); setOrderQuery(""); }}>Show all orders<ArrowRight size={14} aria-hidden="true" /></button>}</div>}
              <div className="admin-list-foot">Showing {visibleOrders.length} of {orders.length} orders <span>All-time queue</span></div>
            </section>
            <section ref={inventoryRef} tabIndex={-1} className="admin-panel admin-inventory" aria-labelledby="admin-inventory-title">
              <div className="admin-panel-head"><div><p className="admin-eyebrow">YOUR MENU</p><h2 id="admin-inventory-title">Availability</h2><p className="admin-sub">A menu that’s always in step with your kitchen.</p></div><span className="admin-panel-icon"><UtensilsCrossed size={18} aria-hidden="true" /></span></div>
              <div className="admin-inventory-summary"><span className="admin-dot" /><strong>{available}<span> / {items.length}</span></strong><span>dishes available</span><span className="admin-inventory-paused">{items.length - available} paused</span></div>
              <div className="admin-search-field"><Search size={16} aria-hidden="true" /><input type="search" aria-label="Search menu" placeholder="Find a dish…" value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} /></div>
              <div className="admin-inventory-filters"><label><span className="admin-sr-only">Menu category</span><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((value) => <option key={value} value={value}>{value}</option>)}</select><ChevronDown size={14} aria-hidden="true" /></label><label><span className="admin-sr-only">Availability filter</span><select value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">All dishes</option><option value="available">Available</option><option value="unavailable">Paused</option></select><ChevronDown size={14} aria-hidden="true" /></label></div>
              {visibleItems.length ? <ul className="admin-items">{visibleItems.map((item) => <li className={`admin-item${item.available ? "" : " admin-item-off"}`} key={item.id}><div className="admin-item-image"><UtensilsCrossed size={19} aria-hidden="true" />{item.image && <img src={item.image} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.visibility = "hidden"; }} />}</div><div className="admin-item-body"><strong>{item.name}</strong><p>{item.category} <span>·</span> {money(item.price)}</p></div><div className="admin-item-toggle"><button type="button" role="switch" aria-checked={item.available} aria-label={`${item.name} available`} onClick={() => { onAvailability(item.id); setNotice(`${item.name} ${item.available ? "paused" : "made available"}.`); }}><span /></button><span>{item.available ? "Available" : "Paused"}</span></div></li>)}</ul> : <div className="admin-empty"><span><Package size={27} strokeWidth={1.5} aria-hidden="true" /></span><h3>{items.length ? "No dishes match." : "Your menu starts here."}</h3><p>{items.length ? "Try another search or adjust your menu filters." : "Dishes added to the store will appear here."}</p>{!!items.length && <button type="button" className="admin-btn admin-btn-ghost" onClick={() => { setCategory("all"); setAvailability("all"); setItemQuery(""); }}>Reset filters</button>}</div>}
              <div className="admin-list-foot">Showing {visibleItems.length} of {items.length} dishes <span>Changes update the store</span></div>
            </section>
          </div>
          <footer className="admin-footer"><span>DELIVR <span>/</span> OWNER CONSOLE</span><p>Local demo workspace · metrics from supplied orders</p><button type="button" onClick={signOut}>Sign out<LogOut size={13} aria-hidden="true" /></button></footer>
        </main>
      </div>
      <dialog ref={dialogRef} className="admin-command-dialog" aria-labelledby="admin-command-title" onCancel={() => setPaletteOpen(false)} onClose={() => setPaletteOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setPaletteOpen(false); }}>
        <div className="admin-command-content"><h2 id="admin-command-title" className="admin-sr-only">Command search</h2><div className="admin-command-input"><Search size={20} aria-hidden="true" /><input ref={commandInputRef} aria-label="Search commands, orders and dishes" placeholder="Where would you like to go?" value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); dialogRef.current?.querySelector<HTMLButtonElement>(".admin-command-result")?.focus(); } if (event.key === "Enter") { event.preventDefault(); dialogRef.current?.querySelector<HTMLButtonElement>(".admin-command-result")?.click(); } }} /><button type="button" aria-label="Close command search" onClick={() => setPaletteOpen(false)}><X size={18} aria-hidden="true" /></button></div>
          <div className="admin-command-results" onKeyDown={(event) => {
            if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
            const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>(".admin-command-result"));
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
            if (index < 0) return;
            event.preventDefault(); buttons[(index + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
          }}>
            {!!matchingCommands.length && <p className="admin-command-group">QUICK ACTIONS</p>}{matchingCommands.map((command) => <button key={command.title} className="admin-command-result" type="button" aria-label={`${command.title}. ${command.hint}`} onClick={command.run}><span aria-hidden="true">{command.icon}</span><span><strong>{command.title}</strong><small>{command.hint}</small></span><ArrowUpRight size={15} aria-hidden="true" /></button>)}
            {!!matchingOrders.length && <p className="admin-command-group">ORDERS</p>}{matchingOrders.map((order) => <button key={order.id} className="admin-command-result" type="button" aria-label={`Order #${order.id.slice(-6).toUpperCase()}. ${order.items.map((item) => item.name).join(", ")}`} onClick={() => { setOrderQuery(order.id); setFilter("all"); goTo("queue"); }}><Receipt size={18} aria-hidden="true" /><span><strong>#{order.id.slice(-6).toUpperCase()}</strong><small>{order.items.map((item) => item.name).join(", ")}</small></span><ArrowUpRight size={15} aria-hidden="true" /></button>)}
            {!!matchingItems.length && <p className="admin-command-group">DISHES</p>}{matchingItems.map((item) => <button key={item.id} className="admin-command-result" type="button" aria-label={`${item.name}. ${item.available ? "Available" : "Paused"}, ${money(item.price)}`} onClick={() => { setItemQuery(item.name); setCategory("all"); setAvailability("all"); goTo("inventory"); }}><UtensilsCrossed size={18} aria-hidden="true" /><span><strong>{item.name}</strong><small>{item.available ? "Available" : "Paused"} · {money(item.price)}</small></span><ArrowUpRight size={15} aria-hidden="true" /></button>)}
            {!matchingCommands.length && !matchingOrders.length && !matchingItems.length && <p className="admin-command-no-results">No matches. Try “queue”, an order ID or a dish name.</p>}
          </div><div className="admin-command-foot"><span><Command size={12} aria-hidden="true" /> Your next move, a shortcut away.</span><span>↑ ↓ navigate · Enter select · Esc close</span></div>
        </div>
      </dialog>
      <div className={`admin-toast${notice ? " admin-toast-visible" : ""}`} role="status" aria-live="polite" aria-atomic="true">{notice && <><CheckCircle2 size={17} aria-hidden="true" />{notice}</>}</div>
    </div>
  );
}
