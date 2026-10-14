import { useEffect, useMemo, useRef, useState } from 'react';
import { MapPin, Navigation, Search, Minus, Plus, Crosshair } from 'lucide-react';
import { destinations, inCity, KITCHEN, roadPlan, searchDestinations, illustratedPlan, routePosition, type Coordinate, type DeliveryPlan, type Destination } from './journey';
import './journey.css';

const SIZE = 256;
export function project([lon, lat]: Coordinate, zoom: number): Coordinate {
  const scale = SIZE * 2 ** zoom;
  return [(lon + 180) / 360 * scale, (1 - Math.asinh(Math.tan(lat * Math.PI / 180)) / Math.PI) / 2 * scale];
}
export function unproject([x, y]: Coordinate, zoom: number): Coordinate {
  const scale = SIZE * 2 ** zoom;
  return [x / scale * 360 - 180, Math.atan(Math.sinh(Math.PI * (1 - 2 * y / scale))) * 180 / Math.PI];
}
export function ChandigarhMap({ plan, progress = 0, onPick }: { plan?: DeliveryPlan | null; progress?: number; onPick?: (point: Coordinate) => void }) {
  const [zoom, setZoom] = useState(13);
  const [center, setCenter] = useState<Coordinate>([76.785, 30.734]);
  const [tileError, setTileError] = useState(false);
  const [pin, setPin] = useState<Coordinate>(plan?.destination.point || destinations[0].point);
  const drag = useRef<{ x: number; y: number; center: Coordinate } | null>(null);
  useEffect(() => {
    if (!plan) return;
    setPin(plan.destination.point);
    setCenter([(KITCHEN[0] + plan.destination.point[0]) / 2, (KITCHEN[1] + plan.destination.point[1]) / 2]);
    for (let z = 15; z >= 10; z--) { const a = project(KITCHEN, z), b = project(plan.destination.point, z); if (Math.abs(a[0] - b[0]) < 590 && Math.abs(a[1] - b[1]) < 280) { setZoom(z); break; } }
  }, [plan]);
  const [cx, cy] = project(center, zoom), left = cx - 400, top = cy - 230;
  const xy = (p: Coordinate) => { const [x, y] = project(p, zoom); return [x - left, y - top]; };
  const tiles = useMemo(() => {
    const tiles = [];
    for (let x = Math.floor(left / SIZE); x <= Math.floor((left + 800) / SIZE); x++) for (let y = Math.floor(top / SIZE); y <= Math.floor((top + 460) / SIZE); y++) tiles.push({ x, y });
    return tiles;
  }, [left, top]);
  const route = plan?.coordinates.map(p => xy(p).join(',')).join(' ');
  const rider = xy(routePosition(plan?.coordinates || [KITCHEN], progress));
  const kitchen = xy(KITCHEN), home = xy(plan?.destination.point || pin);
  const pick = (point: Coordinate) => { if (onPick && inCity(point)) { setPin(point); onPick(point); } };
  return <div className={`chandigarh-map ${onPick ? 'selectable' : ''}`}>
    <svg viewBox="0 0 800 460" role={onPick ? 'application' : 'img'} aria-label={onPick ? 'Chandigarh map. Tap to place a delivery pin; drag to pan. Use arrow keys to move the pin and Enter to confirm.' : 'Chandigarh delivery route map'} tabIndex={onPick ? 0 : undefined}
      onKeyDown={e => { const delta = .0015 / 2 ** (zoom - 13); const moves: Record<string, Coordinate> = { ArrowLeft: [-delta, 0], ArrowRight: [delta, 0], ArrowUp: [0, delta], ArrowDown: [0, -delta] }; if (moves[e.key] && onPick) { e.preventDefault(); const next: Coordinate = [pin[0] + moves[e.key][0], pin[1] + moves[e.key][1]]; if (inCity(next)) { setPin(next); setCenter(next); } } if (e.key === 'Enter') { e.preventDefault(); pick(pin); } }}
      onPointerDown={e => { if (!onPick) return; drag.current = { x: e.clientX, y: e.clientY, center }; e.currentTarget.setPointerCapture?.(e.pointerId); }}
      onPointerUp={e => { if (!drag.current) return; const start = drag.current; drag.current = null; const box = e.currentTarget.getBoundingClientRect(); const dx = (e.clientX - start.x) * 800 / box.width, dy = (e.clientY - start.y) * 460 / box.height; if (Math.hypot(dx, dy) > 8) { const c = project(start.center, zoom), next = unproject([c[0] - dx, c[1] - dy], zoom); if (inCity(next)) setCenter(next); } else pick(unproject([left + (e.clientX - box.left) * 800 / box.width, top + (e.clientY - box.top) * 460 / box.height], zoom)); }} onPointerCancel={() => { drag.current = null; }}>
      <rect width="800" height="460" fill="#e6e4d5" />
      {tiles.map(tile => <image key={`${zoom}-${tile.x}-${tile.y}`} href={`https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png`} x={tile.x * SIZE - left} y={tile.y * SIZE - top} width={SIZE + .3} height={SIZE + .3} onError={() => setTileError(true)} />)}
      {route && <><polyline points={route} fill="none" stroke="#fff8e5" strokeWidth="12" strokeLinejoin="round" strokeLinecap="round" /><polyline points={route} fill="none" stroke="#d8492b" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={plan?.source === 'illustrated' ? '9 9' : undefined} /></>}
      <g transform={`translate(${kitchen.join(' ')})`}><circle r="18" fill="#242923" stroke="#fff" strokeWidth="4" /><text textAnchor="middle" y="5" fill="white" fontSize="14">K</text></g>
      <g transform={`translate(${home.join(' ')})`}><circle r="27" fill="#ed5935" opacity=".2" /><path d="M0 0C-30-22-16-46 0-46S30-22 0 0" fill="#d8492b" stroke="#fff" strokeWidth="3" /><circle cy="-29" r="6" fill="#fff" /></g>
      {plan && <g transform={`translate(${rider.join(' ')})`}><circle className="route-rider-pulse" r="20" fill="#ed5935" opacity=".2" /><circle r="9" fill="#fff" stroke="#d8492b" strokeWidth="4" /></g>}
    </svg>
    <span className="city-map-label">CHANDIGARH <i>30.7333° N · 76.7794° E</i></span>
    <div className="map-zoom"><button type="button" aria-label="Zoom in map" disabled={zoom >= 17} onClick={() => setZoom(z => Math.min(17, z + 1))}><Plus size={16} /></button><button type="button" aria-label="Zoom out map" disabled={zoom <= 11} onClick={() => setZoom(z => Math.max(11, z - 1))}><Minus size={16} /></button><button type="button" aria-label="Reset map to Chandigarh" onClick={() => { setCenter([76.785, 30.734]); setZoom(13); }}><Crosshair size={16} /></button></div>
    <a className="map-attribution" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
    {tileError && <span className="map-offline">Map tiles unavailable · route overlay only</span>}
  </div>;
}

