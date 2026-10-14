import { MENU_ITEMS } from './data';
import { validPlan, type DeliveryPlan } from './journey';

export type Status = 'placed' | 'preparing' | 'out_for_delivery' | 'delivered';
export interface Dish {
  id: string; name: string; description: string; longDescription: string; price: number;
  category: string; available: boolean; isVeg: boolean; prepTime: string; calories: string;
  ingredients: string[]; tag?: string; image: string; rating: string;
}
export interface OrderLine { id: string; name: string; qty: number; price: number; image: string }
export interface FoodOrder {
  id: string; createdAt: number; status: Status; total: number; address: string;
  items: OrderLine[]; subtotal: number; delivery: number; discount: number;
  journey?: DeliveryPlan;
}
export interface Store {
  cart: Record<string, number>; favorites: string[]; orders: FoodOrder[];
  address: string; name: string; unavailable: string[];
}
export const money = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
export const catalog: Dish[] = MENU_ITEMS.map((item, index) => ({
  ...item, image: `${import.meta.env.BASE_URL}food/${item.id}.svg`, rating: ['4.9', '4.8', '4.7', '4.9', '4.6'][index % 5],
}));
export const initialStore: Store = { cart: {}, favorites: [], orders: [], address: '14B, Sector 9, Chandigarh', name: 'Arjun', unavailable: catalog.filter(d => !d.available).map(d => d.id) };
export const steps: Status[] = ['placed', 'preparing', 'out_for_delivery', 'delivered'];
export const statusLabel: Record<Status, string> = { placed: 'Order confirmed', preparing: 'A little kitchen magic', out_for_delivery: 'Good things on the way', delivered: 'Happiness, delivered' };

export function cartLines(store: Store): OrderLine[] {
  return catalog.filter(d => store.cart[d.id] > 0).map(d => ({ id: d.id, name: d.name, price: d.price, image: d.image, qty: store.cart[d.id] }));
}
export function totals(lines: OrderLine[], promo = false) {
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.qty, 0);
  const discount = promo ? Math.min(100, Math.round(subtotal * .2)) : 0;
  const delivery = subtotal === 0 || subtotal >= 499 ? 0 : 30;
  return { subtotal, discount, delivery, total: subtotal - discount + delivery };
}
export type Action =
  | { type: 'quantity'; id: string; delta: number }
  | { type: 'favorite'; id: string }
  | { type: 'profile'; name: string; address: string }
  | { type: 'availability'; id: string }
  | { type: 'order'; id: string; now: number; address: string; promo: boolean; journey?: DeliveryPlan }
  | { type: 'status'; id: string; status: Status };

export function reducer(state: Store, action: Action): Store {
  switch (action.type) {
    case 'quantity': {
      if (!Number.isInteger(action.delta) || !catalog.some(d => d.id === action.id) || (action.delta > 0 && state.unavailable.includes(action.id))) return state;
      const qty = Math.max(0, Math.min(20, (state.cart[action.id] || 0) + action.delta));
      const cart = { ...state.cart };
      if (qty) cart[action.id] = qty; else delete cart[action.id];
      return { ...state, cart };
    }
    case 'favorite': return { ...state, favorites: state.favorites.includes(action.id) ? state.favorites.filter(id => id !== action.id) : [...state.favorites, action.id] };
    case 'profile': return { ...state, name: action.name.trim().slice(0, 60) || state.name, address: action.address.trim().slice(0, 250) || state.address };
    case 'availability': return { ...state, unavailable: state.unavailable.includes(action.id) ? state.unavailable.filter(id => id !== action.id) : [...state.unavailable, action.id] };
    case 'order': {
      const items = cartLines(state);
      if (!items.length || !action.address.trim() || items.some(i => state.unavailable.includes(i.id))) return state;
      const order: FoodOrder = { id: action.id, createdAt: action.now, status: 'placed', address: action.address.trim(), items, ...totals(items, action.promo) };
      if (validPlan(action.journey)) order.journey = action.journey;
      return { ...state, cart: {}, address: order.address, orders: [order, ...state.orders].slice(0, 100) };
    }
    case 'status': return { ...state, orders: state.orders.map(order => order.id === action.id && steps.indexOf(action.status) === steps.indexOf(order.status) + 1 ? { ...order, status: action.status } : order) };
  }
}

const isObject = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function restoreStore(raw: string | null): Store {
  if (!raw) return initialStore;
  try {
    const saved: unknown = JSON.parse(raw);
    if (!isObject(saved)) return initialStore;
    const ids = new Set(catalog.map(d => d.id));
    const cart: Record<string, number> = {};
    if (isObject(saved.cart)) Object.entries(saved.cart).forEach(([id, qty]) => {
      if (ids.has(id) && typeof qty === 'number' && Number.isInteger(qty) && qty > 0) cart[id] = Math.min(20, qty);
    });
    const validIds = (v: unknown) => Array.isArray(v) ? [...new Set(v.filter((id): id is string => typeof id === 'string' && ids.has(id)))] : [];
    const orders = Array.isArray(saved.orders) ? saved.orders.filter((o): o is FoodOrder => {
      if (!isObject(o) || typeof o.id !== 'string' || typeof o.address !== 'string' || !steps.includes(o.status as Status) || typeof o.createdAt !== 'number' || !Number.isFinite(o.createdAt)) return false;
      if (!['total', 'subtotal', 'delivery', 'discount'].every(k => typeof o[k] === 'number' && Number.isFinite(o[k]) && (o[k] as number) >= 0)) return false;
      return Array.isArray(o.items) && o.items.length > 0 && o.items.every(i => isObject(i) && typeof i.id === 'string' && ids.has(i.id) && typeof i.name === 'string' && typeof i.image === 'string' && typeof i.qty === 'number' && Number.isInteger(i.qty) && i.qty > 0 && i.qty <= 20 && typeof i.price === 'number' && Number.isFinite(i.price) && i.price >= 0);
    }).slice(0, 100).map(order => { const { journey, ...rest } = order; return validPlan(journey) ? { ...rest, journey } : rest; }) : [];
    return { ...initialStore, cart, orders, favorites: validIds(saved.favorites), unavailable: Array.isArray(saved.unavailable) ? validIds(saved.unavailable) : initialStore.unavailable,
      address: typeof saved.address === 'string' && saved.address.trim() ? saved.address.slice(0, 250) : initialStore.address,
      name: typeof saved.name === 'string' && saved.name.trim() ? saved.name.slice(0, 60) : initialStore.name };
  } catch { return initialStore; }
}
