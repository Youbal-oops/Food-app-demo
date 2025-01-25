import {describe,it,expect} from 'vitest';
import { catalog, cartLines, initialStore, reducer, restoreStore, totals } from './domain';
import type { FoodOrder, OrderLine, Status, Store } from './domain';

// Independent stores keep mutations in one scenario from affecting another.
function store(overrides: Partial<Store> = {}): Store {
  return {
    ...initialStore,
    cart: {},
    favorites: [],
    orders: [],
    unavailable: [...initialStore.unavailable],
    ...overrides,
  };
}

const availableDish = catalog.find(dish => dish.available)!;
const otherDish = catalog.find(dish => dish.available && dish.id !== availableDish.id)!;
const unavailableDish = catalog.find(dish => !dish.available)!;

function line(price: number, qty = 1): OrderLine {
  return { id: availableDish.id, name: 'Test meal', image: '/meal.jpg', price, qty };
}

function historicalOrder(overrides: Partial<FoodOrder> = {}): FoodOrder {
  return {
    id: 'ORDER-OLD',
    createdAt: 1_700_000_000_000,
    status: 'placed',
    address: '12 Market Street',
    items: [line(200, 2)],
    subtotal: 400,
    discount: 80,
    delivery: 30,
    total: 350,
    ...overrides,
  };
}

const checkout = {
  type: 'order' as const,
  id: 'ORDER-NEW',
  now: 1_800_000_000_000,
  address: '  42 Garden Road  ',
  promo: false,
};

describe('cart quantities and availability', () => {
  it('adds servings to one cart line without changing the previous cart', () => {
    const before = store();
    const once = reducer(before, { type: 'quantity', id: availableDish.id, delta: 1 });
    const twice = reducer(once, { type: 'quantity', id: availableDish.id, delta: 1 });

    expect(before.cart).toEqual({});
    expect(once.cart).toEqual({ [availableDish.id]: 1 });
    expect(twice.cart).toEqual({ [availableDish.id]: 2 });
    expect(cartLines(twice)).toEqual([{
      id: availableDish.id,
      name: availableDish.name,
      price: availableDish.price,
      image: availableDish.image,
      qty: 2,
    }]);
  });

  it('allows exactly 20 servings and refuses to exceed that per-dish limit', () => {
    let current = store({ cart: { [availableDish.id]: 19, [otherDish.id]: 2 } });
    current = reducer(current, { type: 'quantity', id: availableDish.id, delta: 1 });
    expect(current.cart[availableDish.id]).toBe(20);

    current = reducer(current, { type: 'quantity', id: availableDish.id, delta: 1 });
    expect(current.cart).toEqual({ [availableDish.id]: 20, [otherDish.id]: 2 });
  });

  it('caps an oversized increment at 20 while allowing another dish its own 20 servings', () => {
    const first = reducer(store(), { type: 'quantity', id: availableDish.id, delta: 100 });
    const second = reducer(first, { type: 'quantity', id: otherDish.id, delta: 100 });

    expect(second.cart).toEqual({ [availableDish.id]: 20, [otherDish.id]: 20 });
  });

  it.each([1, 10])('removes a final serving with a decrement of %s', decrement => {
    const before = store({ cart: { [availableDish.id]: 1, [otherDish.id]: 2 } });
    const after = reducer(before, { type: 'quantity', id: availableDish.id, delta: -decrement });

    expect(after.cart).toEqual({ [otherDish.id]: 2 });
    expect(cartLines(after)).toHaveLength(1);
    expect(before.cart[availableDish.id]).toBe(1);
  });

  it('does not create a negative or zero line when decrementing an absent dish', () => {
    const after = reducer(store(), { type: 'quantity', id: availableDish.id, delta: -1 });
    expect(after.cart).toEqual({});
    expect(cartLines(after)).toEqual([]);
  });

  it('ignores quantities for unknown dish IDs', () => {
    const before = store({ cart: { [availableDish.id]: 2 } });
    expect(reducer(before, { type: 'quantity', id: 'missing-dish', delta: 1 })).toEqual(before);
  });

  it.each([0.5, -0.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects a non-finite or fractional quantity change (%s)', delta => {
      const before = store({ cart: { [availableDish.id]: 2 } });
      expect(reducer(before, { type: 'quantity', id: availableDish.id, delta })).toEqual(before);
    },
  );

  it('prevents adding a dish that starts unavailable', () => {
    const before = store();
    expect(before.unavailable).toContain(unavailableDish.id);
    expect(reducer(before, { type: 'quantity', id: unavailableDish.id, delta: 1 })).toEqual(before);
  });

  it('enforces an availability change against dishes already in the cart', () => {
    const before = store({ cart: { [availableDish.id]: 2 } });
    const disabled = reducer(before, { type: 'availability', id: availableDish.id });

    expect(disabled.unavailable).toContain(availableDish.id);
    expect(reducer(disabled, { type: 'quantity', id: availableDish.id, delta: 1 }).cart)
      .toEqual({ [availableDish.id]: 2 });
    expect(reducer(disabled, { type: 'quantity', id: availableDish.id, delta: -1 }).cart)
      .toEqual({ [availableDish.id]: 1 });
    expect(reducer(disabled, { type: 'quantity', id: availableDish.id, delta: -2 }).cart)
      .toEqual({});
  });

  it('allows adding a dish after it is made available again', () => {
    const enabled = reducer(store(), { type: 'availability', id: unavailableDish.id });
    expect(enabled.unavailable).not.toContain(unavailableDish.id);
    expect(reducer(enabled, { type: 'quantity', id: unavailableDish.id, delta: 1 }).cart)
      .toEqual({ [unavailableDish.id]: 1 });
  });

  it('uses catalog prices and leaves unknown cart IDs out of billable lines', () => {
    const current = store({ cart: { [availableDish.id]: 3, 'missing-dish': 100 } });
    expect(cartLines(current)).toEqual([{
      id: availableDish.id,
      name: availableDish.name,
      qty: 3,
      price: availableDish.price,
      image: availableDish.image,
    }]);
  });
});

