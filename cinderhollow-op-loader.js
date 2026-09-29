/*
 * Cinderhollow OP 2.0 browser loader + Ember Console UI
 *
 * Use:
 *   1. Open https://p4zox.github.io/cinderhollow/
 *   2. Open Developer Tools -> Console.
 *   3. Paste this entire file and press Enter.
 *
 * This only modifies the current browser tab and its Cinderhollow save.
 * Press F2 for the draggable control panel. Reloading the normal page removes
 * the runtime mod, but saved unlocks remain.
 */
(async () => {
  'use strict';

  const official = location.hostname === 'p4zox.github.io' && location.pathname.startsWith('/cinderhollow');
  const localTest = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  if (!official && !localTest) {
    throw new Error('Open https://p4zox.github.io/cinderhollow/ before running this loader.');
  }

  const cleanPath = localTest ? '/clean-index.html' : (location.pathname.endsWith('/') ? location.pathname + 'index.html' : location.pathname);
  const sourceUrl = `${location.origin}${cleanPath}?cinderhollow_mod_source=${Date.now()}`;
  const response = await fetch(sourceUrl, { cache: 'no-store', credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Could not load Cinderhollow (${response.status}).`);

  let html = await response.text();
  html = html.replace(/\/\* CH_OP_BEGIN \*\/[\s\S]*?\/\* CH_OP_END \*\//g, '');
  // The world transform remains recognizable in both formatted and minified builds.
  const worldTransform = /g\.setTransform\(\s*1\s*,\s*0\s*,\s*0\s*,\s*1\s*,\s*-(\w+)\s*,\s*-(\w+)\s*\)\s*;\s*g\.drawImage\(room\.back\s*,\s*0\s*,\s*0\s*\)/g;
  const matches = [...html.matchAll(worldTransform)];
  if (matches.length !== 1) throw new Error('Could not locate the world camera transform in this game build.');
  html = html.replace(worldTransform, (_, cameraX, cameraY) => {
    return 'const studioZoom=100/(window.__CINDERHOLLOW_FOV__||100);' +
      'g.setTransform(studioZoom,0,0,studioZoom,(1-studioZoom)*W/2-' + cameraX + '*studioZoom,(1-studioZoom)*H/2-' + cameraY + '*studioZoom);' +
      'g.drawImage(room.back,0,0)';
  });
  const assetLoader = html.indexOf('<script>(() => { const SZ =');
  const gameScriptEnd = assetLoader < 0 ? -1 : html.lastIndexOf('</script>', assetLoader);
  const startupFunctionEnd = gameScriptEnd < 0 ? -1 : html.lastIndexOf('};', gameScriptEnd);
  if (startupFunctionEnd < 0) throw new Error('The game startup function was not found. The site may have changed.');

  const mod = String.raw`
;/* CH_OP_BEGIN */(() => {
  if (window.__CINDERHOLLOW_OP_MOD__) return;
  window.__CINDERHOLLOW_OP_MOD__ = '1.0.0';

  const studioSettingsBaseline = Object.assign({}, SETTINGS);
  const studioWeaponBaseline = Object.fromEntries(Object.entries(WEAPONS).map(([id, weapon]) => [id, JSON.parse(JSON.stringify(weapon))]));
  let hasSavedStudioState = false;
  try { hasSavedStudioState = !!localStorage.getItem('cinderhollow_op_ui'); } catch (_) {}
  if (!hasSavedStudioState) Object.assign(SETTINGS, { god: 1, infst: 1, inffp: 1, nocd: 1, noclip: 0 });
  FIXED_KEYS.KeyV = 'noclip';
  FIXED_KEYS.KeyO = 'omni';
  applyBindings();
  saveSettings();

  const omni = {
    active: false, weapon: 0, art: 0, spell: 0,
    nextArt: 0, nextSpell: 0, oldWeapon: null, oldArt: null,
  };
  const modState = {
    masterEnabled: true,
    autoGrant: true,
    freeze: false,
    oneHit: false,
    infJump: true,
    shield: false,
    vacuum: false,
    killAura: false,
    randomArsenal: false,
    storm: true,
    noclipSpeed: 360,
    bossFightSpeed: 100,
    bossCamera: 'player',
    fov: 100,
    weaponPower: 9999,
    theme: 'ember',
    uiOpen: true,
    stormAt: 0,
    randomAt: 0,
  };
  try { Object.assign(modState, JSON.parse(localStorage.getItem('cinderhollow_op_ui') || '{}')); } catch (_) {}
  modState.fov = Math.max(100, Math.min(500, Number(modState.fov) || 100));
  modState.bossFightSpeed = Math.max(25, Math.min(300, Number(modState.bossFightSpeed) || 100));
  modState.bossCamera = ['player','arena'].includes(modState.bossCamera) ? modState.bossCamera : 'player';
  window.__CINDERHOLLOW_FOV__ = modState.fov;
  const nativeLxBegin = lxBegin;
  lxBegin = function studioLightingStart() {
    if (modState.fov === 100) return nativeLxBegin();
    g = gLow;
    LX.on = false;
    return false;
  };
  const nativeRenderLighting = renderLighting;
  renderLighting = function studioLighting() {
    if (modState.fov === 100) return nativeRenderLighting();
    const area = AREAS[room.def.biome], zoom = 100 / modState.fov;
    let ambient = typeof darkT !== 'undefined' && darkT > 0 ? Math.min(0.97, area.ambient + 0.4 * Math.min(1, darkT)) : area.ambient;
    ambient = Math.min(0.97, ambient * [1.15, 1, 0.72][SETTINGS.bright ?? 1]);
    const lightX = x => (x - cam.x) * zoom + (1 - zoom) * W / 2;
    const lightY = y => (y - cam.y) * zoom + (1 - zoom) * H / 2;
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, W, H);
    lg.fillStyle = 'rgba(4,3,8,' + ambient + ')';
    lg.fillRect(0, 0, W, H);
    lg.globalCompositeOperation = 'destination-out';
    for (const light of lights) {
      const x = lightX(light.x), y = lightY(light.y), radius = light.r * zoom;
      if (x < -radius || x > W + radius || y < -radius || y > H + radius) continue;
      const gradient = lg.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(0,0,0,' + Math.min(1, light.k) + ')');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      lg.fillStyle = gradient;
      lg.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.drawImage(lightC, 0, 0);
    g.globalCompositeOperation = 'lighter';
    for (const light of lights) {
      const x = lightX(light.x), y = lightY(light.y), radius = light.r * zoom * 0.6;
      if (x < -radius || x > W + radius || y < -radius || y > H + radius) continue;
      const gradient = g.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(' + light.color + ',' + (0.16 * light.k) + ')');
      gradient.addColorStop(1, 'rgba(' + light.color + ',0)');
      g.fillStyle = gradient;
      g.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    g.globalCompositeOperation = 'source-over';
  };
  if (!modState.masterEnabled) {
    Object.assign(SETTINGS, studioSettingsBaseline, { god: 0, infst: 0, inffp: 0, nocd: 0, noclip: 0 });
    saveSettings();
  }
  const saveModState = () => {
    try {
      const { masterEnabled, autoGrant, freeze, oneHit, infJump, shield, vacuum, killAura, randomArsenal, storm, noclipSpeed, bossFightSpeed, bossCamera, fov, weaponPower, theme, uiOpen } = modState;
      localStorage.setItem('cinderhollow_op_ui', JSON.stringify({ masterEnabled, autoGrant, freeze, oneHit, infJump, shield, vacuum, killAura, randomArsenal, storm, noclipSpeed, bossFightSpeed, bossCamera, fov, weaponPower, theme, uiOpen }));
    } catch (_) {}
  };

  function omniTick() {
    if (!modState.masterEnabled) return;
    if (!P || state !== 'play' || P.state === 'dead') return;
    if (!held.has('omni')) {
      if (omni.active) {
        omni.active = false;
        if (omni.oldWeapon && WEAPONS[omni.oldWeapon]) SAVE.weapon = omni.oldWeapon;
        if (omni.oldArt && ARTS[omni.oldArt]) SAVE.art = omni.oldArt;
        refreshDerived(false);
        P.fp = D.maxFp;
        toast('OMNI released · loadout restored', 1.4);
      }
      return;
    }

    if (!omni.active) {
      omni.active = true;
      omni.oldWeapon = SAVE.weapon;
      omni.oldArt = SAVE.art;
      omni.nextArt = omni.nextSpell = 0;
      toast('OMNI MODE · every weapon, art and spell', 2.4);
    }

    P.fp = D.maxFp;
    const spells = Object.keys(SPELLS);
    if (spells.length && time >= omni.nextSpell) {
      const id = spells[omni.spell++ % spells.length];
      try { castSpell(id); } catch (_) {}
      omni.nextSpell = time + 0.16;
    }

    if (free() && time >= omni.nextArt) {
      const weapons = Object.keys(WEAPONS);
      const arts = Object.keys(ARTS);
      if (weapons.length) SAVE.weapon = weapons[omni.weapon++ % weapons.length];
      if (arts.length) SAVE.art = arts[omni.art++ % arts.length];
      refreshDerived(false);
      P.fp = D.maxFp;
      try { startArt(); } catch (_) { setP('idle', 'idle', true); }
      omni.nextArt = time + 0.2;
    }
  }

  const originalPress = press;
  press = function moddedPress(action) {
    originalPress(action);
    if (action === 'omni') omniTick();
    if ((action === 'attack' || action === 'heavy') && P && D && state === 'play') {
      const spec = customWeapons[SAVE.weapon];
      if (spec && spec.mode !== 'melee') {
        const trigger = spec.fireTrigger || 'light', matches = trigger === 'both' || (action === 'heavy' ? trigger === 'heavy' : trigger === 'light');
        if (matches && free()) fireStudioWeapon(SAVE.weapon, spec, { kind: action === 'heavy' ? 'heavy' : 'light' });
      }
    }
  };

  const originalInput = onPressHook;
  onPressHook = function moddedInput(action, repeat) {
    if (!modState.masterEnabled) return originalInput(action, repeat);
    if (action === 'noclip') {
      SETTINGS.noclip = SETTINGS.noclip ? 0 : 1;
      saveSettings();
      clearBuffer();
      toast('Noclip ' + (SETTINGS.noclip ? 'ON' : 'OFF') + ' · V toggles', 2.5);
      return;
    }
    originalInput(action, repeat);
  };

  const normalUpdatePlayer = updatePlayer;
  updatePlayer = function moddedUpdatePlayer(dt) {
    if (D && (!Number.isFinite(D.castSpeed) || D.castSpeed > 2.5)) D.castSpeed = 2.5;
    if (!modState.masterEnabled) return normalUpdatePlayer(dt);
    omniTick();
    const activeStudioWeapon = customWeapons[SAVE.weapon];
    if (activeStudioWeapon && activeStudioWeapon.mode !== 'melee' && studioBool(activeStudioWeapon, 'fullAuto') && held.has('attack') && free()) { fireStudioWeapon(SAVE.weapon, activeStudioWeapon, { kind: 'light' }); buffered.set('attack', performance.now()); }
    if (held.has('cast') && free()) buffered.set('cast', performance.now());
    if (held.has('heavy') && free()) buffered.set('heavy', performance.now());

    if (!SETTINGS.noclip) return normalUpdatePlayer(dt);
    const dx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
    const dy = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
    const speed = held.has('roll') ? modState.noclipSpeed * 2 : modState.noclipSpeed;
    P.x += dx * speed * dt;
    P.y += dy * speed * dt;
    P.vx = P.vy = 0;
    P.ground = false;
    P.wallDir = 0;
    P.inv = 1;
    if (dx) P.face = dx;
    if (P.state !== 'idle') setP('idle', 'idle', true);
    P.anim.update(dt);
  };

  function setWeaponPower(value) {
    modState.weaponPower = Math.max(30, Math.min(50000, Number(value) || 9999));
    for (const weapon of Object.values(WEAPONS)) weapon.base = modState.weaponPower;
    if (P && D) refreshDerived(false);
    saveModState();
  }

  function restoreWeaponValues(announce) {
    if (catalogEdits.WEAPONS) { delete catalogEdits.WEAPONS; saveCatalogEdits(); }
    for (const [id, baseline] of Object.entries(studioWeaponBaseline)) {
      if (!WEAPONS[id]) WEAPONS[id] = {};
      for (const key of Object.keys(WEAPONS[id])) delete WEAPONS[id][key];
      Object.assign(WEAPONS[id], JSON.parse(JSON.stringify(baseline)));
    }
    if (P && D) refreshDerived(false);
    if (announce) toast('Original weapon values restored', 2.5);
  }

  function resetLoadout(announce) {
    const weapon = WEAPONS.longsword ? 'longsword' : Object.keys(studioWeaponBaseline)[0];
    const art = WEAPONS[weapon] && ARTS[WEAPONS[weapon].art] ? WEAPONS[weapon].art : (ARTS.crescent ? 'crescent' : Object.keys(ARTS)[0]);
    SAVE.weapons[weapon] = SAVE.weapons[weapon] === undefined ? 0 : SAVE.weapons[weapon];
    if (art && !SAVE.arts.includes(art)) SAVE.arts.push(art);
    SAVE.weapon = weapon;
    SAVE.art = art;
    SAVE.spellsEq = [];
    SAVE.spell = null;
    SAVE.charmsEq = [];
    omni.active = false;
    held.delete('omni');
    clearBuffer();
    if (P && D) refreshDerived(false);
    saveGame();
    if (announce) toast('Loadout cleared · starter weapon retained', 3);
  }

  function restoreNormalGameplay(announce) {
    stopBossExhibition();
    if (boss && boss.__studioExhibition) boss = null;
    modState.masterEnabled = false;
    for (const key of ['freeze','oneHit','infJump','shield','vacuum','killAura','randomArsenal','storm']) modState[key] = false;
    Object.assign(SETTINGS, studioSettingsBaseline, { god: 0, infst: 0, inffp: 0, nocd: 0, noclip: 0 });
    restoreWeaponValues(false);
    resetLoadout(false);
    saveSettings();
    saveModState();
    if (announce) toast('Normal gameplay restored · save progress kept', 4);
  }

  function enableStudioRuntime() {
    modState.masterEnabled = true;
    saveModState();
    toast('Studio runtime enabled', 2);
  }

  function startCleanReplay() {
    if (!confirm('Start a completely new Cinderhollow save? This replaces current progress.')) return;
    stopBossExhibition();
    modState.masterEnabled = true;
    modState.autoGrant = false;
    newGame(true);
    saveModState();
    saveGame();
    toast('Clean replay started · Studio cheats remain available', 4);
  }

  // The game has one native boss slot. Arena fighters live beside it so any
  // number can be hit by the player without changing story progression.
  const exhibitionKinds = ['hound','omen','ice_warden','bellringer','overseer','oswin','champion','scarab'];
  const studioBosses = [];
  let studioBossRoom = null;
  let studioBossMode = 'brawl';
  let studioBossSerial = 0;
  let studioTournament = null;
  function makeStudioBoss(kind, x, y) {
    const fallback = { hound: () => new Hound(x, y), omen: () => new Omen(x, y) };
    const factory = BOSS_SPAWN[kind];
    const fighter = factory ? factory(x, y, { kind }) : fallback[kind] && fallback[kind]();
    if (!fighter || typeof fighter.draw !== 'function' || !fighter.anim || typeof fighter.hit !== 'function') throw new Error('Boss art is unavailable in this build.');
    fighter.active = true;
    fighter.introT = 0;
    fighter.cool = 0.4;
    fighter.state = 'idle';
    if (fighter.sh && fighter.sh.has('idle')) fighter.anim.set('idle', true, 1);
    fighter.rewards = () => {};
    fighter.__studioExhibition = true;
    fighter.__studioSerial = ++studioBossSerial;
    fighter.__studioNextHit = 0.5 + Math.random() * 0.6;
    fighter.__studioAimAt = 0;
    fighter.__studioSwing = 0;
    fighter.die = () => {
      if (fighter.state === 'dead') return;
      fighter.hp = 0; fighter.state = 'dead'; fighter.active = false;
      if (fighter.sh && fighter.sh.has('death')) fighter.anim.set('death', false, 1);
    };
    return fighter;
  }
  function stopBossExhibition() {
    studioBosses.length = 0;
    studioBossRoom = null;
    studioTournament = null;
  }
  function spawnStudioBoss(kind, count = 1, mode = studioBossMode) {
    if (state !== 'play' || !room || !P) throw new Error('Enter a game room first.');
    if (!exhibitionKinds.includes(kind)) throw new Error('Choose a supported boss.');
    studioTournament = null;
    count = Math.floor(Number(count));
    if (!Number.isFinite(count) || count < 1 || count > 50) throw new Error('Spawn 1–50 per click. You can click again to add more.');
    if (studioBossRoom && studioBossRoom !== room.id) stopBossExhibition();
    studioBossRoom = room.id;
    studioBossMode = mode === 'hunt' ? 'hunt' : 'brawl';
    let created = 0;
    for (let i = 0; i < count; i++) {
      const ring = studioBosses.length;
      const offset = (ring % 2 ? -1 : 1) * (110 + (ring % 7) * 32);
      const x = clamp(P.x + offset, TILE + 25, room.pw - TILE - 25);
      const fighter = makeStudioBoss(kind, x, P.y);
      studioBosses.push(fighter);
      created++;
    }
    toast(created + ' ' + BOSS_INFO[kind].name + (created === 1 ? ' enters' : ' enter') + ' the arena', 3);
  }
  function startBossClash(firstKind, secondKind, mode = 'brawl') {
    if (!exhibitionKinds.includes(firstKind) || !exhibitionKinds.includes(secondKind)) throw new Error('Choose supported bosses.');
    stopBossExhibition();
    spawnStudioBoss(firstKind, 1, mode);
    spawnStudioBoss(secondKind, 1, mode);
  }
  function startBossTournament() {
    if (state !== 'play' || !room || !P) throw new Error('Enter a game room first.');
    const queue = exhibitionKinds.slice();
    for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [queue[i], queue[j]] = [queue[j], queue[i]]; }
    const bracket = { queue, winners: [], round: 1, pair: 0, nextAt: 0, champion: null };
    const first = bracket.queue.shift(), second = bracket.queue.shift();
    startBossClash(first, second, 'brawl');
    bracket.pair = 1;
    studioTournament = bracket;
    toast('Boss Tournament · round 1 of 3', 4);
  }
  function updateBossTournament() {
    const bracket = studioTournament;
    if (!bracket || studioBosses.length !== 2) return;
    if (studioBosses.every(f => f.alive)) return;
    if (!bracket.nextAt) {
      const winner = studioBosses.find(f => f.alive) || studioBosses[0];
      bracket.winners.push(winner.kind);
      bracket.nextAt = time + 2;
      toast(winner.name + ' advances', 2);
      return;
    }
    if (time < bracket.nextAt) return;
    if (!bracket.queue.length) {
      if (bracket.winners.length === 1) {
        bracket.champion = bracket.winners[0];
        toast('Tournament champion: ' + BOSS_INFO[bracket.champion].name, 6);
        studioTournament = null;
        return;
      }
      bracket.queue = bracket.winners.splice(0);
      bracket.round++;
      bracket.pair = 0;
    }
    const first = bracket.queue.shift(), second = bracket.queue.shift();
    startBossClash(first, second, 'brawl');
    bracket.pair++;
    bracket.nextAt = 0;
    studioTournament = bracket;
    toast('Tournament round ' + bracket.round + ' · match ' + bracket.pair, 3);
  }
  const nativeTargets = targets;
  targets = function studioTargets() {
    const list = nativeTargets();
    for (const fighter of studioBosses) if (fighter.alive && fighter.active) list.push(fighter);
    return list;
  };
  function updateBossClash(dt) {
    if (!studioBosses.length) return;
    if (state !== 'play' || !room || room.id !== studioBossRoom) { stopBossExhibition(); return; }
    dt = (Number(dt) || 1 / 60) * modState.bossFightSpeed / 100;
    const living = studioBosses.filter(f => f.alive);
    for (const fighter of studioBosses) {
      fighter.anim.update(dt);
      fighter.flash = Math.max(0, (fighter.flash || 0) - dt * 4);
      fighter.displayHp += (fighter.hp - fighter.displayHp) * Math.min(1, dt * 5);
      if (!fighter.alive) continue;
      const others = living.filter(f => f !== fighter);
      const nearest = others.reduce((best, candidate) => !best || Math.abs(candidate.x - fighter.x) < Math.abs(best.x - fighter.x) ? candidate : best, null);
      if (time >= fighter.__studioAimAt || (fighter.__studioTarget && fighter.__studioTarget !== P && !fighter.__studioTarget.alive)) {
        fighter.__studioTarget = studioBossMode === 'brawl' && nearest && Math.random() < 0.68 ? nearest : P;
        fighter.__studioAimAt = time + 1.1;
      }
      const target = fighter.__studioTarget || P;
      const distance = Math.abs(target.x - fighter.x);
      fighter.face = target.x < fighter.x ? -1 : 1;
      if (distance > 72) fighter.x = clamp(fighter.x + fighter.face * 62 * dt, TILE + 25, room.pw - TILE - 25);
      fighter.__studioSwing = Math.max(0, fighter.__studioSwing - dt);
      fighter.__studioNextHit -= dt;
      if (fighter.__studioNextHit <= 0 && distance < 115) {
        fighter.__studioNextHit = 0.8 + Math.random() * 0.6;
        fighter.__studioSwing = 0.35;
        const tags = ['attack','bite','sweep','combo','thrust','slash','strike'];
        const tag = fighter.sh && tags.find(t => fighter.sh.has(t));
        if (tag) fighter.anim.set(tag, false, 1.25);
        const damage = Math.max(28, Math.round(fighter.maxHp * (0.035 + Math.random() * 0.02)));
        if (target === P) {
          hurtPlayer(Math.min(60, damage * 0.4), fighter.face, ++hazardId, { src: fighter, parryable: true });
        } else if (target.alive) {
          target.hp = Math.max(0, target.hp - damage);
          target.flash = 0.7; target.dmgShown = damage; target.dmgT = 1.5;
          spawnFx('hit', target.x, target.y - 35, fighter.face);
          if (target.hp <= 0) target.die();
        }
        shake = Math.max(shake, 2);
      }
      if (fighter.__studioSwing <= 0 && fighter.anim.done && fighter.sh && fighter.sh.has('idle')) fighter.anim.set('idle', true, 1);
    }
  }
  HOOKS.update.push(updateBossClash);
  HOOKS.update.push(updateBossTournament);
  HOOKS.render.push(() => { if (studioBossRoom === (room && room.id)) for (const fighter of studioBosses) fighter.draw(); });
  const nativeUpdateCamera = updateCamera;
  updateCamera = function studioUpdateCamera(dt, snap) {
    nativeUpdateCamera(dt, snap);
    if (modState.bossCamera !== 'arena' || !studioBosses.length || !room || room.id !== studioBossRoom) return;
    const living = studioBosses.filter(f => f.alive);
    if (!living.length) return;
    const focus = living.reduce((sum, fighter) => sum + fighter.x, 0) / living.length;
    const maxX = room.pw - W;
    const tx = maxX < 0 ? maxX / 2 : clamp(focus - W / 2, 0, maxX);
    cam.x += (tx - cam.x) * Math.min(1, dt * 5);
  };
  const nativeRenderHUD = renderHUD;
  renderHUD = function studioRenderHUD() {
    if (!studioBosses.length) return nativeRenderHUD();
    const savedBoss = boss;
    boss = null; // the arena health stack replaces the single native boss bar
    try { return nativeRenderHUD(); } finally { boss = savedBoss; }
  };

  function defeatAllBosses(announce) {
    stopBossExhibition();
    const bosses = Object.keys(BOSS_INFO);
    for (const kind of bosses) SAVE.flags['boss:' + kind] = 1;
    SAVE.flags.__allBossesDefeated = bosses.length;
    if (boss && boss.alive) {
      boss.hp = 0;
      boss.state = 'dead';
      boss.active = false;
    }
    hazards = [];
    projectiles = projectiles.filter(p => p.owner === 'player');
    if (announce) toast('All ' + bosses.length + ' bosses defeated', 3);
  }

  function killThroughGame(target) {
    if (!target || target.alive === false || target.state === 'dead') return;
    if (target.__studioAuraAt && time - target.__studioAuraAt < 0.2) return;
    target.__studioAuraAt = time;
    const hb = typeof target.hurtbox === 'function' ? target.hurtbox() : null;
    const x = hb ? (hb.x0 + hb.x1) / 2 : target.x;
    const y = hb ? (hb.y0 + hb.y1) / 2 : target.y - 12;
    const info = { dmg: Math.max(1000000000, (target.maxHp || target.hp || 1) * 20), poise: 1000000, dir: target.x >= P.x ? 1 : -1, kind: 'spell', x, y, big: true, quiet: true };
    try { if (typeof target.hit === 'function') target.hit(info); } catch (_) {}
    if (target.alive !== false && target.state !== 'dead' && target.hp <= 0 && typeof target.die === 'function') {
      try { target.die(info); } catch (_) { try { target.die(); } catch (_) {} }
    }
  }

  function restoreAllBosses(announce) {
    stopBossExhibition();
    const bosses = Object.keys(BOSS_INFO);
    for (const kind of bosses) delete SAVE.flags['boss:' + kind];
    delete SAVE.flags.__allBossesDefeated;
    delete SAVE.flags.true_ending;
    delete SAVE.flags.venn_betrayed;
    boss = null;
    hazards = [];
    projectiles = projectiles.filter(p => p.owner === 'player');
    saveGame();
    if (state === 'play' && room && P) enterRoom(room.id, P.x, P.y, { quiet: true });
    if (announce) toast('All ' + bosses.length + ' bosses restored · revisit their arenas', 4);
  }

  function respawnCurrentRoom() {
    if (!room || !P || state !== 'play') return;
    stopBossExhibition();
    enterRoom(room.id, P.x, P.y, { quiet: true });
    toast('Current room respawned', 2);
  }

  function revealWorld() {
    SAVE.seenAreas = SAVE.seenAreas || {};
    for (const def of ROOMS) {
      SAVE.visited[def.id] = 1;
      if (def.biome) SAVE.seenAreas[def.biome] = 1;
      if (def.shrine && !SAVE.shrines.includes(def.id)) SAVE.shrines.push(def.id);
    }
    saveGame();
    toast('World revealed · every shrine kindled', 3);
  }

  function unlockSkillsSafely() {
    const oldSkills = [...new Set((SAVE.skills || []).filter(id => SKILL_BY[id]))];
    for (const id of oldSkills) { try { skOnLearn(id, false); } catch (_) {} }
    SAVE.skills = [];
    const ordered = [...new Set(oldSkills.concat(Object.keys(SKILL_BY)))];
    for (let pass = 0, changed = true; changed && pass < 50; pass++) {
      changed = false;
      for (const id of ordered) {
        if (SAVE.skills.includes(id)) continue;
        let result = null;
        try { result = skillLearnable(id); } catch (_) {}
        if (result && result.ok) {
          SAVE.skills.push(id);
          try { skOnLearn(id, true); } catch (_) {}
          changed = true;
        }
      }
    }
  }

  function unlockOwnershipSafely(announce) {
    SAVE.shards = Math.max(SAVE.shards || 0, 9999);
    for (const id of Object.keys(WEAPONS)) {
      if (SAVE.weapons[id] === undefined) SAVE.weapons[id] = 0;
      const art = WEAPONS[id].art;
      if (art && !SAVE.arts.includes(art)) SAVE.arts.push(art);
    }
    for (const id of Object.keys(ARTS)) if (!SAVE.arts.includes(id)) SAVE.arts.push(id);
    for (const id of Object.keys(SPELLS)) if (!SAVE.spellsOwned.includes(id)) SAVE.spellsOwned.push(id);
    for (const id of Object.keys(CHARMS)) if (!SAVE.charms.includes(id)) SAVE.charms.push(id);
    unlockSkillsSafely();
    SAVE.spellSlots = Math.max(SAVE.spellSlots || 0, 4);
    SAVE.spellsEq = (SAVE.spellsEq || []).filter(id => SPELLS[id]).slice(0, SAVE.spellSlots);
    SAVE.spell = SAVE.spellsEq.includes(SAVE.spell) ? SAVE.spell : (SAVE.spellsEq[0] || null);
    SAVE.charmSlots = Math.max(SAVE.charmSlots || 0, 4);
    SAVE.charmsEq = (SAVE.charmsEq || []).filter(id => CHARMS[id]).slice(0, SAVE.charmSlots);
    SAVE.items.wings = 1;
    SAVE.items.talon = 1;
    refreshDerived(false);
    if (P && state === 'play') { clearBuffer(); setP('idle', 'idle', true); P.st = D.maxSt; }
    saveGame();
    if (announce) toast('Ownership unlocked safely · attack build repaired', 4);
  }

  function grantEverything(announce) {
    for (const key of ['vig', 'mnd', 'end', 'str', 'dex', 'fth']) SAVE.stats[key] = 9999;
    SAVE.cinders = 999999999;
    SAVE.inv.emberstone = 9999;
    SAVE.flaskBase = SAVE.flaskBlue = 9999;

    unlockOwnershipSafely(false);
    for (const id of Object.keys(WEAPONS)) SAVE.weapons[id] = 5;

    setWeaponPower(modState.weaponPower);
    defeatAllBosses(false);
    refreshDerived();
    if (P) {
      P.hp = D.maxHp;
      P.fp = D.maxFp;
      P.st = D.maxSt;
    }
    SAVE.flags.__browserOpModReady = 2;
    saveGame();
    if (announce) toast('Everything unlocked and powered up', 3);
  }

  function fireworks() {
    if (!P) return;
    for (let i = 0; i < 180; i++) particles.push({
      x: P.x + rand(-20, 20), y: P.y - rand(5, 55),
      vx: rand(-240, 240), vy: rand(-320, 40), g: 190,
      life: rand(0.7, 2.2), kind: i % 3 ? 'ember' : 'gold',
    });
    flashScreen = 0.35;
    shake = Math.max(shake, 10);
    toast('CINDERFALL', 2);
  }

  const CUSTOM_WEAPONS_KEY = 'cinderhollow_studio_weapons';
  let customWeapons = {};
  const studioGunState = {};
  const studioAim = { x: 0, y: 0, seen: false };
  try { customWeapons = JSON.parse(localStorage.getItem(CUSTOM_WEAPONS_KEY) || '{}') || {}; } catch (_) { customWeapons = {}; }

  view.addEventListener('pointermove', event => {
    const box = view.getBoundingClientRect();
    const px = (event.clientX - box.left) * view.width / Math.max(1, box.width);
    const py = (event.clientY - box.top) * view.height / Math.max(1, box.height);
    const zoom = 100 / modState.fov;
    studioAim.x = cam.x + ((px - ox) / Math.max(0.001, scale) - (1 - zoom) * W / 2) / zoom;
    studioAim.y = cam.y + ((py - oy) / Math.max(0.001, scale) - (1 - zoom) * H / 2) / zoom;
    studioAim.seen = true;
  });

  function saveCustomWeapons() {
    try { localStorage.setItem(CUSTOM_WEAPONS_KEY, JSON.stringify(customWeapons)); } catch (_) {}
  }

  const studioNum = (spec, key, fallback, min, max) => {
    const value = Number(spec[key]);
    return Math.max(min === undefined ? -Infinity : min, Math.min(max === undefined ? Infinity : max, Number.isFinite(value) ? value : fallback));
  };
  const studioBool = (spec, key) => spec[key] === true || spec[key] === 'true' || spec[key] === 'on' || spec[key] === '1';

  function studioAimAngle(spec) {
    const mode = spec.aimMode || 'directional';
    if (mode === 'cursor' && studioAim.seen) return Math.atan2(studioAim.y - (P.y - 18), studioAim.x - P.x);
    if (mode === 'nearest') {
      let best = null, distance = Infinity;
      for (const target of targets()) {
        if (!target || target.prop || target.alive === false) continue;
        const hb = hbOf(target); if (!hb) continue;
        const tx = (hb.x0 + hb.x1) / 2, ty = (hb.y0 + hb.y1) / 2, d = Math.hypot(tx - P.x, ty - (P.y - 18));
        if (d < distance) { distance = d; best = { x: tx, y: ty }; }
      }
      if (best) return Math.atan2(best.y - (P.y - 18), best.x - P.x);
    }
    if (mode === 'directional') {
      if (held.has('up')) return P.face > 0 ? -0.72 : Math.PI + 0.72;
      if (held.has('down') && !P.ground) return P.face > 0 ? 0.72 : Math.PI - 0.72;
    }
    return P.face > 0 ? 0 : Math.PI;
  }

  function studioProjectileVisual(spec) {
    const visual = spec.projectileVisual || 'ashbolt';
    return {
      ashbolt: { kind: 'ashbolt', sh: 'fx_ashbolt' },
      sunspear: { kind: 'sunspear', sh: 'fx_light_spear' },
      shard: { kind: 'shard', sh: 'fx_shards' },
      lance: { kind: 'lance', sh: 'fx_lance' },
      crescent: { kind: 'crescent', sh: 'fx_slash_air' },
      arrow: { kind: 'arrow', sh: 'proj_arrow' },
    }[visual] || { kind: 'ashbolt', sh: 'fx_ashbolt' };
  }

  function fireStudioWeapon(id, spec, attack) {
    if (!P || !D || state !== 'play') return;
    const gun = studioGunState[id] || (studioGunState[id] = { ammo: studioNum(spec, 'magSize', 12, 1, 9999), next: 0, reloadUntil: 0 });
    const now = time;
    if (gun.reloadUntil > now) return;
    const magSize = studioNum(spec, 'magSize', 12, 1, 9999);
    if (gun.ammo <= 0) {
      gun.reloadUntil = now + studioNum(spec, 'reloadTime', 1.2, 0, 20);
      gun.ammo = magSize;
      toast('Reloading ' + (WEAPONS[id].name || 'weapon'), 1.1);
      return;
    }
    const fireRate = studioNum(spec, 'fireRate', 6, 0.1, 60);
    if (now < gun.next) return;
    gun.next = now + 1 / fireRate;
    gun.ammo--;
    const baseAngle = studioAimAngle(spec), count = Math.round(studioNum(spec, 'projectileCount', 1, 1, 64));
    const burstCount = Math.round(studioNum(spec, 'burstCount', 1, 1, 32));
    const spread = studioNum(spec, 'spread', 0, 0, 180) * Math.PI / 180;
    const speed = studioNum(spec, 'projectileSpeed', 360, 10, 3000);
    const life = studioNum(spec, 'range', 650, 20, 5000) / speed;
    const damage = D.light * studioNum(spec, 'shotDamage', 1, 0, 1000) * (Math.random() < studioNum(spec, 'critChance', 0, 0, 100) / 100 ? studioNum(spec, 'critMultiplier', 2, 1, 20) : 1);
    const visual = studioProjectileVisual(spec), muzzleX = studioNum(spec, 'muzzleX', 16, -100, 100), muzzleY = studioNum(spec, 'muzzleY', -18, -100, 100);
    if (Math.cos(baseAngle)) P.face = Math.cos(baseAngle) >= 0 ? 1 : -1;
    for (let burstIndex = 0; burstIndex < burstCount; burstIndex++) for (let pellet = 0; pellet < count; pellet++) {
      const centered = count === 1 ? 0 : (pellet / (count - 1) - 0.5) * spread;
      const angle = baseAngle + centered + rand(-spread * 0.06, spread * 0.06);
      projectiles.push({ owner: 'player', face: P.face, t: 0, hits: new Set(), kind: visual.kind, sh: visual.sh,
        x: P.x + Math.cos(baseAngle) * muzzleX, y: P.y + muzzleY + Math.sin(baseAngle) * Math.abs(muzzleX),
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, dmg: damage, life,
        r: studioNum(spec, 'projectileRadius', 4, 1, 80), poise: studioNum(spec, 'shotPoise', 22, 0, 9999),
        g: studioNum(spec, 'gravity', 0, -3000, 3000), pierce: studioBool(spec, 'pierce'), seek: studioNum(spec, 'homing', 0, 0, 20),
        delay: burstIndex * studioNum(spec, 'burstDelay', 0.08, 0, 5), __studio: id, __studioApplied: new Set() });
    }
    const recoil = studioNum(spec, 'recoil', 20, 0, 1000); P.vx -= Math.cos(baseAngle) * recoil; P.vy -= Math.sin(baseAngle) * recoil * 0.3;
    shake = Math.max(shake, studioNum(spec, 'screenShake', 2, 0, 30));
    sfx.shoot();
  }

  function registerStudioWeaponBehavior(id, spec) {
    const mode = spec.mode || 'melee';
    if (mode === 'melee') { delete SIGS[id]; return; }
    SIGS[id] = {
      glow: spec.glow || '#e6c47a', light: spec.light || '255,210,130', pk: spec.particle || 'gold',
      info: 'Studio firearm · ' + (spec.aimMode || 'directional') + ' aim · ' + studioNum(spec, 'projectileCount', 1, 1, 64) + ' projectile(s)',
      swing(attack) {
        const point = { x: P.x + P.face * 18, y: P.y - 18 };
        for (let i = 0; i < 5; i++) particles.push({ x: point.x, y: point.y, vx: P.face * rand(40, 120), vy: rand(-45, 25), g: 120, life: 0.25, kind: spec.particle || 'gold' });
      },
    };
  }

  function installCustomWeapon(spec, persist) {
    const rawId = String(spec.id || spec.name || 'studio_blade').toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'studio_blade';
    const id = rawId.startsWith('studio_') ? rawId : 'studio_' + rawId;
    const baseId = WEAPONS[spec.template] ? spec.template : (WEAPONS.longsword ? 'longsword' : Object.keys(WEAPONS)[0]);
    const base = JSON.parse(JSON.stringify(WEAPONS[baseId]));
    const number = (key, fallback) => Number.isFinite(Number(spec[key])) ? Number(spec[key]) : fallback;
    const weapon = Object.assign(base, {
      name: String(spec.name || 'Studio Weapon'),
      base: number('base', 9999), speed: number('speed', base.speed || 1), reach: number('reach', base.reach || 1),
      stam: number('stam', base.stam || 1), poise: number('poise', base.poise || 1),
      fire: number('fire', base.fire || 0), holy: number('holy', base.holy || 0), frost: number('frost', base.frost || 0), bleed: number('bleed', base.bleed || 0),
      art: ARTS[spec.art] ? spec.art : (base.art || Object.keys(ARTS)[0]),
      sc: { str: spec.str || 'S', dex: spec.dex || 'S', fth: spec.fth || 'S' },
      desc: String(spec.desc || 'A weapon authored in Cinderhollow Studio.'),
    });
    WEAPONS[id] = weapon;
    if (typeof WEAPON_CLASS !== 'undefined') WEAPON_CLASS[id] = WEAPON_CLASS[baseId] || 'sword';
    registerStudioWeaponBehavior(id, spec);
    ITEMS['w:' + id] = { name: weapon.name, icon: 'w_' + baseId, sheet: 'ui_icons3', desc: weapon.desc, weapon: id };
    if (persist !== false) {
      SAVE.weapons[id] = 5;
      if (!SAVE.arts.includes(weapon.art)) SAVE.arts.push(weapon.art);
      SAVE.weapon = id;
      SAVE.art = weapon.art;
      customWeapons[id] = Object.assign({}, spec, { id, template: baseId });
      saveCustomWeapons();
      refreshDerived(false);
      saveGame();
    }
    return id;
  }

  function updateStudioProjectiles() {
    for (const projectile of projectiles) {
      if (!projectile.__studio || !projectile.hits) continue;
      const spec = customWeapons[projectile.__studio]; if (!spec) continue;
      for (const target of projectile.hits) {
        if (!target || target === 'brk' || projectile.__studioApplied.has(target)) continue;
        projectile.__studioApplied.add(target);
        const frost = studioNum(spec, 'frostShot', 0, 0, 10000); if (frost && typeof wAddFrost === 'function') wAddFrost(target, frost);
        const burn = studioNum(spec, 'burnShot', 0, 0, 10000); if (burn && typeof wAddBurn === 'function') wAddBurn(target, studioNum(spec, 'burnDuration', 3, 0, 60), burn);
        const steal = studioNum(spec, 'lifeSteal', 0, 0, 100) / 100; if (steal && P && D) P.hp = Math.min(D.maxHp, P.hp + projectile.dmg * steal);
        const explosion = studioNum(spec, 'explosionRadius', 0, 0, 300);
        if (explosion) {
          for (const nearby of targets()) {
            if (!nearby || nearby === target || nearby.prop || nearby.alive === false || Math.hypot(nearby.x - target.x, nearby.y - target.y) > explosion) continue;
            nearby.hit({ dmg: projectile.dmg * studioNum(spec, 'explosionDamage', 0.6, 0, 20), poise: projectile.poise, dir: nearby.x > target.x ? 1 : -1, kind: 'spell', x: nearby.x, y: nearby.y - 12, big: true, fire: burn > 0 });
          }
          spawnFx(fxOr('flame_ring', 'shockwave'), target.x, target.y, 1, null, { bottom: true });
        }
        let chain = Math.round(studioNum(spec, 'chainTargets', 0, 0, 20)), from = target;
        const chained = new Set([target]);
        while (chain-- > 0) {
          let next = null, distance = studioNum(spec, 'chainRange', 120, 1, 1000);
          for (const candidate of targets()) {
            if (!candidate || candidate.prop || candidate.alive === false || chained.has(candidate)) continue;
            const d = Math.hypot(candidate.x - from.x, candidate.y - from.y); if (d < distance) { distance = d; next = candidate; }
          }
          if (!next) break;
          next.hit({ dmg: projectile.dmg * studioNum(spec, 'chainDamage', 0.5, 0, 20), poise: projectile.poise * 0.5, dir: next.x > from.x ? 1 : -1, kind: 'spell', x: next.x, y: next.y - 12 });
          if (typeof wBoltPath === 'function') wfx({ life: 0.2, pts: wBoltPath(from.x, from.y - 12, next.x, next.y - 12), draw() { wDrawBolt(this.pts, Math.max(0, 1 - this.t / this.life)); } });
          chained.add(next); from = next;
        }
      }
    }
  }

  function loadCustomWeapons() {
    for (const spec of Object.values(customWeapons)) {
      try { installCustomWeapon(spec, false); } catch (_) {}
    }
  }

  function editableCatalogs() {
    return {
      PLAYER: P, SAVE, SETTINGS,
      WEAPONS, ARTS, SPELLS, CHARMS, ENEMIES: ENEMY,
      BOSSES: BOSS_INFO,
      ITEMS,
    };
  }

  const CATALOG_EDITS_KEY = 'cinderhollow_studio_catalog_edits';
  let catalogEdits = {};
  try { catalogEdits = JSON.parse(localStorage.getItem(CATALOG_EDITS_KEY) || '{}') || {}; } catch (_) {}
  function saveCatalogEdits() {
    try { localStorage.setItem(CATALOG_EDITS_KEY, JSON.stringify(catalogEdits)); } catch (_) {}
  }
  function rememberCatalogRecord(name, key) {
    if (!key || !['WEAPONS','ARTS','SPELLS','CHARMS','ENEMIES','BOSSES','ITEMS'].includes(name)) return;
    const record = editableCatalogs()[name][key];
    if (!record || typeof record !== 'object') return;
    (catalogEdits[name] ||= {})[key] = JSON.parse(JSON.stringify(record));
    saveCatalogEdits();
  }
  function applyCatalogEdits() {
    const catalogs = editableCatalogs();
    for (const [name, records] of Object.entries(catalogEdits)) {
      const catalog = catalogs[name];
      if (!catalog || !records || typeof records !== 'object') continue;
      for (const [key, stored] of Object.entries(records)) {
        if (!catalog[key] || !stored || typeof stored !== 'object' || Array.isArray(stored)) continue;
        Object.assign(catalog[key], JSON.parse(JSON.stringify(stored)));
        if (name === 'WEAPONS' && ITEMS['w:' + key]) {
          ITEMS['w:' + key].name = catalog[key].name;
          ITEMS['w:' + key].desc = catalog[key].desc;
        }
      }
    }
    if (P && D) refreshDerived(false);
  }

  function safeJson(value) {
    const seen = new WeakSet();
    return JSON.stringify(value, (key, item) => {
      if (typeof item === 'function') return '[Function]';
      if (item && typeof item === 'object') { if (seen.has(item)) return '[Circular]'; seen.add(item); }
      return item;
    }, 2);
  }

  function applyCatalogJson(catalogName, itemKey, text) {
    const catalogs = editableCatalogs();
    const catalog = catalogs[catalogName];
    if (!catalog) throw new Error('Unknown catalog');
    const value = JSON.parse(text);
    if (itemKey) catalog[itemKey] = value;
    else {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Root value must be an object');
      for (const key of Object.keys(catalog)) delete catalog[key];
      Object.assign(catalog, value);
    }
    if (P && D) refreshDerived(false);
    saveSettings();
    saveGame();
    if (itemKey) rememberCatalogRecord(catalogName, itemKey);
  }

  loadCustomWeapons();
  applyCatalogEdits();

  function makeModUI() {
    const loadingBadge = document.getElementById('ch-op-loading'); if (loadingBadge) loadingBadge.remove();
    for (const id of ['ch-studio','ch-studio-launch','ch-studio-style']) { const old = document.getElementById(id); if (old) old.remove(); }
    const style = document.createElement('style');
    style.id = 'ch-studio-style';
    style.textContent = [
      '#ch-studio{--accent:#d4a85f;--accent2:#f2d59b;position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1040px,calc(100vw - 32px));height:min(720px,calc(100vh - 32px));z-index:2147483647;display:flex;flex-direction:column;color:#e7e9ec;background:#101318;border:1px solid #343941;border-radius:12px;box-shadow:0 28px 90px #000d;font:500 13px/1.4 Inter,Segoe UI,sans-serif;overflow:hidden;user-select:none}',
      '#ch-studio *{box-sizing:border-box}#ch-studio.ch-hidden{display:none}.cs-head{height:58px;display:flex;align-items:center;padding:0 18px;border-bottom:1px solid #2a2f36;background:#151920;cursor:move}.cs-mark{width:31px;height:31px;border:1px solid #8c744d;border-radius:7px;display:grid;place-items:center;color:var(--accent2);font:700 12px Georgia}.cs-brand{margin-left:11px}.cs-title{font-size:14px;font-weight:700;letter-spacing:.03em}.cs-version{font-size:10px;color:#7e8792}.cs-metrics{display:flex;gap:18px;margin-left:auto;margin-right:18px}.cs-metric span{display:block;color:#77818c;font-size:9px;text-transform:uppercase;letter-spacing:.1em}.cs-metric b{font-size:11px;color:#d9dde2}.cs-close{width:30px;height:30px;border:1px solid #353b44;border-radius:6px;background:#1b2027;color:#aeb5be;cursor:pointer}',
      '.cs-shell{display:grid;grid-template-columns:188px 1fr;min-height:0;flex:1}.cs-side{padding:14px 10px;border-right:1px solid #292e35;background:#12161b;overflow:auto}.cs-nav{width:100%;display:flex;align-items:center;gap:9px;padding:9px 11px;margin:2px 0;border:0;border-radius:6px;background:transparent;color:#8d96a1;text-align:left;cursor:pointer;font-size:12px}.cs-nav:hover{background:#1b2027;color:#d9dde2}.cs-nav.active{background:#242a32;color:#f0d7a8;box-shadow:inset 2px 0 var(--accent)}.cs-nav i{width:18px;color:#69737f;font-style:normal}.cs-side-note{margin:18px 10px 0;padding-top:13px;border-top:1px solid #282d34;color:#69727c;font-size:10px;line-height:1.6}',
      '.cs-main{min-width:0;min-height:0;overflow:auto;padding:22px 24px 30px;background:#0e1115}.cs-page{display:none}.cs-page.active{display:block}.cs-pagehead{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:18px}.cs-pagehead h2{margin:0;font-size:19px;font-weight:650}.cs-pagehead p{margin:3px 0 0;color:#78828d;font-size:11px}.cs-badge{padding:5px 8px;border:1px solid #3a4048;border-radius:5px;color:#9ca5af;font-size:9px;text-transform:uppercase;letter-spacing:.08em}',
      '.cs-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.cs-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.cs-card{padding:15px;border:1px solid #2c3239;border-radius:8px;background:#15191f}.cs-card.wide{grid-column:1/-1}.cs-card h3{margin:0 0 12px;color:#cdd2d8;font-size:11px;text-transform:uppercase;letter-spacing:.09em}.cs-card p.cs-help{margin:-6px 0 12px;color:#737d88;font-size:10px}',
      '.cs-toggle{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #242930}.cs-toggle:last-child{border:0}.cs-toggle>div{flex:1}.cs-toggle strong{display:block;font-size:12px;font-weight:600}.cs-toggle small{color:#737d88;font-size:10px}.cs-toggle input{appearance:none;width:34px;height:18px;border-radius:20px;background:#343a43;position:relative;cursor:pointer}.cs-toggle input:after{content:"";position:absolute;width:12px;height:12px;left:3px;top:3px;border-radius:50%;background:#9da5ae;transition:.16s}.cs-toggle input:checked{background:#8f7040}.cs-toggle input:checked:after{left:19px;background:#f5deb4}',
      '.cs-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.cs-btn{min-height:34px;padding:7px 10px;border:1px solid #343a43;border-radius:6px;background:#1b2027;color:#c9ced4;cursor:pointer;font:600 11px Inter,Segoe UI,sans-serif}.cs-btn:hover{border-color:#706044;background:#222831;color:#f1d9ac}.cs-btn.primary{background:#8a6a38;border-color:#a4834e;color:#fff4df}.cs-btn.danger{border-color:#694749;color:#e3b6b8}.cs-btn.wide{grid-column:1/-1}',
      '.cs-duel-readout{margin-top:8px;padding:9px;border:1px solid #323940;border-radius:6px;background:#10151b;color:#c8d0d7;font-size:11px;line-height:1.6}.cs-duel-readout b{color:#f0d29b}',
      '#ch-boss-stack{position:fixed;right:18px;top:60px;z-index:2147483645;width:min(280px,36vw);max-height:55vh;overflow:auto;padding:9px;border:1px solid #5f4540;border-radius:8px;background:#0c0b10e8;box-shadow:0 12px 32px #000b;color:#f2e5d5;font:600 11px Inter,Segoe UI,sans-serif}#ch-boss-stack.ch-hidden{display:none}.cs-boss-stack-title{padding:1px 3px 8px;color:#e8bd81;letter-spacing:.08em;text-transform:uppercase;font-size:10px}.cs-boss-hp-row{margin:0 2px 8px}.cs-boss-hp-name{display:flex;justify-content:space-between;gap:8px;margin-bottom:3px}.cs-boss-hp-name span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.cs-boss-hp-name span:last-child{flex:none;color:#b7a99a;font:10px Consolas,monospace}.cs-boss-hp-track{height:7px;border:1px solid #754d3f;background:#28171b;overflow:hidden}.cs-boss-hp-fill{height:100%;background:linear-gradient(90deg,#9f2937,#d15b48);transition:width .15s}.cs-boss-hp-row.dead{opacity:.43}',
      '.cs-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.cs-fields.four{grid-template-columns:repeat(4,minmax(0,1fr))}.cs-field{display:flex;flex-direction:column;gap:4px}.cs-field.full{grid-column:1/-1}.cs-field label{color:#7f8994;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.cs-input,.cs-select,.cs-textarea{width:100%;border:1px solid #343a43;border-radius:5px;background:#0e1217;color:#dce0e4;padding:8px 9px;font:500 12px Inter,Segoe UI,sans-serif;outline:none}.cs-input:focus,.cs-select:focus,.cs-textarea:focus{border-color:#8d754d;box-shadow:0 0 0 2px #8d754d22}.cs-textarea{min-height:300px;resize:vertical;font:11px/1.45 Consolas,monospace;user-select:text}.cs-range{width:100%;accent-color:#a98145}.cs-status{min-height:18px;margin-top:8px;color:#a8b0b8;font-size:10px}.cs-status.ok{color:#9fc49d}.cs-status.err{color:#e19a9e}',
      '.cs-setting-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.cs-setting{display:flex;align-items:center;gap:8px;padding:9px;border:1px solid #292f36;border-radius:6px;background:#12161b}.cs-setting label{flex:1;color:#aeb5bd;font-size:11px}.cs-setting input[type=number],.cs-setting input[type=text]{width:105px}.cs-tablebar{display:flex;gap:8px;margin-bottom:9px}.cs-tablebar>*{flex:1}.cs-kbd{display:inline-block;min-width:22px;padding:2px 5px;border:1px solid #3b4149;border-bottom-color:#59616b;border-radius:4px;background:#1b2027;color:#c9cfd5;text-align:center;font:600 10px Consolas}',
      '.cs-labbar{display:grid;grid-template-columns:170px minmax(130px,1fr) minmax(170px,1.4fr);gap:8px;margin-bottom:12px}.cs-lab-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 10px;color:#8e98a3;font-size:11px}.cs-lab-meta b{color:#e8d0a1}.cs-value-list{display:grid;gap:7px;max-height:350px;overflow:auto;padding-right:3px}.cs-value-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 12px;border:1px solid #2d343b;border-radius:7px;background:#131820}.cs-value-name{display:block;font-size:12px;font-weight:650;color:#e2e5e9}.cs-value-note{display:block;margin-top:2px;color:#89939e;font-size:10px}.cs-value-path{display:block;margin-top:3px;color:#63707d;font:10px Consolas,monospace}.cs-value-edit{display:flex;align-items:center;gap:5px}.cs-value-edit .cs-input{width:112px;text-align:right}.cs-value-edit .cs-input[type=text]{width:150px}.cs-mini{min-width:28px;height:29px;border:1px solid #39414a;border-radius:5px;background:#1c232b;color:#e8c98e;cursor:pointer}.cs-mini:hover{background:#303943}.cs-value-current{color:#e8c98e;font:650 12px Consolas,monospace}.cs-raw-details{margin-top:13px;border-top:1px solid #2c3239;padding-top:12px}.cs-raw-details summary{cursor:pointer;color:#aab4be;font-size:11px}.cs-raw-details .cs-textarea{margin-top:10px}.cs-empty{padding:18px;color:#8b96a0;text-align:center;border:1px dashed #343c45;border-radius:7px}',
      '#ch-studio-launch{position:fixed;right:18px;top:18px;z-index:2147483646;width:46px;height:34px;border:1px solid #706044;border-radius:7px;background:#171b21;color:#e6cca0;font:700 10px Inter,Segoe UI,sans-serif;letter-spacing:.08em;cursor:pointer;box-shadow:0 10px 30px #000b}#ch-studio-launch.ch-hidden{display:none}',
      '@media(max-width:760px){#ch-studio{width:calc(100vw - 12px);height:calc(100vh - 12px)}.cs-shell{grid-template-columns:140px 1fr}.cs-grid,.cs-grid.three,.cs-fields.four{grid-template-columns:1fr}.cs-metrics{display:none}}',
    ].join('');
    document.head.appendChild(style);

    const toggle = (id,title,note) => '<label class="cs-toggle"><div><strong>' + title + '</strong><small>' + note + '</small></div><input type="checkbox" data-toggle="' + id + '"></label>';
    const field = (name,label,value,type) => '<div class="cs-field"><label>' + label + '</label><input class="cs-input" name="' + name + '" type="' + (type || 'number') + '" ' + ((type || 'number') === 'number' ? 'step="any"' : '') + ' value="' + value + '"></div>';
    const statFields = ['vig','mnd','end','str','dex','fth'].map(key => field(key,key.toUpperCase(),SAVE.stats[key])).join('');
    const root = document.createElement('div'); root.id = 'ch-studio'; root.classList.toggle('ch-hidden', !modState.uiOpen);
    root.innerHTML = [
      '<header class="cs-head"><div class="cs-mark">CH</div><div class="cs-brand"><div class="cs-title">Cinderhollow Studio</div><div class="cs-version">Runtime Editor · V5 Arsenal</div></div><div class="cs-metrics"><div class="cs-metric"><span>Health</span><b data-live="hp">—</b></div><div class="cs-metric"><span>Focus</span><b data-live="fp">—</b></div><div class="cs-metric"><span>Stamina</span><b data-live="st">—</b></div><div class="cs-metric"><span>Ammo</span><b data-live="ammo">—</b></div><div class="cs-metric"><span>Cinders</span><b data-live="cash">—</b></div></div><button class="cs-close" title="Hide Studio">×</button></header>',
      '<div class="cs-shell"><aside class="cs-side">',
      '<button class="cs-nav active" data-page="quick"><i>01</i>Quick Controls</button><button class="cs-nav" data-page="player"><i>02</i>Player</button><button class="cs-nav" data-page="inventory"><i>03</i>Inventory</button><button class="cs-nav" data-page="combat"><i>04</i>Combat</button><button class="cs-nav" data-page="world"><i>05</i>World & Bosses</button><button class="cs-nav" data-page="gear"><i>06</i>Weapon Studio</button><button class="cs-nav" data-page="settings"><i>07</i>All Settings</button><button class="cs-nav" data-page="advanced"><i>08</i>Advanced Data</button><button class="cs-nav" data-page="recovery"><i>09</i>Recovery</button>',
      '<div class="cs-side-note"><span class="cs-kbd">F2</span> toggle panel<br><span class="cs-kbd">O</span> Omni arsenal<br><span class="cs-kbd">V</span> noclip</div></aside><main class="cs-main">',
      '<section class="cs-page active" data-page="quick"><div class="cs-pagehead"><div><h2>Quick Controls</h2><p>The familiar controls, kept simple and close at hand.</p></div><span class="cs-badge">Safe presets</span></div><div class="cs-grid">',
      '<div class="cs-card"><h3>Core</h3>' + toggle('god','God mode','Continuously restore health and status') + toggle('infst','Infinite stamina','Never exhaust stamina') + toggle('inffp','Infinite focus','Unlimited spells and arts') + toggle('nocd','No cooldowns','Abilities reset immediately') + toggle('infJump','Infinite air jumps','Jump and dash indefinitely') + '</div>',
      '<div class="cs-card"><h3>Movement & combat</h3>' + toggle('noclip','Noclip','Fly through terrain with V') + toggle('oneHit','One-hit mode','Reduce all hostiles to one HP') + toggle('shield','Projectile shield','Remove hostile projectiles and hazards') + toggle('freeze','Freeze enemies','Lock enemy movement and actions') + '</div>',
      '<div class="cs-card wide"><h3>Common actions</h3><div class="cs-actions"><button class="cs-btn" data-action="restore">Full restore</button><button class="cs-btn" data-action="currency">Max currency</button><button class="cs-btn" data-action="clear">Clear room</button><button class="cs-btn" data-action="respawn">Respawn room</button><button class="cs-btn" data-action="bosses">Defeat all bosses</button><button class="cs-btn" data-action="restoreBosses">Restore all bosses</button><button class="cs-btn" data-action="reveal">Reveal world</button><button class="cs-btn" data-action="save">Save now</button><button class="cs-btn primary wide" data-action="grant">Unlock and maximize everything</button></div></div></div></section>',
      '<section class="cs-page" data-page="player"><div class="cs-pagehead"><div><h2>Player Editor</h2><p>Edit core attributes and live resources directly.</p></div><span class="cs-badge">Immediate apply</span></div><div class="cs-grid"><div class="cs-card wide"><h3>Attributes</h3><div class="cs-fields four" data-stat-fields>' + statFields + '</div><div class="cs-status" data-status="player"></div></div><div class="cs-card"><h3>Live resources</h3><div class="cs-fields">' + field('hp','Current HP',P ? P.hp : 0) + field('fp','Current FP',P ? P.fp : 0) + field('st','Current stamina',P ? P.st : 0) + '</div></div><div class="cs-card"><h3>Mobility</h3>' + toggle('infJump','Infinite air jumps','Continuously refill aerial movement') + toggle('noclip','Noclip flight','Ignore collision and gravity') + '<div class="cs-field" style="margin-top:10px"><label>Flight speed</label><input class="cs-range" type="range" min="100" max="1500" step="25" data-range="noclipSpeed"><output data-output="noclipSpeed"></output></div></div><div class="cs-card wide"><h3>Camera field of view</h3><p class="cs-help">See more of the room while the HUD keeps its normal size. 100% is the game default; wider views use classic lighting. Zoom out as far as 5×.</p><div class="cs-field"><label>View width</label><input class="cs-range" type="range" min="100" max="500" step="10" data-range="fov"><output data-output="fov"></output></div></div></div></section>',
      '<section class="cs-page" data-page="inventory"><div class="cs-pagehead"><div><h2>Inventory & Progression</h2><p>Currency, flasks, materials, skills, spells, and equipment ownership.</p></div></div><div class="cs-grid"><div class="cs-card"><h3>Economy</h3><div class="cs-fields">' + field('cinders','Cinders',SAVE.cinders) + field('shards','Skill shards',SAVE.shards) + field('emberstone','Emberstone',SAVE.inv.emberstone || 0) + '</div></div><div class="cs-card"><h3>Flasks</h3><div class="cs-fields">' + field('flaskBase','Total charges',SAVE.flaskBase) + field('flaskBlue','Azure allocation',SAVE.flaskBlue) + field('flaskPot','Flask potency',SAVE.flaskPot) + '</div></div><div class="cs-card wide"><h3>Ownership</h3><div class="cs-actions"><button class="cs-btn" data-action="ownership">Safely unlock all gear, skills and charms</button><button class="cs-btn" data-action="currency">Max currencies and materials</button><button class="cs-btn" data-action="save">Commit inventory to save</button><button class="cs-btn" data-action="fireworks">Preview reward effect</button></div><p class="cs-help" style="margin-top:10px">Preserves the equipped loadout and follows the game’s mutually exclusive skill-tree rules.</p></div></div></section>',
      '<section class="cs-page" data-page="combat"><div class="cs-pagehead"><div><h2>Combat Systems</h2><p>Damage, AI control, defensive automation, and arsenal behavior.</p></div></div><div class="cs-grid"><div class="cs-card"><h3>Damage model</h3><div class="cs-field"><label>Global weapon base power</label><input class="cs-range" type="range" min="1" max="100000" step="100" data-range="weaponPower"><output data-output="weaponPower"></output></div>' + toggle('oneHit','One-hit hostiles','Set enemies and bosses to one HP') + toggle('killAura','Kill aura','Defeat nearby targets automatically') + '</div><div class="cs-card"><h3>AI & projectiles</h3>' + toggle('freeze','Freeze all AI','Stops enemies and active bosses') + toggle('vacuum','Enemy vacuum','Pull enemies toward the player') + toggle('shield','Projectile shield','Remove enemy shots and hazards') + '</div><div class="cs-card wide"><h3>Arsenal automation</h3>' + toggle('randomArsenal','Random arsenal','Cycle random weapons and arts') + toggle('storm','Cinder aura','Persistent ambient particle field') + '<div class="cs-actions" style="margin-top:10px"><button class="cs-btn" data-action="fireworks">Cinderfall effect</button><button class="cs-btn" data-action="clear">Clear active combat</button></div></div></div></section>',
      '<section class="cs-page" data-page="world"><div class="cs-pagehead"><div><h2>World & Bosses</h2><p>Control encounter state, exploration, rooms, and progression.</p></div></div><div class="cs-grid"><div class="cs-card"><h3>Boss state</h3><div class="cs-actions"><button class="cs-btn" data-action="bosses">Mark every boss defeated</button><button class="cs-btn danger" data-action="restoreBosses">Restore every boss</button></div><p class="cs-help" style="margin-top:10px">Restored bosses respawn when their arena is re-entered. The current room is rebuilt immediately.</p></div><div class="cs-card"><h3>Exploration</h3><div class="cs-actions"><button class="cs-btn" data-action="reveal">Reveal map and shrines</button><button class="cs-btn" data-action="shrine">Return to active shrine</button><button class="cs-btn" data-action="respawn">Rebuild current room</button><button class="cs-btn" data-action="clear">Clear current room</button></div></div><div class="cs-card wide"><h3>Boss Arena</h3><p class="cs-help">Add as many arena bosses as you like. You can hit every one of them. In Brawl, they attack each other and you; in Hunt, they all chase you. Their attack loop is simplified to keep multiple bosses stable, and arena defeats do not change story progress. Turn off God mode if you want their hits to hurt you.</p><div class="cs-fields"><div class="cs-field"><label>Boss to add</label><select class="cs-select" data-boss-first></select></div><div class="cs-field"><label>Count per click</label><input class="cs-input" type="number" min="1" max="50" step="1" value="1" data-boss-count></div><div class="cs-field"><label>Fight mode</label><select class="cs-select" data-boss-mode><option value="brawl">Brawl · bosses and player</option><option value="hunt">Hunt · all versus player</option></select></div><div class="cs-field"><label>Second boss for quick clash</label><select class="cs-select" data-boss-second></select></div></div><div class="cs-fields" style="margin-top:12px"><div class="cs-field"><label>Fight speed</label><input class="cs-range" type="range" min="25" max="300" step="25" data-range="bossFightSpeed"><output data-output="bossFightSpeed"></output></div><div class="cs-field"><label>Camera</label><select class="cs-select" data-boss-camera><option value="player">Follow player</option><option value="arena">Follow boss fight</option></select></div></div><div class="cs-actions" style="margin-top:10px"><button class="cs-btn primary" data-boss-action="spawn">Add selected bosses</button><button class="cs-btn" data-boss-action="clash">Start two-boss clash</button><button class="cs-btn" data-boss-action="tournament">Start 8-boss tournament</button><button class="cs-btn" data-boss-action="stop">Clear arena bosses</button></div><div class="cs-status" data-boss-status></div><div class="cs-duel-readout" data-boss-readout>No arena bosses spawned.</div></div><div class="cs-card wide"><h3>World save</h3><div class="cs-actions"><button class="cs-btn primary" data-action="save">Save all current changes</button><button class="cs-btn" data-action="restore">Restore player resources</button></div></div></div></section>',
      '<section class="cs-page" data-page="gear"><div class="cs-pagehead"><div><h2>Professional Weapon Lab</h2><p>Author melee weapons, firearms, shotguns, launchers, and arcane guns with native combat integration.</p></div><span class="cs-badge">Persistent runtime weapons</span></div><form id="cs-weapon-form"><div class="cs-grid"><div class="cs-card wide"><h3>Identity & architecture</h3><div class="cs-fields four"><div class="cs-field"><label>Internal ID</label><input class="cs-input" name="id" value="studio_ember_rifle"></div><div class="cs-field"><label>Display name</label><input class="cs-input" name="name" value="Emberline Rifle"></div><div class="cs-field"><label>Weapon architecture</label><select class="cs-select" name="mode"><option value="melee">Melee only</option><option value="handgun">Handgun</option><option value="rifle" selected>Automatic rifle</option><option value="shotgun">Shotgun</option><option value="launcher">Launcher</option><option value="arcane">Arcane focus</option></select></div><div class="cs-field"><label>Base animation template</label><select class="cs-select" name="template" data-weapon-template></select></div><div class="cs-field"><label>Weapon art</label><select class="cs-select" name="art" data-art-template></select></div><div class="cs-field full"><label>Description</label><input class="cs-input" name="desc" value="A precision firearm authored in Cinderhollow Studio."></div></div></div>',
      '<div class="cs-card"><h3>Melee chassis</h3><div class="cs-fields">' + field('base','Base damage',120) + field('speed','Attack animation speed',1.8) + field('reach','Melee reach',1) + field('stam','Stamina cost',0.2) + field('poise','Melee poise',2) + '</div></div><div class="cs-card"><h3>Elemental melee profile</h3><div class="cs-fields">' + field('fire','Fire multiplier',0) + field('holy','Holy multiplier',0) + field('frost','Frost buildup',0) + field('bleed','Bleed buildup',0) + '</div></div>',
      '<div class="cs-card wide"><h3>Fire control & aiming</h3><div class="cs-fields four"><div class="cs-field"><label>Aim system</label><select class="cs-select" name="aimMode"><option value="directional">Keyboard directional</option><option value="cursor">Mouse cursor</option><option value="nearest">Auto-aim nearest</option><option value="facing">Facing direction</option></select></div><div class="cs-field"><label>Fire trigger</label><select class="cs-select" name="fireTrigger"><option value="light">Basic attack</option><option value="heavy">Heavy attack</option><option value="both">Both attacks</option></select></div><div class="cs-field"><label>Projectile visual</label><select class="cs-select" name="projectileVisual"><option value="ashbolt">Ember round</option><option value="sunspear">Sun spear</option><option value="shard">Arcane shard</option><option value="lance">Blue lance</option><option value="crescent">Blade wave</option><option value="arrow">Physical round</option></select></div><label class="cs-toggle"><div><strong>Full automatic</strong><small>Hold basic attack to keep firing</small></div><input type="checkbox" name="fullAuto" checked></label></div><div class="cs-fields four" style="margin-top:12px">' + field('fireRate','Rounds per second',8) + field('magSize','Magazine size',30) + field('reloadTime','Reload time (seconds)',1.2) + field('shotDamage','Shot damage multiplier',1.4) + field('critChance','Critical chance %',10) + field('critMultiplier','Critical multiplier',2) + field('recoil','Recoil force',25) + field('screenShake','Screen shake',2) + '</div></div>',
      '<div class="cs-card"><h3>Projectile ballistics</h3><div class="cs-fields">' + field('projectileSpeed','Velocity',520) + field('range','Range',900) + field('projectileRadius','Hit radius',4) + field('shotPoise','Impact poise',24) + field('gravity','Gravity',0) + field('homing','Homing strength',0) + field('muzzleX','Muzzle forward offset',18) + field('muzzleY','Muzzle vertical offset',-18) + '</div><label class="cs-toggle"><div><strong>Piercing rounds</strong><small>Pass through multiple targets</small></div><input type="checkbox" name="pierce"></label></div>',
      '<div class="cs-card"><h3>Volley & spread</h3><div class="cs-fields">' + field('projectileCount','Pellets per shot',1) + field('spread','Spread degrees',2) + field('burstCount','Burst rounds',1) + field('burstDelay','Burst interval',0.08) + '</div><p class="cs-help" style="margin-top:10px">For a shotgun use 8–16 pellets and 20–45° spread. For a burst rifle use 3 burst rounds.</p></div>',
      '<div class="cs-card"><h3>Status payload</h3><div class="cs-fields">' + field('frostShot','Frost per hit',0) + field('burnShot','Burn DPS',0) + field('burnDuration','Burn duration',3) + field('lifeSteal','Life steal %',0) + '</div></div>',
      '<div class="cs-card"><h3>Advanced payload</h3><div class="cs-fields">' + field('explosionRadius','Explosion radius',0) + field('explosionDamage','Explosion multiplier',0.6) + field('chainTargets','Chain targets',0) + field('chainRange','Chain range',120) + field('chainDamage','Chain multiplier',0.5) + '</div></div>',
      '<div class="cs-card wide"><h3>Scaling & authoring</h3><div class="cs-fields four"><div class="cs-field"><label>Strength</label><select class="cs-select" name="str"><option>S</option><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option><option>-</option></select></div><div class="cs-field"><label>Dexterity</label><select class="cs-select" name="dex"><option>S</option><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option><option>-</option></select></div><div class="cs-field"><label>Faith</label><select class="cs-select" name="fth"><option>S</option><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option><option>-</option></select></div><button class="cs-btn primary" type="submit">Build, save, and equip</button></div><div class="cs-status" data-status="weapon"></div></div>',
      '<div class="cs-card wide"><h3>Saved custom weapons</h3><div class="cs-tablebar"><select class="cs-select" data-custom-weapon-list></select><button class="cs-btn" type="button" data-weapon-action="load">Load into editor</button><button class="cs-btn" type="button" data-weapon-action="equip">Equip selected</button><button class="cs-btn danger" type="button" data-weapon-action="delete">Delete selected</button></div><div class="cs-status" data-status="weaponManager"></div></div></div></form></section>',
      '<section class="cs-page" data-page="settings"><div class="cs-pagehead"><div><h2>All Game Settings</h2><p>Automatically generated from every primitive value currently exposed by SETTINGS.</p></div><span class="cs-badge" data-setting-count></span></div><div class="cs-card"><div class="cs-setting-list" data-settings-list></div></div></section>',
      '<section class="cs-page" data-page="advanced"><div class="cs-pagehead"><div><h2>Value Lab</h2><p>Find values by their game names. Edit live, saved, and balance values in one place.</p></div><span class="cs-badge">Live editor</span></div><div class="cs-card"><div class="cs-labbar"><select class="cs-select" data-catalog aria-label="Value group"></select><select class="cs-select" data-catalog-item aria-label="Record"></select><input class="cs-input" data-catalog-search placeholder="Search names, effects, or keys…" aria-label="Search values"></div><div class="cs-lab-meta"><b data-lab-count>0 values</b><span>Changes apply immediately. Enter a number or use − / +.</span><button class="cs-btn" data-editor="undo" type="button" style="margin-left:auto">Undo last edit</button></div><div class="cs-value-list" data-value-list></div><div class="cs-status" data-status="value"></div><details class="cs-raw-details"><summary>Raw JSON editor · complex values</summary><textarea class="cs-textarea" data-json spellcheck="false"></textarea><div class="cs-actions" style="margin-top:9px"><button class="cs-btn" data-editor="reload">Reload selected data</button><button class="cs-btn primary" data-editor="apply">Apply JSON</button></div><div class="cs-status" data-status="editor">Select a record to inspect its JSON.</div></details></div></section>',
      '<section class="cs-page" data-page="recovery"><div class="cs-pagehead"><div><h2>Recovery & Replay</h2><p>Fix input or loadout problems and return the game to a replayable state.</p></div><span class="cs-badge">Progress-safe options</span></div><div class="cs-grid"><div class="cs-card"><h3>Input & loadout</h3><div class="cs-actions"><button class="cs-btn primary" data-action="focusGame">Return focus to game</button><button class="cs-btn" data-action="resetLoadout">Unequip all extras</button><button class="cs-btn wide" data-action="repairAttack">Repair attack and skill tree</button></div><p class="cs-help" style="margin-top:10px">Attack repair removes invalid mutually exclusive skill combinations. Loadout reset keeps the required starter longsword while unequipping spells and charms.</p></div><div class="cs-card"><h3>Restore normal play</h3><div class="cs-actions"><button class="cs-btn" data-action="restoreWeapons">Restore weapon values</button><button class="cs-btn primary" data-action="normalPlay">Disable mods, keep save</button><button class="cs-btn" data-action="enableRuntime">Re-enable Studio runtime</button><button class="cs-btn" data-action="restoreBosses">Restore every boss</button></div><p class="cs-help" style="margin-top:10px">Normal play disables runtime effects, restores original settings and weapons, and resets the equipped loadout without deleting progress.</p></div><div class="cs-card wide"><h3>Fresh start</h3><p class="cs-help">Replaces game progress after confirmation, but keeps the Studio runtime and cheat controls enabled. The automatic unlock preset stays off so the new journey remains fresh.</p><div class="cs-actions"><button class="cs-btn danger wide" data-action="cleanReplay">Start completely clean replay</button></div></div></div></section>',
      '</main></div>',
    ].join('');
    document.body.appendChild(root);
    const launcher = document.createElement('button'); launcher.id = 'ch-studio-launch'; launcher.textContent = 'STUDIO'; launcher.classList.toggle('ch-hidden', modState.uiOpen); document.body.appendChild(launcher);
    const bossHud = document.createElement('div'); bossHud.id = 'ch-boss-stack'; bossHud.className = 'ch-hidden'; bossHud.setAttribute('aria-label', 'Boss health bars'); document.body.appendChild(bossHud);
    const bossHudRows = new Map();
    const bossHudTitle = document.createElement('div'); bossHudTitle.className = 'cs-boss-stack-title'; bossHud.appendChild(bossHudTitle);
    setInterval(() => {
      const all = studioBossRoom === (room && room.id) ? studioBosses.slice() : [];
      if (all.length && boss && boss.active && !boss.__studioExhibition) all.unshift(boss);
      bossHud.classList.toggle('ch-hidden', !all.length);
      if (!all.length) { for (const row of bossHudRows.values()) row.remove(); bossHudRows.clear(); return; }
      bossHudTitle.textContent = all.length + (all.length === 1 ? ' boss' : ' bosses') + ' · ' + (studioBossMode === 'brawl' ? 'Brawl' : 'Hunt');
      const seen = new Set();
      for (const fighter of all) {
        const key = fighter.__studioSerial || 'native'; seen.add(key);
        let row = bossHudRows.get(key);
        if (!row) {
          row = document.createElement('div'); row.className = 'cs-boss-hp-row';
          const label = document.createElement('div'); label.className = 'cs-boss-hp-name';
          const name = document.createElement('span'), hp = document.createElement('span'); label.append(name, hp);
          const track = document.createElement('div'); track.className = 'cs-boss-hp-track';
          const fill = document.createElement('div'); fill.className = 'cs-boss-hp-fill'; track.appendChild(fill); row.append(label, track); bossHudRows.set(key, row); bossHud.appendChild(row);
        }
        row.classList.toggle('dead', !fighter.alive);
        row.children[0].children[0].textContent = fighter.name;
        row.children[0].children[1].textContent = Math.ceil(fighter.hp) + '/' + Math.ceil(fighter.maxHp);
        row.children[1].firstChild.style.width = (100 * Math.max(0, fighter.hp) / Math.max(1, fighter.maxHp)).toFixed(1) + '%';
      }
      for (const [key, row] of bossHudRows) if (!seen.has(key)) { row.remove(); bossHudRows.delete(key); }
    }, 200);
    root.addEventListener('pointerdown', e => e.stopPropagation()); root.addEventListener('click', e => e.stopPropagation()); root.addEventListener('keydown', e => { if (e.code !== 'F2' && e.code !== 'Backquote') e.stopPropagation(); });
    const toggleUI = force => { modState.uiOpen = force === undefined ? !modState.uiOpen : !!force; root.classList.toggle('ch-hidden', !modState.uiOpen); launcher.classList.toggle('ch-hidden', modState.uiOpen); saveModState(); if (!modState.uiOpen) setTimeout(() => { try { grabFocus(); view.focus({ preventScroll: true }); } catch (_) {} }, 0); };
    launcher.addEventListener('click', e => { e.stopPropagation(); toggleUI(true); }); root.querySelector('.cs-close').addEventListener('click', () => toggleUI(false));
    addEventListener('keydown', e => { if (e.code !== 'F2' && e.code !== 'Backquote') return; e.preventDefault(); e.stopImmediatePropagation(); toggleUI(); }, true);
    root.querySelectorAll('.cs-nav').forEach(button => button.addEventListener('click', () => { root.querySelectorAll('.cs-nav').forEach(x => x.classList.toggle('active', x === button)); root.querySelectorAll('.cs-page').forEach(x => x.classList.toggle('active', x.dataset.page === button.dataset.page)); }));

    root.querySelectorAll('[data-toggle]').forEach(input => { const key = input.dataset.toggle; input.checked = key in SETTINGS ? !!SETTINGS[key] : !!modState[key]; input.addEventListener('change', () => { if (key in SETTINGS) { SETTINGS[key] = input.checked ? 1 : 0; saveSettings(); } else { modState[key] = input.checked; saveModState(); } }); });
    root.querySelectorAll('[data-range]').forEach(input => { const key = input.dataset.range; input.value = modState[key]; const out = root.querySelector('[data-output="' + key + '"]'); const apply = () => { modState[key] = Number(input.value); if (out) out.textContent = Number(input.value).toLocaleString() + (key === 'fov' || key === 'bossFightSpeed' ? '%' : ''); if (key === 'fov') window.__CINDERHOLLOW_FOV__ = modState.fov; if (key === 'weaponPower' && modState.masterEnabled) setWeaponPower(input.value); else saveModState(); }; input.addEventListener('input', apply); apply(); });
    root.querySelectorAll('[data-stat-fields] input').forEach(input => input.addEventListener('change', () => { SAVE.stats[input.name] = Number(input.value) || 0; refreshDerived(false); saveGame(); }));
    root.querySelectorAll('[data-page="player"] input[name=hp],[data-page="player"] input[name=fp],[data-page="player"] input[name=st]').forEach(input => input.addEventListener('change', () => { if (P) P[input.name] = Number(input.value) || 0; }));
    root.querySelectorAll('[data-page="inventory"] input').forEach(input => input.addEventListener('change', () => { const value = Number(input.value) || 0; if (input.name === 'emberstone') SAVE.inv.emberstone = value; else SAVE[input.name] = value; saveGame(); }));

    const firstBossSelect = root.querySelector('[data-boss-first]');
    const secondBossSelect = root.querySelector('[data-boss-second]');
    const bossCountInput = root.querySelector('[data-boss-count]');
    const bossModeSelect = root.querySelector('[data-boss-mode]');
    const bossCameraSelect = root.querySelector('[data-boss-camera]');
    bossCameraSelect.value = modState.bossCamera;
    bossCameraSelect.addEventListener('change', () => { modState.bossCamera = bossCameraSelect.value; saveModState(); });
    for (const kind of exhibitionKinds) {
      if (!BOSS_INFO[kind]) continue;
      for (const select of [firstBossSelect, secondBossSelect]) {
        const option = document.createElement('option'); option.value = kind; option.textContent = BOSS_INFO[kind].name; select.appendChild(option);
      }
    }
    secondBossSelect.value = 'omen';
    root.querySelectorAll('[data-boss-action]').forEach(button => button.addEventListener('click', () => {
      const status = root.querySelector('[data-boss-status]');
      try {
        if (button.dataset.bossAction === 'spawn') spawnStudioBoss(firstBossSelect.value, bossCountInput.value, bossModeSelect.value);
        else if (button.dataset.bossAction === 'clash') startBossClash(firstBossSelect.value, secondBossSelect.value, bossModeSelect.value);
        else if (button.dataset.bossAction === 'tournament') startBossTournament();
        else stopBossExhibition();
        status.className = 'cs-status ok';
        status.textContent = button.dataset.bossAction === 'stop' ? 'Arena bosses cleared.' : 'Bosses spawned. Close Studio to join the fight.';
      } catch (error) { status.className = 'cs-status err'; status.textContent = error.message; }
    }));
    setInterval(() => {
      const out = root.querySelector('[data-boss-readout]');
      const alive = studioBosses.filter(f => f.alive).length;
      out.textContent = studioBosses.length ? alive + ' alive / ' + studioBosses.length + ' spawned · ' + (studioTournament ? 'Tournament round ' + studioTournament.round + ' of 3' : studioBossMode === 'brawl' ? 'Bosses and player brawl' : 'All bosses hunt player') : 'No arena bosses spawned.';
    }, 300);

    root.querySelectorAll('[data-action]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); const action = button.dataset.action; if (action === 'restore' && P) { P.hp = D.maxHp; P.fp = D.maxFp; P.st = D.maxSt; refillFlasks(); toast('Fully restored'); } if (action === 'clear') { stopBossExhibition(); enemies.length = 0; hazards = []; projectiles = projectiles.filter(p => p.owner === 'player'); toast('Room cleared'); } if (action === 'respawn') respawnCurrentRoom(); if (action === 'bosses') { defeatAllBosses(true); saveGame(); } if (action === 'restoreBosses') restoreAllBosses(true); if (action === 'reveal') revealWorld(); if (action === 'currency') { SAVE.cinders = 999999999; SAVE.inv.emberstone = 9999; SAVE.shards = 9999; toast('Economy maximized'); } if (action === 'grant') grantEverything(true); if (action === 'ownership') unlockOwnershipSafely(true); if (action === 'repairAttack') unlockOwnershipSafely(true); if (action === 'fireworks') fireworks(); if (action === 'save') { saveGame(); toast('Changes saved'); } if (action === 'shrine' && P) { stopBossExhibition(); respawnAtShrine(SAVE.shrine || (SAVE.shrines[0] || 'R1')); toast('Returned to shrine'); } if (action === 'focusGame') toggleUI(false); if (action === 'resetLoadout') resetLoadout(true); if (action === 'restoreWeapons') restoreWeaponValues(true); if (action === 'normalPlay') restoreNormalGameplay(true); if (action === 'enableRuntime') enableStudioRuntime(); if (action === 'cleanReplay') startCleanReplay(); }));

    const templateSelect = root.querySelector('[data-weapon-template]'), artSelect = root.querySelector('[data-art-template]');
    templateSelect.innerHTML = Object.keys(WEAPONS).filter(id => !id.startsWith('studio_')).map(id => '<option value="' + id + '">' + WEAPONS[id].name + '</option>').join('');
    artSelect.innerHTML = Object.keys(ARTS).map(id => '<option value="' + id + '">' + (ARTS[id].name || id) + '</option>').join('');
    const weaponForm = root.querySelector('#cs-weapon-form'), customWeaponList = root.querySelector('[data-custom-weapon-list]');
    function renderCustomWeaponList(selected) {
      const ids = Object.keys(customWeapons);
      customWeaponList.innerHTML = ids.length ? ids.map(id => '<option value="' + id + '">' + (WEAPONS[id] && WEAPONS[id].name || id) + ' — ' + (customWeapons[id].mode || 'melee') + '</option>').join('') : '<option value="">No custom weapons saved</option>';
      if (selected && ids.includes(selected)) customWeaponList.value = selected;
    }
    function loadWeaponIntoForm(id) {
      const spec = customWeapons[id]; if (!spec) return;
      for (const [key, value] of Object.entries(spec)) {
        const input = weaponForm.elements.namedItem(key); if (!input) continue;
        if (input.type === 'checkbox') input.checked = studioBool(spec, key); else input.value = value;
      }
      const status = root.querySelector('[data-status=weaponManager]'); status.className = 'cs-status ok'; status.textContent = 'Loaded ' + (WEAPONS[id] && WEAPONS[id].name || id) + ' into the editor.';
    }
    weaponForm.addEventListener('submit', event => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries()); const status = root.querySelector('[data-status=weapon]'); try { const id = installCustomWeapon(data, true); renderCustomWeaponList(id); status.className = 'cs-status ok'; status.textContent = 'Built, saved, and equipped: ' + WEAPONS[id].name + ' (' + id + '). Basic attack now uses the configured firing system.'; } catch (error) { status.className = 'cs-status err'; status.textContent = error.message; } });
    weaponForm.querySelector('[name=mode]').addEventListener('change', event => {
      const presets = {
        handgun: { fullAuto:false, fireRate:3, magSize:10, projectileCount:1, spread:2, shotDamage:2 },
        rifle: { fullAuto:true, fireRate:9, magSize:30, projectileCount:1, spread:3, shotDamage:1.2 },
        shotgun: { fullAuto:false, fireRate:1.4, magSize:6, projectileCount:10, spread:34, shotDamage:0.55 },
        launcher: { fullAuto:false, fireRate:0.8, magSize:4, projectileCount:1, spread:0, shotDamage:4, projectileSpeed:260, explosionRadius:70 },
        arcane: { fullAuto:false, fireRate:2.5, magSize:20, projectileCount:3, spread:12, shotDamage:1.1, homing:5, projectileVisual:'shard' },
      };
      const preset = presets[event.target.value]; if (!preset) return;
      for (const [key, value] of Object.entries(preset)) { const input = weaponForm.elements.namedItem(key); if (!input) continue; if (input.type === 'checkbox') input.checked = value; else input.value = value; }
    });
    root.querySelectorAll('[data-weapon-action]').forEach(button => button.addEventListener('click', () => {
      const id = customWeaponList.value, action = button.dataset.weaponAction, status = root.querySelector('[data-status=weaponManager]');
      if (!id || !customWeapons[id]) { status.className = 'cs-status err'; status.textContent = 'No saved custom weapon selected.'; return; }
      if (action === 'load') loadWeaponIntoForm(id);
      if (action === 'equip') { SAVE.weapon = id; SAVE.art = WEAPONS[id].art; refreshDerived(false); saveGame(); status.className = 'cs-status ok'; status.textContent = 'Equipped ' + WEAPONS[id].name + '.'; }
      if (action === 'delete' && confirm('Delete custom weapon ' + (WEAPONS[id].name || id) + '?')) { delete customWeapons[id]; delete studioGunState[id]; delete SIGS[id]; if (catalogEdits.WEAPONS) { delete catalogEdits.WEAPONS[id]; saveCatalogEdits(); } saveCustomWeapons(); if (SAVE.weapon === id) resetLoadout(false); delete WEAPONS[id]; delete ITEMS['w:' + id]; renderCustomWeaponList(); status.className = 'cs-status ok'; status.textContent = 'Deleted custom weapon.'; }
    }));
    renderCustomWeaponList();

    const settingsList = root.querySelector('[data-settings-list]');
    function renderSettings() { settingsList.innerHTML = Object.entries(SETTINGS).filter(pair => ['number','string','boolean'].includes(typeof pair[1])).map(pair => { const key = pair[0], value = pair[1]; if (typeof value === 'boolean' || value === 0 || value === 1) return '<div class="cs-setting"><label>' + key + '</label><input type="checkbox" data-setting="' + key + '" ' + (value ? 'checked' : '') + '></div>'; return '<div class="cs-setting"><label>' + key + '</label><input class="cs-input" type="' + (typeof value === 'number' ? 'number' : 'text') + '" data-setting="' + key + '" value="' + value + '"></div>'; }).join(''); root.querySelector('[data-setting-count]').textContent = Object.keys(SETTINGS).length + ' values'; settingsList.querySelectorAll('[data-setting]').forEach(input => input.addEventListener('change', () => { const key = input.dataset.setting; SETTINGS[key] = input.type === 'checkbox' ? (input.checked ? 1 : 0) : (typeof SETTINGS[key] === 'number' ? Number(input.value) : input.value); saveSettings(); })); }
    renderSettings();

    const catalogSelect = root.querySelector('[data-catalog]'), catalogItem = root.querySelector('[data-catalog-item]'), catalogSearch = root.querySelector('[data-catalog-search]'), jsonArea = root.querySelector('[data-json]'), editorStatus = root.querySelector('[data-status=editor]');
    const valueList = root.querySelector('[data-value-list]'), valueStatus = root.querySelector('[data-status=value]');
    const catalogNames = { PLAYER:'Live player', SAVE:'Save & progress', SETTINGS:'Game settings', WEAPONS:'Weapons', ARTS:'Weapon arts', SPELLS:'Spells', CHARMS:'Charms', ENEMIES:'Enemy types', BOSSES:'Bosses', ITEMS:'Items' };
    const valueNames = { hp:'Health', maxHp:'Maximum health', fp:'Focus', maxFp:'Maximum focus', st:'Stamina', maxSt:'Maximum stamina', x:'Horizontal position', y:'Vertical position', vx:'Horizontal velocity', vy:'Vertical velocity', inv:'Inventory', airJumps:'Air jumps', cinders:'Cinders', shards:'Skill shards', emberstone:'Emberstone', deaths:'Deaths', playTime:'Play time', ngp:'New Game+ level', flaskBase:'Flask charges', flaskBlue:'Azure flask charges', flaskPot:'Flask strength', spellSlots:'Spell slots', charmSlots:'Charm slots', vig:'Vigor', mnd:'Mind', end:'Endurance', str:'Strength', dex:'Dexterity', fth:'Faith', music:'Music volume', sfx:'Sound effects volume', shake:'Screen shake', numbers:'Damage numbers', god:'God mode', infst:'Infinite stamina', inffp:'Infinite focus', nocd:'No cooldowns', noclip:'Noclip', base:'Base damage', speed:'Speed multiplier', reach:'Reach multiplier', stam:'Stamina cost multiplier', poise:'Poise damage', stance:'Stance threshold', sc:'Stat scaling', fire:'Fire damage bonus', holy:'Holy damage bonus', frost:'Frost buildup', bleed:'Bleed buildup', armor:'Armor during attacks', art:'Weapon art', desc:'Description', name:'Display name', dmg:'Attack damage', cool:'Attack cooldown', aggro:'Detection distance', range:'Attack range', contact:'Contact damage', reward:'Rewards' };
    const valueNotes = { hp:'Current resource; changes as you play.', fp:'Spent on spells and weapon arts.', st:'Spent on movement and attacks.', x:'World coordinate; changing it moves the player.', y:'World coordinate; changing it moves the player.', base:'Starting weapon damage before scaling and upgrades.', speed:'Higher means faster attacks.', reach:'Higher means longer attack range.', stam:'Higher means greater stamina cost.', poise:'Higher means more stagger pressure.', cinders:'Currency kept in the save.', shards:'Points available for skills.', flaskBlue:'Azure charges are part of total flask charges.', music:'0 is muted; 1 is full volume.', sfx:'0 is muted; 1 is full volume.', cool:'Time between enemy attacks in seconds.' };
    const togglePaths = new Set(['SETTINGS.god','SETTINGS.infst','SETTINGS.inffp','SETTINGS.nocd','SETTINGS.noclip','SETTINGS.numbers','WEAPONS.armor','WEAPONS.boss','WEAPONS.rot','ENEMIES.guard','ENEMIES.flying','ENEMIES.elite','ENEMIES.suicide','ENEMIES.blink']);
    const playerPaths = ['hp','fp','st','x','y','vx','vy','airJumps','inv'];
    const valueHistory = [];
    const titleCase = key => String(key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_:-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
    const friendlyName = path => path.map(part => valueNames[part] || titleCase(part)).join(' · ');
    const pathKey = path => path.join('.');
    const currentTarget = () => { const catalog = editableCatalogs()[catalogSelect.value]; return catalogItem.disabled ? catalog : catalog && catalog[catalogItem.value]; };
    const getPath = (obj, path) => path.reduce((part, key) => part == null ? undefined : part[key], obj);
    function collectValues(obj, path, out, depth) {
      if (!obj || depth > 3) return;
      for (const key of Object.keys(obj)) {
        if (catalogSelect.value === 'PLAYER' && !playerPaths.includes(key)) continue;
        const value = obj[key], next = path.concat(key);
        if (value === null || value === undefined || Array.isArray(value) || typeof value === 'function') continue;
        if (typeof value === 'object') collectValues(value, next, out, depth + 1);
        else if (['number','string','boolean'].includes(typeof value)) out.push({ path:next, value });
      }
    }
    function setValueAt(catalogName, recordKey, path, value, remember) {
      const catalog = editableCatalogs()[catalogName], target = recordKey ? catalog && catalog[recordKey] : catalog;
      if (!target) throw new Error('This game object is not available yet.');
      const parent = getPath(target, path.slice(0, -1)), key = path[path.length - 1];
      if (!parent || !(key in parent)) throw new Error('This value no longer exists. Reload the record.');
      const old = parent[key];
      if (remember) valueHistory.push({ catalogName, recordKey, path:path.slice(), old });
      parent[key] = value;
      if (catalogName === 'SETTINGS') saveSettings();
      if (catalogName === 'SAVE') saveGame();
      if (recordKey) rememberCatalogRecord(catalogName, recordKey);
      if (catalogName !== 'PLAYER' && P && D) refreshDerived(false);
      if (catalogName === 'WEAPONS' && recordKey && ITEMS['w:' + recordKey]) { ITEMS['w:' + recordKey].name = WEAPONS[recordKey].name; ITEMS['w:' + recordKey].desc = WEAPONS[recordKey].desc; }
    }
    function renderValues() {
      valueList.replaceChildren();
      const target = currentTarget(), rows = [];
      collectValues(target, [], rows, 0);
      const query = catalogSearch.value.trim().toLowerCase();
      const found = rows.filter(row => (friendlyName(row.path) + ' ' + pathKey(row.path) + ' ' + (valueNotes[row.path.at(-1)] || '')).toLowerCase().includes(query));
      root.querySelector('[data-lab-count]').textContent = found.length + ' of ' + rows.length + ' values';
      if (!found.length) { const empty = document.createElement('div'); empty.className = 'cs-empty'; empty.textContent = target ? 'No matching editable values. Use Raw JSON for arrays and complex objects.' : 'Start or load a game to edit live player values.'; valueList.appendChild(empty); return; }
      for (const row of found) {
        const key = row.path.at(-1), wrap = document.createElement('div'); wrap.className = 'cs-value-row'; wrap.dataset.path = JSON.stringify(row.path);
        const info = document.createElement('div'), name = document.createElement('strong'), note = document.createElement('small'), code = document.createElement('code');
        name.className = 'cs-value-name'; name.textContent = friendlyName(row.path);
        note.className = 'cs-value-note'; note.textContent = valueNotes[key] || (typeof row.value === 'string' ? 'Text value' : 'Live value');
        code.className = 'cs-value-path'; code.textContent = (catalogItem.disabled ? catalogSelect.value : catalogSelect.value + '.' + catalogItem.value) + '.' + pathKey(row.path);
        info.append(name, note, code);
        const edit = document.createElement('div'); edit.className = 'cs-value-edit';
        const toggle = typeof row.value === 'boolean' || togglePaths.has(catalogSelect.value + '.' + key);
        if (toggle) { const input = document.createElement('input'); input.type = 'checkbox'; input.checked = !!row.value; input.dataset.valueInput = 'toggle'; input.setAttribute('aria-label', friendlyName(row.path)); edit.appendChild(input); }
        else { const input = document.createElement('input'); input.className = 'cs-input'; input.type = typeof row.value === 'number' ? 'number' : 'text'; input.value = row.value; input.dataset.valueInput = 'plain'; input.setAttribute('aria-label', friendlyName(row.path)); if (input.type === 'number') { input.step = Number.isInteger(row.value) ? '1' : '0.1'; const down = document.createElement('button'); down.type = 'button'; down.className = 'cs-mini'; down.textContent = '−'; down.dataset.nudge = '-1'; edit.appendChild(down); edit.appendChild(input); const up = document.createElement('button'); up.type = 'button'; up.className = 'cs-mini'; up.textContent = '+'; up.dataset.nudge = '1'; edit.appendChild(up); } else edit.appendChild(input); }
        wrap.append(info, edit); valueList.appendChild(wrap);
      }
    }
    function loadJson() { const target = currentTarget(); jsonArea.value = catalogSelect.value === 'PLAYER' ? 'Live player values are edited in the table above.' : safeJson(target); jsonArea.disabled = catalogSelect.value === 'PLAYER'; root.querySelector('[data-editor=apply]').disabled = catalogSelect.value === 'PLAYER'; }
    function loadCatalog(keepRecord) {
      const name = catalogSelect.value, catalog = editableCatalogs()[name], single = ['PLAYER','SAVE','SETTINGS'].includes(name), previous = keepRecord ? catalogItem.value : '';
      catalogItem.replaceChildren(); catalogItem.disabled = single;
      if (single) catalogItem.add(new Option(name === 'PLAYER' ? 'Current character' : 'All values', ''));
      else for (const key of Object.keys(catalog || {})) catalogItem.add(new Option((catalog[key] && catalog[key].name ? catalog[key].name : titleCase(key)) + '  ·  ' + key, key));
      if (previous && catalog && catalog[previous]) catalogItem.value = previous;
      renderValues(); loadJson();
    }
    for (const [id, label] of Object.entries(catalogNames)) catalogSelect.add(new Option(label, id));
    catalogSelect.value = 'SAVE';
    catalogSelect.addEventListener('change', () => loadCatalog(false));
    catalogItem.addEventListener('change', () => { renderValues(); loadJson(); });
    catalogSearch.addEventListener('input', renderValues);
    valueList.addEventListener('click', event => { const button = event.target.closest('[data-nudge]'); if (!button) return; const row = button.closest('[data-path]'), input = row.querySelector('[data-value-input]'); input.value = String((Number(input.value) || 0) + Number(button.dataset.nudge) * Number(input.step || 1)); input.dispatchEvent(new Event('change', { bubbles:true })); });
    valueList.addEventListener('change', event => { const input = event.target.closest('[data-value-input]'); if (!input) return; const row = input.closest('[data-path]'), path = JSON.parse(row.dataset.path), old = getPath(currentTarget(), path); try { let value = input.type === 'checkbox' ? (typeof old === 'number' ? (input.checked ? 1 : 0) : input.checked) : input.type === 'number' ? Number(input.value) : input.value; if (input.type === 'number' && (input.value.trim() === '' || !Number.isFinite(value))) throw new Error('Enter a valid number.'); setValueAt(catalogSelect.value, catalogItem.disabled ? '' : catalogItem.value, path, value, true); valueStatus.className = 'cs-status ok'; valueStatus.textContent = friendlyName(path) + ' updated. Undo is available.'; loadJson(); if (catalogSelect.value === 'SETTINGS') renderSettings(); } catch (error) { input.value = old; valueStatus.className = 'cs-status err'; valueStatus.textContent = error.message; } });
    root.querySelector('[data-editor=undo]').addEventListener('click', () => { const edit = valueHistory.pop(); if (!edit) { valueStatus.className = 'cs-status'; valueStatus.textContent = 'No edits to undo.'; return; } try { setValueAt(edit.catalogName, edit.recordKey, edit.path, edit.old, false); valueStatus.className = 'cs-status ok'; valueStatus.textContent = 'Restored ' + friendlyName(edit.path) + '.'; renderValues(); loadJson(); } catch (error) { valueStatus.className = 'cs-status err'; valueStatus.textContent = error.message; } });
    root.querySelector('[data-editor=reload]').addEventListener('click', () => { renderValues(); loadJson(); });
    root.querySelector('[data-editor=apply]').addEventListener('click', () => { try { applyCatalogJson(catalogSelect.value, catalogItem.disabled ? '' : catalogItem.value, jsonArea.value); editorStatus.className = 'cs-status ok'; editorStatus.textContent = 'Applied successfully. Derived stats and save refreshed.'; renderSettings(); loadCatalog(true); } catch (error) { editorStatus.className = 'cs-status err'; editorStatus.textContent = error.message; } });
    loadCatalog(false);
    setInterval(() => { if (!root.querySelector('[data-page="advanced"].active')) return; const target = currentTarget(); if (!target) { if (catalogSelect.value === 'PLAYER') renderValues(); return; } for (const row of valueList.querySelectorAll('[data-path]')) { const input = row.querySelector('[data-value-input]'); if (!input || document.activeElement === input) continue; const value = getPath(target, JSON.parse(row.dataset.path)); if (value === undefined) continue; if (input.type === 'checkbox') input.checked = !!value; else if (input.value !== String(value)) input.value = value; } }, 350);

    let drag = null; const head = root.querySelector('.cs-head'); head.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; const box = root.getBoundingClientRect(); drag = { x:e.clientX-box.left, y:e.clientY-box.top }; root.style.transform = 'none'; root.style.left = box.left + 'px'; root.style.top = box.top + 'px'; head.setPointerCapture(e.pointerId); }); head.addEventListener('pointermove', e => { if (!drag) return; root.style.left = Math.max(0,Math.min(innerWidth-root.offsetWidth,e.clientX-drag.x)) + 'px'; root.style.top = Math.max(0,Math.min(innerHeight-50,e.clientY-drag.y)) + 'px'; }); head.addEventListener('pointerup', () => { drag = null; });
    setInterval(() => { const gun = studioGunState[SAVE && SAVE.weapon], spec = customWeapons[SAVE && SAVE.weapon]; const values = { hp:P&&D?Math.round(P.hp).toLocaleString():'—', fp:P&&D?Math.round(P.fp).toLocaleString():'—', st:P&&D?Math.round(P.st).toLocaleString():'—', ammo:gun&&spec?(gun.ammo + ' / ' + studioNum(spec,'magSize',12,1,9999)):'—', cash:SAVE?Number(SAVE.cinders||0).toLocaleString():'—' }; for (const pair of Object.entries(values)) { const cell = root.querySelector('[data-live="' + pair[0] + '"]'); if (cell) cell.textContent = pair[1]; } root.querySelectorAll('[data-toggle]').forEach(input => { const key=input.dataset.toggle; input.checked=key in SETTINGS?!!SETTINGS[key]:!!modState[key]; }); },250);
  }

  let runtimeSetupDone = false;
  HOOKS.update.push(dt => {
    if (!P || !D) return;
    if (!runtimeSetupDone) {
      runtimeSetupDone = true;
      if (modState.masterEnabled) {
        if (modState.autoGrant) grantEverything(false);
        applyCatalogEdits();
        toast('CINDERHOLLOW STUDIO V5 ARSENAL READY · F2 opens the editor', 6);
      } else toast('Studio loaded in normal-play mode · F2 opens Recovery', 5);
    }
    if (!modState.masterEnabled) return;
    updateStudioProjectiles();
    dt = Number(dt) || 1 / 60;
    if (SETTINGS.god) { P.hp = D.maxHp; P.rot = P.rotT = 0; }
    if (SETTINGS.inffp) P.fp = D.maxFp;
    if (SETTINGS.infst) P.st = D.maxSt;
    SAVE.cinders = Math.max(SAVE.cinders, 999999999);
    SAVE.inv.emberstone = Math.max(SAVE.inv.emberstone || 0, 9999);

    if (modState.infJump) {
      P.airJumps = 9999;
      P.airDash = true;
      P.airLock = false;
      P.airN = 0;
      P.airCd = 0;
    }

    if (modState.shield) {
      hazards = [];
      projectiles = projectiles.filter(p => p.owner === 'player');
    }

    if (modState.freeze) {
      for (const enemy of enemies) { enemy.vx = enemy.vy = 0; enemy.stun = Math.max(enemy.stun || 0, 0.2); }
      if (boss && boss.alive) { boss.vx = boss.vy = 0; boss.stun = Math.max(boss.stun || 0, 0.2); }
    }
    if (modState.oneHit) {
      for (const enemy of enemies) if (enemy.alive) enemy.hp = Math.min(enemy.hp, 1);
      if (boss && boss.alive) boss.hp = Math.min(boss.hp, 1);
      for (const fighter of studioBosses) if (fighter.alive) fighter.hp = Math.min(fighter.hp, 1);
    }
    if (modState.vacuum) {
      for (const enemy of enemies) if (enemy.alive) {
        enemy.x += (P.x - enemy.x) * Math.min(1, 3.5 * dt);
        enemy.y += (P.y - enemy.y) * Math.min(1, 2.5 * dt);
      }
    }
    if (modState.killAura) {
      for (const enemy of enemies) if (enemy.alive && Math.hypot(enemy.x - P.x, enemy.y - P.y) < 260) killThroughGame(enemy);
      if (boss && boss.alive && Math.hypot(boss.x - P.x, boss.y - P.y) < 320) killThroughGame(boss);
      for (const fighter of studioBosses) if (fighter.alive && Math.hypot(fighter.x - P.x, fighter.y - P.y) < 320) killThroughGame(fighter);
    }
    if (modState.randomArsenal && time >= modState.randomAt) {
      const weapons = Object.keys(WEAPONS), arts = Object.keys(ARTS);
      if (weapons.length) SAVE.weapon = weapons[Math.floor(Math.random() * weapons.length)];
      if (arts.length) SAVE.art = arts[Math.floor(Math.random() * arts.length)];
      refreshDerived(false);
      modState.randomAt = time + 0.8;
    }
    if (modState.storm && time >= modState.stormAt) {
      for (let i = 0; i < 4; i++) particles.push({ x: P.x + rand(-35, 35), y: P.y - rand(0, 55), vx: rand(-35, 35), vy: -rand(20, 90), g: -10, life: rand(0.4, 1.1), kind: i % 3 ? 'ember' : 'gold' });
      modState.stormAt = time + 0.08;
    }
  });

  makeModUI();
  applyCatalogEdits();
  console.info('[Cinderhollow Studio V5 Arsenal] Installed. F2 = editor, O = Omni, V = noclip.');
})();/* CH_OP_END */
`;

  html = html.slice(0, startupFunctionEnd) + mod + html.slice(startupFunctionEnd);
  const loadingUi = '<div id="ch-op-loading" style="position:fixed;right:18px;top:18px;z-index:2147483647;padding:12px 15px;border:1px solid #48505a;border-radius:8px;background:#11151beF;color:#d9bd8a;box-shadow:0 14px 35px #0009;font:650 11px Segoe UI,sans-serif;letter-spacing:.04em">CINDERHOLLOW STUDIO · LOADING</div>';
  const shiftedAssetLoader = html.indexOf('<script>(() => { const SZ =');
  html = html.slice(0, shiftedAssetLoader) + loadingUi + html.slice(shiftedAssetLoader);
  const frame = document.createElement('iframe');
  frame.id = 'cinderhollow-op-frame';
  frame.setAttribute('allow', 'autoplay; fullscreen');
  frame.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;background:#050408;z-index:2147483647';
  frame.srcdoc = html;
  document.documentElement.style.cssText = 'margin:0;width:100%;height:100%;overflow:hidden;background:#050408';
  document.body.style.cssText = 'margin:0;width:100%;height:100%;overflow:hidden;background:#050408';
  document.body.replaceChildren(frame);
  frame.addEventListener('load', () => {
    try { frame.contentWindow.focus(); } catch (_) {}
  }, { once: true });
})().catch(error => {
  console.error('[Cinderhollow OP]', error);
  alert(`Cinderhollow OP loader failed: ${error.message}`);
});
