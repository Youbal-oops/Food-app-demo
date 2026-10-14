export type Coordinate = [number, number]; // longitude, latitude
export interface Destination { label: string; point: Coordinate }
export interface DeliveryPlan { destination: Destination; coordinates: Coordinate[]; distance: number; duration: number; source: 'road' | 'illustrated' }
export const KITCHEN: Coordinate = [76.7821, 30.7398];
export const CITY_BOUNDS = [76.68, 30.62, 76.88, 30.82] as const;
export const destinations: Destination[] = [
  { label: 'Sector 9, Chandigarh', point: [76.7945, 30.7485] },
  { label: 'Sukhna Lake, Chandigarh', point: [76.8105, 30.7421] },
  { label: 'Sector 35, Chandigarh', point: [76.7603, 30.7215] },
  { label: 'Elante Mall, Chandigarh', point: [76.8008, 30.7056] },
];
export function inCity(point: unknown): point is Coordinate {
  return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) && point[0] >= CITY_BOUNDS[0] && point[0] <= CITY_BOUNDS[2] && point[1] >= CITY_BOUNDS[1] && point[1] <= CITY_BOUNDS[3];
}
export function distanceBetween(a: Coordinate, b: Coordinate) {
  const rad = Math.PI / 180, dLat = (b[1] - a[1]) * rad, dLon = (b[0] - a[0]) * rad;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2));
}
export function routePosition(points: Coordinate[], progress: number): Coordinate {
  if (!points.length) return KITCHEN;
  const lengths = points.slice(1).map((p, i) => distanceBetween(points[i], p));
  let remaining = lengths.reduce((a, b) => a + b, 0) * Math.max(0, Math.min(1, progress));
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] && lengths[i] > 0) { const t = remaining / lengths[i]; return [points[i][0] + (points[i + 1][0] - points[i][0]) * t, points[i][1] + (points[i + 1][1] - points[i][1]) * t]; }
    remaining -= lengths[i];
  }
  return points[points.length - 1];
}
export function illustratedPlan(destination: Destination): DeliveryPlan {
  // Deliberately straight: never represent an invented path as a drivable road.
  return { destination, coordinates: [KITCHEN, destination.point], distance: distanceBetween(KITCHEN, destination.point), duration: 0, source: 'illustrated' };
}
export function validPlan(value: unknown): value is DeliveryPlan {
  if (!value || typeof value !== 'object') return false;
  const v = value as DeliveryPlan;
  return !!v.destination && typeof v.destination.label === 'string' && inCity(v.destination.point) && Array.isArray(v.coordinates) && v.coordinates.length >= 2 && v.coordinates.length <= 12000 && v.coordinates.every(inCity) && Number.isFinite(v.distance) && v.distance >= 0 && Number.isFinite(v.duration) && v.duration >= 0 && ['road', 'illustrated'].includes(v.source);
}
export async function searchDestinations(query: string, signal: AbortSignal): Promise<Destination[]> {
  const url = new URL('https://photon.komoot.io/api/');
  url.search = new URLSearchParams({ q: query, limit: '7', lat: '30.7333', lon: '76.7794', bbox: CITY_BOUNDS.join(',') }).toString();
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Address search is unavailable. Drop a pin on the map instead.');
  const json = await response.json();
  return (Array.isArray(json.features) ? json.features : []).flatMap((feature: { geometry?: { coordinates?: unknown }; properties?: Record<string, string> }) => {
    if (!inCity(feature.geometry?.coordinates)) return [];
    const p = feature.properties || {};
    return [{ label: [...new Set([p.name, p.housenumber, p.street, p.district, p.city].filter(Boolean))].join(', ') || 'Chandigarh destination', point: feature.geometry!.coordinates }];
  });
}
export async function roadPlan(destination: Destination, signal: AbortSignal): Promise<DeliveryPlan> {
  const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${KITCHEN.join(',')};${destination.point.join(',')}?overview=full&geometries=geojson`, { signal });
  if (!response.ok) throw new Error('Road routing is temporarily unavailable.');
  const data = await response.json();
  const r = data.routes?.[0];
  const result = { destination, coordinates: r?.geometry?.coordinates, distance: r?.distance, duration: r?.duration, source: 'road' as const };
  if (data.code !== 'Ok' || !validPlan(result)) throw new Error('No supported driving route was found for this pin.');
  return result;
}
