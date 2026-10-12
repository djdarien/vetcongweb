// Settings persistence and application
const DEFAULTS = {
  quality: 'medium',
  shadows: 'on',
  fog: 'on',
  sensitivity: 1
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem('vetcongweb-settings');
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem('vetcongweb-settings', JSON.stringify(s));
  } catch (_) {}
}

export function applyGraphics(renderer, scene, settings) {
  const q = settings.quality;
  let pr = 1;
  let shadowSize = 512;
  if (q === 'low') { pr = 0.75; shadowSize = 256; }
  else if (q === 'medium') { pr = 1; shadowSize = 512; }
  else { pr = Math.min(window.devicePixelRatio, 1.5); shadowSize = 1024; }

  renderer.setPixelRatio(pr);
  renderer.shadowMap.enabled = settings.shadows === 'on';
  if (renderer.shadowMap.enabled) {
    scene.traverse(obj => {
      if (obj.isDirectionalLight && obj.shadow) {
        obj.shadow.mapSize.set(shadowSize, shadowSize);
        if (obj.shadow.map) obj.shadow.map.dispose();
        obj.shadow.map = null;
      }
    });
  }

  if (settings.fog === 'on') {
    if (!scene.fog) scene.fog = new (scene.fog?.constructor || Object)();
    // fog already set by map builders; just ensure density
  } else {
    scene.fog = null;
  }
}

export function bindMenu(onApply) {
  const overlay = document.getElementById('menuOverlay');
  const btnMenu = document.getElementById('btnMenu');
  const btnApply = document.getElementById('btnApply');
  const btnClose = document.getElementById('btnClose');
  const setQuality = document.getElementById('setQuality');
  const setShadows = document.getElementById('setShadows');
  const setFog = document.getElementById('setFog');
  const setSens = document.getElementById('setSens');

  function open() {
    const s = loadSettings();
    setQuality.value = s.quality;
    setShadows.value = s.shadows;
    setFog.value = s.fog;
    setSens.value = s.sensitivity;
    overlay.classList.add('visible');
  }
  function close() { overlay.classList.remove('visible'); }

  btnMenu.addEventListener('click', open);
  btnClose.addEventListener('click', close);
  btnApply.addEventListener('click', () => {
    const s = {
      quality: setQuality.value,
      shadows: setShadows.value,
      fog: setFog.value,
      sensitivity: parseFloat(setSens.value)
    };
    saveSettings(s);
    onApply(s);
    close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') {
      if (overlay.classList.contains('visible')) close();
      else open();
    }
  });
}
