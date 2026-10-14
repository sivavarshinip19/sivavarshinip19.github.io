(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

  /* scroll progress */
  const bar = document.querySelector('.progress');
  const onScroll = () => {
    const h = document.documentElement;
    const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight);
    if (bar) bar.style.transform = `scaleX(${p})`;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* tilt helper */
  function tilt(el, max, onMove) {
    if (!fine || reduce) return;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', ((x - 0.5) * 2 * max).toFixed(2) + 'deg');
      el.style.setProperty('--rx', ((0.5 - y) * 2 * max).toFixed(2) + 'deg');
      el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    });
    el.addEventListener('mouseleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  }
  const stage = document.querySelector('.hero-visual');
  const st = document.querySelector('.stage');
  if (stage && st) {
    // tilt driven from the whole visual area so the photo reacts as the cursor approaches
    stage.addEventListener('mousemove', (e) => {
      if (!fine || reduce) return;
      const r = stage.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      st.style.setProperty('--ry', ((x - 0.5) * 24).toFixed(2) + 'deg');
      st.style.setProperty('--rx', ((0.5 - y) * 18).toFixed(2) + 'deg');
    });
    stage.addEventListener('mouseleave', () => { st.style.setProperty('--rx', '0deg'); st.style.setProperty('--ry', '0deg'); });
  }
  document.querySelectorAll('.card').forEach((c) => tilt(c, 6));

  /* ---------- Three.js background ---------- */
  const canvas = document.getElementById('bg');
  if (!canvas || typeof THREE === 'undefined') return;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.z = 14;

  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const cAccent = new THREE.Color(), cTeal = new THREE.Color();
  const setColors = () => { cAccent.set(css('--accent')); cTeal.set(css('--accent2')); };
  setColors();

  const mat = (c, o) => new THREE.MeshBasicMaterial({ color: c, wireframe: true, transparent: true, opacity: o });
  const shapes = [
    { m: new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), mat(cAccent, 0.5)), p: [8.5, 3.6, -3], s: [0.004, 0.006] },
    { m: new THREE.Mesh(new THREE.TorusKnotGeometry(1.2, 0.34, 100, 14), mat(cTeal, 0.32)), p: [-13.5, -6, -6], s: [0.006, 0.004] },
    { m: new THREE.Mesh(new THREE.OctahedronGeometry(1.5, 0), mat(cAccent, 0.45)), p: [-6.5, 6, -6], s: [0.008, 0.005] },
    { m: new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.05, 8, 60), mat(cTeal, 0.5)), p: [9, -6, -5], s: [0.007, 0.003] },
  ];
  shapes.forEach((s) => { s.m.position.set(...s.p); scene.add(s.m); });

  const N = 700, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i*3] = (Math.random()-.5)*44; pos[i*3+1] = (Math.random()-.5)*30; pos[i*3+2] = (Math.random()-.5)*26 - 4; }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.055, color: cAccent, transparent: true, opacity: 0.7, sizeAttenuation: true }));
  scene.add(pts);

  const resize = () => { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize(); addEventListener('resize', resize);

  let mx = 0, my = 0, tx = 0, ty = 0;
  addEventListener('mousemove', (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; });

  new MutationObserver(() => {
    setColors();
    shapes.forEach((s, i) => s.m.material.color.copy(i % 2 ? cTeal : cAccent));
    pts.material.color.copy(cAccent);
    if (reduce) renderer.render(scene, camera);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  let running = !document.hidden;
  document.addEventListener('visibilitychange', () => { running = !document.hidden; if (running) loop(); });

  function frame() {
    tx += (mx - tx) * 0.04; ty += (my - ty) * 0.04;
    const sy = (document.documentElement.scrollTop || 0) / Math.max(1, innerHeight);
    camera.position.x = tx * 3; camera.position.y = -ty * 2 - sy * 1.4;
    camera.lookAt(0, -sy * 1.4, 0);
    shapes.forEach((s) => { s.m.rotation.x += s.s[0]; s.m.rotation.y += s.s[1]; });
    pts.rotation.y += 0.0007;
    renderer.render(scene, camera);
  }
  function loop() { if (!running) return; frame(); requestAnimationFrame(loop); }
  if (reduce) renderer.render(scene, camera); else loop();
})();
