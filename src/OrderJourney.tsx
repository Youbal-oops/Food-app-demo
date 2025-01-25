import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Film, Map, Maximize2, MapPin, RotateCcw, SkipForward } from 'lucide-react';
import { ChandigarhMap } from './ChandigarhMap';
import { steps, type FoodOrder, type Status } from './domain';
import './journey.css';

const KitchenTheater = lazy(() => import('./KitchenTheater'));
const DriverScene = lazy(() => import('./DriverScene'));
const starts = [0, 5000, 12000, 23000, 31000, 36000, 76000];
const chapters = ['Received', 'Prep', 'The flame', 'Plating', 'Handoff', 'The ride', 'At home'];
const headlines = ['Your craving, in motion.', 'Every great meal starts here.', 'A little fire. A lot of flavour.', 'The final, delicious details.', 'From our hands to the city.', 'Chandigarh, here we come.', 'The best seat is yours.'];
const descriptions = ['Your order slips onto the kitchen pass. The team takes it from here.', 'Fresh ingredients meet the board. Your dishes are coming to life.', 'The pan comes alive. Watch the heat, the toss, the finishing touch.', 'Sauce, garnish, seal. A little care in every layer.', 'Packed with care. Your rider is ready to roll.', 'Follow your rider from the kitchen toward your chosen pin.', 'Unpacked, plated, and ready for your first bite.'];
const startFor = (status: Status) => status === 'preparing' ? 5000 : status === 'out_for_delivery' ? 36000 : status === 'delivered' ? 76000 : 0;

export default function OrderJourney({ order, playing, onPlaying, onStatus }: { order: FoodOrder; playing: boolean; onPlaying: (value: boolean) => void; onStatus: (status: Status) => void }) {
  const [elapsed, setElapsed] = useState(() => startFor(order.status));
  const [replay, setReplay] = useState(false);
  const [camera, setCamera] = useState<'chase' | 'map'>('chase');
  const host = useRef<HTMLDivElement>(null);
  const phase = Math.max(0, starts.reduce((last, s, index) => elapsed >= s ? index : last, 0));
  const progress = phase === 6 ? 1 : Math.min(1, (elapsed - starts[phase]) / (starts[phase + 1] - starts[phase]));
  useEffect(() => {
    if (!playing || elapsed >= 76000) return;
    const timer = setInterval(() => setElapsed(value => Math.min(76000, value + 100)), 100);
    return () => clearInterval(timer);
  }, [playing, elapsed >= 76000]);
  useEffect(() => {
    if (elapsed >= 76000 && playing) onPlaying(false);
    if (replay) return;
    const wanted: Status = phase === 6 ? 'delivered' : phase >= 5 ? 'out_for_delivery' : phase >= 1 ? 'preparing' : 'placed';
    const index = steps.indexOf(order.status);
    if (index < steps.indexOf(wanted)) onStatus(steps[index + 1]);
  }, [elapsed, phase, playing, replay, order.status, onPlaying, onStatus]);
  // Dashboard status changes can move this film forward, never backward.
  useEffect(() => { if (!replay) setElapsed(value => Math.max(value, startFor(order.status))); }, [order.status, replay]);
  const plan = order.journey;
  const dishes = order.items.map(item => `${item.qty} × ${item.name}`);
  return <div className="journey-experience" ref={host}>
    <div className="journey-toolbar"><span><Film size={13} /> YOUR ORDER, A SHORT FILM</span><div>{phase >= 5 && plan && <button onClick={() => setCamera(camera === 'chase' ? 'map' : 'chase')} className={camera === 'map' ? 'active' : ''}><Map size={13} />{camera === 'map' ? 'Rider view' : 'City map'}</button>}<button onClick={() => setElapsed(starts[Math.min(6, phase + 1)])} disabled={phase === 6} aria-label="Next order scene"><SkipForward size={13} /></button>{typeof document.documentElement.requestFullscreen === 'function' && <button aria-label="Expand order film" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void host.current?.requestFullscreen().catch(() => {}); }}><Maximize2 size={13} /></button>}</div></div>
    <div className="journey-screen"><Suspense fallback={<div className="journey-interlude"><span>✳</span><p>Setting the scene…</p></div>}>
      {phase === 5 && plan ? camera === 'map' ? <ChandigarhMap plan={plan} progress={progress} /> : <DriverScene route={plan.coordinates} progress={progress} paused={!playing} destination={plan.destination.label} /> : phase === 5 ? <div className="journey-interlude"><MapPin size={40} /><p>This older order has no saved destination pin.</p></div> : phase === 6 && camera === 'map' && plan ? <ChandigarhMap plan={plan} progress={1} /> : <KitchenTheater phase={phase === 6 ? 5 : phase} progress={progress} dishes={dishes} paused={!playing} />}
    </Suspense></div>
    <div className="journey-chapters" aria-label={`Order scene: ${chapters[phase]}`}>{chapters.map((chapter, i) => <div key={chapter} className={`journey-chapter ${i === phase ? 'current' : ''}`}><i><b style={{ width: `${i < phase ? 100 : i === phase ? progress * 100 : 0}%` }} /></i><span>{chapter}</span></div>)}</div>
    <div className="journey-caption" aria-live="polite"><div><h3>{headlines[phase]}</h3><p>{descriptions[phase]}</p></div><span>{String(phase + 1).padStart(2, '0')}<small>/07</small></span></div>
    {plan && <div className="journey-location"><MapPin size={18} /><span><strong>{plan.destination.label}</strong><small>{plan.source === 'road' ? `${(plan.distance / 1000).toFixed(1)} km · Road geometry via OSRM · Stylised city scenery` : 'Illustrated direct path · road routing unavailable'} · Simulated rider</small></span></div>}
    <div className="demo-controls"><span><i className="live-dot" /> Interactive delivery demo</span><button disabled={phase === 6} onClick={() => onPlaying(!playing)}>{phase === 6 ? 'Film complete' : playing ? 'Pause animation' : 'Play delivery demo'}</button></div>
    <button className="journey-replay" onClick={() => { setReplay(true); setElapsed(0); setCamera('chase'); onPlaying(true); }}><RotateCcw size={13} /> Replay the whole experience</button>
  </div>;
}
