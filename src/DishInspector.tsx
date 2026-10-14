import { lazy, Suspense, useId, useState } from 'react';
import { ArrowUpRight, Layers3, Rotate3D, Plus, Minus, Leaf, Flame } from 'lucide-react';
import { money, type Dish } from './domain';
const FoodSculpture = lazy(() => import('./FoodSculpture'));
const notes: Record<string, { title: string; note: string; part: string }[]> = {
  m1: [{ title: 'The slow simmer', note: 'Tomato, butter & a little patience.', part: 'THE BASE' }, { title: 'Tandoor-kissed', note: 'Charred edges. Tender at the centre.', part: 'THE HEART' }, { title: 'A cream signature', note: 'That last, impossibly silky swirl.', part: 'THE FINISH' }, { title: 'Kasuri methi', note: 'The unmistakable final note.', part: 'THE AROMA' }],
  m2: [{ title: 'Fresh paneer', note: 'Soft inside. Beautifully charred.', part: 'THE HEART' }, { title: 'Yoghurt marinade', note: 'Spice, tang & time to soak it in.', part: 'THE METHOD' }, { title: 'Fire-roasted peppers', note: 'A little sweetness. A little smoke.', part: 'THE COLOUR' }, { title: 'Mint & lemon', note: 'A bright, fresh finish.', part: 'THE LIFT' }],
  m4: [{ title: 'Long-grain basmati', note: 'Light, fragrant, perfectly separate.', part: 'THE FOUNDATION' }, { title: 'Saffron threads', note: 'A golden hue. An unmistakable aroma.', part: 'THE GOLD' }, { title: 'Dum-cooked chicken', note: 'Slow-steamed with warming spices.', part: 'THE SOUL' }, { title: 'Crisp golden onions', note: 'Sweetness, crunch & fresh mint.', part: 'THE CROWN' }],
};
export default function DishInspector({ dish, qty, unavailable, onAdd }: { dish: Dish; qty: number; unavailable: boolean; onAdd: () => void }) {
  const [exploded, setExploded] = useState(false);
  const [paused, setPaused] = useState(false);
  const id = useId().replace(/:/g, '');
  const callouts = notes[dish.id] || notes.m1;
  return <div className="dish-inspector">
    <div className="inspector-heading"><span>THE SIGNATURE COLLECTION / {dish.id === 'm1' ? '01' : dish.id === 'm2' ? '02' : '03'}</span><h2>{dish.name}<i>™</i></h2><p>{dish.description}</p></div>
    <div className={`inspector-stage ${exploded ? 'is-exploded' : ''}`}>
      <span className="inspector-watermark">{exploded ? 'INSIDE' : 'TASTE'}</span>
      <Suspense fallback={<div className="sculpture-loading"><Rotate3D /><span>Setting the table…</span></div>}><FoodSculpture id={dish.id} exploded={exploded} interactive paused={paused} /></Suspense>
      <svg className="inspector-arrows" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true"><defs><marker id={id} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M1 1L6 4L1 7" fill="none" stroke="currentColor" /></marker></defs>{['M200 135Q310 100 388 270', 'M800 140Q700 125 610 260', 'M190 435Q300 470 378 365', 'M810 440Q720 462 620 360'].map(d => <path key={d} d={d} fill="none" stroke="currentColor" strokeWidth="1.3" markerEnd={`url(#${id})`} />)}</svg>
      <div className="inspector-callouts">{callouts.map((c,i) => <div className={`inspector-callout callout-${i}`} key={c.title}><span>0{i+1} / {c.part}</span><strong>{c.title}</strong><p>{c.note}</p></div>)}</div>
      <div className="inspector-tools"><button aria-pressed={exploded} onClick={() => setExploded(v => !v)}><Layers3 size={15} />{exploded ? 'Bring it together' : 'Explore the layers'}{exploded ? <Minus size={13} /> : <Plus size={13} />}</button><button aria-pressed={paused} onClick={() => setPaused(v => !v)}><Rotate3D size={15} />{paused ? 'Auto-rotate' : 'Pause rotation'}</button></div>
    </div>
    <div className="inspector-footer"><div><span className="inspector-diet">{dish.isVeg ? <Leaf size={13} /> : <Flame size={13} />}{dish.isVeg ? 'VEGETARIAN' : 'HOUSE SIGNATURE'} · {dish.calories} · {dish.prepTime}</span><p>{dish.longDescription}</p><div className="inspector-ingredients">{dish.ingredients.map(i => <span key={i}>{i}</span>)}</div></div><div className="inspector-purchase"><strong>{money(dish.price)}<small>ONE VERY GOOD DECISION</small></strong><button className="atelier-cta" disabled={unavailable || qty >= 20} onClick={onAdd}>{unavailable ? 'Back soon' : qty ? `Add another (${qty} in bag)` : 'Add to my bag'}<ArrowUpRight size={19} /></button></div></div>
  </div>;
}
