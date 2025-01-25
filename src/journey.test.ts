import { describe, expect, it, vi } from 'vitest';
import { destinations, illustratedPlan, inCity, KITCHEN, roadPlan, routePosition, searchDestinations, validPlan } from './journey';
import { initialStore, reducer, restoreStore } from './domain';

describe('destination and route integrity', () => {
  it('accepts Chandigarh coordinates and rejects malformed or out of area pins', () => {
    expect(inCity(destinations[0].point)).toBe(true);
    for (const point of [[77.2, 28.6], [NaN, 30.7], [76.7], ['76.7', 30.7], null]) expect(inCity(point)).toBe(false);
  });
  it('moves according to distance, not the number of geometry points', () => {
    const points: [number, number][] = [[76.7, 30.7], [76.701, 30.7], [76.8, 30.7]];
    expect(routePosition(points, .5)[0]).toBeCloseTo(76.75, 4);
    expect(routePosition(points, -1)).toEqual(points[0]);
    expect(routePosition(points, 2)).toEqual(points[2]);
    expect(routePosition([], .5)).toEqual(KITCHEN);
    expect(routePosition([KITCHEN, KITCHEN], .5)).toEqual(KITCHEN);
  });
  it('persists a chosen route without changing historical orders without pins', () => {
    const journey = illustratedPlan(destinations[2]);
    const state = reducer({ ...initialStore, cart: { m1: 1 } }, { type: 'order', id: 'route-order', now: 123, address: 'Sector 35 Chandigarh', promo: false, journey });
    expect(restoreStore(JSON.stringify(state)).orders[0].journey).toEqual(journey);
    const legacy = { ...state, orders: state.orders.map(({ journey: _, ...order }) => order) };
    expect(restoreStore(JSON.stringify(legacy)).orders[0].journey).toBeUndefined();
    const invalid = { ...state, orders: state.orders.map(order => ({ ...order, journey: { ...journey, coordinates: [[77.2, 28.6]] } })) };
    expect(restoreStore(JSON.stringify(invalid)).orders[0].journey).toBeUndefined();
  });
  it('never labels a direct illustrative path as a road route', () => {
    const plan = illustratedPlan(destinations[1]);
    expect(plan.source).toBe('illustrated');
    expect(plan.coordinates).toEqual([KITCHEN, destinations[1].point]);
    expect(validPlan(plan)).toBe(true);
    expect(validPlan({ ...plan, duration: Infinity })).toBe(false);
  });
  it('handles routing errors and rejects malformed provider responses', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ code: 'NoRoute', routes: [] }) } as Response);
    try { await expect(roadPlan(destinations[0], new AbortController().signal)).rejects.toThrow('No supported driving route'); }
    finally { fetchMock.mockRestore(); }
  });
  it('filters geocoding results to the Chandigarh area', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ features: [{ geometry: { coordinates: destinations[0].point }, properties: { name: 'Sector 9', city: 'Chandigarh' } }, { geometry: { coordinates: [77.2, 28.6] }, properties: { name: 'Delhi' } }] }) } as Response);
    try { const results = await searchDestinations('Sector 9', new AbortController().signal); expect(results).toHaveLength(1); expect(results[0].label).toBe('Sector 9, Chandigarh'); }
    finally { fetchMock.mockRestore(); }
  });
});
