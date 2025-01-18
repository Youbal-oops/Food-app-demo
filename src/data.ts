import { MenuItem, Order, Promotion, SavedAddress } from './types';

export const PROMOTIONS: Promotion[] = [
  { id: 'p1', title: 'Family Feast Pack', subtitle: 'Feeds 4 · Save ₹200', tag: 'LIMITED', color: '#C0392B' },
  { id: 'p2', title: 'Office Lunch Bundle', subtitle: '10 meals · Free delivery', tag: 'POPULAR', color: '#1A56A0' },
  { id: 'p3', title: 'Weekend Thali Deal', subtitle: 'Full meal · Only ₹149', tag: 'NEW', color: '#166534' },
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1', name: 'Butter Chicken', category: 'Mains', price: 220, tag: 'Bestseller', available: true,
    isVeg: false, prepTime: '20–25 min', calories: '380 kcal',
    description: 'Creamy tomato-based curry with tender chicken',
    longDescription: 'Our signature Butter Chicken is slow-cooked in a rich, velvety tomato and cream gravy, infused with whole spices and finished with a generous knob of butter. The chicken is marinated overnight in yoghurt and tandoor-roasted before being folded into the sauce — giving it that signature smoky depth. Pairs perfectly with naan or steamed rice.',
    ingredients: ['Chicken', 'Tomatoes', 'Fresh cream', 'Butter', 'Ginger', 'Garlic', 'Kashmiri chilli', 'Fenugreek leaves'],
  },
  {
    id: 'm2', name: 'Paneer Tikka Masala', category: 'Mains', price: 200, available: true,
    isVeg: true, prepTime: '18–22 min', calories: '340 kcal',
    description: 'Chargrilled paneer in spiced gravy',
    longDescription: 'Thick cubes of fresh cottage cheese are marinated in a spiced yoghurt mix, grilled in the tandoor till charred at the edges, then simmered in a vibrant onion-tomato masala. The result is a smoky, tangy curry with a satisfying bite. A vegetarian crowd-pleaser that never disappoints.',
    ingredients: ['Paneer', 'Onions', 'Tomatoes', 'Capsicum', 'Yoghurt', 'Cream', 'Spice blend'],
  },
  {
    id: 'm3', name: 'Dal Tadka', category: 'Mains', price: 140, available: true,
    isVeg: true, prepTime: '15 min', calories: '210 kcal',
    description: 'Tempered yellow lentils with ghee',
    longDescription: 'A soul-warming bowl of yellow lentils cooked to a silky consistency, finished with a sizzling tadka of ghee, cumin seeds, garlic, dried red chillies, and a pinch of asafoetida. Simple, honest, and deeply comforting — the kind of dal that tastes like home.',
    ingredients: ['Yellow lentils', 'Ghee', 'Cumin', 'Garlic', 'Dried red chilli', 'Asafoetida', 'Coriander'],
  },
  {
    id: 'm4', name: 'Chicken Biryani', category: 'Rice & Biryani', price: 260, tag: "Chef's Pick", available: true,
    isVeg: false, prepTime: '30–35 min', calories: '520 kcal',
    description: 'Fragrant basmati rice with marinated chicken',
    longDescription: 'Layers of aged basmati rice and bone-in chicken marinated in yoghurt and aromatic spices, slow-cooked (dum) in a sealed pot so every grain absorbs the flavour. Finished with saffron milk, caramelised onions, and fresh mint. A full meal in one pot.',
    ingredients: ['Basmati rice', 'Chicken', 'Saffron', 'Fried onions', 'Mint', 'Yoghurt', 'Whole spices'],
  },
  {
    id: 'm5', name: 'Veg Pulao', category: 'Rice & Biryani', price: 160, available: true,
    isVeg: true, prepTime: '20 min', calories: '310 kcal',
    description: 'Mildly spiced rice with seasonal vegetables',
    longDescription: 'Fragrant long-grain rice cooked with seasonal vegetables — carrots, peas, beans, and corn — in a light whole-spice broth. Mild enough for all palates, and perfect alongside a bowl of raita. Satisfying without being heavy.',
    ingredients: ['Basmati rice', 'Mixed vegetables', 'Bay leaf', 'Cloves', 'Cardamom', 'Ghee'],
  },
  {
    id: 'm6', name: 'Garlic Naan', category: 'Breads', price: 50, available: true,
    isVeg: true, prepTime: '8 min', calories: '160 kcal',
    description: 'Soft leavened bread with garlic butter',
    longDescription: 'Hand-stretched leavened dough baked to a light char in our clay tandoor, then brushed generously with garlic-infused butter and fresh coriander. Fluffy on the inside, slightly crisp at the edges — the ideal accompaniment to any curry.',
    ingredients: ['Refined flour', 'Yeast', 'Butter', 'Garlic', 'Coriander', 'Salt'],
  },
  {
    id: 'm7', name: 'Tandoori Roti', category: 'Breads', price: 35, available: true,
    isVeg: true, prepTime: '6 min', calories: '110 kcal',
    description: 'Whole wheat bread from clay oven',
    longDescription: 'Unleavened whole wheat flatbread rolled thin and cooked directly on the walls of the tandoor. Light, slightly charred, and wholesome — a healthier companion to your meal.',
    ingredients: ['Whole wheat flour', 'Water', 'Salt'],
  },
  {
    id: 'm8', name: 'Raita', category: 'Sides', price: 60, available: true,
    isVeg: true, prepTime: '5 min', calories: '90 kcal',
    description: 'Yoghurt with cucumber and spices',
    longDescription: 'Chilled hung curd whisked smooth and folded with grated cucumber, roasted cumin powder, chaat masala, and fresh coriander. A cooling counterpoint to spicy mains — essential alongside biryani.',
    ingredients: ['Yoghurt', 'Cucumber', 'Cumin', 'Chaat masala', 'Coriander'],
  },
  {
    id: 'm9', name: 'Gulab Jamun', category: 'Desserts', price: 80, available: true,
    isVeg: true, prepTime: '10 min', calories: '280 kcal',
    description: 'Soft milk dumplings in rose syrup',
    longDescription: 'Melt-in-the-mouth khoya dumplings fried to a deep golden brown and soaked overnight in rose-cardamom sugar syrup. Served warm. An indulgent classic that bookmarks any good meal.',
    ingredients: ['Khoya', 'Refined flour', 'Sugar', 'Rose water', 'Cardamom'],
  },
  {
    id: 'm10', name: 'Mango Lassi', category: 'Drinks', price: 90, tag: 'New', available: true,
    isVeg: true, prepTime: '5 min', calories: '200 kcal',
    description: 'Chilled mango yoghurt drink',
    longDescription: 'Thick Alphonso mango pulp blended with chilled yoghurt, a touch of sugar, and a pinch of cardamom. Served cold in a tall glass. Refreshing, filling, and the perfect antidote to a spicy meal.',
    ingredients: ['Alphonso mango pulp', 'Yoghurt', 'Sugar', 'Cardamom', 'Ice'],
  },
  {
    id: 'm11', name: 'Mutton Rogan Josh', category: 'Mains', price: 320, available: false,
    isVeg: false, prepTime: '45 min', calories: '480 kcal',
    description: 'Slow cooked Kashmiri lamb curry',
    longDescription: 'A Kashmiri heirloom — bone-in mutton braised low and slow in an aromatic gravy of dried Kashmiri chillies, fennel, ginger powder, and whole spices. The result is deeply flavoured, fall-off-the-bone tender meat in a brick-red sauce. Currently unavailable — check back tomorrow.',
    ingredients: ['Mutton', 'Kashmiri chilli', 'Fennel', 'Ginger powder', 'Cloves', 'Bay leaf'],
  },
  {
    id: 'm12', name: 'Fish Curry', category: 'Mains', price: 280, available: true,
    isVeg: false, prepTime: '25 min', calories: '320 kcal',
    description: 'Coastal style fish in coconut gravy',
    longDescription: 'Fresh catch of the day simmered in a tangy, coconut-based gravy with raw mango, curry leaves, and mustard seeds — inspired by the coastal kitchens of Goa and Kerala. Light yet packed with flavour. Best with steamed rice.',
    ingredients: ['Fish', 'Coconut milk', 'Raw mango', 'Curry leaves', 'Mustard seeds', 'Turmeric'],
  },
];

