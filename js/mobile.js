// Mobile touch controls for vetcongweb
export function setupMobile(keys, shootFn, reloadFn, getSensitivity) {
  const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const controls = document.getElementById('touchControls');
  if (!isMobile || !controls) return;

  controls.classList.add('visible');
  const info = document.getElementById('info');
  if (info) info.style.fontSize = '11px';

  const joy = document.getElementById('joystick');
  const stick = document.getElementById('joystick-stick');
  let joyActive = false;

  function joyMove(clientX, clientY) {
    const rect = joy.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const max = 40;
    if (dist > max) {
      dx = (dx / dist) * max;
      dy = (dy / dist) * max;
    }
    stick.style.transform = `translate(${dx}px, ${dy}px)`;
    keys.w = dy < -15;
    keys.s = dy > 15;
    keys.a = dx < -15;
    keys.d = dx > 15;
  }

  joy.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joyActive = true;
    const t = e.touches[0];
    joyMove(t.clientX, t.clientY);
  }, { passive: false });

  joy.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!joyActive) return;
    const t = e.touches[0];
    joyMove(t.clientX, t.clientY);
  }, { passive: false });

  joy.addEventListener('touchend', () => {
    joyActive = false;
    stick.style.transform = '';
    keys.w = keys.a = keys.s = keys.d = false;
  });

  let lookActive = false;
  let lastLook = { x: 0, y: 0 };
  document.addEventListener('touchstart', (e) => {
    if (e.target.closest('.touch-controls') || e.target.closest('#mapSelect') || e.target.closest('#btnMenu') || e.target.closest('#menuOverlay')) return;
    const t = e.touches[0];
    if (t.clientX > window.innerWidth * 0.45) {
      lookActive = true;
      lastLook = { x: t.clientX, y: t.clientY };
    }
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!lookActive) return;
    const t = e.touches[0];
    const sens = getSensitivity ? getSensitivity() : 1;
    const dx = (t.clientX - lastLook.x) * sens;
    const dy = (t.clientY - lastLook.y) * sens;
    lastLook = { x: t.clientX, y: t.clientY };
    const evt = new MouseEvent('mousemove', { movementX: dx * 1.5, movementY: dy * 1.5 });
    document.dispatchEvent(evt);
  }, { passive: true });

  document.addEventListener('touchend', () => { lookActive = false; });

  const btnShoot = document.getElementById('btn-shoot');
  const btnJump = document.getElementById('btn-jump');
  const btnReload = document.getElementById('btn-reload');

  btnShoot.addEventListener('touchstart', (e) => { e.preventDefault(); shootFn(); });
  btnJump.addEventListener('touchstart', (e) => { e.preventDefault(); keys.space = true; });
  btnJump.addEventListener('touchend', () => { keys.space = false; });
  btnReload.addEventListener('touchstart', (e) => { e.preventDefault(); reloadFn(); });
}
