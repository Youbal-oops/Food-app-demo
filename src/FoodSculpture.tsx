import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createFoodModel, disposeFoodModel, FOOD_NAMES, type FoodLayer } from './food-models';
import './food-sculpture.css';

export interface FoodSculptureProps {
  id: string;
  exploded?: boolean;
  interactive?: boolean;
  paused?: boolean;
  className?: string;
}

interface Viewer {
  model: THREE.Group | null;
  stage: THREE.Group;
  controls: OrbitControls;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  invalidate: () => void;
  reset: () => void;
  dispose: () => void;
}

type ViewerState = 'loading' | 'ready' | 'fallback';

/** Local vector fallback is available before WebGL loads and after a lost context. */
function DishFallback({ id, gradientId }: { id: string; gradientId: string }) {
  const rice = id === 'm4', paneer = id === 'm2';
  return <svg className="food-sculpture__fallback-art" viewBox="0 0 520 380" aria-hidden="true">
    <defs>
      <radialGradient id={gradientId} cx="42%" cy="35%" r="65%">
        <stop offset="0" stopColor={rice ? '#fff0bf' : '#e88a35'} />
        <stop offset="1" stopColor={rice ? '#cc8930' : '#af401b'} />
      </radialGradient>
      <linearGradient id={`${gradientId}-bowl`} x2="0" y2="1">
        <stop stopColor={paneer || rice ? '#fcf4e6' : '#dfae73'} />
        <stop offset="1" stopColor={paneer || rice ? '#cabc9b' : '#8a462b'} />
      </linearGradient>
    </defs>
    <ellipse cx="260" cy="306" rx="166" ry="22" fill="#503321" opacity=".09" />
    <path d="M75 188 Q84 295 260 302 Q436 295 445 188Z" fill={`url(#${gradientId}-bowl)`} />
    <ellipse cx="260" cy="190" rx="190" ry="102" fill="#f4e8d0" stroke={paneer || rice ? '#c6b996' : '#af7950'} strokeWidth="5" />
    {paneer ? <g transform="translate(260 187) rotate(-12)">
      {[-45, 0, 45].map((row, r) => <g key={row}>
        <path d={`M-138 ${row} H138`} stroke="#977b4c" strokeWidth="5" strokeLinecap="round" />
        {[-96, -32, 32, 96].map((x, c) => <g key={x} transform={`translate(${x} ${row})`}>
          <rect x="-22" y="-22" width="44" height="42" rx="7" fill="#e7ac58" stroke="#bb733c" strokeWidth="2" />
          <path d="M-12 -10L12 -7 M-11 1L10 4 M-9 11L12 14" stroke="#633522" strokeWidth="3" strokeLinecap="round" />
          {c < 3 && <ellipse cx="32" cy="0" rx="8" ry="20" fill={r % 2 ? '#737e34' : '#b34028'} />}
        </g>)}
      </g>)}
      <path d="M99 74 A26 26 0 0 1 47 74Z" fill="#b4bd57" stroke="#7b902e" strokeWidth="4" />
    </g> : <>
      <ellipse cx="260" cy={rice ? 177 : 190} rx="172" ry={rice ? 93 : 87} fill={`url(#${gradientId})`} />
      {rice ? <>
        {Array.from({ length: 290 }, (_, i) => {
          const a = i * 2.39996, r = Math.sqrt((i + .5) / 290);
          const x = 260 + Math.cos(a) * r * 166, y = 177 + Math.sin(a) * r * 87;
          return <ellipse key={i} cx={x} cy={y} rx="4.3" ry="1.4" fill={i % 3 ? '#fff0cb' : '#e29b29'} transform={`rotate(${i * 41 % 180} ${x} ${y})`} />;
        })}
        {[[180, 153], [318, 200], [278, 127]].map(([x, y]) => <rect key={x} x={x} y={y} width="37" height="28" rx="10" fill="#97522a" transform={`rotate(-15 ${x} ${y})`} />)}
        <path d="M172 197q35-27 46-2t42-7 M277 164q25-28 38-5 M218 229q23-28 43-8" fill="none" stroke="#92542b" strokeWidth="3" />
      </> : <>
        {Array.from({ length: 12 }, (_, i) => {
          const a = i * 2.39996, r = Math.sqrt((i + .5) / 12);
          const x = 260 + Math.cos(a) * r * 128, y = 190 + Math.sin(a) * r * 59;
          return <rect key={i} x={x - 19} y={y - 13} width="40" height="29" rx="10" fill={i % 2 ? '#ce742e' : '#b96528'} transform={`rotate(${i * 23} ${x} ${y})`} />;
        })}
        <path d="M250 190c-16-16 29-27 40-9s-20 42-55 26-28-56 17-64 94 22 81 56-67 52-116 20-45-82 19-94 128 12 147 51" fill="none" stroke="#ffe6b4" strokeWidth="4" strokeLinecap="round" />
      </>}
    </>}
    <g transform={paneer ? 'translate(145 254)' : 'translate(263 155)'} fill="#4d7536" stroke="#385f2b" strokeWidth="1">
      <path d="M0 7Q-39 3-27-17Q-3-25 0 7Z" /><path d="M0 7Q36 3 28-19Q7-20 0 7Z" /><path d="M0 7Q-17-26 1-33Q20-24 0 7Z" />
    </g>
  </svg>;
}

