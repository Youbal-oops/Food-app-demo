import { useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, MoveUpRight, Pause, Play } from 'lucide-react';
import { catalog, type Dish } from './domain';

export default function CinematicHero({ onBrowse, onDish }: { onBrowse: () => void; onDish: (dish: Dish) => void }) {
  const [motion, setMotion] = useState(true);
  const poster = useRef<HTMLButtonElement>(null);
  return <section className="atelier-hero" aria-labelledby="atelier-title" data-motion={motion}>
    <div className="atelier-hero-top"><span>DELIVR / CULINARY ATELIER</span><span><i /> CHANDIGARH, INDIA</span><span>VOLUME 003 / THE SIGNATURES</span></div>
    <div className="atelier-hero-copy"><div className="atelier-overline"><span>FOOD, FROM A DIFFERENT ANGLE.</span><b aria-hidden="true">&#10035;</b></div><h1 id="atelier-title">Good food.<br /><span>New</span><br /><em>dimension.</em></h1><p>A small menu. An obsessive eye for detail.<br />Three signatures to turn around, take apart,<br className="desktop-only" /> and fall a little in love with.</p><button className="atelier-cta" onClick={onBrowse}>ENTER THE COLLECTION <ArrowUpRight size={20} /></button><div className="atelier-edition"><span className="edition-disc">03</span><span>THREE SIGNATURES.<br /><b>ZERO ORDINARY MOMENTS.</b></span></div></div>
    <button className="atelier-poster" ref={poster} onClick={() => onDish(catalog[0])} aria-label="Inspect Butter Chicken in 3D" onPointerMove={e => { if (e.pointerType === 'touch' || !motion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return; const b=e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--rx', ((.5-(e.clientY-b.top)/b.height)*6)+'deg'); e.currentTarget.style.setProperty('--ry', (((e.clientX-b.left)/b.width-.5)*7)+'deg'); }} onPointerLeave={() => { poster.current?.style.setProperty('--rx','0deg'); poster.current?.style.setProperty('--ry','0deg'); }}>
      <img src={import.meta.env.BASE_URL+'atelier-poster.png'} alt="Butter chicken in a copper bowl, framed by a sculptural steel ribbon on travertine" fetchPriority="high" />
      <div className="poster-wordmark">form<span>&</span><em>flavour.</em></div><span className="poster-series">STUDIES IN GOOD TASTE / NO. 01</span><div className="poster-sticker"><span>LOOK CLOSER</span><MoveUpRight size={23} /><small>EXPLORE IN 3D</small></div><span className="poster-bottom">BUTTER CHICKEN <b>THE HOUSE ORIGINAL</b></span>
    </button>
    <div className="atelier-hero-bottom"><button onClick={onBrowse}><ArrowDown size={16} /> SCROLL TO DISCOVER</button><span>FIRE. FORM. FLAVOUR.</span><button onClick={() => setMotion(v=>!v)} aria-label={motion ? 'Pause hero motion' : 'Resume hero motion'}>{motion ? <Pause size={13} /> : <Play size={13} />}{motion ? 'MOTION ON' : 'MOTION OFF'}</button></div>
  </section>;
}