describe('order totals', () => {
  it.each([false, true])('charges nothing for an empty cart (promo: %s)', promo => {
    expect(totals([], promo)).toEqual({ subtotal: 0, discount: 0, delivery: 0, total: 0 });
  });

  it('sums every line price times its quantity', () => {
    expect(totals([line(120, 2), { ...line(75, 3), id: otherDish.id }])).toEqual({
      subtotal: 465, discount: 0, delivery: 30, total: 495,
    });
  });

  it.each([
    [498, 30, 528],
    [499, 0, 499],
    [500, 0, 500],
  ])('applies the delivery threshold to a subtotal of %s', (subtotal, delivery, total) => {
    expect(totals([line(subtotal)])).toEqual({ subtotal, discount: 0, delivery, total });
  });

  it.each([
    [102, 20, 30, 112],
    [103, 21, 30, 112],
    [400, 80, 30, 350],
    [499, 100, 0, 399],
    [500, 100, 0, 400],
    [1000, 100, 0, 900],
  ])('rounds the 20%% promo and caps it at ₹100 for subtotal %s', (subtotal, discount, delivery, total) => {
    expect(totals([line(subtotal)], true)).toEqual({ subtotal, discount, delivery, total });
  });

  it('bases free delivery on the subtotal before the promo discount', () => {
    expect(totals([line(499)], true)).toEqual({ subtotal: 499, discount: 100, delivery: 0, total: 399 });
  });

  it('does not charge delivery for zero-priced items', () => {
    expect(totals([line(0, 2)], true)).toEqual({ subtotal: 0, discount: 0, delivery: 0, total: 0 });
  });
});

