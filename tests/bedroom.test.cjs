const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const source = ['rooms.js', 'outside.js', 'game.js'].map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n');
const styles = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const markup = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('approved background masters remain byte-for-byte unchanged', () => {
  const assetDirectory = path.join(__dirname, '..', 'assets');
  const manifest = JSON.parse(fs.readFileSync(path.join(assetDirectory, 'background-masters.json'), 'utf8'));
  for (const [file, expectedHash] of Object.entries(manifest)) {
    const bytes = fs.readFileSync(path.join(assetDirectory, file));
    const actualHash = crypto.createHash('sha256').update(bytes).digest('hex');
    assert.equal(actualHash, expectedHash, `${file} was overwritten; create a derived asset instead of editing the master`);
    assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG', `${file} must remain a PNG`);
    assert.equal(bytes.readUInt32BE(16), 1672, `${file} width changed`);
    assert.equal(bytes.readUInt32BE(20), 941, `${file} height changed`);
  }
});

function game(storage = new Map()) {
  const elements = new Map(); let frame = null, time = 0;
  function element() {
    return { style: { setProperty(k, v) { this[k] = v; } }, dataset: {}, attributes: {}, events: {}, children: [],
      classList: { values: new Set(), add(c) { this.values.add(c); }, remove(c) { this.values.delete(c); }, contains(c) { return this.values.has(c); }, toggle(c, on) { on ? this.values.add(c) : this.values.delete(c); } },
      setAttribute(k, v) { this.attributes[k] = v; }, appendChild(el) { this.children.push(el); }, replaceChildren() { this.children = []; },
      addEventListener(k, cb) { this.events[k] = cb; }, querySelector() { return this.child ||= element(); },
      clientWidth: 1000, clientHeight: 562.5, offsetWidth: 240
    };
  }
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  const verbs = ['walk', 'look', 'open', 'close', 'use'].map(verb => { const el = element(); el.dataset.verb = verb; return el; });
  const context = vm.createContext({ document: { getElementById: get, querySelectorAll: () => verbs, createElement: element },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    setTimeout: () => 1, clearTimeout() {}, requestAnimationFrame: cb => { frame = cb; return 1; }, cancelAnimationFrame: () => { frame = null; } });
  vm.runInContext(source, context);
  return { get, storage, run: code => vm.runInContext(code, context),
    tick(dt = 1000 / 60) { time += dt; const cb = frame; frame = null; if (cb) cb(time); },
    finish() { let limit = 3000; while (frame && limit-- > 0) this.tick(); assert.ok(limit > 0, 'walk must arrive'); }
  };
}
test('new launches always start in the dark bedroom, even with a saved open-curtain state', () => {
  const g = game(); g.run('setCurtains(true); saveGame();');
  const fresh = game(g.storage);
  assert.equal(fresh.run('gameState.curtainsOpen'), false);
  assert.ok(fresh.get('scene').classList.contains('curtains-closed'));
  assert.equal(fresh.get('curtainToggle').textContent, 'Open curtains');
  assert.equal(fresh.run('movement.facing'), 'down');
  assert.equal(fresh.get('hotspots').children.length, 14);
});
test('bedroom lighting uses complete pre-rendered states without runtime masks', () => {
  assert.match(markup, /id="scene"[^>]*class="curtains-closed"[^>]*data-room="bedroom"/);
  assert.match(source, /function roomImageForState/);
  assert.doesNotMatch(markup, /room-dimmer|lighting-effects|light-effect|lamp-halo|lamp-constant/);
  assert.doesNotMatch(styles, /#room-dimmer|\.light-effect|mix-blend-mode/);
  assert.doesNotMatch(styles, /#room-art\s*\{[^}]*(?:filter|transition)/);
  const g = game();
  assert.equal(g.get('scene').dataset.room, 'bedroom');
  assert.match(g.get('scene').style['--room-image'], /bedroom-c0-l1-m0\.png/);
  g.run('showRoom("living"); showRoom("bedroom");');
  assert.match(g.get('scene').style['--room-image'], /bedroom-c0-l1-m0\.png/);
  g.run('setCurtains(true);');
  assert.equal(g.get('scene').classList.contains('curtains-open'), true);
  assert.match(g.get('scene').style['--room-image'], /bedroom-c1-l1-m0\.png/);
});

test('independent light circuits select the matching complete background', () => {
  const g = game();
  g.run('interact("mainLightSwitch","use")');
  assert.equal(g.run('gameState.bedroomMainLightOn'), true);
  assert.match(g.get('scene').style['--room-image'], /bedroom-c0-l1-m1\.png/);

  g.run('showRoom("living")');
  for (const [target, key] of [
    ['mainLightSwitch', 'livingMainLightOn'],
    ['kitchenLightSwitch', 'kitchenLightsOn'],
    ['hallwayLightSwitch', 'hallwayLightOn']
  ]) {
    g.run(`interact('${target}','use')`);
    assert.equal(g.run(`gameState.${key}`), true);
  }
  assert.match(g.get('scene').style['--room-image'], /living-c0-m1-b1-h1\.png/);
  assert.equal(g.run('Object.hasOwn(gameState,"livingLampOn")'), false);
  assert.equal(g.run('Object.hasOwn(apartmentRooms.living.objects,"floorLamp")'), false);

  g.run('showRoom("bathroom"); interact("mainLightSwitch","use")');
  assert.equal(g.run('gameState.bathroomMainLightOn'), true);
  assert.match(g.get('scene').style['--room-image'], /bathroom-c0-m1\.png/);
});

test('light switches rapidly update room, fixture and character illumination', () => {
  assert.match(source, /const FAST_LIGHT_TRANSITION_MS = 220/);
  assert.match(source, /syncRoom\(\{ fastLight: true \}\)/);
  assert.match(styles, /#scene\.light-switching \.room-background-layer,[\s\S]*?transition-duration:\s*\.22s/);
  assert.match(styles, /#scene\.light-switching \.curtain-panel[^}]*transition-duration:\s*1\.4s, \.22s/);
  assert.match(styles, /#scene\.light-switching \.sprite[^}]*transition-duration:\s*\.20s, \.08s/);

  const g = game();
  g.get('room-background-a').classList.add('is-visible');
  g.run('toggleLight("bedroomMain")');
  assert.ok(g.get('scene').classList.contains('light-switching'));
  assert.equal(g.run('gameState.bedroomMainLightOn'), true);
  assert.ok(g.get('room-background-a').classList.contains('is-visible'));
  assert.ok(g.get('room-background-b').classList.contains('is-visible'));
  assert.match(source, /setLayerVisibilityImmediately\(current, false\)/);
});

test('living room represents all 16 curtain and three-circuit combinations', () => {
  const g = game(); g.run('showRoom("living")');
  const images = new Set();
  for (let bits = 0; bits < 16; bits++) {
    g.run(`Object.assign(gameState,{livingCurtainsOpen:${!!(bits&1)},livingMainLightOn:${!!(bits&2)},kitchenLightsOn:${!!(bits&4)},hallwayLightOn:${!!(bits&8)}});syncRoom()`);
    images.add(g.get('scene').style['--room-image']);
    assert.match(g.get('scene').style['--room-image'], /assets\/lighting\/hard-states-v7\/living-c[01]-m[01]-b[01]-h[01]\.png/);
  }
  assert.equal(images.size, 16);
  assert.doesNotMatch(markup, /lighting-effects|light-effect/);
});

test('bathroom off-screen curtains change daylight and the mirror reflection without fabric animation', () => {
  const g = game(); g.run('showRoom("bathroom")');
  assert.equal(g.run('gameState.bathroomCurtainsOpen'), false);
  assert.match(g.get('scene').style['--room-image'], /bathroom-c0-m0\.png/);
  g.run('setVerb("walk");updateStatus("bathroomCurtains")');
  assert.equal(g.get('statusText').textContent, 'Open bathroom curtains');
  g.run('handleTarget("bathroomCurtains")'); g.finish();
  assert.equal(g.run('gameState.bathroomCurtainsOpen'), true);
  assert.ok(g.get('scene').classList.contains('curtains-open'));
  assert.equal(g.run('movement.frame'), null);
  assert.doesNotMatch(markup, /id="bathroom-window-reflection"/);
  assert.match(g.get('scene').style['--room-image'], /bathroom-c1-m0\.png/);
});

test('lighting state is saved, loaded and reset with backwards-compatible defaults', () => {
  const g = game();
  g.run('Object.assign(gameState,{bedroomMainLightOn:true,livingCurtainsOpen:true,livingMainLightOn:true,kitchenLightsOn:true,hallwayLightOn:true,bathroomCurtainsOpen:true,bathroomMainLightOn:true});saveGame()');
  const saved = JSON.parse(g.storage.get('theCracksBedroomSave'));
  assert.equal(saved.version, 5);
  g.run('Object.assign(gameState,{bedroomMainLightOn:false,livingCurtainsOpen:false,livingMainLightOn:false,kitchenLightsOn:false,hallwayLightOn:false,bathroomCurtainsOpen:false,bathroomMainLightOn:false});loadGame()');
  for (const key of ['bedroomMainLightOn','livingCurtainsOpen','livingMainLightOn','kitchenLightsOn','hallwayLightOn','bathroomCurtainsOpen','bathroomMainLightOn']) assert.equal(g.run(`gameState.${key}`), true);
  g.run('resetGame()');
  for (const key of ['bedroomMainLightOn','livingCurtainsOpen','livingMainLightOn','kitchenLightsOn','hallwayLightOn','bathroomCurtainsOpen','bathroomMainLightOn']) assert.equal(g.run(`gameState.${key}`), false);
});

test('all 28 pre-rendered lighting states are native-size PNGs with verified hashes', () => {
  const directory = path.join(__dirname, '..', 'assets', 'lighting', 'hard-states-v7');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  assert.equal(Object.keys(manifest.files).length, 28);
  for (const [file, expectedHash] of Object.entries(manifest.files)) {
    const bytes = fs.readFileSync(path.join(directory, file));
    assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
    assert.equal(bytes.readUInt32BE(16), 1672);
    assert.equal(bytes.readUInt32BE(20), 941);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), expectedHash);
  }
  assert.doesNotMatch(markup, /switch-sprite|room-fixtures/);
});

test('living circuits share one fixed high-detail master and deterministic lighting fields', () => {
  const lightingDirectory = path.join(__dirname, '..', 'assets', 'lighting');
  const sourceDirectory = path.join(__dirname, '..', 'assets', 'lighting', 'living-source-states-v2');
  const sourceFiles = fs.readdirSync(sourceDirectory).filter(file => file.endsWith('.png')).sort();
  assert.deepEqual(sourceFiles, ['living-m0-b0-h0.png','living-m0-b0-h1.png','living-m0-b1-h0.png','living-m0-b1-h1.png','living-m1-b0-h0.png','living-m1-b0-h1.png','living-m1-b1-h0.png','living-m1-b1-h1.png']);
  for (const file of sourceFiles) {
    const bytes = fs.readFileSync(path.join(sourceDirectory, file));
    assert.equal(bytes.readUInt32BE(16), 1672);
    assert.equal(bytes.readUInt32BE(20), 941);
  }
  const builder = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-lighting-states.ps1'), 'utf8');
  const sourceBuilder = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-living-v2-sources.ps1'), 'utf8');
  const master = fs.readFileSync(path.join(lightingDirectory, 'living-master-v2.png'));
  assert.equal(master.readUInt32BE(16), 1672);
  assert.equal(master.readUInt32BE(20), 941);
  assert.equal(fs.existsSync(path.join(lightingDirectory, 'living-floor-lamp.png')), false);
  for (const oldVersion of ['hard-states-v3','hard-states-v4','hard-states-v5','hard-states-v6']) {
    assert.equal(fs.existsSync(path.join(lightingDirectory, oldVersion)), false);
  }
  assert.match(builder, /\$livingSources\s*=\s*@\{/);
  assert.match(sourceBuilder, /Relight\(\$master, \$fields\)/);
  assert.match(sourceBuilder, /living-master-v2\.png/);
  assert.doesNotMatch(sourceBuilder, /living-floor-lamp/);
  assert.doesNotMatch(builder, /switchSprite|\$switch|kitchenReflectionSurface|hallwayInterior|benchFixtures|hallwayFixture/);
  assert.doesNotMatch(builder, /livingLamp|living-floor-lamp|room == "living"\) DrawPercent/);
});

test('all lights advertise their current action and toggle immediately on click', () => {
  const g = game();
  for (const [room, target, state, label] of [
    ['bedroom', 'lamp', 'lampOn', 'lamp'],
    ['bedroom', 'mainLightSwitch', 'bedroomMainLightOn', 'bedroom light'],
    ['living', 'mainLightSwitch', 'livingMainLightOn', 'living room light'],
    ['living', 'kitchenLightSwitch', 'kitchenLightsOn', 'bench lights'],
    ['living', 'hallwayLightSwitch', 'hallwayLightOn', 'hallway light'],
    ['bathroom', 'mainLightSwitch', 'bathroomMainLightOn', 'bathroom light']
  ]) {
    g.run(`showRoom('${room}');setVerb('look');`);
    const wasOn = g.run(`gameState.${state}`);
    g.run(`updateStatus('${target}')`);
    assert.equal(g.get('statusText').textContent, `Turn ${wasOn ? 'off' : 'on'} ${label}`);
    g.run(`handleTarget('${target}')`);
    assert.equal(g.run(`gameState.${state}`), !wasOn);
    assert.equal(g.run('movement.destination'), null);
    assert.equal(g.get('statusText').textContent, `Turn ${wasOn ? 'on' : 'off'} ${label}`);
  }
});

test('bedroom lamp and main circuits use four complete paintings with no fixture or switch overlays', () => {
  const sourceDirectory = path.join(__dirname, '..', 'assets', 'lighting', 'bedroom-source-states');
  const sourceFiles = fs.readdirSync(sourceDirectory).filter(file => file.endsWith('.png')).sort();
  assert.deepEqual(sourceFiles, ['bedroom-l0-m0.png', 'bedroom-l0-m1.png', 'bedroom-l1-m0.png', 'bedroom-l1-m1.png']);
  for (const file of sourceFiles) {
    const bytes = fs.readFileSync(path.join(sourceDirectory, file));
    assert.equal(bytes.readUInt32BE(16), 1672);
    assert.equal(bytes.readUInt32BE(20), 941);
  }
  const builder = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-lighting-states.ps1'), 'utf8');
  assert.match(builder, /\$bedroomSources\s*=\s*@\{/);
  assert.doesNotMatch(builder, /bedroomFixture/);
  assert.match(builder, /\$bedroomStool\s*=.*bedroom-stool\.png/);
  assert.match(builder, /room == "bedroom"\) DrawPercent\(graphics, fixture/);
  assert.match(source, /area: \[69\.6, 28\.5, 2\.5, 7\]/);
});

test('bathroom light uses two complete paintings with no circular mask or switch overlay', () => {
  const sourceDirectory = path.join(__dirname, '..', 'assets', 'lighting', 'bathroom-source-states');
  const sourceFiles = fs.readdirSync(sourceDirectory).filter(file => file.endsWith('.png')).sort();
  assert.deepEqual(sourceFiles, ['bathroom-m0.png', 'bathroom-m1.png']);
  for (const file of sourceFiles) {
    const bytes = fs.readFileSync(path.join(sourceDirectory, file));
    assert.equal(bytes.readUInt32BE(16), 1672);
    assert.equal(bytes.readUInt32BE(20), 941);
  }
  const builder = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-lighting-states.ps1'), 'utf8');
  assert.match(builder, /\$bathroomSources\s*=\s*@\{/);
  assert.doesNotMatch(builder, /Ellipse\(|fixtureCore|bakedGlow|fixtureSilhouette|double repair|double emitter/);
  assert.doesNotMatch(builder, /room == "bathroom"\) DrawPercent/);
  assert.match(source, /bathroom light switch', \[37\.4,35,2,6\.5\]/);
});

test('room backgrounds remain visible until the next state is decoded', () => {
  assert.match(source, /function preloadRoomImage/);
  assert.match(source, /await image\.decode\(\)/);
  assert.match(source, /function applyRoomImage/);
  assert.match(source, /loaded\.every\(Boolean\) && roomImageForState\(\) === path/);
  assert.match(source, /warmAdjacentRoomImages\(gameState\.currentRoom\)/);
  assert.match(markup, /id="room-background-a"[^>]*is-visible/);
  assert.match(markup, /id="room-background-b"/);
  assert.match(source, /function commitRoomImage/);
  assert.match(source, /syncRoom\(\{ immediate: true \}\)/);
  assert.match(styles, /\.room-background-layer[^}]*transition:\s*opacity 1\.4s/);
});

test('the toaster is a persistent state-matched prop over clean living-room plates', () => {
  const patchDirectory = path.join(__dirname, '..', 'assets', 'lighting', 'toaster-clean-patches-v2');
  const patchFiles = fs.readdirSync(patchDirectory).filter(file => file.endsWith('.png')).sort();
  assert.deepEqual(patchFiles, ['living-m0-b0-h0.png','living-m0-b0-h1.png','living-m0-b1-h0.png','living-m0-b1-h1.png','living-m1-b0-h0.png','living-m1-b0-h1.png','living-m1-b1-h0.png','living-m1-b1-h1.png']);
  for (const file of patchFiles) {
    const bytes = fs.readFileSync(path.join(patchDirectory, file));
    assert.equal(bytes.readUInt32BE(16), 82);
    assert.equal(bytes.readUInt32BE(20), 82);
  }

  const toasterDirectory = path.join(__dirname, '..', 'assets', 'lighting', 'toaster-states-v2');
  const toasterFiles = fs.readdirSync(toasterDirectory).filter(file => file.endsWith('.png')).sort();
  assert.equal(toasterFiles.length, 16);
  for (const file of toasterFiles) {
    const bytes = fs.readFileSync(path.join(toasterDirectory, file));
    assert.equal(bytes.readUInt32BE(16), 82);
    assert.equal(bytes.readUInt32BE(20), 82);
  }

  const builder = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-lighting-states.ps1'), 'utf8');
  assert.match(builder, /PreparePatched\([^\n]+742, 276, 4\)/);
  assert.match(builder, /Crop\(\$originalRendered, 742, 276, 82, 82\)/);
  assert.match(markup, /id="living-toaster-a"[^>]*is-visible/);
  assert.match(markup, /id="living-toaster-b"/);
  assert.match(styles, /\.toaster-state-layer[^}]*transition:\s*opacity 1\.4s/);

  const g = game();
  g.run('showRoom("living");setVerb("use");updateStatus("toaster")');
  assert.equal(g.get('statusText').textContent, 'Pick up toaster');
  g.run('handleTarget("toaster")'); g.finish();
  assert.equal(g.run('gameState.toasterTaken'), true);
  assert.ok(g.get('living-toaster').classList.contains('is-taken'));
  assert.equal(g.get('statusText').textContent, 'Put back toaster');
  g.run('saveGame();gameState.toasterTaken=false;loadGame()');
  assert.equal(g.run('gameState.toasterTaken'), true);
  g.run('resetGame()');
  assert.equal(g.run('gameState.toasterTaken'), false);
});
test('bedroom curtain fabric follows room lighting with the same smooth transition', () => {
  const g = game();
  assert.equal(g.get('scene').style['--curtain-light'], .82);
  g.run('gameState.lampOn=false;syncRoom()');
  assert.equal(g.get('scene').style['--curtain-light'], .55);
  g.run('gameState.bedroomMainLightOn=true;syncRoom()');
  assert.equal(g.get('scene').style['--curtain-light'], 1.04);
  g.run('gameState.bedroomMainLightOn=false;setCurtains(true)');
  assert.equal(g.get('scene').style['--curtain-light'], .9);
  assert.match(styles, /filter:\s*brightness\(var\(--curtain-light/);
  assert.match(styles, /filter 1\.4s/);
});
test('curtains open, close, and reverse without delayed stale state', () => {
  const g = game();
  for (const open of [true, false, true, false]) {
    g.run(`setCurtains(${open});`);
    assert.equal(g.get('scene').classList.contains('curtains-open'), open);
    assert.equal(g.get('scene').classList.contains('curtains-closed'), !open);
    assert.equal(g.get('curtainToggle').attributes['aria-expanded'], String(open));
  }
});
test('curtain control acts on arrival and a new walk cancels the pending action', () => {
  const g = game(); g.get('curtainToggle').events.click();
  assert.equal(g.run('gameState.curtainsOpen'), false);
  g.run('movePlayerTo(55,90);'); g.finish();
  assert.equal(g.run('gameState.curtainsOpen'), false);
  g.get('curtainToggle').events.click(); g.finish();
  assert.equal(g.run('gameState.curtainsOpen'), true);
});
test('only movement inside the 30-degree vertical cones uses front/back', () => {
  const g = game();
  assert.equal(g.run('movementFacing(0,10)'), 'down');
  assert.equal(g.run('movementFacing(0,-10)'), 'up');
  assert.equal(g.run('movementFacing(5,10)'), 'down');
  assert.equal(g.run('movementFacing(6,10)'), 'right');
  assert.equal(g.run('movementFacing(-6,-10)'), 'left');
  g.run('movePlayerTo(45,94);'); assert.equal(g.run('movement.facing'), 'down');
  g.run('movePlayerTo(46,94);'); assert.equal(g.run('movement.facing'), 'right');
});
test('movement is continuous, frame-rate independent, and retains the facing on arrival', () => {
  const g = game(); g.run('movePlayerTo(42,68);');
  assert.equal(g.run('movement.y'), 84); g.tick(); g.tick();
  assert.ok(g.run('movement.y') < 84); g.finish();
  assert.equal(g.run('movement.y'), 68); assert.equal(g.run('movement.facing'), 'up');
  assert.equal(g.get('player').child.style.backgroundPosition, '0% 100%');
  function at(hz) { const s = game(); s.run('movePlayerTo(65,84);'); s.tick(0); for (let i=0;i<hz;i++) s.tick(1000/hz); return s.run('movement.x'); }
  assert.ok(Math.abs(at(30) - at(120)) < 1e-9);
});
test('one sheet supplies idle and walking in all directions without per-pose brightness changes', () => {
  const g = game();
  for (const direction of ['left','right','up','down']) {
    g.run(`movement.facing='${direction}';renderPlayer(false);`);
    for (let i=0;i<4;i++) { g.run(`movement.phase=${i}/4;renderPlayer(true);`); assert.ok(!/NaN|Infinity/.test(g.get('player').child.style.transform)); }
    assert.equal(g.get('player').child.style.filter, undefined);
  }
});
test('vertical travel uses corrected walking frames and profile-driven sizing', () => {
  const g = game();
  g.run('movement.facing="down"; movement.phase=0; renderPlayer(true);');
  assert.equal(g.get('player').child.style.backgroundPosition, '25% 50%');
  g.run('movement.phase=.26; renderPlayer(true);');
  assert.equal(g.get('player').child.style.backgroundPosition, '50% 50%');
  g.run('movement.facing="up"; movement.phase=.75; renderPlayer(true);');
  assert.equal(g.get('player').child.style.backgroundPosition, '100% 100%');
  g.run('renderPlayer(false);');
  assert.equal(g.get('player').child.style.backgroundPosition, '0% 100%');
  assert.match(styles, /width:\s*var\(--sprite-width,\s*27\.5%\)/);
  assert.equal(g.get('player').style['--sprite-width'], `${g.run("playerPerspective('bedroom',84).width")}%`);
});
test('every room profile keeps the player consistent with its painted doors', () => {
  const g = game();
  const visibleBodyRatio = 314 / (971 / 3);
  const aspect = 1672 / 941;
  const references = [
    ['bedroom', 56.5, 42.5],
    ['living', 39.6, 21.2],
    ['living', 52.5, 38],
    ['living', 52.5, 37.5],
    ['bathroom', 67.5, 41.1],
    ['outside', 36.1, 18.7]
  ];
  for (const [room, y, doorHeight] of references) {
    const width = g.run(`playerPerspective('${room}',${y}).width`);
    const bodyHeight = width / 100 * aspect * visibleBodyRatio * 100;
    assert.ok(bodyHeight / doorHeight > .9 && bodyHeight / doorHeight < 1.15, `${room} is not door-calibrated`);
    assert.ok(g.run(`playerPerspectiveProfiles.${room}.anchors.at(-1).width > playerPerspectiveProfiles.${room}.anchors[0].width`));
  }
  assert.equal(g.run('JSON.stringify(apartmentRooms.living.objects.exit.portal)'), '[91.7,39.6]');
});
test('bedroom objects respond, with independent lamp and TV toggles', () => {
  const g = game();
  for (const target of g.run('Object.keys(roomObjects).filter(k => k !== "door")')) for (const verb of ['look','open','close','use']) g.run(`interact('${target}','${verb}');`);
  g.run('gameState.lampOn=true;interact("lamp","use");');
  assert.match(g.get('scene').style['--room-image'], /bedroom-c1-l0-m1\.png/);
  assert.doesNotMatch(markup, /lamp-constant|lamp-halo/);
  g.run('interact("lamp","use");');
  assert.match(g.get('scene').style['--room-image'], /bedroom-c1-l1-m1\.png/);
  g.run('gameState.tvOn=false;interact("console","use");'); assert.ok(g.get('scene').classList.contains('tv-on'));
});
test('save/load restores the room and direction; reset restores closed curtains', () => {
  const g = game(); g.run('setCurtains(true);movement.facing="up";gameState.tvOn=true;saveGame();resetGame();');
  assert.equal(g.run('gameState.curtainsOpen'), false);
  g.run('setCurtains(true);movement.facing="left";saveGame();setCurtains(false);loadGame();');
  assert.equal(g.run('gameState.curtainsOpen'), true); assert.equal(g.run('movement.facing'), 'left');
  g.run('resetGame();'); assert.equal(g.run('gameState.curtainsOpen'), false); assert.equal(g.run('movement.destination'), null);
});

test('doors animate before switching rooms and all interior routes are reciprocal', () => {
  const g = game();
  g.run('setCurtains(true); handleTarget("door");');
  g.tick(16); g.tick(16);
  assert.equal(g.run('gameState.currentRoom'), 'bedroom');
  g.finish();
  assert.equal(g.run('gameState.currentRoom'), 'living');
  assert.equal(g.run('transition'), null);
  assert.equal(g.get('curtainToggle').hidden, true);
  g.run('handleTarget("bathroomDoor");'); g.finish();
  assert.equal(g.run('gameState.currentRoom'), 'bathroom');
  g.run('handleTarget("livingDoor");'); g.finish();
  assert.equal(g.run('gameState.currentRoom'), 'living');
  g.run('handleTarget("bedroomDoor");'); g.finish();
  assert.equal(g.run('gameState.currentRoom'), 'bedroom');
  assert.equal(g.run('gameState.curtainsOpen'), true);
  assert.equal(g.get('hotspots').children.length, 14);
});

test('the restored bathroom runs from its left entrance to the right-side bath and closes on the source side', () => {
  const g = game();
  assert.equal(g.run('apartmentRooms.living.objects.bathroomDoor.appearance'), 'glass');
  assert.equal(g.run('apartmentRooms.bathroom.objects.livingDoor.appearance'), 'glass');
  assert.equal(g.run('JSON.stringify(apartmentRooms.living.objects.bathroomDoor.panel)'), '[68.6,14.1,8,37.5]');
  assert.equal(g.run('JSON.stringify(apartmentRooms.bathroom.objects.livingDoor.panel)'), '[27.5,25.9,8.8,41.1]');
  assert.equal(g.run('JSON.stringify(apartmentRooms.bathroom.floor)'), '[23,77,65,82]');
  assert.equal(g.run('apartmentRooms.bathroom.objects.livingDoor.area[0] < apartmentRooms.bathroom.objects.laundry.area[0]'), true);
  assert.equal(g.run('apartmentRooms.bathroom.objects.laundry.area[0] < apartmentRooms.bathroom.objects.sink.area[0]'), true);
  assert.equal(g.run('apartmentRooms.bathroom.objects.sink.area[0] < apartmentRooms.bathroom.objects.toilet.area[0]'), true);
  assert.equal(g.run('apartmentRooms.bathroom.objects.toilet.area[0] < apartmentRooms.bathroom.objects.bath.area[0]'), true);
  assert.equal(g.run('apartmentRooms.bathroom.objects.picture.name'), 'framed city picture');
  g.run('showRoom("living"); movement.x=roomObjects.bathroomDoor.walk[0]; movement.y=roomObjects.bathroomDoor.walk[1]; interact("bathroomDoor", "use");');
  assert.equal(g.get('doorway').dataset.appearance, 'glass');
  assert.equal(g.get('doorway').style.left, '68.6%');
  assert.equal(g.get('doorway').style.width, '8%');
  assert.equal(g.get('doorway').dataset.hinge, 'right');
  assert.equal(g.get('doorway').dataset.motion, 'opening');
  g.tick(16);
  for (let i = 0; i < 12; i++) g.tick(50);
  assert.equal(g.run('movement.facing'), 'up');
  assert.match(g.get('player').child.style.backgroundPosition, /^(25|50|75|100)% 100%$/);
  for (let i = 0; i < 16; i++) g.tick(50);
  assert.equal(g.run('gameState.currentRoom'), 'living');
  assert.equal(g.get('doorway').dataset.motion, 'opening');
  assert.match(g.get('door-face').style.transform, /rotateY\([1-9]/);
  for (let i = 0; i < 10; i++) g.tick(50);
  assert.equal(g.run('gameState.currentRoom'), 'bathroom');
  assert.equal(g.get('doorway').classList.contains('hidden'), false);
  assert.equal(g.get('doorway').style.left, '27.5%');
  assert.equal(g.get('doorway').style.width, '8.8%');
  assert.equal(g.get('doorway').dataset.hinge, 'left');
  assert.equal(g.get('doorway').dataset.appearance, 'glass');
  assert.equal(g.get('doorway').dataset.motion, 'closing');
  assert.equal(g.get('doorway').dataset.swingSide, 'source');
  assert.equal(g.get('doorway').dataset.visualRoom, 'bathroom');
  assert.match(g.get('door-surface').style.backgroundImage, /bathroom-c0-m0\.png/);
  assert.equal(g.run('movement.facing'), 'down');
  assert.match(g.get('player').child.style.backgroundPosition, /^(25|50|75|100)% 50%$/);
  for (let i = 0; i < 12; i++) g.tick(50);
  assert.match(g.get('door-face').style.transform, /rotateY\([1-9]/);
  g.finish();
  assert.equal(g.get('doorway').dataset.motion, undefined);
  assert.match(styles, /data-appearance="glass"/);
});

test('bedroom travel keeps the original arrival walk but closes with the departing side in both directions', () => {
  const g = game();
  g.run('showRoom("bedroom"); interact("door", "use");');
  g.tick(16); for (let i = 0; i < 28; i++) g.tick(50);
  assert.equal(g.run('gameState.currentRoom'), 'bedroom');
  assert.equal(g.get('doorway').dataset.motion, 'opening');
  assert.equal(g.get('doorway').dataset.hinge, 'right');
  assert.match(g.get('door-face').style.transform, /rotateY\([1-9]/);
  for (let i = 0; i < 10; i++) g.tick(50);
  assert.equal(g.run('gameState.currentRoom'), 'living');
  assert.equal(g.get('doorway').dataset.hinge, 'left');
  assert.equal(g.get('doorway').dataset.swingSide, 'source');
  assert.equal(g.get('doorway').dataset.visualRoom, 'living');
  assert.match(g.get('door-surface').style.backgroundImage, /living-c0-m0-b0-h0\.png/);
  for (let i = 0; i < 12; i++) g.tick(50);
  assert.match(g.get('door-face').style.transform, /rotateY\([1-9]/);
  g.finish();

  g.run('interact("bedroomDoor", "use");');
  g.tick(16); for (let i = 0; i < 28; i++) g.tick(50);
  assert.equal(g.run('gameState.currentRoom'), 'living');
  assert.equal(g.get('doorway').dataset.motion, 'opening');
  assert.equal(g.get('doorway').dataset.hinge, 'left');
  assert.match(g.get('door-face').style.transform, /rotateY\(-/);
  for (let i = 0; i < 10; i++) g.tick(50);
  assert.equal(g.run('gameState.currentRoom'), 'bedroom');
  assert.equal(g.get('doorway').dataset.hinge, 'right');
  assert.equal(g.get('doorway').dataset.swingSide, 'source');
  assert.equal(g.get('doorway').dataset.visualRoom, 'bedroom');
  assert.match(g.get('door-surface').style.backgroundImage, /bedroom-c0-l1-m0\.png/);
  for (let i = 0; i < 12; i++) g.tick(50);
  assert.match(g.get('door-face').style.transform, /rotateY\(-/);
  g.finish();
});

test('the full bedroom door leaf animates behind an unchanged foreground couch', () => {
  const panelDirectory = path.join(__dirname, '..', 'assets', 'lighting', 'bedroom-door-states');
  const correctedDirectory = path.join(__dirname, '..', 'assets', 'lighting', 'bedroom-states-v12');
  const panelFiles = fs.readdirSync(panelDirectory).filter(file => file.endsWith('.png')).sort();
  const correctedFiles = fs.readdirSync(correctedDirectory).filter(file => file.endsWith('.png')).sort();
  assert.equal(panelFiles.length, 8);
  assert.deepEqual(correctedFiles, panelFiles);
  for (const file of panelFiles) {
    for (const directory of [panelDirectory, correctedDirectory]) {
      const bytes = fs.readFileSync(path.join(directory, file));
      assert.equal(bytes.readUInt32BE(16), 1672);
      assert.equal(bytes.readUInt32BE(20), 941);
    }
  }
  assert.match(source, /if \(bedroom\) preloadRoomImage\(bedroomDoorImageForState\(\)\)/);
  assert.match(source, /assets\/lighting\/bedroom-states-v12\/bedroom-c/);
  const builder = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-bedroom-door-states.ps1'), 'utf8');
  assert.match(builder, /\$frameX = 1200/);
  assert.match(builder, /\$panelX = 1219/);
  assert.match(builder, /\$panelY = 131/);
  assert.match(builder, /neither the hinges nor the leaf are warped/);

  const g = game();
  assert.equal(g.run('JSON.stringify(apartmentRooms.bedroom.objects.door.area)'), '[72.8,14,9.5,42.5]');
  assert.equal(g.run('JSON.stringify(apartmentRooms.bedroom.objects.door.panel)'), '[72.9067,13.9214,9.4498,42.6142]');
  assert.equal(g.run('apartmentRooms.bedroom.objects.door.foreground'), 'bedroom-couch');
  g.run('interact("door", "use");');
  assert.equal(g.get('doorway').style.left, '72.9067%');
  assert.equal(g.get('doorway').style.top, '13.9214%');
  assert.equal(g.get('doorway').style.width, '9.4498%');
  assert.equal(g.get('doorway').style.height, '42.6142%');
  assert.equal(g.get('door-face').style.transformOrigin, 'right center');
  assert.equal(g.get('doorway').dataset.foreground, 'bedroom-couch');
  assert.match(g.get('door-surface').style.backgroundImage, /bedroom-door-states\/bedroom-c0-l1-m0\.png/);
  assert.match(g.get('door-surface').style.backgroundSize, /^[\d.]+% [\d.]+%$/);
  assert.notEqual(g.get('door-surface').style.backgroundSize, '100% 100%');
  assert.match(markup, /id="bedroom-door-foreground"/);
  assert.match(styles, /#bedroom-door-foreground[^}]*z-index:\s*4/);
  assert.match(styles, /#doorway\[data-foreground="bedroom-couch"\]:not\(\.hidden\) ~ #bedroom-door-foreground/);
});

test('living-room doors have reversed artwork handedness and hotspots stay invisible', () => {
  const g = game();
  assert.equal(g.run('apartmentRooms.living.objects.bedroomDoor.hinge'), 'left');
  assert.equal(g.run('apartmentRooms.living.objects.bathroomDoor.hinge'), 'right');
  assert.equal(g.run('apartmentRooms.living.objects.exit.hinge'), 'right');
  assert.equal(g.run('apartmentRooms.outside.objects.frontDoor.hinge'), 'left');
  assert.equal(g.run('apartmentRooms.living.objects.exit.swing'), 1);
  assert.equal(g.run('apartmentRooms.outside.objects.frontDoor.swing'), 1);
  assert.equal(g.run('apartmentRooms.bedroom.objects.door.hinge'), 'right');
  assert.equal(g.run('apartmentRooms.bathroom.objects.livingDoor.hinge'), 'left');
  assert.match(styles, /\.hotspot:hover[^}]*opacity:\s*0[^}]*background:\s*transparent[^}]*outline:\s*none/);
});

test('transition input is locked and reset cancels pending travel', () => {
  const g = game();
  g.run('interact("door","open"); movePlayerTo(10,90); interact("door","use");');
  assert.equal(g.run('movement.destination'), null);
  g.tick(16); g.tick(200);
  assert.match(g.get('door-face').style.transform, /rotateY\([1-9]/);
  g.run('resetGame();'); g.finish();
  assert.equal(g.run('transition'), null);
  assert.equal(g.run('gameState.currentRoom'), 'bedroom');
  assert.equal(g.get('scene-fade').style.opacity, '0');
});

test('living TV channels, saves, bathroom and exit preserve apartment state', () => {
  const g = game();
  g.run('showRoom("living"); interact("channelBox","use"); interact("plant","use"); saveGame();');
  assert.equal(g.run('gameState.channel'), 1);
  assert.equal(g.run('gameState.livingTvOn'), true);
  g.run('interact("bathroomDoor","use");'); g.tick(16);
  g.run('loadGame();'); g.finish();
  assert.equal(g.run('gameState.currentRoom'), 'living');
  assert.equal(g.run('gameState.plantWatered'), true);
  assert.equal(g.run('transition'), null);
  g.run('interact("exit","open");');
  g.tick(16); for (let i=0;i<30;i++) g.tick(50);
  assert.equal(g.run('gameState.currentRoom'), 'outside');
  assert.equal(g.get('doorway').dataset.hinge, 'left');
  assert.equal(g.get('doorway').dataset.motion, 'closing');
  assert.match(g.get('door-face').style.transform, /rotateY\([1-9]/);
  assert.match(g.get('door-surface').style.backgroundImage, /outside_bg\.png/);
  g.finish();
  assert.equal(g.run('gameState.currentRoom'), 'outside');
  assert.equal(g.run('transition'), null);
  g.run('handleTarget("frontDoor");');
  g.tick(16); for (let i=0;i<30;i++) g.tick(50);
  assert.equal(g.run('gameState.currentRoom'), 'living');
  assert.equal(g.get('doorway').dataset.hinge, 'right');
  assert.match(g.get('door-face').style.transform, /rotateY\([1-9]/);
  assert.match(g.get('door-surface').style.backgroundImage, /living-c0-m0-b0-h0\.png/);
  g.finish();
  assert.equal(g.run('gameState.currentRoom'), 'living');
});

test('outside paths descend stairs and use the gap beside the blue car', () => {
  const g = game();
  g.run('showRoom("outside"); movement.x=73; movement.y=37.4; handleTarget("blueCar");');
  let stairs = 0, passage = false, lift = false;
  for (let i=0; i<2200 && g.run('movement.destination !== null'); i++) {
    g.tick();
    const x = g.run('movement.x'), y = g.run('movement.y');
    if (g.run('movement.destination?.stairs')) {
      stairs++;
      assert.ok(x >= 73 && x <= 74);
      lift ||= parseFloat(g.get('player').style['--step-lift']) < -.2;
    }
    if (y > 56 && y < 91) { assert.ok(Math.abs(x-72.7) < .01); passage = true; }
  }
  assert.ok(stairs > 10 && lift && passage);
  assert.equal(g.run('movement.destination'), null);
  assert.equal(g.run('movement.x'), 87);
  assert.equal(g.run('movement.y'), 92);
  assert.doesNotMatch(g.get('messageBox').textContent, /your car|belongs to you/i);
  assert.match(g.get('messageBox').textContent, /Lonza Experience/);
});

test('all painted gaps between parked cars are walkable', () => {
  const g = game();
  for (const x of [24, 50, 72.7]) {
    const route = g.run(`outsideRoute({x:${x},y:55},{x:${x},y:92})`);
    assert.ok(route.length > 0);
    assert.ok(route.filter(point => point.y > 55).every(point => Math.abs(point.x - x) < .001));
    assert.ok(route.some(point => Math.abs(point.x - x) < .001 && point.y === 92));
    assert.equal(route.at(-1).y, 92);
  }
});

test('clear parking-lot ground supports free movement without crossing parked cars', () => {
  const g = game();
  for (const [x, y] of [[9,94], [42,72], [31,84], [66,94], [91,90]]) {
    const projected = g.run(`outsideProjection(${x},${y})`);
    assert.deepEqual([projected.x, projected.y], [x, y]);
    assert.equal(projected.free, true);
  }
  const route = g.run('outsideRoute({x:9,y:94},{x:91,y:90})');
  assert.deepEqual([route.at(-1).x, route.at(-1).y], [91, 90]);
  assert.ok(route.every((point, index) => {
    const prior = index ? route[index-1] : { x: 9, y: 94 };
    return g.run(`outsideFreeSegment({x:${prior.x},y:${prior.y}},{x:${point.x},y:${point.y}})`);
  }));
  const onCar = g.run('outsideProjection(61,70)');
  assert.notDeepEqual([onCar.x, onCar.y], [61, 70]);
});

test('car foreground masks use tightly traced vehicle silhouettes', () => {
  for (const car of ['burgundy', 'silver', 'blue']) {
    const rule = styles.match(new RegExp(`\\.outside-car-foreground\\.${car} \\{ clip-path: polygon\\(([^;]+)\\); \\}`));
    assert.ok(rule, `${car} foreground mask must exist`);
    assert.ok(rule[1].split(',').length >= 25, `${car} mask must closely trace the painted silhouette`);
  }
});

test('outside perspective is calibrated to doors and parked cars', () => {
  const g = game();
  assert.equal(g.run("playerPerspective('outside',0).width"), 10.2);
  assert.equal(g.run("playerPerspective('outside',37.4).width"), 10.2);
  assert.equal(g.run("playerPerspective('outside',92).width"), 22.4);
  assert.equal(g.run("playerPerspective('outside',100).width"), 22.4);
  g.run('showRoom("outside"); movement.y=37.4; renderPlayer();');
  assert.equal(g.get('player').style['--sprite-width'], '10.2%');
  assert.equal(g.get('player').style['--depth'], 1);
  g.run('movement.y=92; renderPlayer();');
  assert.equal(g.get('player').style['--sprite-width'], '22.4%');
  assert.ok(Math.abs(g.get('player').style['--depth'] - 22.4 / 10.2) < 1e-12);
  const rearBodyHeight = .102 * (1672 / 941) * (314 / (971 / 3));
  const frontBodyHeight = .224 * (1672 / 941) * (314 / (971 / 3));
  assert.ok(rearBodyHeight / .187 > .9 && rearBodyHeight / .187 < 1);
  assert.ok(Math.abs(frontBodyHeight / .30 - 1.8 / 1.4) < .02);
});

test('both neighbouring patios are reachable but locked, even with keys', () => {
  const g = game();
  g.run('showRoom("outside"); movement.x=73; movement.y=37.4; gameState.keysTaken=true; setVerb("open");');
  for (const target of ['neighbourLeft', 'neighbourMiddle', 'blueCar', 'silverCar', 'burgundyCar']) {
    g.run('handleTarget("' + target + '");'); g.finish();
    assert.equal(g.run('gameState.currentRoom'), 'outside');
    assert.match(g.get('messageBox').textContent, /locked/i);
    assert.equal(g.run('transition'), null);
  }
});

test('outside save on stairs resumes safely and new clicks cancel pending interactions', () => {
  const g = game();
  g.run('showRoom("outside"); movement.x=73; movement.y=37.4; handleTarget("blueCar");');
  for(let i=0;i<20;i++) g.tick();
  g.run('saveGame();');
  const savedY = g.run('movement.y');
  g.run('showRoom("bedroom"); loadGame();');
  assert.equal(g.run('gameState.currentRoom'), 'outside');
  assert.ok(Math.abs(g.run('movement.y')-savedY) < .001);
  g.run('handleTarget("blueCar"); movePlayerTo(73,37.4);'); g.finish();
  assert.ok(Math.abs(g.run('movement.y')-37.4) < .001);
  assert.equal(g.run('movement.route'), null);
  assert.equal(g.get('player').style['--step-lift'], '0%');
});

test('living TV is right of the couch and both furniture footprints are blocked', () => {
  const g = game();
  g.run('showRoom("living")');
  const areas = g.run('[roomObjects.coffeeTable.area, roomObjects.couch.area]');
  for (const [left, , width] of areas) assert.ok(left + width / 2 > 40 && left + width / 2 < 65);
  assert.ok(g.run('roomObjects.tv.area[0]') > g.run('roomObjects.couch.area[0] + roomObjects.couch.area[2]'));
  assert.equal(g.run('floorPosition(50,80).x'), 50);
  assert.equal(g.run('floorPosition(50,80).y'), 62);
  assert.equal(g.run('floorPosition(90,75).x'), 78);
  assert.equal(g.run('floorPosition(90,75).y'), 75);
  assert.equal(g.run('Object.values(roomObjects).filter(object => /plant/i.test(object.name)).length'), 1);
  assert.equal(g.run('roomObjects.plant.name'), 'living room plant');
  g.run('showRoom("bedroom")');
  assert.equal(g.run('Object.values(roomObjects).filter(object => /plant/i.test(object.name)).length'), 0);
  g.run('showRoom("bathroom")');
  assert.equal(g.run('Object.values(roomObjects).filter(object => /plant/i.test(object.name)).length'), 0);
});

test('bedroom has a separate interactive bookshelf beside the lamp table', () => {
  const g = game();
  assert.equal(g.run('roomObjects.bookshelf.name'), 'small bookshelf');
  assert.ok(g.run('roomObjects.bookshelf.area[0] + roomObjects.bookshelf.area[2]') < g.run('roomObjects.lamp.area[0] + roomObjects.lamp.area[2]'));
});
