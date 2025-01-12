export type Page = 'home' | 'menu' | 'cart' | 'account' | 'tracker' | 'admin';
export type Role = 'user' | 'admin' | null;
export type AccountSection = 'orders' | 'addresses' | 'payment' | 'refer' | 'help' | null;
export type AdminTab = 'orders' | 'menu' | 'staff' | 'settings';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  price: number;
  category: string;
  tag?: string;
  available: boolean;
  prepTime: string;
  calories: string;
  isVeg: boolean;
  ingredients: string[];
}

export interface CartItem extends MenuItem {
  qty: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  status: 'placed' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered';
  total: number;
  time: string;
  date: string;
  address: string;
  driver?: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  full: string;
}

export interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  color: string;
}