describe('checkout', () => {
  it('creates a priced snapshot, clears the cart, and preserves prior orders and preferences', () => {
    const previous = historicalOrder();
    const before = store({
      cart: { [availableDish.id]: 2, [otherDish.id]: 1 },
      orders: [previous],
      favorites: [availableDish.id],
      name: 'Priya',
    });
    const after = reducer(before, { ...checkout, promo: true });
    const order = after.orders[0];
    const subtotal = availableDish.price * 2 + otherDish.price;

    expect(after.cart).toEqual({});
    expect(after.address).toBe('42 Garden Road');
    expect(after.name).toBe('Priya');
    expect(after.favorites).toEqual(before.favorites);
    expect(after.unavailable).toEqual(before.unavailable);
    expect(after.orders).toHaveLength(2);
    expect(after.orders[1]).toEqual(previous);
    expect(order).toMatchObject({
      id: 'ORDER-NEW', createdAt: checkout.now, status: 'placed', address: '42 Garden Road',
      subtotal,
      // This basket exceeds ₹500; the promo reaches its cap and delivery is free.
      discount: 100, delivery: 0, total: subtotal - 100,
    });
    expect(order.items).toHaveLength(2);
    expect(order.items).toEqual(expect.arrayContaining([
      { id: availableDish.id, name: availableDish.name, price: availableDish.price, image: availableDish.image, qty: 2 },
      { id: otherDish.id, name: otherDish.name, price: otherDish.price, image: otherDish.image, qty: 1 },
    ]));
    expect(before.cart).toEqual({ [availableDish.id]: 2, [otherDish.id]: 1 });
    expect(before.orders).toEqual([previous]);

    // Later cart and menu availability changes cannot rewrite the purchased meal.
    const changedCart = reducer(after, { type: 'quantity', id: availableDish.id, delta: 3 });
    const changedMenu = reducer(changedCart, { type: 'availability', id: availableDish.id });
    expect(changedMenu.orders[0]).toEqual(order);
    expect(order.items.find(item => item.id === availableDish.id)?.qty).toBe(2);
    expect(changedMenu.cart[availableDish.id]).toBe(3);
  });

  it('keeps the delivery fee on a small undiscounted checkout', () => {
    const after = reducer(store({ cart: { [availableDish.id]: 1 } }), checkout);
    expect(after.orders[0]).toMatchObject({
      subtotal: availableDish.price, discount: 0, delivery: 30, total: availableDish.price + 30,
    });
  });

  it('blocks checkout of an empty cart without changing existing orders or the address', () => {
    const before = store({ orders: [historicalOrder()] });
    expect(reducer(before, checkout)).toEqual(before);
  });

  it.each(['', '   ', '\t\n'])('blocks checkout with a blank address (%j) and preserves the cart', address => {
    const before = store({ cart: { [availableDish.id]: 2 }, orders: [historicalOrder()] });
    expect(reducer(before, { ...checkout, address })).toEqual(before);
  });

  it('blocks the entire checkout when one of several dishes becomes unavailable', () => {
    const before = store({ cart: { [availableDish.id]: 2, [otherDish.id]: 1 } });
    const disabled = reducer(before, { type: 'availability', id: otherDish.id });
    expect(reducer(disabled, checkout)).toEqual(disabled);

    const enabled = reducer(disabled, { type: 'availability', id: otherDish.id });
    const purchased = reducer(enabled, checkout);
    expect(purchased.orders).toHaveLength(1);
    expect(purchased.orders[0].items).toHaveLength(2);
    expect(purchased.cart).toEqual({});
  });

  it('does not create a second order from an already cleared cart', () => {
    const purchased = reducer(store({ cart: { [availableDish.id]: 1 } }), checkout);
    expect(reducer(purchased, { ...checkout, id: 'ORDER-RETRY' })).toEqual(purchased);
  });
});

describe('order status transitions', () => {
  const statuses: Status[] = ['placed', 'preparing', 'out_for_delivery', 'delivered'];

  it('moves through the complete sequence while preserving the purchased details and other orders', () => {
    const target = historicalOrder();
    const other = historicalOrder({ id: 'ORDER-OTHER', status: 'preparing' });
    let current = store({ orders: [target, other] });

    for (const status of ['preparing', 'out_for_delivery', 'delivered'] as const) {
      const before = current;
      current = reducer(current, { type: 'status', id: target.id, status });
      expect(current.orders[0]).toEqual({ ...target, status });
      expect(current.orders[1]).toEqual(other);
      expect(before.orders[0].status).not.toBe(status);
    }
  });

  const rejectedTransitions = statuses.flatMap((from, index) =>
    statuses.filter(to => to !== statuses[index + 1]).map(to => ({ from, to })),
  );
  it.each(rejectedTransitions)('rejects $from → $to', ({ from, to }) => {
    const before = store({ orders: [historicalOrder({ status: from })] });
    expect(reducer(before, { type: 'status', id: 'ORDER-OLD', status: to })).toEqual(before);
  });

  it('leaves every order unchanged when the target order does not exist', () => {
    const before = store({ orders: [historicalOrder()] });
    expect(reducer(before, { type: 'status', id: 'ORDER-MISSING', status: 'preparing' })).toEqual(before);
  });
});