/** One renderer per mount; dish and motion changes are applied through refs. */
export default function FoodSculpture({
  id, exploded = false, interactive = true, paused = false, className = '',
}: FoodSculptureProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const propsRef = useRef({ id, exploded, interactive, paused });
  propsRef.current = { id, exploded, interactive, paused };
  const [state, setState] = useState<ViewerState>('loading');
  const labelId = useId();
  const gradientId = `dish-${useId().replace(/:/g, '')}`;
  const name = FOOD_NAMES[id] ?? FOOD_NAMES.m1;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer | undefined;
    let controls: OrbitControls | undefined;
    let environment: THREE.WebGLRenderTarget | undefined;
    let pmrem: THREE.PMREMGenerator | undefined;
    let room: RoomEnvironment | undefined;
    let observer: ResizeObserver | undefined;
    let intersection: IntersectionObserver | undefined;
    let frame = 0;
    let disposed = false;
    let visible = true;
    let documentVisible = !document.hidden;
    let dirty = true;
    let dragging = false;
    let userIdleUntil = 0;
    let lastTime = 0;
    let lastDraw = 0;
    let width = 0, height = 0;
    let explosion = propsRef.current.exploded ? 1 : 0;
    const scene = new THREE.Scene();
    const stage = new THREE.Group();
    scene.add(stage);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let reducedMotion = motion.matches;
    const camera = new THREE.PerspectiveCamera(35, 1, .1, 40);
    const startPosition = new THREE.Vector3(4.4, 4.05, 5.8);
    const baseTarget = new THREE.Vector3(0, .57, 0);
    camera.position.copy(startPosition);
    const pedestal = new THREE.Group();
    scene.add(pedestal);
    const viewer: Viewer = {
      model: null, stage,
      // Assigned before this object is made available to React effects.
      controls: undefined as unknown as OrbitControls,
      camera, renderer: undefined as unknown as THREE.WebGLRenderer,
      invalidate: () => { dirty = true; schedule(); },
      reset: () => {
        if (!controls) return;
        stage.rotation.set(0, 0, 0);
        camera.position.copy(startPosition);
        controls.target.copy(baseTarget).y += explosion * .52;
        controls.update();
        userIdleUntil = performance.now() + 5000;
        viewer.invalidate();
      },
      dispose: () => {
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(frame);
        frame = 0;
        observer?.disconnect();
        intersection?.disconnect();
        document.removeEventListener('visibilitychange', visibilityChange);
        window.removeEventListener('resize', resize);
        motion.removeEventListener('change', motionChange);
        controls?.removeEventListener('change', controlChange);
        controls?.removeEventListener('start', controlStart);
        controls?.removeEventListener('end', controlEnd);
        controls?.dispose();
        if (renderer) renderer.domElement.removeEventListener('webglcontextlost', contextLost);
        if (viewer.model) disposeFoodModel(viewer.model);
        disposeFoodModel(pedestal);
        scene.environment = null;
        environment?.dispose();
        room?.dispose();
        pmrem?.dispose();
        scene.traverse(object => { if (object instanceof THREE.Light) object.dispose(); });
        scene.clear();
        renderer?.renderLists.dispose();
        renderer?.dispose();
        renderer?.forceContextLoss();
        renderer?.domElement.remove();
      },
    };

    function active() {
      return !disposed && visible && documentVisible && width > 0 && height > 0;
    }
    function schedule() {
      if (!frame && active()) frame = requestAnimationFrame(draw);
    }
    function fail() {
      viewer.dispose();
      if (viewerRef.current === viewer) viewerRef.current = null;
      setState('fallback');
    }
    function contextLost(event: Event) {
      event.preventDefault();
      // Release the failed renderer. The local SVG remains fully usable.
      fail();
    }
    function controlChange() { viewer.invalidate(); }
    function controlStart() { dragging = true; userIdleUntil = Infinity; viewer.invalidate(); }
    function controlEnd() { dragging = false; userIdleUntil = performance.now() + 5000; viewer.invalidate(); }
    function motionChange(event: MediaQueryListEvent) {
      reducedMotion = event.matches;
      lastTime = 0;
      viewer.invalidate();
    }
    function visibilityChange() {
      documentVisible = !document.hidden;
      lastTime = 0;
      if (!documentVisible) { cancelAnimationFrame(frame); frame = 0; }
      else viewer.invalidate();
    }
    function resize() {
      if (!renderer || disposed) return;
      const rect = host!.getBoundingClientRect();
      width = Math.round(rect.width);
      height = Math.round(rect.height);
      if (!width || !height) { cancelAnimationFrame(frame); frame = 0; return; }
      // Keep portrait/mobile compositions comfortably within the frame.
      camera.aspect = width / height;
      camera.fov = camera.aspect < 1 ? Math.min(61, 35 / camera.aspect) : 35;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 640 ? 1.5 : 1.8));
      renderer.setSize(width, height, false);
      viewer.invalidate();
    }
    function draw(now: number) {
      frame = 0;
      if (!active() || !renderer || !controls) return;
      const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 1 / 60;
      lastTime = now;
      const props = propsRef.current;
      const targetExplosion = props.exploded ? 1 : 0;
      const movingLayers = Math.abs(targetExplosion - explosion) > .001;
      if (movingLayers) {
        explosion = reducedMotion ? targetExplosion : THREE.MathUtils.damp(explosion, targetExplosion, 6, dt);
        if (Math.abs(targetExplosion - explosion) < .001) explosion = targetExplosion;
        for (const ingredient of (viewer.model?.userData.layers ?? []) as FoodLayer[]) {
          ingredient.position.y = ingredient.userData.baseY + explosion * ingredient.userData.explodeOffset;
        }
        controls.target.y = baseTarget.y + explosion * .52;
        dirty = true;
      }
      const spinning = !props.paused && !reducedMotion && !dragging && now >= userIdleUntil;
      if (spinning) { stage.rotation.y += dt * .095; dirty = true; }
      const controlsChanged = controls.update();
      // 30fps is sufficient for a food turntable; drag responses are immediate.
      if ((dirty || controlsChanged) && (dragging || now - lastDraw >= 1000 / 30 || !lastDraw)) {
        try { renderer.render(scene, camera); }
        catch { fail(); return; }
        lastDraw = now;
        dirty = false;
      }
      if (spinning || movingLayers || controlsChanged || dirty || (!props.paused && !reducedMotion)) schedule();
      else lastTime = 0;
    }

    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.22;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.className = 'food-sculpture__canvas';
      renderer.domElement.setAttribute('aria-hidden', 'true');
      renderer.domElement.addEventListener('webglcontextlost', contextLost, false);
      host.appendChild(renderer.domElement);
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.copy(baseTarget).y += explosion * .52;
      controls.enableDamping = true;
      controls.dampingFactor = .085;
      controls.enablePan = false;
      controls.minDistance = 4.9;
      controls.maxDistance = 11.5;
      controls.minPolarAngle = .3;
      controls.maxPolarAngle = Math.PI / 2 - .08;
      controls.rotateSpeed = .65;
      controls.zoomSpeed = .7;
      controls.enabled = propsRef.current.interactive;
      controls.touches.ONE = THREE.TOUCH.ROTATE;
      controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
      // OrbitControls sets touch-action:none; restore vertical page scrolling.
      renderer.domElement.style.touchAction = 'pan-y';
      controls.addEventListener('change', controlChange);
      controls.addEventListener('start', controlStart);
      controls.addEventListener('end', controlEnd);
      controls.update();
      viewer.controls = controls;
      viewer.renderer = renderer;
      const hemisphere = new THREE.HemisphereLight('#fff0d8', '#8c7562', 2.1);
      scene.add(hemisphere);
      const key = new THREE.DirectionalLight('#fff1d7', 4.1);
      key.position.set(-3.5, 6.5, 4);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = key.shadow.camera.bottom = -4.5;
      key.shadow.camera.right = key.shadow.camera.top = 4.5;
      key.shadow.camera.near = .5;
      key.shadow.camera.far = 18;
      key.shadow.normalBias = .025;
      key.shadow.bias = -.0003;
      key.shadow.radius = 3;
      scene.add(key);
      const fill = new THREE.DirectionalLight('#e4edff', 1.2);
      fill.position.set(4, 3, -2);
      scene.add(fill);
      const rim = new THREE.DirectionalLight('#ffd49d', 2.4);
      rim.position.set(1, 4, -5);
      scene.add(rim);
      // A PMREM studio room supplies softbox reflections on ceramic, oil and copper.
      pmrem = new THREE.PMREMGenerator(renderer);
      room = new RoomEnvironment();
      environment = pmrem.fromScene(room, .04);
      scene.environment = environment.texture;
      scene.environmentIntensity = .65;
      room.dispose();
      room = undefined;
      pmrem.dispose();
      pmrem = undefined;
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.32, 1.35, .11, 96),
        new THREE.MeshStandardMaterial({ color: '#e9dec7', roughness: .83 }));
      plinth.position.y = -.012;
      plinth.receiveShadow = true;
      pedestal.add(plinth);
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), new THREE.ShadowMaterial({ color: '#60442c', opacity: .17 }));
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -.074;
      shadow.receiveShadow = true;
      pedestal.add(shadow);
      viewerRef.current = viewer;
      observer = new ResizeObserver(resize);
      observer.observe(host);
      if ('IntersectionObserver' in window) {
        intersection = new IntersectionObserver(entries => {
          visible = entries.some(entry => entry.isIntersecting);
          lastTime = 0;
          if (!visible) { cancelAnimationFrame(frame); frame = 0; }
          else viewer.invalidate();
        }, { threshold: .01 });
        intersection.observe(host);
      }
      document.addEventListener('visibilitychange', visibilityChange);
      window.addEventListener('resize', resize);
      motion.addEventListener('change', motionChange);
      resize();
      setState('ready');
    } catch {
      fail();
    }
    return () => {
      viewer.dispose();
      if (viewerRef.current === viewer) viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    try {
      const next = createFoodModel(id);
      for (const ingredient of next.userData.layers as FoodLayer[]) {
        ingredient.position.y = ingredient.userData.baseY + (propsRef.current.exploded ? ingredient.userData.explodeOffset : 0);
      }
      if (viewer.model) disposeFoodModel(viewer.model);
      viewer.model = next;
      viewer.stage.add(next);
      viewer.invalidate();
    } catch {
      viewer.dispose();
      viewerRef.current = null;
      setState('fallback');
    }
  }, [id]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    viewer.controls.enabled = interactive;
    viewer.renderer.domElement.style.touchAction = 'pan-y';
    viewer.invalidate();
  }, [interactive, exploded, paused]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const viewer = viewerRef.current;
    if (!interactive || !viewer || event.target !== event.currentTarget) return;
    const delta = .14;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      viewer.stage.rotation.y += event.key === 'ArrowLeft' ? -delta : delta;
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      const offset = viewer.camera.position.clone().sub(viewer.controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.phi = THREE.MathUtils.clamp(spherical.phi + (event.key === 'ArrowUp' ? -delta : delta), .3, Math.PI / 2 - .08);
      viewer.camera.position.copy(viewer.controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
      viewer.controls.update();
    } else if (event.key.toLowerCase() === 'r' || event.key === 'Home') {
      event.preventDefault();
      viewer.reset();
    } else return;
    viewer.invalidate();
  }

  return <div className={`food-sculpture ${className}`} data-state={state} data-interactive={interactive}
    data-exploded={exploded} role="region" aria-label={`${name} ${state === 'ready' ? '3D viewer' : 'dish illustration'}`}
    aria-describedby={labelId} tabIndex={interactive && state === 'ready' ? 0 : -1} onKeyDown={onKeyDown}>
    <div className="food-sculpture__viewport" ref={hostRef} />
    {state !== 'ready' && <div className="food-sculpture__fallback"><DishFallback id={id} gradientId={gradientId} /></div>}
    <p className="food-sculpture__sr" id={labelId}>
      {state === 'ready'
        ? `${name}, a procedural three-dimensional food sculpture. ${interactive ? 'Drag to rotate, pinch or scroll to zoom. Use arrow keys to rotate and R or Home to reset.' : 'A rotating view of the dish.'} ${exploded ? 'Ingredients are separated into layers.' : 'Ingredients are plated together.'}`
        : `${name}. ${state === 'loading' ? 'Loading the 3D view.' : '3D is unavailable. A local dish illustration is shown.'}`}
    </p>
    <span className="food-sculpture__sr" role="status" aria-live="polite">
      {state === 'fallback' ? '3D is unavailable. Dish illustration displayed.' : ''}
    </span>
    {interactive && state === 'ready' && <div className="food-sculpture__controls">
      <span className="food-sculpture__hint" aria-hidden="true">Drag to explore</span>
      <button className="food-sculpture__reset" type="button" aria-label={`Reset ${name} view`} onClick={() => viewerRef.current?.reset()}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M3 10a9 9 0 1 1 2.6 8.4M3 4v6h6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>Reset view</span>
      </button>
    </div>}
  </div>;
}