export const CATEGORIES = ['All', ...Array.from(new Set(MENU_ITEMS.map(i => i.category)))];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-4821', status: 'out_for_delivery', total: 320, time: '12:34 PM', date: 'Today',
    address: '14B, Sector 9, Rohini, Delhi', driver: 'Ramesh K.',
    items: [
      { ...MENU_ITEMS[0], qty: 1 },
      { ...MENU_ITEMS[5], qty: 2 },
    ],
  },
  {
    id: 'ORD-4798', status: 'delivered', total: 520, time: '11:10 AM', date: 'Today',
    address: '14B, Sector 9, Rohini, Delhi', driver: 'Sunil P.',
    items: [{ ...MENU_ITEMS[3], qty: 2 }],
  },
  {
    id: 'ORD-4750', status: 'delivered', total: 390, time: '7:45 PM', date: 'Yesterday',
    address: '14B, Sector 9, Rohini, Delhi', driver: 'Arun M.',
    items: [{ ...MENU_ITEMS[1], qty: 1 }, { ...MENU_ITEMS[7], qty: 1 }, { ...MENU_ITEMS[6], qty: 2 }],
  },
];

export const SAVED_ADDRESSES: SavedAddress[] = [
  { id: 'a1', label: 'Home 🏠', full: '14B, Sector 9, Rohini, Delhi — 110085' },
  { id: 'a2', label: 'Office 🏢', full: 'Plot 7, Netaji Subhash Place, Pitampura, Delhi — 110034' },
];

export const ADMIN_ORDERS: Order[] = [
  { id: 'ORD-4825', items: [], status: 'placed', total: 440, time: '1:02 PM', date: 'Today', address: 'A-12, Pitampura', driver: undefined },
  { id: 'ORD-4824', items: [], status: 'preparing', total: 280, time: '12:55 PM', date: 'Today', address: 'C-8, Shalimar Bagh', driver: 'Ramesh K.' },
  { id: 'ORD-4823', items: [], status: 'out_for_delivery', total: 360, time: '12:40 PM', date: 'Today', address: '77, Ashok Vihar', driver: 'Sunil P.' },
  { id: 'ORD-4822', items: [], status: 'delivered', total: 190, time: '12:10 PM', date: 'Today', address: '3B, Model Town', driver: 'Arun M.' },
  { id: 'ORD-4821', items: [], status: 'out_for_delivery', total: 320, time: '12:34 PM', date: 'Today', address: '14B, Sector 9, Rohini', driver: 'Ramesh K.' },
];