describe('restoring saved localStorage state', () => {
  it.each([null, '', '{', '{"cart":', 'undefined', 'null', 'false', '42', '"text"', '[]']) (
    'falls back safely for missing, malformed, or non-object JSON (%j)', raw => {
      expect(() => restoreStore(raw)).not.toThrow();
      expect(restoreStore(raw)).toEqual(initialStore);
    },
  );

  it('restores valid persisted state including historical prices and availability overrides', () => {
    const saved = store({
      cart: { [availableDish.id]: 2 },
      favorites: [otherDish.id],
      orders: [historicalOrder({ status: 'delivered' })],
      name: 'Meera',
      address: '17 Lake Road',
      unavailable: [otherDish.id],
    });
    const restored = restoreStore(JSON.stringify(saved));
    expect(restored).toEqual(saved);
    expect(restored.orders[0].items[0].price).toBe(200);
  });

  it('keeps good cart entries, caps excess servings, and discards invalid entries', () => {
    const saved = {
      cart: {
        [availableDish.id]: 2,
        [otherDish.id]: 999,
        [unavailableDish.id]: 0,
        'missing-dish': 5,
      },
    };
    expect(restoreStore(JSON.stringify(saved)).cart).toEqual({ [availableDish.id]: 2, [otherDish.id]: 20 });
  });

  it.each([0, -1, 1.5, '2', null, false, {}, []])('discards an invalid stored quantity (%j)', qty => {
    const restored = restoreStore(JSON.stringify({ cart: { [availableDish.id]: qty, [otherDish.id]: 3 } }));
    expect(restored.cart).toEqual({ [otherDish.id]: 3 });
  });

  it('discards a non-finite stored quantity even when the JSON number overflows', () => {
    expect(restoreStore(`{"cart":{"${availableDish.id}":1e309}}`).cart).toEqual({});
  });

  it.each([null, false, 4, 'invalid', []])('handles a malformed cart container (%j)', cart => {
    expect(restoreStore(JSON.stringify({ cart })).cart).toEqual({});
  });

  it('filters and deduplicates saved favorites and unavailable IDs', () => {
    const restored = restoreStore(JSON.stringify({
      favorites: [availableDish.id, availableDish.id, 'missing-dish', null, 3, otherDish.id],
      unavailable: [otherDish.id, otherDish.id, 'missing-dish', false, {}],
    }));
    expect(restored.favorites).toEqual([availableDish.id, otherDish.id]);
    expect(restored.unavailable).toEqual([otherDish.id]);
  });

  it('uses defaults for malformed profile fields and malformed list containers', () => {
    const restored = restoreStore(JSON.stringify({
      name: { value: 'Meera' }, address: ['17 Lake Road'],
      favorites: 'm1', unavailable: {}, orders: { id: 'ORDER-OLD' },
    }));
    expect(restored).toEqual(initialStore);
  });

  it('uses defaults for blank profiles and limits excessively long saved text', () => {
    const blank = restoreStore(JSON.stringify({ name: '  ', address: '\n\t' }));
    expect(blank.name).toBe(initialStore.name);
    expect(blank.address).toBe(initialStore.address);

    const long = restoreStore(JSON.stringify({ name: 'N'.repeat(100), address: 'A'.repeat(400) }));
    expect(long.name).toBe('N'.repeat(60));
    expect(long.address).toBe('A'.repeat(250));
  });

  it('preserves explicitly empty availability overrides', () => {
    expect(restoreStore('{"unavailable":[]}').unavailable).toEqual([]);
  });

  const malformedOrders: { reason: string; value: unknown }[] = [
    { reason: 'null order', value: null },
    { reason: 'array order', value: [] },
    { reason: 'missing fields', value: { id: 'ORDER-BROKEN' } },
    { reason: 'non-string ID', value: historicalOrder({ id: 123 as unknown as string }) },
    { reason: 'non-string address', value: { ...historicalOrder(), address: null } },
    { reason: 'unknown status', value: { ...historicalOrder(), status: 'cancelled' } },
    { reason: 'non-numeric timestamp', value: { ...historicalOrder(), createdAt: 'yesterday' } },
    { reason: 'negative total', value: historicalOrder({ total: -1 }) },
    { reason: 'non-numeric subtotal', value: { ...historicalOrder(), subtotal: '400' } },
    { reason: 'negative delivery', value: historicalOrder({ delivery: -30 }) },
    { reason: 'negative discount', value: historicalOrder({ discount: -80 }) },
    { reason: 'empty items', value: historicalOrder({ items: [] }) },
    { reason: 'non-array items', value: { ...historicalOrder(), items: {} } },
    { reason: 'null item', value: { ...historicalOrder(), items: [null] } },
    { reason: 'unknown dish', value: historicalOrder({ items: [{ ...line(200), id: 'missing-dish' }] }) },
    { reason: 'non-string item name', value: { ...historicalOrder(), items: [{ ...line(200), name: 1 }] } },
    { reason: 'missing item image', value: { ...historicalOrder(), items: [{ id: availableDish.id, name: 'Meal', qty: 1, price: 200 }] } },
    { reason: 'zero quantity', value: historicalOrder({ items: [line(200, 0)] }) },
    { reason: 'negative quantity', value: historicalOrder({ items: [line(200, -1)] }) },
    { reason: 'fractional quantity', value: historicalOrder({ items: [line(200, 1.5)] }) },
    { reason: 'quantity above the cart limit', value: historicalOrder({ items: [line(200, 21)] }) },
    { reason: 'negative item price', value: historicalOrder({ items: [line(-200)] }) },
    { reason: 'non-numeric item price', value: { ...historicalOrder(), items: [{ ...line(200), price: '200' }] } },
    { reason: 'one invalid item in an otherwise valid order', value: historicalOrder({ items: [line(200), line(50, 0)] }) },
  ];
  it.each(malformedOrders)('discards $reason without losing good orders or the cart', ({ value }) => {
    const good = historicalOrder();
    const restored = restoreStore(JSON.stringify({
      cart: { [availableDish.id]: 2 }, orders: [value, good],
    }));
    expect(restored.orders).toEqual([good]);
    expect(restored.cart).toEqual({ [availableDish.id]: 2 });
  });

  it.each(['createdAt', 'subtotal', 'discount', 'delivery', 'total'] as const)(
    'rejects an overflowing saved %s', field => {
      const rawOrder = JSON.stringify(historicalOrder()).replace(`"${field}":${historicalOrder()[field]}`, `"${field}":1e309`);
      expect(restoreStore(`{"orders":[${rawOrder}]}`).orders).toEqual([]);
    },
  );

  it('rejects a non-finite saved line price', () => {
    const rawOrder = JSON.stringify(historicalOrder()).replace('"price":200', '"price":1e309');
    expect(restoreStore(`{"orders":[${rawOrder}]}`).orders).toEqual([]);
  });

  it('keeps only the latest 100 saved orders in their existing order', () => {
    const orders = Array.from({ length: 105 }, (_, index) => historicalOrder({ id: `ORDER-${index}` }));
    expect(restoreStore(JSON.stringify({ orders })).orders).toEqual(orders.slice(0, 100));
  });

  it('revalidates availability at checkout after restoring a saved cart', () => {
    const restored = restoreStore(JSON.stringify({
      cart: { [availableDish.id]: 1 }, unavailable: [availableDish.id],
    }));
    expect(reducer(restored, checkout)).toEqual(restored);
    expect(reducer(restored, { type: 'quantity', id: availableDish.id, delta: 1 })).toEqual(restored);
    expect(reducer(restored, { type: 'quantity', id: availableDish.id, delta: -1 }).cart).toEqual({});
  });
});