export default function DestinationPicker({ address, plan, onChange }: { address: string; plan: DeliveryPlan | null; onChange: (plan: DeliveryPlan | null) => void }) {
  const [query, setQuery] = useState(address);
  const [results, setResults] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  const [routing, setRouting] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<Destination | null>(null);
  const searchAbort = useRef<AbortController | null>(null), routeAbort = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  useEffect(() => () => { sequence.current++; searchAbort.current?.abort(); routeAbort.current?.abort(); }, []);
  useEffect(() => { sequence.current++; routeAbort.current?.abort(); searchAbort.current?.abort(); searchAbort.current = null; setQuery(address); setPending(null); setRouting(false); setLoading(false); setResults([]); setError(''); }, [address]);
  async function search() {
    if (query.trim().length < 3) { setError('Enter a street, sector or landmark to search.'); return; }
    searchAbort.current?.abort(); const controller = new AbortController(); searchAbort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    setLoading(true); setError('');
    try { const found = await searchDestinations(query, controller.signal); if (searchAbort.current !== controller) return; setResults(found); if (!found.length) setError('No match in Chandigarh. Try a landmark or drop a pin at your door.'); }
    catch { if (searchAbort.current === controller) setError('Search could not connect. Choose a landmark or drop your own pin.'); }
    finally { clearTimeout(timeout); if (searchAbort.current === controller) setLoading(false); }
  }
  async function select(destination: Destination) {
    const current = ++sequence.current;
    routeAbort.current?.abort(); const controller = new AbortController(); routeAbort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 10000);
    onChange(null); setPending(destination); setRouting(true); setError(''); setResults([]);
    try { const next = await roadPlan(destination, controller.signal); if (sequence.current === current) onChange(next); }
    catch { if (sequence.current === current) setError('Road routing could not connect. Retry, or use a clearly marked illustrated journey.'); }
    finally { clearTimeout(timeout); if (sequence.current === current) setRouting(false); }
  }
  return <section className="destination-picker" aria-label="Delivery location">
    <div className="destination-heading"><Navigation size={18} /><div><strong>Where does your story end?</strong><small>Choose the exact destination for your delivery film.</small></div></div>
    <div className="destination-search"><input aria-label="Search Chandigarh location" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void search(); } }} placeholder="House, sector or landmark in Chandigarh" /><button type="button" onClick={() => void search()} disabled={loading}><Search size={17} />{loading ? 'Finding…' : 'Find'}</button></div>
    <small className="map-service-note">Search uses Photon; routing uses OSRM. Or tap the map to pin your door.</small>
    {!!results.length && <div className="destination-results">{results.map((r, i) => <button key={i} type="button" onClick={() => void select(r)}><MapPin size={16} />{r.label}</button>)}</div>}
    <div className="destination-presets">{destinations.map(d => <button type="button" key={d.label} onClick={() => void select(d)}>{d.label.replace(', Chandigarh', '')}</button>)}</div>
    <ChandigarhMap plan={plan || (pending ? illustratedPlan(pending) : null)} onPick={point => void select({ point, label: `Pinned door · ${point[1].toFixed(5)}, ${point[0].toFixed(5)}` })} />
    <div className="destination-status" aria-live="polite">{routing ? <span className="route-loading">Mapping your route through the city…</span> : plan ? <><MapPin size={17} /><span><strong>{plan.destination.label}</strong><small>{plan.source === 'road' ? `${(plan.distance / 1000).toFixed(1)} km driving route · OpenStreetMap / OSRM` : 'Illustrated direct path · not a road navigation route'}</small></span></> : <span>Select a destination to continue.</span>}</div>
    {error && <div className="route-error" role="status">{error}{pending && !routing && <div><button type="button" onClick={() => void select(pending)}>Retry road route</button><button type="button" onClick={() => { onChange(illustratedPlan(pending)); setError(''); }}>Use illustrated journey</button></div>}</div>}
  </section>;
}
