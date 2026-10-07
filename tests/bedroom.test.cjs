const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const source = ['rooms.js', 'outside.js', 'street.js', 'bluestar.js', 'laundry.js', 'alley.js', 'garage.js', 'wakeup.js', 'game.js', 'object-interactions.js'].map(file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')).join('\n');
const styles = fs.readFileSync(path.join(__dirname, '..', 'style.css'), 'utf8');
const markup = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const placementRefusalMessages = ["That's not where it goes.", "It doesn't go there.", "You don't want to put it there."];
const assertPlacementRefusal = (message, context) => assert.ok(placementRefusalMessages.includes(message), `${context || 'Placement'}: ${message}`);

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
  const timers=new Map();let timerId=0,timerNow=0;
  function element() {
    return { style: { setProperty(k, v) { this[k] = v; } }, dataset: {}, attributes: {}, events: {}, children: [],
      classList: { values: new Set(), add(c) { this.values.add(c); }, remove(c) { this.values.delete(c); }, contains(c) { return this.values.has(c); }, toggle(c, on) { on ? this.values.add(c) : this.values.delete(c); } },
      setAttribute(k, v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; }, appendChild(el) { this.children.push(el); }, replaceChildren() { this.children = []; },
      addEventListener(k, cb) { this.events[k] = cb; }, querySelector() { return this.child ||= element(); },
      clientWidth: 1000, clientHeight: 562.5, offsetWidth: 240
    };
  }
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  const verbs = ['pickup', 'place', 'look', 'use', 'talk'].map(verb => { const el = element(); el.dataset.verb = verb; return el; });
  const context = vm.createContext({ document: { getElementById: get, querySelectorAll: () => verbs, createElement: element },
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) },
    performance:{now:()=>timerNow}, getComputedStyle:()=>({opacity:'0'}),
    setTimeout: (cb,ms=0) => {const id=++timerId;timers.set(id,{cb,at:timerNow+ms});return id;}, clearTimeout(id) {timers.delete(id);}, requestAnimationFrame: cb => { frame = cb; return 1; }, cancelAnimationFrame: () => { frame = null; } });
  vm.runInContext(source, context);
  return { get, storage, run: code => vm.runInContext(code, context),
    loadCatalog() {
      for (const file of ['vendor/acorn.js', 'message-catalog.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
    },
    advance(ms) {
      const end=timerNow+ms;let limit=10000;
      while(limit-- > 0) {
        const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
        if(!next) break;
        timers.delete(next[0]);timerNow=next[1].at;next[1].cb();
      }
      assert.ok(limit>0);timerNow=end;
    },
    tick(dt = 1000 / 60) { time += dt; const cb = frame; frame = null; if (cb) cb(time); },
    finish() { let limit = 3000; while (frame && limit-- > 0) this.tick(); assert.ok(limit > 0, 'walk must arrive'); }
  };
}
test('new launches always start in the dark bedroom, even with a saved open-curtain state', () => {
  const g = game(); g.run('setCurtains(true); saveGame();');
  const fresh = game(g.storage);
  assert.equal(fresh.run('gameState.curtainsOpen'), false);
  for (const key of ['lampOn', 'bedroomMainLightOn', 'livingMainLightOn', 'kitchenLightsOn', 'hallwayLightOn', 'bathroomMainLightOn']) {
    assert.equal(fresh.run(`gameState.${key}`), false, `${key} must start off`);
  }
  assert.ok(fresh.get('scene').classList.contains('curtains-closed'));
  assert.match(fresh.get('scene').style['--room-image'], /bedroom-c0-l0-m0\.png/);
  assert.match(markup, /preload[^>]+bedroom-c0-l0-m0\.png/);
  assert.match(styles, /--room-image[^}]+bedroom-c0-l0-m0\.png/);
  assert.equal(fresh.get('curtainToggle').textContent, 'Open curtains');
  assert.equal(fresh.run('movement.facing'), 'down');
  assert.equal(fresh.get('hotspots').children.length, 15);
});
test('bedroom lighting uses complete pre-rendered states without runtime masks', () => {
  assert.match(markup, /id="scene"[^>]*class="curtains-closed"[^>]*data-room="bedroom"/);
  assert.match(source, /function roomImageForState/);
  assert.doesNotMatch(markup, /room-dimmer|lighting-effects|light-effect|lamp-halo|lamp-constant/);
  assert.doesNotMatch(styles, /#room-dimmer|\.light-effect|mix-blend-mode/);
  assert.doesNotMatch(styles, /#room-art\s*\{[^}]*(?:filter|transition)/);
  const g = game();
  assert.equal(g.get('scene').dataset.room, 'bedroom');
  assert.match(g.get('scene').style['--room-image'], /bedroom-c0-l0-m0\.png/);
  g.run('showRoom("living"); showRoom("bedroom");');
  assert.match(g.get('scene').style['--room-image'], /bedroom-c0-l0-m0\.png/);
  g.run('setCurtains(true);');
  assert.equal(g.get('scene').classList.contains('curtains-open'), true);
  assert.match(g.get('scene').style['--room-image'], /bedroom-c1-l0-m0\.png/);
});

test('independent light circuits select the matching complete background', () => {
  const g = game();
  g.run('interact("mainLightSwitch","use")');
  assert.equal(g.run('gameState.bedroomMainLightOn'), true);
  assert.match(g.get('scene').style['--room-image'], /bedroom-c0-l0-m1\.png/);

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
  assert.match(styles, /#scene\.light-switching \.sprite[^}]*transition-duration:\s*\.20s;/);

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
    assert.match(g.get('scene').style['--room-image'], /assets\/used\/lighting\/hard-states-v7\/living-c[01]-m[01]-b[01]-h[01]\.png/);
  }
  assert.equal(images.size, 16);
  assert.doesNotMatch(markup, /lighting-effects|light-effect/);
});

test('bathroom off-screen curtains change daylight and the mirror reflection without fabric animation', () => {
  const g = game(); g.run('showRoom("bathroom")');
  assert.equal(g.run('gameState.bathroomCurtainsOpen'), false);
  assert.match(g.get('scene').style['--room-image'], /bathroom-c0-m0\.png/);
  g.run('setVerb(null);updateStatus("bathroomCurtains")');
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
  assert.equal(saved.version, 7);
  g.run('Object.assign(gameState,{bedroomMainLightOn:false,livingCurtainsOpen:false,livingMainLightOn:false,kitchenLightsOn:false,hallwayLightOn:false,bathroomCurtainsOpen:false,bathroomMainLightOn:false});loadGame()');
  for (const key of ['bedroomMainLightOn','livingCurtainsOpen','livingMainLightOn','kitchenLightsOn','hallwayLightOn','bathroomCurtainsOpen','bathroomMainLightOn']) assert.equal(g.run(`gameState.${key}`), true);
  g.run('resetGame()');
  for (const key of ['bedroomMainLightOn','livingCurtainsOpen','livingMainLightOn','kitchenLightsOn','hallwayLightOn','bathroomCurtainsOpen','bathroomMainLightOn']) assert.equal(g.run(`gameState.${key}`), false);
  assert.equal(g.run('gameState.curtainsOpen'), false);
  assert.equal(g.run('gameState.lampOn'), false);
});

test('all 28 pre-rendered lighting states are native-size PNGs with verified hashes', () => {
  // The game loads the living and bathroom states; the superseded bedroom states live in assets/unused.
  const directory = path.join(__dirname, '..', 'assets', 'used', 'lighting', 'hard-states-v7');
  const unusedDirectory = path.join(__dirname, '..', 'assets', 'unused', 'lighting', 'hard-states-v7');
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  assert.equal(Object.keys(manifest.files).length, 28);
  for (const [file, expectedHash] of Object.entries(manifest.files)) {
    const bytes = fs.readFileSync(path.join(file.startsWith('bedroom-') ? unusedDirectory : directory, file));
    assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
    assert.equal(bytes.readUInt32BE(16), 1672);
    assert.equal(bytes.readUInt32BE(20), 941);
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), expectedHash);
  }
  assert.doesNotMatch(markup, /switch-sprite|room-fixtures/);
});

test('living circuits share one fixed high-detail master and deterministic lighting fields', () => {
  const lightingDirectory = path.join(__dirname, '..', 'assets', 'used', 'lighting');
  const sourceDirectory = path.join(__dirname, '..', 'assets', 'unused', 'lighting', 'living-source-states-v2');
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
  assert.match(sourceBuilder, /SetWrapMode\(WrapMode\.TileFlipXY\)/);
  assert.match(sourceBuilder, /HallStrength\(double x, double y\)/);
  assert.match(sourceBuilder, /double strength = \.35 \+ \.37 \* hallway/);
  assert.match(sourceBuilder, /bathroomDoor/);
  assert.match(sourceBuilder, /kitchenBench/);
  assert.match(sourceBuilder, /BenchStrength\(double x, double y\)/);
  assert.match(sourceBuilder, /double underBench/);
  assert.match(sourceBuilder, /SmoothStep\(\.365, \.39, y\)/);
  assert.match(sourceBuilder, /1 - \.92 \* underBench/);
  assert.match(sourceBuilder, /double coffeeTable/);
  assert.match(sourceBuilder, /strength \+= \(1 - strength\) \* coffeeTable/);
  assert.match(sourceBuilder, /BenchRightSpread\(double x, double y\)/);
  assert.match(sourceBuilder, /ExtendPositiveDelta/);
  assert.match(sourceBuilder, /MainStrength\(double x, double y\)/);
  assert.match(sourceBuilder, /return 1 - \.75 \* underBench/);
  assert.match(sourceBuilder, /IlluminateMainBulb\(Bitmap output\)/);
  assert.match(sourceBuilder, /if \(mainFields\.Contains\(true\)\) IlluminateMainBulb\(output\)/);
  assert.match(sourceBuilder, /const double radiusX = 9/);
  assert.match(sourceBuilder, /for \(int y = 55; y <= 73; y\+\+\)/);
  assert.doesNotMatch(sourceBuilder, /living-floor-lamp/);
  assert.doesNotMatch(builder, /switchSprite|\$switch|kitchenReflectionSurface|hallwayInterior|benchFixtures|hallwayFixture/);
  assert.doesNotMatch(builder, /livingLamp|living-floor-lamp|room == "living"\) DrawPercent/);
});

test('all switches and the bedside lamp walk into reach before toggling', () => {
  const g = game();
  for (const [room, target, state, label] of [
    ['bedroom', 'lamp', 'lampOn', 'lamp'],
    ['bedroom', 'mainLightSwitch', 'bedroomMainLightOn', 'bedroom light'],
    ['living', 'mainLightSwitch', 'livingMainLightOn', 'living room light'],
    ['living', 'kitchenLightSwitch', 'kitchenLightsOn', 'bench lights'],
    ['living', 'hallwayLightSwitch', 'hallwayLightOn', 'hallway light'],
    ['bathroom', 'mainLightSwitch', 'bathroomMainLightOn', 'bathroom light']
  ]) {
    g.run(`showRoom('${room}');setVerb(null);`);
    const wasOn = g.run(`gameState.${state}`);
    g.run(`updateStatus('${target}')`);
    assert.equal(g.get('statusText').textContent, `Turn ${wasOn ? 'off' : 'on'} ${label}`);
    g.run(`handleTarget('${target}')`);
    assert.equal(g.run(`gameState.${state}`), wasOn, 'the light waits until the character arrives');
    assert.notEqual(g.run('movement.destination'), null);
    g.finish();
    assert.equal(g.run(`gameState.${state}`), !wasOn);
    assert.equal(g.run('movement.destination'), null);
    assert.equal(g.get('statusText').textContent, `Turn ${wasOn ? 'on' : 'off'} ${label}`);
  }
});

test('bedroom lamp and main circuits use four complete paintings with no fixture or switch overlays', () => {
  const sourceDirectory = path.join(__dirname, '..', 'assets', 'unused', 'lighting', 'bedroom-source-states');
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
  const sourceDirectory = path.join(__dirname, '..', 'assets', 'unused', 'lighting', 'bathroom-source-states');
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
  const patchDirectory = path.join(__dirname, '..', 'assets', 'unused', 'lighting', 'toaster-clean-patches-v2');
  const patchFiles = fs.readdirSync(patchDirectory).filter(file => file.endsWith('.png')).sort();
  assert.deepEqual(patchFiles, ['living-m0-b0-h0.png','living-m0-b0-h1.png','living-m0-b1-h0.png','living-m0-b1-h1.png','living-m1-b0-h0.png','living-m1-b0-h1.png','living-m1-b1-h0.png','living-m1-b1-h1.png']);
  for (const file of patchFiles) {
    const bytes = fs.readFileSync(path.join(patchDirectory, file));
    assert.equal(bytes.readUInt32BE(16), 82);
    assert.equal(bytes.readUInt32BE(20), 82);
  }

  const toasterDirectory = path.join(__dirname, '..', 'assets', 'used', 'lighting', 'toaster-states-v2');
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
  assert.match(source, /let toasterLayerCleanupTimer = null/);
  assert.match(source, /setLayerVisibilityImmediately\(current, true\)/);
  assert.match(source, /commitToasterImage\(toasterImageForState\(\), immediate, fastLight\)/);

  const g = game();
  g.run('showRoom("living");setVerb("pickup");updateStatus("toaster")');
  assert.equal(g.get('statusText').textContent, 'Pick up toaster');
  g.run('handleTarget("toaster")'); g.finish();
  assert.equal(g.run('gameState.toasterTaken'), true);
  assert.equal(g.run('JSON.stringify(gameState.inventory)'), '["toaster"]');
  assert.ok(g.get('living-toaster').classList.contains('is-taken'));
  assert.equal(g.get('inventoryCount').textContent, '1');
  g.run('saveGame();resetWorldState();loadGame()');
  assert.equal(g.run('gameState.toasterTaken'), true);
  assert.equal(g.run('JSON.stringify(gameState.inventory)'), '["toaster"]');
  g.run('interactionSelection.itemId="toaster";setVerb("place",{keepItem:true});handleTarget("toaster")'); g.finish();
  assert.equal(g.run('gameState.toasterTaken'), false);
  assert.equal(g.run('gameState.inventory.length'), 0);
  assert.equal(g.run('gameState.itemPlacements.toaster.target'), 'toaster');
  g.run('resetGame()');
  assert.equal(g.run('gameState.toasterTaken'), false);
});
test('bedroom curtain fabric follows room lighting with the same smooth transition', () => {
  const g = game();
  assert.equal(g.get('scene').style['--curtain-light'], .55);
  g.run('gameState.lampOn=true;syncRoom()');
  assert.equal(g.get('scene').style['--curtain-light'], .82);
  g.run('gameState.bedroomMainLightOn=true;syncRoom()');
  assert.equal(g.get('scene').style['--curtain-light'], 1.04);
  g.run('gameState.lampOn=false;gameState.bedroomMainLightOn=false;setCurtains(true)');
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
  assert.equal(g.get('hotspots').children.length, 15);
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

test('bedroom travel keeps the physical door inside the bedroom in both directions', () => {
  const g = game();
  g.run('showRoom("bedroom"); interact("door", "use");');
  g.tick(16); for (let i = 0; i < 28; i++) g.tick(50);
  assert.equal(g.run('gameState.currentRoom'), 'bedroom');
  assert.equal(g.get('doorway').dataset.motion, 'opening');
  assert.equal(g.get('doorway').dataset.hinge, 'right');
  assert.match(g.get('door-face').style.transform, /rotateY\([1-9]/);
  for (let i = 0; i < 10; i++) g.tick(50);
  assert.equal(g.run('gameState.currentRoom'), 'living');
  assert.equal(g.get('doorway').dataset.hinge, 'right');
  assert.equal(g.get('doorway').dataset.swingSide, 'destination');
  assert.equal(g.get('doorway').dataset.visualRoom, 'living');
  assert.match(g.get('door-surface').style.backgroundImage, /living-c0-m0-b0-h0\.png/);
  for (let i = 0; i < 12; i++) g.tick(50);
  assert.match(g.get('door-face').style.transform, /rotateY\(-/);
  g.finish();

  g.run('interact("bedroomDoor", "use");');
  g.tick(16); for (let i = 0; i < 28; i++) g.tick(50);
  assert.equal(g.run('gameState.currentRoom'), 'living');
  assert.equal(g.get('doorway').dataset.motion, 'opening');
  assert.equal(g.get('doorway').dataset.hinge, 'right');
  assert.match(g.get('door-face').style.transform, /rotateY\(-/);
  for (let i = 0; i < 10; i++) g.tick(50);
  assert.equal(g.run('gameState.currentRoom'), 'bedroom');
  assert.equal(g.get('doorway').dataset.hinge, 'right');
  assert.equal(g.get('doorway').dataset.swingSide, 'destination');
  assert.equal(g.get('doorway').dataset.visualRoom, 'bedroom');
  assert.match(g.get('door-surface').style.backgroundImage, /bedroom-c0-l0-m0\.png/);
  for (let i = 0; i < 12; i++) g.tick(50);
  assert.match(g.get('door-face').style.transform, /rotateY\([1-9]/);
  g.finish();
});

test('the regenerated right-hinged bedroom door animates clear of the shortened couch', () => {
  const stateDirectory = path.join(__dirname, '..', 'assets', 'used', 'lighting', 'bedroom-states-v14');
  const sourceDirectory = path.join(__dirname, '..', 'assets', 'unused', 'lighting', 'bedroom-source-v14');
  const stateFiles = fs.readdirSync(stateDirectory).filter(file => file.endsWith('.png')).sort();
  const sourceFiles = fs.readdirSync(sourceDirectory).filter(file => file.endsWith('.png')).sort();
  assert.equal(stateFiles.length, 8);
  assert.equal(sourceFiles.length, 4);
  for (const file of stateFiles) {
    const bytes = fs.readFileSync(path.join(stateDirectory, file));
    assert.equal(bytes.readUInt32BE(16), 1672);
    assert.equal(bytes.readUInt32BE(20), 941);
  }
  assert.match(source, /if \(bedroom\) preloadRoomImage\(bedroomDoorImageForState\(\)\)/);
  assert.match(source, /assets\/used\/lighting\/bedroom-states-v14\/bedroom-c/);
  const builder = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-bedroom-v14-states.ps1'), 'utf8');
  assert.match(builder, /bedroom-source-v14/);
  assert.match(builder, /bedroom-stool\.png/);
  assert.match(builder, /ApplyClosedCurtainAmbient/);

  const g = game();
  assert.equal(g.run('JSON.stringify(apartmentRooms.bedroom.objects.door.area)'), '[72.8,14,9.5,42.5]');
  assert.equal(g.run('JSON.stringify(apartmentRooms.bedroom.objects.door.panel)'), '[72.9665,14.0276,9.2105,43.2519]');
  assert.equal(g.run('apartmentRooms.bedroom.objects.door.foreground'), undefined);
  assert.equal(g.run('JSON.stringify(apartmentRooms.bedroom.objects.couch.area)'), '[70.2,59.6,29.8,40.4]');
  g.run('interact("door", "use");');
  assert.equal(g.get('doorway').style.left, '72.9665%');
  assert.equal(g.get('doorway').style.top, '14.0276%');
  assert.equal(g.get('doorway').style.width, '9.2105%');
  assert.equal(g.get('doorway').style.height, '43.2519%');
  assert.equal(g.get('door-face').style.transformOrigin, 'right center');
  assert.equal(g.get('doorway').dataset.foreground, '');
  assert.match(g.get('door-surface').style.backgroundImage, /bedroom-states-v14\/bedroom-c0-l0-m0\.png/);
  assert.match(g.get('door-surface').style.backgroundSize, /^[\d.]+% [\d.]+%$/);
  assert.notEqual(g.get('door-surface').style.backgroundSize, '100% 100%');
  assert.equal(g.get('bedroom-door-foreground').style.display, undefined);
});

test('living-room doors have reversed artwork handedness and hotspots stay invisible', () => {
  const g = game();
  assert.equal(g.run('apartmentRooms.living.objects.bedroomDoor.hinge'), 'right');
  assert.equal(g.run('apartmentRooms.living.objects.bedroomDoor.swing'), -1);
  assert.equal(g.run('apartmentRooms.living.objects.bedroomDoor.destinationSwing'), true);
  assert.equal(g.run('apartmentRooms.living.objects.bathroomDoor.hinge'), 'right');
  assert.equal(g.run('apartmentRooms.living.objects.exit.hinge'), 'right');
  assert.equal(g.run('apartmentRooms.outside.objects.frontDoor.hinge'), 'left');
  assert.equal(g.run('apartmentRooms.living.objects.exit.swing'), 1);
  assert.equal(g.run('JSON.stringify(apartmentRooms.living.objects.exit.panel)'), '[88.3971,18.491,4.5455,20.085]');
  assert.equal(g.run('apartmentRooms.outside.objects.frontDoor.swing'), 1);
  assert.equal(g.run('apartmentRooms.bedroom.objects.door.hinge'), 'right');
  assert.equal(g.run('apartmentRooms.bedroom.objects.door.destinationSwing'), true);
  assert.equal(g.run('apartmentRooms.bathroom.objects.livingDoor.hinge'), 'left');
  assert.match(styles, /\.hotspot:hover[^}]*opacity:\s*0[^}]*background:\s*transparent[^}]*outline:\s*none/);
});

test('the living-room front door animation samples only the exact inner leaf', () => {
  const g = game();
  g.run('showRoom("living"); positionDoor(apartmentRooms.living.objects.exit);');
  assert.equal(g.get('doorway').style.left, '88.3971%');
  assert.equal(g.get('doorway').style.top, '18.491%');
  assert.equal(g.get('doorway').style.width, '4.5455%');
  assert.equal(g.get('doorway').style.height, '20.085%');
  assert.equal(g.get('door-face').style.transformOrigin, 'right center');
  assert.match(g.get('door-surface').style.backgroundImage, /living-c0-m0-b0-h0\.png/);
  assert.notEqual(g.run('JSON.stringify(apartmentRooms.living.objects.exit.area)'), g.run('JSON.stringify(apartmentRooms.living.objects.exit.panel)'));
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
  g.run('showRoom("outside"); movement.x=73; movement.y=37.4; setVerb("look"); handleTarget("blueCar");');
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

test('the parking line beside the burgundy car bounds the empty bay', () => {
  const g = game();
  // The line runs from (28.1, 64.4) at the kerb to (22.0, 89.9) at the lane.
  for (const [x, y] of [[24, 75], [22, 62], [21.5, 80]]) assert.equal(g.run(`outsidePointIsFree(${x},${y})`), false, `${x},${y} is beside the car`);
  for (const [x, y] of [[25.6, 75], [27, 70], [23, 86]]) assert.equal(g.run(`outsidePointIsFree(${x},${y})`), true, `${x},${y} is on or right of the line`);
  const snapped = g.run('outsideProjection(24,75)');
  assert.ok(Math.abs(snapped.x - (29.9 - (snapped.y - 57) * 8.4 / 35)) < .01, 'clicks beside the car snap onto the line');
  const route = g.run('outsideRoute({x:22,y:55},{x:21.5,y:92})');
  assert.ok(route.every(point => g.run(`outsidePointIsFree(${point.x},${point.y})`)));
});

test('all painted gaps between parked cars are walkable', () => {
  const g = game();
  for (const x of [50, 72.7]) {
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

test('cars occlude the player through a per-pixel cutout, switching at their ground line', () => {
  const cutout = fs.readFileSync(path.join(__dirname, '..', 'assets', 'used', 'outside-cars-foreground-v1.png'));
  assert.equal(cutout.readUInt32BE(16), 1672);
  assert.equal(cutout.readUInt32BE(20), 941);
  assert.equal(cutout[25], 6, 'RGBA with transparency outside the cars');
  assert.match(styles, /\.outside-cars-foreground \{[^}]*outside-cars-foreground-v1\.png/);
  assert.doesNotMatch(styles, /outside-car-foreground\.(burgundy|silver|blue)/);
  const g = game();
  g.run("showRoom('outside');movement.x=36;movement.y=85;renderPlayer()");
  assert.equal(g.get('scene').classList.contains('player-behind-cars'), true);
  g.run('movement.y=86;renderPlayer()');
  assert.equal(g.get('scene').classList.contains('player-behind-cars'), false, 'level with the bumpers the player is in front');
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

test('the neighbouring apartment doors give their distinct responses', () => {
  const g = game();
  g.run('showRoom("outside"); movement.x=73; movement.y=37.4; gameState.keysTaken=true; setVerb("use");');
  for (const [target, expected] of [
    ['neighbourLeft', 'The door is locked.'],
    ['neighbourMiddle', "You think it's open, but have no desire to barge in."]
  ]) {
    g.run('handleTarget("' + target + '");'); g.finish();
    assert.equal(g.get('messageBox').textContent, expected);
    assert.equal(g.run('gameState.currentRoom'), 'outside');
    assert.equal(g.run('transition'), null);
    g.run('setVerb("use")');
  }
  for (const target of ['blueCar', 'silverCar', 'burgundyCar']) {
    g.run('handleTarget("' + target + '");'); g.finish();
    assert.equal(g.get('messageBox').textContent, g.run(`roomObjects.${target}.lockedResponse`));
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
  assert.equal(g.run('isFloorPoint(floorPosition(90,75), apartmentRooms.living)'), true);
  assert.equal(g.run('insidePolygon(floorPosition(90,75), apartmentRooms.living.obstacles[1])'), false);
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

test('street is reached from the right footpath and returns at the left edge', () => {
  const g=game();
  g.run("showRoom('outside');Object.assign(movement,{x:90,y:55});movePlayerTo(99,55)");
  g.finish();
  assert.equal(g.run('gameState.currentRoom'),'street');
  assert.equal(g.run('movement.x'),3);
  assert.ok(g.run("playerPerspective('street',movement.y).width < playerPerspective('outside',55).width"));
  g.run("movePlayerTo(0,64)");g.finish();
  assert.equal(g.run('gameState.currentRoom'),'outside');
  assert.equal(g.run('movement.x'),93);
});
test('Bluestar sensor opens before the player enters the complete store interior', () => {
  const g=game();
  g.run("showRoom('street');Object.assign(movement,{x:56,y:streetFootY(56)});renderPlayer()");
  assert.equal(g.get('street-bluestar').classList.contains('is-open'),false);
  g.run("movePlayerTo(62,streetFootY(62))");g.finish();
  assert.equal(g.get('street-bluestar').classList.contains('is-open'),true);
  assert.equal(g.run('movement.x'),62);
  assert.ok(g.run('movement.y > streetDoors.bluestar.threshold'));
  g.run("handleTarget('bluestar')");g.finish();
  assert.equal(g.run('gameState.currentRoom'),'bluestar');
  assert.equal(g.run('movement.x'),43);
  assert.equal(g.run('movement.y'),86);
  assert.equal(g.run("roomObjects.coffeeMachine.name"),'coffee machine');
  assert.ok(g.run("Object.keys(roomObjects).length >= 30"));
  assert.ok(g.run("isFloorPoint({x:55,y:80},apartmentRooms.bluestar)"));
  assert.equal(g.run("isFloorPoint({x:44,y:55},apartmentRooms.bluestar)"),false);
  g.run("setVerb('use');handleTarget('entrance')");g.finish();
  assert.equal(g.run('gameState.currentRoom'),'street');
  assert.equal(g.run('movement.x'),g.run('streetDoors.bluestar.x'));
  assert.equal(g.run('movement.y'),g.run('streetDoors.bluestar.inside'));
});

test('Bluestar aisles reach the counter, every shelf face and the drinks wall', () => {
  const g = game();
  g.run("showRoom('bluestar');Object.assign(movement,{x:43,y:86})");
  for (const [x, y] of [[35,55],[35,38],[54.5,52],[55,35],[69.5,52],[84.5,52],[84,76],[43,86]]) {
    assert.ok(g.run(`isFloorPoint({x:${x},y:${y}},apartmentRooms.bluestar)`), `aisle point ${x},${y} is walkable`);
    assert.ok(g.run(`apartmentRoute(movement,{x:${x},y:${y}},apartmentRooms.bluestar).every((point,index,route)=>floorSegmentClear(index?route[index-1]:movement,point,apartmentRooms.bluestar))`), `route to ${x},${y} stays in aisles`);
    g.run(`Object.assign(movement,{x:${x},y:${y}})`);
  }
  assert.equal(g.run('isFloorPoint({x:44,y:55},apartmentRooms.bluestar)'), false);
  assert.ok(g.run('Object.keys(roomObjects).length >= 40'));
  for (const [key, object] of Object.entries(g.run('roomObjects'))) {
    assert.ok(g.run(`isFloorPoint({x:${object.walk[0]},y:${object.walk[1]}},apartmentRooms.bluestar)`), `${key} has a reachable interaction point`);
  }
  for (const key of ['coffeeMachine','nuts','cashierSpace','cigarettes','vapes','atm','colaDrinks','energyDrinks','water','milk','juice','cannedGoods','flourRice','bread','cleaningGoods','oralCare','paperGoods','electronics','batteries','beer','wine','iceCream']) {
    assert.ok(g.run(`roomObjects.${key}.description.length > 35`), `${key} has a useful look description`);
  }
});
test('Laundry uses one contextual click to open, enter and persist its door state', () => {
  const g=game();
  g.run("showRoom('street');Object.assign(movement,{x:39,y:streetFootY(39)});setVerb(null);updateStatus('laundry')");
  assert.equal(g.get('statusText').textContent,'Open Laundry glass door');
  g.run("handleTarget('laundry')");g.finish();
  assert.equal(g.run('gameState.currentRoom'),'laundry');
  assert.equal(g.run('gameState.laundryDoorOpen'),true);
  assert.equal(g.run('movement.x'),50);
  assert.equal(g.run('movement.y'),87);
  g.run("saveGame();showRoom('bedroom');gameState.laundryDoorOpen=false;loadGame()");
  assert.equal(g.run('gameState.currentRoom'),'laundry');
  assert.equal(g.run('gameState.laundryDoorOpen'),true);
  assert.equal(g.run('movement.y'),87);
  g.run("handleTarget('entrance')");g.finish();
  assert.equal(g.run('gameState.currentRoom'),'street');
  assert.equal(g.run('movement.y'),62.5);
  g.run("handleTarget('laundry')");g.finish();
  assert.equal(g.run('gameState.currentRoom'),'laundry');
  g.run('resetGame()');
  assert.equal(g.run('gameState.laundryDoorOpen'),false);
});

test('Laundry has a clear centre, two front basket tables and a right-wall payphone', () => {
  const g=game();
  g.run("showRoom('laundry');Object.assign(movement,{x:50,y:87})");
  for (const [x,y] of [[35,78],[38,55],[50,52],[50,60],[64,54],[68,62],[66,83],[50,87]]) {
    assert.ok(g.run(`isFloorPoint({x:${x},y:${y}},apartmentRooms.laundry)`), `Laundry floor at ${x},${y}`);
    assert.ok(g.run(`apartmentRoute(movement,{x:${x},y:${y}},apartmentRooms.laundry).every((point,index,route)=>floorSegmentClear(index?route[index-1]:movement,point,apartmentRooms.laundry))`), `route to ${x},${y}`);
    g.run(`Object.assign(movement,{x:${x},y:${y}})`);
  }
  assert.equal(g.run('isFloorPoint({x:25,y:75},apartmentRooms.laundry)'),false);
  assert.equal(g.run('isFloorPoint({x:75,y:75},apartmentRooms.laundry)'),false);
  for (const [key, object] of Object.entries(g.run('roomObjects'))) {
    assert.ok(g.run(`isFloorPoint({x:${object.walk[0]},y:${object.walk[1]}},apartmentRooms.laundry)`), `${key} has a reachable interaction point`);
    assert.ok(object.description.length > 35, `${key} has a look description`);
  }
  assert.ok(g.run('roomObjects.payphone.area[0] > roomObjects.rightMachines.area[0]'));
  assert.ok(g.run('roomObjects.entrance.area[2] < 18'));
  assert.ok(g.run('roomObjects.frontLeftTable.area[0] < roomObjects.entrance.area[0]'));
  assert.ok(g.run('roomObjects.frontRightTable.area[0] > roomObjects.entrance.area[0]'));
  assert.equal(g.run('Object.hasOwn(roomObjects,"foldingTable")'),false);
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'unused', 'laundry-room-source-v6.png'));
  const used = fs.readFileSync(path.join(__dirname, '..', 'assets', 'used', 'laundry-room-bg-v3.png'));
  assert.equal(crypto.createHash('sha256').update(source).digest('hex'), crypto.createHash('sha256').update(used).digest('hex'), 'the displayed PNG is a byte-for-byte copy of the generated master');
});
test('street routes stay on the pavement and alley instead of cutting across bins or shops', () => {
  const g=game();
  g.run("showRoom('street');Object.assign(movement,{x:42.53,y:64.3});movePlayerTo(87.5,64.5)");
  assert.ok(g.run('movement.route.some(p=>p.x===87.7 && p.y===streetFootY(87.7))'));
  g.finish();
  assert.equal(g.run('movement.y'),64.5);
  g.run('movePlayerTo(50,95)');g.finish();
  assert.ok(g.run('Math.abs(movement.y-streetFootY(movement.x))<.001'));
});

test('the player sheet is pre-keyed so no live filter re-renders the character', () => {
  const sheet = fs.readFileSync(path.join(__dirname, '..', 'assets', 'used', 'player-sheet-keyed-v1.png'));
  assert.equal(sheet.readUInt32BE(16), 1619);
  assert.equal(sheet.readUInt32BE(20), 971);
  assert.equal(sheet[25], 6, 'RGBA with transparency');
  assert.match(styles, /.player-frame[^}]*player-sheet-keyed-v1.png/);
  assert.doesNotMatch(styles + markup, /sprite-green-key/);
});

test('the seated man is clickable above the shelter, sleeping bag and bags', () => {
  const g = game();
  assert.equal(g.run("Object.keys(apartmentRooms.alley.objects).at(-1)"), 'man');
  assert.match(styles, /#alley-npc \{[^}]*z-index:59/);
});

test('verbs an object does not support get a fitting reply instead of its Use response', () => {
  const g = game();
  const reply = (room, target, verb) => { g.run(`showRoom('${room}');setVerb('${verb}');interact('${target}','${verb}')`); return g.run('messageBox.textContent'); };
  assert.equal(reply('bathroom', 'toilet', 'talk'), 'The toilet offers only the usual household silence.');
  assert.equal(reply('bathroom', 'toilet', 'open'), 'You lift the toilet lid, then lower it again.');
  assert.equal(reply('bathroom', 'toilet', 'use'), 'You flush the toilet.');
  assert.equal(reply('living', 'couch', 'open'), 'There is nothing to open on the couch.');
  assert.equal(reply('bedroom', 'bed', 'talk'), 'There is nothing you feel like saying to the bed.');
  assert.equal(reply('living', 'bedroomDoor', 'talk'), 'You have nothing to say to the bedroom door.');
  assert.equal(g.run('transition'), null, 'talking to a door does not open it');
});

test('Use follows scene openings while Talk To leaves them alone', () => {
  const g = game();
  g.run("showRoom('alley');Object.assign(movement,{x:28.5,y:48,facing:'up'});renderPlayer();setVerb('talk');updateStatus('street')");
  assert.equal(g.get('statusText').textContent, 'Talk to street beside Bluestar');
  g.run("handleTarget('street')");g.finish();g.advance(500);
  assert.equal(g.run('gameState.currentRoom'), 'alley');
  assert.equal(g.get('messageBox').textContent, 'You have nothing to say to the street beside Bluestar.');
  g.run("setVerb('use');handleTarget('street')");g.finish();g.advance(500);
  assert.equal(g.run('gameState.currentRoom'), 'street');
  assert.equal(g.run('gameState.selectedVerb'), null);
});

test('loading a save during the turn at an opening cancels the pending exit', () => {
  const g = game();
  g.run("showRoom('alley');Object.assign(movement,{x:28.5,y:48,facing:'down'});renderPlayer();saveGame();setVerb('use');handleTarget('street')");
  assert.equal(g.run('movement.facing'), 'up');
  g.run('loadGame()');
  g.advance(500);
  assert.equal(g.run('gameState.currentRoom'), 'alley');
});

test('room switches wait for every destination asset, then change in one step', () => {
  const g = game();
  // Each destination lists its overlays with its background.
  assert.equal(g.run("JSON.stringify(roomAssetPaths('outside'))"), JSON.stringify(['assets/used/outside_bg.png', 'assets/used/outside-cars-foreground-v1.png']));
  assert.ok(g.run("roomAssetPaths('alley').includes('assets/used/alley-man-sprite-v6.png')"));
  // Simulate a browser where nothing is decoded yet.
  g.run("globalThis.Image=function(){};decodedRoomImages.clear();showRoom('alley');Object.assign(movement,{x:28.5,y:48,facing:'up'});renderPlayer()");
  g.run("travelAlley('street')");
  assert.equal(g.run('gameState.currentRoom'), 'alley', 'the old scene stays until the new one is decoded');
  assert.equal(g.run('movement.x'), 28.5, 'the player stays put and visible in the old scene');
  g.run("movePlayerTo(40,80)");
  assert.equal(g.run('movement.destination'), null, 'input waits during the switch');
  g.run("cancelRoomSwitch();roomAssetPaths('street').forEach(p=>decodedRoomImages.add(p));travelAlley('street')");
  assert.equal(g.run('gameState.currentRoom'), 'street');
  assert.equal(g.run('movement.x'), 87.5);
  // Every neighbour of a room is warmed, so exits normally switch instantly.
  assert.equal(g.run('roomNeighbours.alley.join()'), 'street');
  assert.equal(g.run('roomNeighbours.street.join()'), 'outside,laundry,bluestar,alley');
  assert.equal(g.run('roomNeighbours.laundry.join()'), 'street');
  assert.equal(g.run('roomNeighbours.bluestar.join()'), 'street');
});

test('Bluestar alley uses a stable two-frame transparent blink sprite', () => {
  const npc = fs.readFileSync(path.join(__dirname, '..', 'assets', 'used', 'alley-man-sprite-v6.png'));
  assert.equal(npc.readUInt32BE(16), 2748);
  assert.equal(npc.readUInt32BE(20), 1145);
  assert.match(markup, /id="alley-npc"/);
  assert.match(styles, /alley-man-sprite-v6\.png/);
  assert.match(styles, /background-size:200% 100%/);
  assert.match(styles, /@keyframes alley-npc-blink/);
});

test('Bluestar alley is reciprocal with free walking inside its concrete bounds', () => {
  const g=game();
  g.run("showRoom('street');Object.assign(movement,{x:87.5,y:64.5});setVerb('use');handleTarget('alley')");
  g.finish();g.advance(500);
  assert.equal(g.run('gameState.currentRoom'),'alley');
  assert.equal(g.run('movement.x'),28.5);
  assert.equal(g.run('movement.facing'),'down');
  g.run('movePlayerTo(35,80)');g.finish();
  assert.equal(g.run('movement.x'),35);assert.equal(g.run('movement.y'),80);
  // The shelter, dumpster, bushes and the foreground beyond the cutoff stay out of reach.
  for (const [x,y] of [[50,58],[10,70],[80,80],[40,97]]) assert.equal(g.run(`alleyPointIsFree(${x},${y})`),false);
  g.run('movePlayerTo(80,97)');g.finish();
  assert.ok(g.run('alleyPointIsFree(movement.x,movement.y) && movement.y<=90'));
  // Crossing from the back of the alley to the door steps goes around the shelter.
  g.run('Object.assign(movement,{x:40,y:52});movePlayerTo(58,67)');
  assert.ok(g.run('[movement.destination,...movement.route].every((p,i,a)=>alleyFreeSegment(i?a[i-1]:{x:40,y:52},p))'));
  assert.ok(g.run('movement.route.length>0'));
  g.finish();
  g.run("saveGame();showRoom('bedroom');loadGame()");
  assert.equal(g.run('gameState.currentRoom'),'alley');
  g.run("setVerb('use');handleTarget('street')");g.finish();g.advance(500);
  assert.equal(g.run('gameState.currentRoom'),'street');
  assert.equal(g.run('movement.x'),87.5);
});

test('alley and street openings turn a standing player around before crossing', () => {
  const g=game();
  g.run("showRoom('street');Object.assign(movement,{x:3,y:streetFootY(3),facing:'right'});setVerb('use');handleTarget('alley')");
  g.finish();g.advance(500);
  assert.equal(g.run('gameState.currentRoom'),'alley');
  // Back out without moving: turn to face the street, then cross.
  g.run("handleTarget('street')");
  assert.equal(g.run('movement.facing'),'up');
  assert.equal(g.run('movement.destination'),null);
  assert.equal(g.run('gameState.currentRoom'),'alley');
  g.advance(300);
  assert.equal(g.run('gameState.currentRoom'),'street');
  assert.equal(g.run('movement.facing'),'down','arrives facing the street');
  assert.equal(g.run('movement.y'),64.5);
  // And straight back in: turn toward the alley, then enter facing the camera.
  g.run("handleTarget('alley')");
  assert.equal(g.run('movement.facing'),'up');
  assert.equal(g.run('gameState.currentRoom'),'street');
  g.advance(300);
  assert.equal(g.run('gameState.currentRoom'),'alley');
  assert.equal(g.run('movement.facing'),'down');
  // Walking away during the turn cancels the exit.
  g.run("handleTarget('street');movePlayerTo(35,70)");
  g.advance(500);g.finish();
  assert.equal(g.run('gameState.currentRoom'),'alley');
  assert.equal(g.run('movement.x'),35);
});

test('wake-up plays sleep, 6:00 alarm, black frame and standing reveal in order',()=>{
  const g=game();g.run('beginWakeup()');
  assert.equal(g.run('wakeup.phase'),'sleeping');
  assert.equal(g.get('wakeup-bed').hidden,false);
  assert.equal(g.get('interface').inert,true);
  g.run("movePlayerTo(60,84);setCurtains(true);toggleLight('bedroomMain');saveGame()");
  assert.equal(g.run('movement.destination'),null);
  assert.equal(g.run('gameState.curtainsOpen'),false);
  assert.equal(g.run('gameState.bedroomMainLightOn'),false);
  assert.equal(g.storage.size,0);
  g.advance(2800);assert.equal(g.run('wakeup.phase'),'alarm');
  assert.match(g.get('alarm-closeup').attributes['aria-label'],/6:00/);
  assert.equal(g.get('alarm-closeup').hidden,false);
  g.advance(3200);assert.equal(g.run('wakeup.phase'),'after-alarm');
  assert.equal(g.get('alarm-closeup').hidden,true);
  g.advance(450);assert.equal(g.run('wakeup.phase'),'fade-out');
  assert.equal(g.get('wakeup-bed').hidden,false);
  g.advance(800);assert.equal(g.run('wakeup.phase'),'black');
  assert.equal(g.get('wakeup-bed').hidden,true);
  assert.equal(g.get('wakeup-fade').style.opacity,'1');
  g.advance(200);assert.equal(g.run('wakeup.phase'),'fade-in');
  g.advance(1250);assert.equal(g.run('wakeup.active'),false);
  assert.equal(g.get('interface').inert,false);
  assert.equal(g.run('movement.x'),42);
  assert.equal(g.run('movement.y'),84);
  g.run('movePlayerTo(50,84)');g.finish();
  assert.equal(g.run('movement.x'),50);
});
test('skipping or resetting the wake-up sequence cancels all pending stages',()=>{
  for(const action of ['finishWakeup()','resetGame()']) {
    const g=game();g.run('beginWakeup()');g.advance(2900);g.run(action);
    g.advance(20000);
    assert.equal(g.run('wakeup.active'),false);
    assert.equal(g.run('wakeup.phase'),'idle');
    assert.equal(g.get('alarm-closeup').hidden,true);
    assert.equal(g.get('wakeup-bed').hidden,true);
    assert.equal(g.get('interface').inert,false);
    assert.equal(g.run('wakeup.timers.length'),0);
  }
});

test('bottom interface exposes five verbs, a separate inventory, and no visible state tracker', () => {
  assert.deepEqual([...markup.matchAll(/data-verb="([^"]+)"/g)].map(match => match[1]), ['pickup','place','look','use','talk']);
  assert.doesNotMatch(markup, /data-verb="(?:walk|open|close)"/);
  assert.match(markup, /id="roomControls" hidden/);
  assert.match(markup, /id="inventoryBtn"/);
  assert.match(styles, /#verbs[^}]*repeat\(5[^}]*32px/);
  assert.match(markup, /id="clearVerb"[^>]*aria-label="Deselect current action"/);
});

test('switches and doors respect selected verbs while curtains remain contextual', () => {
  const g = game();
  for (const [target, name] of [['mainLightSwitch', 'bedroom light switch'], ['lamp', 'bedside lamp'], ['door', 'living room door']]) {
    for (const [verb, label] of [['pickup', 'Pick up'], ['place', 'Place'], ['look', 'Look at'], ['use', 'Use'], ['talk', 'Talk to']]) {
      g.run(`showRoom('bedroom');setVerb('${verb}');updateStatus('${target}')`);
      assert.equal(g.get('statusText').textContent, `${label} ${name}`);
    }
  }
  g.run("showRoom('bedroom');setVerb('look');updateStatus('mainLightSwitch')");
  assert.equal(g.get('statusText').textContent, 'Look at bedroom light switch');
  g.run("handleTarget('mainLightSwitch')"); g.finish();
  assert.equal(g.run('gameState.bedroomMainLightOn'), false);
  assert.equal(g.run('gameState.selectedVerb'), 'look');
  assert.equal(g.get('messageBox').textContent, g.run('roomObjects.mainLightSwitch.description'));

  for (const [verb, expected] of [
    ['talk', 'You have nothing to say to the bedroom light switch.'],
    ['pickup', 'The bedroom light switch is fixed in place, or needs to stay where it is.'],
    ['place', 'Choose an item from Inventory to place.']
  ]) {
    g.run(`setVerb('${verb}');handleTarget('mainLightSwitch')`); g.finish();
    assert.equal(g.run('gameState.bedroomMainLightOn'), false);
    assert.equal(g.get('messageBox').textContent, expected);
    assert.equal(g.run('gameState.selectedVerb'), verb);
  }

  g.run("setVerb('use');updateStatus('mainLightSwitch')");
  assert.equal(g.get('statusText').textContent, 'Use bedroom light switch');
  g.run("handleTarget('mainLightSwitch')");
  assert.equal(g.run('gameState.bedroomMainLightOn'), false);
  assert.equal(g.run('gameState.selectedVerb'), 'use');
  g.finish();
  assert.equal(g.run('gameState.bedroomMainLightOn'), true);
  assert.equal(g.run('gameState.selectedVerb'), null);

  g.run("setVerb('look');updateStatus('door')");
  assert.equal(g.get('statusText').textContent, 'Look at living room door');
  g.run("handleTarget('door')"); g.finish();
  assert.equal(g.run('gameState.currentRoom'), 'bedroom');
  assert.equal(g.run('gameState.selectedVerb'), 'look');
  assert.equal(g.get('messageBox').textContent, g.run('roomObjects.door.description'));

  g.run("setVerb('use');handleTarget('door')"); g.finish();
  assert.equal(g.run('gameState.currentRoom'), 'living');
  assert.equal(g.run('gameState.selectedVerb'), null);

  g.run("showRoom('bedroom');setVerb('look');updateStatus('curtains')");
  assert.equal(g.get('statusText').textContent, 'Look at bedroom curtains');
  g.run("handleTarget('curtains')"); g.finish();
  assert.equal(g.run('gameState.curtainsOpen'), false);
  assert.equal(g.run('gameState.selectedVerb'), 'look');
  assert.equal(g.get('messageBox').textContent, g.run('roomObjects.curtains.description'));

  g.run("setVerb('look');updateStatus('lamp');handleTarget('lamp')"); g.finish();
  assert.equal(g.run('gameState.lampOn'), false);
  assert.equal(g.run('gameState.selectedVerb'), 'look');
  assert.equal(g.get('messageBox').textContent, g.run('roomObjects.lamp.description'));
  g.run("setVerb('use');handleTarget('lamp')");
  assert.equal(g.run('gameState.lampOn'), false);
  assert.equal(g.run('gameState.selectedVerb'), 'use');
  g.finish();
  assert.equal(g.run('gameState.lampOn'), true);
  assert.equal(g.run('gameState.selectedVerb'), null);
});

test('a new floor click cancels a contextual action while the character is approaching', () => {
  const g = game();
  g.run("showRoom('bedroom');Object.assign(movement,{x:12,y:84});setVerb('look');handleTarget('door')");
  assert.notEqual(g.run('movement.destination'), null);
  assert.equal(g.run('gameState.selectedVerb'), 'look');
  g.run('movePlayerTo(20,84)'); g.finish();
  assert.equal(g.run('gameState.currentRoom'), 'bedroom');
  assert.equal(g.run('movement.x'), 20);
  assert.equal(g.run('movement.y'), 84);
  assert.equal(g.run('transition'), null);

  g.run("Object.assign(movement,{x:42,y:84});setVerb('use');handleTarget('mainLightSwitch')");
  assert.equal(g.run('gameState.bedroomMainLightOn'), false);
  assert.notEqual(g.run('movement.destination'), null);
  g.run('movePlayerTo(30,84)'); g.finish();
  assert.equal(g.run('gameState.bedroomMainLightOn'), false);
  assert.equal(g.run('gameState.selectedVerb'), 'use');
});

test('the deselect button clears the active action while contextual controls still work', () => {
  const g = game();
  g.run("setVerb('look');setVerb(null)");
  assert.equal(g.run('gameState.selectedVerb'), null);
  assert.equal(g.get('statusText').textContent, 'No action selected');
  assert.ok(g.run("[...document.querySelectorAll('#verbs button')].every(button=>!button.classList.contains('active'))"));
  g.run("updateStatus('mainLightSwitch')");
  assert.equal(g.get('statusText').textContent, 'Turn on bedroom light');
  g.run("handleTarget('mainLightSwitch')");
  assert.equal(g.run('gameState.bedroomMainLightOn'), false);
  assert.notEqual(g.run('movement.destination'), null);
  g.finish();
  assert.equal(g.run('gameState.bedroomMainLightOn'), true);
});

test('every scene object has a useful description and a valid interaction anchor', () => {
  const g = game();
  const count = g.run("Object.values(apartmentRooms).flatMap(room=>Object.values(room.objects)).length");
  assert.ok(count >= 55, 'the audit covers every current scene object');
  assert.equal(g.run("Object.values(apartmentRooms).flatMap(room=>Object.values(room.objects)).every(object=>typeof object.name==='string'&&object.name.length>1&&typeof object.description==='string'&&object.description.length>12&&Array.isArray(object.walk)&&object.walk.length===2)"), true);
});

test('every scene object is reviewed and has appropriate descriptions and interaction replies', () => {
  const g = game();
  let count = 0;
  for (const [roomId, room] of Object.entries(g.run('apartmentRooms'))) {
    assert.deepEqual(Object.keys(g.run(`reviewedObjects[${JSON.stringify(roomId)}]`)).sort(), Object.keys(room.objects).sort(), `${roomId} has no unreviewed or obsolete targets`);
    for (const [target, object] of Object.entries(room.objects)) {
      count++;
      assert.ok(object.kind && object.description.trim().length > 25, `${roomId}.${target} has a reviewed physical kind and description`);
      for (const verb of ['pickup', 'place', 'open', 'close']) {
        assert.ok(object.interactions[verb]?.length > 15, `${roomId}.${target} has an explicit ${verb} reply`);
      }
      g.run(`resetGame();showRoom(${JSON.stringify(roomId)});messageBox.textContent='';interact(${JSON.stringify(target)},'use')`);
      g.finish();g.advance(2500);g.finish();
      const reply = g.get('messageBox').textContent;
      assert.ok(reply.length > 15, `${roomId}.${target} Use responds`);
      assert.doesNotMatch(reply, /nothing useful comes|Nothing useful happens|\bundefined\b|\bnull\b|\[object Object\]/, `${roomId}.${target} Use has a useful message`);
    }
  }
  assert.equal(count, 184);
});

test('placement checks every inventory item against every scene target', () => {
  const g = game();
  for (const [roomId, room] of Object.entries(g.run('apartmentRooms'))) {
    for (const [target, object] of Object.entries(room.objects)) {
      for (const [id, definition] of Object.entries(g.run('itemDefinitions'))) {
        const allowed = (definition.source.room === roomId && definition.source.target === target) ||
          (id === 'extensionCord' && roomId === 'living' && ['entryDrawers','entryTopDrawer','entrySecondDrawer','entryThirdDrawer','entryBottomDrawer'].includes(target));
        g.run(`resetWorldState();showRoom(${JSON.stringify(roomId)});gameState.inventory=[${JSON.stringify(id)}];gameState.itemPlacements[${JSON.stringify(id)}]={kind:'inventory'};interactionSelection.itemId=${JSON.stringify(id)};placeInventoryItem(${JSON.stringify(id)},${JSON.stringify(target)},roomObjects[${JSON.stringify(target)}])`);
        assert.equal(g.run(`gameState.inventory.includes(${JSON.stringify(id)})`), !allowed, `${id} → ${roomId}.${target}`);
        if (!allowed) {
          assert.equal(g.run('interactionSelection.itemId'), id);
          assertPlacementRefusal(g.get('messageBox').textContent, `${id} → ${roomId}.${target}`);
        }
      }
    }
  }
});

test('Place hovers name every destination even when placement will be refused', () => {
  const g = game();
  g.run("showRoom('living');setVerb('use');handleTarget('entryBottomDrawer')");g.finish();
  g.run("setInventoryMode('place');selectInventoryItem('extensionCord')");
  for (const [target, label] of [
    ['bookshelf','Place extension cord on bookshelf'],
    ['rug','Place extension cord on rug'],
    ['counter','Place extension cord in cooking area and drawers'],
    ['fridge','Place extension cord in fridge'],
    ['microwave','Place extension cord in microwave'],
    ['powerOutlet','Place extension cord on power outlet']
  ]) {
    g.run(`updateStatus('${target}')`);
    assert.equal(g.get('statusText').textContent, label);
  }
  for (const [roomId, room] of Object.entries(g.run('apartmentRooms'))) {
    for (const [target, object] of Object.entries(room.objects)) {
      for (const id of Object.keys(g.run('itemDefinitions'))) {
        g.run(`showRoom('${roomId}');gameState.selectedVerb='place';interactionSelection.itemId='${id}';updateStatus('${target}')`);
        assert.doesNotMatch(g.get('statusText').textContent, /in\/on _|undefined/, `${id} → ${roomId}.${target}`);
        if (id === 'extensionCord' && roomId === 'living' && /^entry.*Drawer/.test(target)) continue;
        assert.ok(g.get('statusText').textContent.endsWith(object.placementName || object.name), `${id} → ${roomId}.${target} names the destination`);
      }
    }
  }
});

test('each invalid placement makes a fresh random choice from exactly three refusals', () => {
  const g = game();g.loadCatalog();
  assert.deepEqual(Array.from(g.run('placementRefusals')), placementRefusalMessages);
  g.run("globalThis.randomDraws=0;globalThis.randomChoices=[0,0.4,0.9,0];Math.random=()=>{randomDraws++;return randomChoices.shift()}");
  for (const id of Object.keys(g.run('itemDefinitions'))) {
    g.run(`resetWorldState();showRoom('living');gameState.inventory=['${id}'];gameState.itemPlacements['${id}']={kind:'inventory'};interactionSelection.itemId='${id}';randomDraws=0;randomChoices=[0,0.4,0.9,0]`);
    for (const expected of [...placementRefusalMessages, placementRefusalMessages[0]]) {
      g.run(`placeInventoryItem('${id}','rug',roomObjects.rug)`);
      assert.equal(g.get('messageBox').textContent, expected, id);
      assert.equal(g.run(`gameState.inventory.includes('${id}')`), true);
      assert.equal(g.run('interactionSelection.itemId'), id);
    }
    assert.equal(g.run('randomDraws'), 4);
  }
  const entries = g.run('buildMessageCatalog()');
  assert.equal(g.run('randomDraws'), 4, 'building the master list does not consume randomness');
  for (const message of placementRefusalMessages) {
    assert.ok(entries.some(entry => entry.text === message && entry.trigger.includes('rejected target') && entry.trigger.includes('random selection')));
  }
  assert.ok(!entries.some(entry => /kitchen cutlery|throw the .* away|leave the .* among the shop's stock/.test(entry.text)));
});

test('invalid placement preserves worn items and stale selections cannot create items', () => {
  const g = game();
  g.run("showRoom('bedroom');wearCleanClothes();toggleSocks()");g.advance(2500);g.finish();
  const before = g.run('JSON.stringify({inventory:gameState.inventory,placements:gameState.itemPlacements,outfit:gameState.outfit,socksOn:gameState.socksOn})');
  for (const id of ['cleanClothes','socks']) {
    g.run(`showRoom('living');interactionSelection.itemId='${id}';placeInventoryItem('${id}','entryBottomDrawer',roomObjects.entryBottomDrawer)`);
    assertPlacementRefusal(g.get('messageBox').textContent);
    assert.equal(g.run('JSON.stringify({inventory:gameState.inventory,placements:gameState.itemPlacements,outfit:gameState.outfit,socksOn:gameState.socksOn})'), before);
  }
  g.run("resetWorldState();showRoom('living');placeInventoryItem('extensionCord','entryTopDrawer',roomObjects.entryTopDrawer)");
  assert.equal(g.get('messageBox').textContent, 'You are not carrying that item.');
  assert.equal(g.run("itemAtTarget('living','entryBottomDrawer')"), 'extensionCord');
});

test('inventory Use does not activate unrelated doors, switches or laundry equipment', () => {
  const g = game();
  g.run("showRoom('living');setVerb('use');handleTarget('entryBottomDrawer')");g.finish();
  for (const target of ['bedroomDoor','mainLightSwitch','counter']) {
    g.run(`setInventoryMode('use');selectInventoryItem('extensionCord');handleTarget('${target}')`);g.finish();
    assert.equal(g.run('gameState.currentRoom'), 'living');
    assert.equal(g.run('gameState.livingMainLightOn'), false);
    assert.equal(g.run("gameState.inventory.includes('extensionCord')"), true);
  }
  g.run("setInventoryMode('use');selectInventoryItem('extensionCord');handleTarget('powerOutlet')");g.finish();
  assert.equal(g.get('messageBox').textContent, 'The extension cord needs something to supply power to before you plug it in.');
  g.run("showRoom('laundry');setInventoryMode('place');selectInventoryItem('extensionCord');handleTarget('machineEight')");g.finish();
  assertPlacementRefusal(g.get('messageBox').textContent);
});

test('storage descriptions reflect clothing and socks being taken out', () => {
  const g = game();
  g.run("showRoom('bedroom');wearCleanClothes()");g.advance(2500);g.finish();
  g.run("setVerb('look');handleTarget('cupboard')");g.finish();
  assert.match(g.get('messageBox').textContent, /clean work outfit has been taken out/);
  g.run("setVerb('use');handleTarget('drawers')");g.finish();
  g.run("setVerb('look');handleTarget('drawers')");g.finish();
  assert.match(g.get('messageBox').textContent, /white socks have been taken out/);
});

test('every object has capitalized hover labels and responses for all five actions', () => {
  const g = game();
  assert.equal(g.run("Object.values(apartmentRooms).flatMap(room=>Object.values(room.objects)).every(object=>/^[A-Z0-9]/.test(objectDisplayName(object)))"), true);
  assert.equal(g.run("Object.values(apartmentRooms).flatMap(room=>Object.entries(room.objects)).every(([target,object])=>['look','use','talk','pickup','place'].every(verb=>typeof interactionReply(target,object,verb)==='string'&&interactionReply(target,object,verb).length>8))"), true);
  for (const room of Object.keys(g.run('apartmentRooms'))) {
    g.run(`showRoom('${room}')`);
    assert.ok(g.get('hotspots').children.every(button => /^[A-Z0-9]/.test(button.attributes['aria-label'])));
    for (const [target, object] of Object.entries(g.run('roomObjects'))) {
      assert.match(object.name, /^(?:[a-z0-9]|TV\b|ATM\b|Bluestar\b|Laundry\b|Dollar\b)/, `${room}.${target} uses lower-case ordinary words or a proper name/acronym`);
      g.run(`setVerb('look');updateStatus(${JSON.stringify(target)})`);
      assert.equal(g.get('statusText').textContent, `Look at ${object.name}`, `${room}.${target} keeps the object name in sentence case after Look at`);
      if (!object.lightCircuit && !object.portal && !object.streetDoor && !object.streetExit && !object.alleyExit && !object.bluestarExit && !object.laundryExit && !object.curtainRoom && !object.garageCall && !object.locked) {
        g.run(`setVerb(null);updateStatus(${JSON.stringify(target)})`);
        assert.equal(g.get('statusText').textContent, object.name.charAt(0).toUpperCase() + object.name.slice(1), `${room}.${target} capitalizes a standalone name`);
      }
    }
  }
  g.run("showRoom('bedroom');setVerb(null);updateStatus('bed')");
  assert.equal(g.get('statusText').textContent, 'Bed');
  g.run("setVerb('look');updateStatus('bed')");
  assert.equal(g.get('statusText').textContent, 'Look at bed');
  assert.equal(g.run("interactionReply('tv',apartmentRooms.living.objects.tv,'talk')"), "You don't feel like talking to the TV.");
  assert.equal(g.run("interactionReply('blueCar',apartmentRooms.outside.objects.blueCar,'talk')"), "You don't feel like talking to the car.");
  assert.match(g.run("interactionReply('plant',apartmentRooms.living.objects.plant,'talk')"), /plant leans toward the window/);
});

test('all object, inventory and hover labels use sentence case and omit terminal punctuation', () => {
  const g = game();g.loadCatalog();
  const properWords = new Set(['TV', 'ATM', 'Bluestar', 'Dollar', 'Laundry', 'Lonza', 'Experience']);
  const names = g.run('Object.values(apartmentRooms).flatMap(room=>Object.values(room.objects)).concat(Object.values(itemDefinitions))');
  for (const object of names) {
    assert.doesNotMatch(object.name, /[.!?]$/, object.name);
    for (const word of object.name.split(/\s+/)) {
      if (/^[A-Z]/.test(word)) assert.ok(properWords.has(word), `${object.name} capitalises only proper names and acronyms`);
    }
    assert.equal(g.run(`displayName(${JSON.stringify(object.name)})`), object.name[0].toUpperCase() + object.name.slice(1));
  }
  for (const [room, target, standalone, action] of [
    ['living','entryTopDrawer','Top drawer','Look at top drawer'],
    ['living','coffeeTable','Coffee table','Look at coffee table'],
    ['living','tv','Living room TV','Look at living room TV'],
    ['street','laundryWindow','Dollar Laundry','Look at Dollar Laundry'],
    ['garage','blueCar','Blue Lonza Experience','Look at blue Lonza Experience']
  ]) {
    g.run(`showRoom('${room}');setVerb(null);updateStatus('${target}')`);
    assert.equal(g.get('statusText').textContent, standalone);
    g.run(`setVerb('look');updateStatus('${target}')`);
    assert.equal(g.get('statusText').textContent, action);
  }
  g.run("showRoom('living');setVerb('pickup');updateStatus('toaster')");
  assert.equal(g.get('statusText').textContent, 'Pick up toaster');
  g.run("updateStatus('bedroomDoor')");
  assert.equal(g.get('statusText').textContent, 'Pick up bedroom door');
  g.run("gameState.inventory=Object.keys(itemDefinitions);renderInventory()");
  for (const card of g.get('inventoryItems').children) {
    const definition = g.run(`itemDefinitions[${JSON.stringify(card.dataset.item)}]`);
    assert.equal(card.children[1].children[0].textContent, definition.name[0].toUpperCase() + definition.name.slice(1));
  }
  for (const entry of g.run('buildMessageCatalog()')) {
    if (!entry.categories.includes('hover')) continue;
    assert.doesNotMatch(entry.text, /[.!?]$/, entry.trigger);
    assert.match(entry.text, /^[A-Z0-9]/, entry.trigger);
  }
});

test('descriptions, inventory text and interaction sentences retain appropriate terminal punctuation', () => {
  const g = game();
  const sentenceEnd = /[.!?][”’"')]*$/;
  for (const [roomId, room] of Object.entries(g.run('apartmentRooms'))) {
    for (const [target, object] of Object.entries(room.objects)) {
      for (const text of [object.description, object.response, object.lockedResponse, ...Object.values(object.interactions || {})].filter(Boolean)) {
        assert.match(text, sentenceEnd, `${roomId}.${target}: ${text}`);
      }
    }
  }
  for (const item of Object.values(g.run('itemDefinitions'))) assert.match(item.description, sentenceEnd, item.name);
  for (const reply of g.run('channels')) assert.match(reply, sentenceEnd, reply);
  g.run("gameState.inventory=['socks'];gameState.itemPlacements.socks={kind:'worn'};renderInventory()");
  assert.equal(g.get('inventoryItems').children[0].children[1].children[1].textContent, 'You are wearing these.');
});

test('selected-item Use hover stays accurate over contextual doors and switches', () => {
  const g = game();
  g.run("showRoom('living');setVerb('use');handleTarget('entryBottomDrawer')");g.finish();
  g.run("setInventoryMode('use');selectInventoryItem('extensionCord');updateStatus('bedroomDoor')");
  assert.equal(g.get('statusText').textContent, 'Use extension cord with bedroom door');
  g.run("updateStatus('mainLightSwitch')");
  assert.equal(g.get('statusText').textContent, 'Use extension cord with main light switch');
});

test('walkable furnishings still respond to Pick Up, Place and Talk To', () => {
  const g = game();
  g.run("showRoom('living');setVerb('pickup');handleTarget('rug',{detail:1,clientX:500,clientY:500})"); g.finish();
  assert.match(g.get('messageBox').textContent, /needs to stay on the floor/);
  g.run("setVerb('place');handleTarget('rug',{detail:1,clientX:500,clientY:500})"); g.finish();
  assert.equal(g.get('messageBox').textContent, 'Choose an item from Inventory to place.');
  g.run("setVerb('talk');handleTarget('livingCurtains')"); g.finish();
  assert.equal(g.run('gameState.livingCurtainsOpen'), false);
  assert.match(g.get('messageBox').textContent, /nothing to say to the living room curtains/);
});

test('the toaster returns to the bench and apartment keys use the same inventory model', () => {
  const g = game();
  g.run("showRoom('living');setVerb('pickup');handleTarget('toaster')");g.finish();
  g.run("interactionSelection.itemId='toaster';setVerb('place',{keepItem:true});updateStatus('toaster')");
  assert.equal(g.get('statusText').textContent, 'Place toaster on bench');
  g.run("handleTarget('toaster')");g.finish();
  assert.equal(g.get('messageBox').textContent, 'You place the toaster on the bench.');
  g.run("setVerb('pickup');handleTarget('keys')");g.finish();
  assert.equal(g.run('gameState.keysTaken'), true);
  assert.equal(g.run("gameState.inventory.includes('keys')"), true);
  assert.equal(g.run('gameState.itemPlacements.keys.kind'), 'inventory');
  g.run('saveGame();resetWorldState();loadGame()');
  assert.equal(g.run("gameState.inventory.includes('keys')"), true);
  assert.equal(g.run('gameState.keysTaken'), true);
});

test('Developer Tools exposes a reversible object-highlight toggle', () => {
  assert.match(markup, /id="devHighlightObjectsBtn"[^>]*aria-pressed="false"[^>]*>Highlight Objects: Off/);
  assert.match(styles, /body.highlight-objects #scene .hotspot[^}]*border:2px dotted/);
  assert.ok(fs.readFileSync(path.join(__dirname, '..', 'devtools.js'), 'utf8').includes('devHighlightObjectsBtn.textContent'));
});

test('inventory pauses movement without changing lighting and resumes exactly where it stopped', () => {
  const g = game();
  g.run('gameState.bedroomMainLightOn=true;syncRoom();movePlayerTo(55,84)');
  assert.notEqual(g.run('movement.frame'), null);
  g.run('openInventory()');
  assert.equal(g.run('gameTimers.paused'), true);
  assert.equal(g.run('movement.frame'), null);
  assert.equal(g.run('gameState.bedroomMainLightOn'), true);
  assert.equal(g.get('inventoryOverlay').hidden, false);
  g.run('closeInventory()');
  assert.equal(g.run('gameTimers.paused'), false);
  assert.notEqual(g.run('movement.frame'), null);
  assert.equal(g.run('gameState.bedroomMainLightOn'), true);
  g.finish();
});

test('inventory Use and Place select an item and reject other containers through save/load', () => {
  const g = game();
  g.run('showRoom("living");setVerb("pickup");handleTarget("toaster")');g.finish();
  g.run('openInventory();setInventoryMode("use");selectInventoryItem("toaster")');
  assert.equal(g.run('interactionSelection.itemId'), 'toaster');
  assert.equal(g.run('gameState.selectedVerb'), 'use');
  g.run('updateStatus("coffee")');
  assert.equal(g.get('statusText').textContent, 'Use toaster with coffee machine');
  g.run('openInventory();setInventoryMode("place");selectInventoryItem("toaster");handleTarget("fridge")');g.finish();
  assertPlacementRefusal(g.get('messageBox').textContent);
  assert.equal(g.run('gameState.inventory.length'), 1);
  assert.equal(g.run('gameState.itemPlacements.toaster.kind'), 'inventory');
  assert.equal(g.run('gameState.toasterTaken'), true);
  g.run('handleTarget("toaster")');g.finish();
  assert.equal(g.run('gameState.itemPlacements.toaster.target'), 'toaster');
  g.run('setVerb("pickup");handleTarget("toaster")');g.finish();
  assert.equal(g.run('JSON.stringify(gameState.inventory)'), '["toaster"]');
  g.run('saveGame();resetWorldState();loadGame()');
  assert.equal(g.run('JSON.stringify(gameState.inventory)'), '["toaster"]');
  assert.equal(g.run('gameState.itemPlacements.toaster.kind'), 'inventory');
});

test('every portable item rejects other locations and can return to its source', () => {
  const g = game();
  for (const [id, definition] of Object.entries(g.run('itemDefinitions'))) {
    g.run(`resetWorldState();gameState.inventory=[${JSON.stringify(id)}];gameState.itemPlacements[${JSON.stringify(id)}]={kind:'inventory'};showRoom('bathroom');setInventoryMode('place');selectInventoryItem(${JSON.stringify(id)});handleTarget('sink')`);g.finish();
    assertPlacementRefusal(g.get('messageBox').textContent, id);
    assert.equal(g.run(`gameState.inventory.includes(${JSON.stringify(id)})`), true, id);
    assert.equal(g.run('interactionSelection.itemId'), id, 'rejection keeps the selected item');
    g.run(`showRoom(${JSON.stringify(definition.source.room)});handleTarget(${JSON.stringify(definition.source.target)})`);g.finish();
    assert.equal(g.run(`gameState.inventory.includes(${JSON.stringify(id)})`), false, id);
    assert.equal(g.run(`gameState.itemPlacements[${JSON.stringify(id)}].room`), definition.source.room, id);
    assert.equal(g.run(`gameState.itemPlacements[${JSON.stringify(id)}].target`), definition.source.target, id);
  }
});

test('the message catalogue includes live replies, state variants, hover, inventory and attributed dialogue without changing the game', () => {
  const g = game();g.loadCatalog();
  g.run("showRoom('living');setInventoryMode('place');selectInventoryItem('extensionCord');updateStatus('entryBottomDrawer')");
  const before = g.run('JSON.stringify({gameState,interactionSelection,movement,status:statusText.textContent})');
  g.run('globalThis.catalogEntries = buildMessageCatalog()');
  assert.equal(g.run('JSON.stringify({gameState,interactionSelection,movement,status:statusText.textContent})'), before);
  const entries = g.run('catalogEntries');
  assert.ok(entries.some(entry => entry.text === 'Place extension cord in drawers' && entry.categories.includes('hover')));
  assert.ok(entries.some(entry => entry.text === "That's not where it goes." && entry.categories.includes('place')));
  assert.ok(entries.some(entry => entry.text === 'A five metre extension cord.' && entry.categories.includes('inventory')));
  assert.ok(entries.some(entry => entry.text === 'You switch the bedside lamp on.' && entry.trigger.includes("target === 'lamp'")));
  assert.ok(entries.some(entry => entry.text === 'You switch the bedside lamp off.'));
  assert.ok(entries.some(entry => entry.text === 'You straighten the pillow. Close enough for now.' && entry.trigger.includes('bed')));
  assert.ok(entries.some(entry => entry.text === 'Weather: another grey morning.'));
  assert.ok(entries.some(entry => entry.text.includes('Morning,') && entry.speaker === 'Owen' && entry.categories.includes('dialogue')));
  assert.ok(entries.some(entry => entry.text.startsWith('A quiet morning.')));
  assert.ok(entries.some(entry => entry.template && entry.definition));
  g.run("globalThis.filteredEntries = filterMessageCatalog(catalogEntries,new Set(['dialogue']),'Owen')");
  assert.ok(g.run('filteredEntries.length') >= 4);
  assert.ok(g.run("filteredEntries.every(entry=>entry.speaker==='Owen' && entry.categories.includes('dialogue'))"));
  assert.ok(g.run("filteredEntries.every(entry=>!entry.categories.includes('look') && !entry.categories.includes('walk'))"));
  assert.equal(g.run("filterMessageCatalog(catalogEntries,new Set(),'').length"), 0);
});

test('selected-item placement rejects doors, switches and curtains without activating them', () => {
  const g = game();
  g.run("showRoom('living');setVerb('pickup');handleTarget('toaster')");g.finish();
  for (const [roomId, room] of Object.entries(g.run('apartmentRooms'))) {
    for (const [target, object] of Object.entries(room.objects)) {
      if (!object.lightCircuit && !object.curtainRoom && !object.to && !object.garageCall) continue;
      g.run(`showRoom(${JSON.stringify(roomId)});setInventoryMode('place');selectInventoryItem('toaster');handleTarget(${JSON.stringify(target)})`);g.finish();
      assertPlacementRefusal(g.get('messageBox').textContent, `${roomId}.${target}`);
      assert.equal(g.run('gameState.currentRoom'), roomId);
      assert.equal(g.run("gameState.inventory.includes('toaster')"), true);
    }
  }
});

test('the message catalogue rebuilds after additions, edits and removals in live data and loaded code', () => {
  const g = game();g.loadCatalog();
  g.run("apartmentRooms.living.objects.powerOutlet.description='A changed outlet description.';globalThis.catalogTestTrigger=function(){showMessage('A newly added game message.')}");
  let entries = g.run('buildMessageCatalog()');
  assert.ok(entries.some(entry => entry.text === 'A changed outlet description.'));
  assert.ok(entries.some(entry => entry.text === 'A newly added game message.'));
  g.run("globalThis.catalogTestTrigger=function(){showMessage('The replacement game message.')};delete apartmentRooms.living.objects.powerOutlet");
  entries = g.run('buildMessageCatalog()');
  assert.ok(entries.some(entry => entry.text === 'The replacement game message.'));
  assert.ok(!entries.some(entry => entry.text === 'A newly added game message.' || entry.text === 'A changed outlet description.'));
  g.run('delete globalThis.catalogTestTrigger');
  entries = g.run('buildMessageCatalog()');
  assert.ok(!entries.some(entry => entry.text === 'The replacement game message.'));
});

test('Use collects the extension cord from the bottom drawer and it can be put back', () => {
  const g = game();
  g.run("showRoom('living');setVerb('look');handleTarget('entryBottomDrawer')");g.finish();
  assert.equal(g.get('messageBox').textContent, 'The bottom drawer holds reusable shopping bags and an extension cord.');
  g.run("setVerb('pickup');updateStatus('entryBottomDrawer')");
  assert.equal(g.get('statusText').textContent, 'Pick up bottom drawer');
  g.run("handleTarget('entryBottomDrawer')");g.finish();
  assert.equal(g.get('messageBox').textContent, "You don't want to pick up the drawer.");
  assert.equal(g.run("gameState.inventory.includes('extensionCord')"), false);
  g.run("setVerb('use');handleTarget('entryBottomDrawer')");g.finish();
  assert.equal(g.run("gameState.inventory.includes('extensionCord')"), true);
  assert.equal(g.get('messageBox').textContent, 'You pick up the extension cord.');
  const card = g.get('inventoryItems').children.find(card => card.dataset.item === 'extensionCord');
  assert.ok(card.children[0].className.includes('item-extension-cord'));
  assert.equal(card.children[1].children[0].textContent, 'Extension cord');
  assert.equal(card.children[1].children[1].textContent, 'A five metre extension cord.');
  g.run("setVerb('look');handleTarget('entryBottomDrawer')");g.finish();
  assert.equal(g.get('messageBox').textContent, 'The bottom drawer holds reusable shopping bags.');
  g.run("setVerb('use');handleTarget('entryBottomDrawer')");g.finish();
  assert.equal(g.run("gameState.inventory.filter(id=>id==='extensionCord').length"), 1);
  g.run('saveGame();resetWorldState();loadGame()');
  assert.equal(g.run("gameState.itemPlacements.extensionCord.kind"), 'inventory');
  g.run("setVerb(null);openInventory();selectInventoryItem('extensionCord')");
  assert.equal(g.get('messageBox').textContent, 'A five metre extension cord.');
  g.run("setInventoryMode('place');selectInventoryItem('extensionCord');updateStatus('entryBottomDrawer')");
  assert.equal(g.get('statusText').textContent, 'Place extension cord in drawers');
  g.run("handleTarget('entryBottomDrawer')");g.finish();
  assert.equal(g.run("gameState.inventory.includes('extensionCord')"), false);
  assert.equal(g.run("itemAtTarget('living','entryBottomDrawer')"), 'extensionCord');
  g.run('saveGame();resetWorldState();loadGame()');
  assert.equal(g.run("itemAtTarget('living','entryBottomDrawer')"), 'extensionCord');
  g.run("setVerb('use');handleTarget('entryBottomDrawer')");g.finish();
  g.run('resetGame()');
  assert.equal(g.run("gameState.inventory.includes('extensionCord')"), false);
  assert.equal(g.run("itemAtTarget('living','entryBottomDrawer')"), 'extensionCord');
  const icon = fs.readFileSync(path.join(__dirname, '..', 'assets', 'used', 'extension-cord-icon-v15.png'));
  assert.equal(icon.subarray(1,4).toString('ascii'), 'PNG');
  assert.equal(icon[25], 6, 'the custom inventory graphic preserves its RGBA transparency');
  assert.match(styles, /item-extension-cord[^}]*extension-cord-icon-v15/);
});

test('the extension cord returns only to the living-room entryway chest, never kitchen or bedroom drawers', () => {
  const g = game();
  for (const [roomId, room] of Object.entries(g.run('apartmentRooms'))) {
    for (const [target, object] of Object.entries(room.objects)) {
      if (!/\bdrawers?\b/i.test(object.name)) continue;
      g.run("showRoom('living');setVerb('use');handleTarget('entryBottomDrawer')");g.finish();
      g.run(`showRoom(${JSON.stringify(roomId)});setInventoryMode('place');selectInventoryItem('extensionCord');updateStatus(${JSON.stringify(target)})`);
      if (roomId !== 'living' || target === 'counter') {
        assert.notEqual(g.get('statusText').textContent, 'Place extension cord in drawers');
        g.run(`handleTarget(${JSON.stringify(target)})`);g.finish();
        assertPlacementRefusal(g.get('messageBox').textContent);
        assert.equal(g.run("gameState.inventory.includes('extensionCord')"), true);
        g.run("showRoom('living');handleTarget('entryBottomDrawer')");g.finish();
        continue;
      }
      assert.equal(g.get('statusText').textContent, 'Place extension cord in drawers', `${roomId}.${target}`);
      g.run(`handleTarget(${JSON.stringify(target)})`);g.finish();
      assert.equal(g.get('messageBox').textContent, 'You place the extension cord in the bottom drawer.', `${roomId}.${target}`);
      assert.equal(g.run("gameState.inventory.includes('extensionCord')"), false);
      assert.equal(g.run("itemAtTarget('living','entryBottomDrawer')"), 'extensionCord');
    }
  }
});

test('all drawers refuse Pick up, including when they contain a portable item', () => {
  const g = game();
  for (const [roomId, room] of Object.entries(g.run('apartmentRooms'))) {
    for (const [target, object] of Object.entries(room.objects)) {
      if (!/\bdrawers?\b/i.test(object.name)) continue;
      g.run(`showRoom(${JSON.stringify(roomId)});setVerb('pickup');handleTarget(${JSON.stringify(target)})`);g.finish();
      assert.equal(g.get('messageBox').textContent, "You don't want to pick up the drawer.", `${roomId}.${target}`);
    }
  }
  assert.equal(g.run('gameState.inventory.length'), 0);
  assert.equal(g.run("itemAtTarget('living','entryBottomDrawer')"), 'extensionCord');
});

test('the living-room outlet beside the bedroom door is selectable and reachable', () => {
  const g = game();
  g.run("showRoom('living');setVerb(null);updateStatus('powerOutlet')");
  assert.equal(g.get('statusText').textContent, 'Power outlet');
  const outlet = g.get('hotspots').children.find(button => button.dataset.target === 'powerOutlet');
  assert.ok(outlet);
  assert.ok(g.run('roomObjects.powerOutlet.area[0] < roomObjects.bedroomDoor.area[0]'));
  assert.ok(g.run('isFloorPoint({x:16,y:59},apartmentRooms.living)'));
  g.run("setVerb('look');updateStatus('powerOutlet')");
  assert.equal(g.get('statusText').textContent, 'Look at power outlet');
  g.run("handleTarget('powerOutlet')");g.finish();
  assert.equal(g.get('messageBox').textContent, 'A double power outlet sits low on the wall to the left of the bedroom door.');
  g.run("setVerb('use');handleTarget('powerOutlet')");g.finish();
  assert.equal(g.get('messageBox').textContent, 'Nothing is plugged into the outlet.');
  g.run("setVerb('pickup');handleTarget('powerOutlet')");g.finish();
  assert.match(g.get('messageBox').textContent, /fixed in place/);
});

test('saves from before the extension cord place it in the bottom drawer', () => {
  for (const version of [5,7]) {
    const g = game();
    g.run(`showRoom('living');saveGame();const oldSave=JSON.parse(localStorage.getItem(SAVE_KEY));oldSave.version=${version};delete oldSave.state.itemPlacements.extensionCord;localStorage.setItem(SAVE_KEY,JSON.stringify(oldSave));gameState.itemPlacements.extensionCord={kind:'inventory'};gameState.inventory.push('extensionCord');loadGame()`);
    assert.equal(g.run("itemAtTarget('living','entryBottomDrawer')"), 'extensionCord');
    assert.equal(g.run("gameState.inventory.includes('extensionCord')"), false);
  }
});

test('the developer menu includes an empty future character-stats screen', () => {
  assert.match(markup, /id="devStatsBtn"[^>]*>Character Stats</);
  assert.match(markup, /id="devStats"[^>]*hidden/);
  assert.ok(source.includes('characterStats: { schemaVersion: 1, definitions: {}, values: {}, displayMode: null }'));
});


test('crumpled clothes remain transparent, lighting-matched, portable and persistent', () => {
  const assetRoot = path.join(__dirname, '..', 'assets', 'used');
  const base = fs.readFileSync(path.join(assetRoot, 'bedroom-crumpled-clothes-v1.png'));
  assert.equal(base.readUInt32BE(16), 1237);
  assert.equal(base.readUInt32BE(20), 547);
  assert.equal(base[25], 6, 'the prop must use RGBA transparency');
  for (const c of [0,1]) for (const l of [0,1]) for (const m of [0,1]) {
    assert.ok(fs.existsSync(path.join(assetRoot, 'lighting', 'bedroom-clothes-v1', 'bedroom-c' + c + '-l' + l + '-m' + m + '.png')));
  }
  const g = game();
  assert.equal(g.run("itemAtTarget('bedroom','crumpledClothes')"), 'crumpledClothes');
  g.run("setVerb('pickup');handleTarget('crumpledClothes')"); g.finish();
  assert.equal(g.run("gameState.inventory.includes('crumpledClothes')"), true);
  assert.equal(g.get('bedroom-clothes').classList.contains('is-away'), true);
  g.run("interactionSelection.itemId='crumpledClothes';setVerb('place',{keepItem:true});handleTarget('crumpledClothes')"); g.finish();
  assert.equal(g.get('messageBox').textContent, 'You place the crumpled clothes on the carpet.');
  assert.equal(g.get('bedroom-clothes').classList.contains('is-away'), false);
  g.run("toggleLight('bedroomMain')");
  assert.match(g.run('displayedClothesImage'), /bedroom-c0-l0-m1\.png/);
  g.run("setVerb('pickup');handleTarget('crumpledClothes')"); g.finish();
  g.run('saveGame();resetWorldState();loadGame()');
  assert.equal(g.run("gameState.inventory.includes('crumpledClothes')"), true);
});


test('wardrobe actions switch all six player sheets and keep worn items in inventory', () => {
  const assets = path.join(__dirname, '..', 'assets', 'used');
  for (const file of ['player-sheet-keyed-v1.png','player-sheet-underwear-socks-v6.png','player-sheet-clothes-barefoot-v14.png','player-sheet-clothes-socks-v17.png','player-sheet-clean-barefoot-v16.png','player-sheet-clean-socks-v19.png']) {
    const png = fs.readFileSync(path.join(assets, file));
    assert.equal(png.readUInt32BE(16), 1619, file + ' width');
    assert.equal(png.readUInt32BE(20), 971, file + ' height');
    assert.equal(png[25], 6, file + ' must retain RGBA transparency');
  }
  const g = game();
  g.run("setVerb('use');handleTarget('crumpledClothes')"); g.finish(); g.advance(250);
  assert.equal(g.run('gameState.outfit'), 'crumpled');
  assert.equal(g.run("gameState.itemPlacements.crumpledClothes.kind"), 'worn');
  assert.equal(g.run("gameState.inventory.includes('crumpledClothes')"), true);
  assert.match(g.get('player').querySelector().style['--player-sheet'], /player-sheet-clothes-barefoot-v14/);
  g.run('renderInventory()');
  assert.equal(g.get('inventoryItems').children[0].children[1].children[1].textContent, 'You are wearing these.');
  g.advance(300);

  g.run("interactionSelection.itemId='crumpledClothes';setVerb('place',{keepItem:true});handleTarget('crumpledClothes')"); g.finish(); g.advance(250);
  assert.equal(g.run('gameState.outfit'), 'underwear');
  assert.equal(g.run("gameState.itemPlacements.crumpledClothes.kind"), 'world');
  assert.match(g.get('player').querySelector().style['--player-sheet'], /player-sheet-keyed-v1/);
  g.advance(300);

  g.run("setVerb('use');handleTarget('drawers')"); g.finish(); g.advance(250);
  assert.equal(g.run('gameState.socksOn'), true);
  assert.equal(g.run("gameState.itemPlacements.socks.kind"), 'worn');
  assert.equal(g.run("gameState.inventory.includes('socks')"), true);
  assert.match(g.get('player').querySelector().style['--player-sheet'], /player-sheet-underwear-socks-v6/);
  g.advance(300);
  g.run("setVerb('use');handleTarget('drawers')"); g.finish();
  assert.equal(g.run('gameState.socksOn'), false);
  assert.equal(g.run("gameState.itemPlacements.socks.kind"), 'stored');
  assert.equal(g.run("gameState.inventory.includes('socks')"), false);
  assert.equal(g.get('messageBox').textContent, 'You take off the socks and put them back in the chest of drawers.');
  g.run("setVerb('use');handleTarget('drawers')"); g.finish();

  g.run("wearCrumpledClothes()"); g.advance(250);
  assert.match(g.get('player').querySelector().style['--player-sheet'], /player-sheet-clothes-socks-v17/);
  g.advance(300);
  g.run("interactionSelection.itemId='socks';setVerb('place',{keepItem:true});handleTarget('drawers')"); g.finish(); g.advance(250);
  assert.equal(g.run('gameState.socksOn'), false);
  assert.equal(g.run("gameState.itemPlacements.socks.kind"), 'stored');
  assert.equal(g.run("gameState.inventory.includes('socks')"), false);
  assert.match(g.get('player').querySelector().style['--player-sheet'], /player-sheet-clothes-barefoot-v14/);
});


test('worn clothes and socks persist through save/load and reset to the original outfit', () => {
  const g = game();
  g.run('wearCrumpledClothes()'); g.advance(600);
  g.run('wearSocks()'); g.advance(600);
  g.run('saveGame();resetWorldState();loadGame()');
  assert.equal(g.run('gameState.outfit'), 'crumpled');
  assert.equal(g.run('gameState.socksOn'), true);
  assert.equal(g.run("gameState.itemPlacements.crumpledClothes.kind"), 'worn');
  assert.equal(g.run("gameState.itemPlacements.socks.kind"), 'worn');
  assert.equal(g.run("gameState.inventory.includes('crumpledClothes') && gameState.inventory.includes('socks')"), true);
  assert.match(g.get('player').querySelector().style['--player-sheet'], /player-sheet-clothes-socks-v17/);
  g.run('resetGame()');
  assert.equal(g.run('gameState.outfit'), 'underwear');
  assert.equal(g.run('gameState.socksOn'), false);
  assert.equal(g.run("gameState.itemPlacements.crumpledClothes.kind"), 'world');
  assert.equal(g.run("gameState.itemPlacements.socks.kind"), 'stored');
});


test('the clothes spot becomes Carpet and only clothes changes use the black fade', () => {
  const g = game();
  g.run("setVerb('use');handleTarget('crumpledClothes')"); g.finish();
  assert.equal(g.run('gameState.outfit'), 'underwear');
  assert.equal(g.get('scene').classList.contains('wardrobe-fade'), true);
  g.advance(240);
  assert.equal(g.run('gameState.outfit'), 'crumpled');
  assert.equal(g.get('scene').classList.contains('wardrobe-fade'), true, 'the sprite swaps while black is held');
  g.advance(50);
  assert.equal(g.get('scene').classList.contains('wardrobe-reveal'), true);
  g.advance(250);
  g.run("setVerb(null);updateStatus('crumpledClothes')");
  assert.equal(g.get('statusText').textContent, 'Carpet');
  g.run("setVerb('look');updateStatus('crumpledClothes');interact('crumpledClothes','look')");
  assert.equal(g.get('statusText').textContent, 'Look at carpet');
  assert.equal(g.get('messageBox').textContent, "It's the carpet.");
  assert.equal(g.get('hotspots').children.find(button=>button.dataset.target==='crumpledClothes').attributes['aria-label'], 'Carpet');

  g.run("interactionSelection.itemId='crumpledClothes';setVerb('place',{keepItem:true});handleTarget('crumpledClothes')"); g.finish();
  assert.equal(g.run('gameState.outfit'), 'crumpled');
  assert.equal(g.get('scene').classList.contains('wardrobe-fade'), true);
  g.advance(240);
  assert.equal(g.run('gameState.outfit'), 'underwear');
  g.advance(300);

  g.run("setVerb('use');handleTarget('drawers')"); g.finish();
  assert.equal(g.run('gameState.socksOn'), true);
  assert.equal(g.run('wardrobeChanging'), false);
  assert.equal(g.get('scene').classList.contains('wardrobe-fade'), false);
  assert.match(g.get('player').querySelector().style['--player-sheet'], /player-sheet-underwear-socks-v6/);
  g.run("interactionSelection.itemId='socks';setVerb('place',{keepItem:true});handleTarget('drawers')"); g.finish();
  assert.equal(g.run('gameState.socksOn'), false);
  assert.equal(g.run('wardrobeChanging'), false);
});

test('the Wardrobe toggles clean clothes and swaps clean and crumpled outfits safely', () => {
  const g = game();
  assert.equal(g.run("bedroomObjects.cupboard.name"), 'wardrobe');

  g.run("setVerb('use');handleTarget('cupboard')"); g.finish();
  assert.equal(g.get('scene').classList.contains('wardrobe-fade'), true);
  g.advance(240);
  assert.equal(g.run('gameState.outfit'), 'clean');
  assert.equal(g.run("gameState.itemPlacements.cleanClothes.kind"), 'worn');
  assert.equal(g.run("gameState.inventory.includes('cleanClothes')"), true);
  assert.match(g.get('player').querySelector().style['--player-sheet'], /player-sheet-clean-barefoot-v16/);
  g.advance(300);
  g.run('wearCleanClothes()');
  assert.equal(g.get('messageBox').textContent, "You're already wearing clean clothes.");

  g.run("setVerb('use');handleTarget('cupboard')"); g.finish(); g.advance(240);
  assert.equal(g.run('gameState.outfit'), 'underwear');
  assert.equal(g.run("gameState.itemPlacements.cleanClothes.kind"), 'stored');
  assert.equal(g.run("gameState.inventory.includes('cleanClothes')"), false);
  g.advance(300);

  g.run("setVerb('use');handleTarget('crumpledClothes')"); g.finish(); g.advance(540);
  g.run("setVerb('use');handleTarget('cupboard')"); g.finish(); g.advance(540);
  assert.equal(g.run('gameState.outfit'), 'clean');
  assert.equal(g.get('messageBox').textContent, 'You throw the crumpled clothes back on the carpet and put on the clean clothes.');
  assert.equal(g.run("gameState.itemPlacements.crumpledClothes.kind"), 'world');
  assert.equal(g.get('bedroom-clothes').classList.contains('is-away'), false);

  g.run("setVerb('use');handleTarget('crumpledClothes')"); g.finish(); g.advance(540);
  assert.equal(g.run('gameState.outfit'), 'crumpled');
  assert.equal(g.get('messageBox').textContent, 'You put the clean clothes back in the wardrobe and put on the crumpled clothes.');
  assert.equal(g.run("gameState.itemPlacements.cleanClothes.kind"), 'stored');

  g.run("setVerb('use');handleTarget('cupboard')"); g.finish(); g.advance(540);
  g.run("interactionSelection.itemId='cleanClothes';setVerb('place',{keepItem:true});handleTarget('cupboard')"); g.finish(); g.advance(240);
  assert.equal(g.run('gameState.outfit'), 'underwear');
  assert.equal(g.run("gameState.itemPlacements.cleanClothes.kind"), 'stored');
  g.advance(300);

  g.run("setVerb('use');handleTarget('drawers')"); g.finish();
  g.run("setVerb('use');handleTarget('cupboard')"); g.finish(); g.advance(240);
  assert.match(g.get('player').querySelector().style['--player-sheet'], /player-sheet-clean-socks-v19/);
});
test('clean clothes and socks survive save, load, and reset', () => {
  const g = game();
  g.run('wearSocks();wearCleanClothes()'); g.advance(600);
  g.run('saveGame();resetWorldState();loadGame()');
  assert.equal(g.run('gameState.outfit'), 'clean');
  assert.equal(g.run('gameState.socksOn'), true);
  assert.equal(g.run("gameState.itemPlacements.cleanClothes.kind"), 'worn');
  assert.equal(g.run("gameState.itemPlacements.socks.kind"), 'worn');
  assert.equal(g.run("gameState.inventory.includes('cleanClothes') && gameState.inventory.includes('socks')"), true);
  assert.match(g.get('player').querySelector().style['--player-sheet'], /player-sheet-clean-socks-v19/);
  g.run('resetGame()');
  assert.equal(g.run('gameState.outfit'), 'underwear');
  assert.equal(g.run('gameState.socksOn'), false);
  assert.equal(g.run("gameState.itemPlacements.cleanClothes.kind"), 'stored');
});
test('living-room floor reaches the hallway and behind the TV, which hides the player there', () => {
  const g = game();
  g.run('showRoom("living")');
  for (const [x, y] of [[91, 42], [90, 48], [95, 60], [93, 74], [97.5, 79.5]]) {
    assert.deepEqual(JSON.parse(g.run(`JSON.stringify(floorPosition(${x},${y}))`)), { x, y }, `${x},${y} is walkable`);
  }
  assert.ok(g.run('floorPosition(100,70).x') <= 98.6, 'no further right than the cabinet');
  assert.ok(g.run('floorPosition(91,30).y') >= 39.8, 'no further than the front door');
  // Routes go around the cabinet instead of through it.
  g.run('movement.x=90; movement.y=92; movePlayerTo(93,74)');
  const route = JSON.parse(g.run('JSON.stringify([{x:90,y:92},movement.destination,...movement.route])'));
  assert.ok(route.length > 2);
  for (let i = 1; i < route.length; i++) assert.equal(g.run(`floorSegmentClear(${JSON.stringify(route[i-1])},${JSON.stringify(route[i])},apartmentRooms.living)`), true);
  g.finish();
  assert.ok(g.get('scene').classList.contains('player-behind-tv'));
  g.run('movePlayerTo(85,90)'); g.finish();
  assert.equal(g.get('scene').classList.contains('player-behind-tv'), false);
  g.run('movePlayerTo(91,44)'); g.finish();
  assert.ok(g.get('scene').classList.contains('player-behind-tv'), 'the hallway is behind the TV');
  assert.match(g.get('tv-foreground').style.clipPath, /^polygon\(/);
  assert.match(styles, /\[data-room="living"\] #tv-foreground \{ display: block; \}/);
  assert.match(styles, /player-behind-tv #tv-foreground \{ z-index: 109; \}/);
  // The hotspot follows the TV's outline so the floor behind it stays clickable.
  g.run('buildHotspots()');
  const tvButton = g.get('hotspots').children.find(button => button.dataset.target === 'tv');
  assert.match(tvButton.style.clipPath, /^polygon\(/);
  g.run('showRoom("bedroom"); renderPlayer()');
  assert.equal(g.get('scene').classList.contains('player-behind-tv'), false);
});

test('bedroom floor reaches behind the couch to the TV, and the couch hides the player there', () => {
  const g = game();
  g.run('showRoom("bedroom")');
  // Beside the left arm, in front of the door, behind the backrest, at the TV stand's feet and in front of the couch.
  for (const [x, y] of [[60, 62], [64.5, 80], [78, 61], [80, 70], [80, 81], [85, 85], [90, 71], [95, 65.8], [97, 88], [80, 92], [85, 96.5]]) {
    assert.deepEqual(JSON.parse(g.run(`JSON.stringify(floorPosition(${x},${y}))`)), { x, y }, `${x},${y} is walkable`);
  }
  assert.equal(g.run('isFloorPoint({x:85,y:90}, apartmentRooms.bedroom)'), false, 'the couch itself is not floor');
  // Routes from the foreground go around the couch's left arm instead of through it.
  g.run('movement.x=60; movement.y=90; movePlayerTo(90,71)');
  const route = JSON.parse(g.run('JSON.stringify([{x:60,y:90},movement.destination,...movement.route])'));
  assert.ok(route.length > 2);
  for (let i = 1; i < route.length; i++) assert.equal(g.run(`floorSegmentClear(${JSON.stringify(route[i-1])},${JSON.stringify(route[i])},apartmentRooms.bedroom)`), true);
  g.finish();
  assert.ok(g.get('scene').classList.contains('player-behind-couch'));
  g.run('movePlayerTo(69.5,84)'); g.finish();
  assert.ok(g.run('movement.x') <= 67.7, 'the player stops a little short of the arm');
  assert.equal(g.get('scene').classList.contains('player-behind-couch'), false, 'beside the arm, in front of the couch');
  g.run('movePlayerTo(80,92)'); g.finish();
  assert.equal(g.get('scene').classList.contains('player-behind-couch'), false, 'in front of the couch');
  assert.match(g.get('couch-foreground').style.clipPath, /^polygon\(/);
  assert.match(styles, /\[data-room="bedroom"\] #couch-foreground \{ display: block; \}/);
  assert.match(styles, /player-behind-couch #couch-foreground \{ z-index: 109; \}/);
  // The hotspot follows the couch's outline so the floor behind it stays clickable.
  g.run('buildHotspots()');
  const couchButton = g.get('hotspots').children.find(button => button.dataset.target === 'couch');
  assert.match(couchButton.style.clipPath, /^polygon\(/);
  g.run('showRoom("living"); renderPlayer()');
  assert.equal(g.get('scene').classList.contains('player-behind-couch'), false);
});

test('workplace garage keeps clothing, routes beside the Lonza and completes its temporary elevator ride', () => {
  const g = game();
  g.run("gameState.outfit='clean';gameState.socksOn=true;showRoom('garage');Object.assign(movement,{x:24,y:54,facing:'right'});renderPlayer()");
  assert.equal(g.run('gameState.currentRoom'), 'garage');
  assert.match(g.get('player').querySelector().style['--player-sheet'], /player-sheet-clean-socks-v19/);
  assert.deepEqual(JSON.parse(g.run('JSON.stringify(floorPosition(79.2,46))')), { x: 79.2, y: 46 });
  assert.ok(g.run("playerPerspective('garage',46).width < playerPerspective('outside',55).width"));
  assert.equal(g.run("roomImageForState('garage')"), 'assets/used/workplace-garage-bg-v3.png');
  assert.equal(g.run("apartmentRooms.garage.objects.blueCar.walk[0]"), 79.2);

  g.run("setVerb(null);handleTarget('elevatorCall')"); g.finish();
  assert.equal(g.run('garageSequenceActive'), true);
  g.advance(650);
  assert.ok(g.get('garage-elevator').classList.contains('is-called'));
  g.advance(550);
  assert.ok(g.get('garage-elevator').classList.contains('is-open'));
  g.advance(750); g.finish();
  assert.equal(g.run('movement.y'), 37.2);
  g.advance(980);
  assert.ok(g.get('garage-elevator').classList.contains('is-called'), 'up stays lit until the doors have closed');
  g.advance(100);
  assert.equal(g.get('garage-elevator').classList.contains('is-called'), false, 'up turns off just after the doors close');
  g.advance(970);
  assert.equal(g.run('movement.x'), 20.4);
  assert.equal(g.run('gameState.currentRoom'), 'garage');
  assert.match(g.get('player').querySelector().style['--player-sheet'], /player-sheet-clean-socks-v19/);
  g.advance(680);
  assert.equal(g.run('garageSequenceActive'), false);
  assert.equal(g.get('scene').attributes['aria-busy'], undefined);
  assert.match(styles, /garage-camera-flash 17s/);
  assert.match(styles, /#garage-up-indicator \{[^}]*left:14\.15%/);
  assert.match(markup, /id="garage-elevator"/);
});
test('the living-room shoe rack offers persistent work shoes and sneakers', () => {
  const g = game();
  g.run("showRoom('living');Object.assign(movement,{x:80,y:70});renderPlayer()");
  assert.equal(g.run("shoesAreOnRack('workShoes') && shoesAreOnRack('sneakers')"), true);
  assert.equal(g.get('living-shoe-rack').classList.contains('work-shoes-away'), false);
  assert.equal(g.get('living-shoe-rack').classList.contains('sneakers-away'), false);
  assert.match(g.run('shoeRackDescription()'), /work shoes and your everyday sneakers/);

  g.run("setVerb('pickup');handleTarget('shoeRack')"); g.finish();
  assert.equal(g.get('shoeChoiceOverlay').hidden, false);
  assert.equal(g.run("worldPause.owners.has('shoe-choice')"), true);
  assert.equal(g.get('takeWorkShoesBtn').disabled, false);
  assert.equal(g.get('takeSneakersBtn').disabled, false);

  g.run("takeShoesFromRack('workShoes')");
  assert.equal(g.get('shoeChoiceOverlay').hidden, true);
  assert.equal(g.run("gameState.inventory.includes('workShoes')"), true);
  assert.equal(g.run("gameState.itemPlacements.workShoes.kind"), 'inventory');
  assert.ok(g.get('living-shoe-rack').classList.contains('work-shoes-away'));
  assert.equal(g.get('living-shoe-rack').classList.contains('sneakers-away'), false);

  g.run("setVerb('use');handleTarget('shoeRack')"); g.finish();
  assert.equal(g.get('takeWorkShoesBtn').disabled, true);
  g.run("takeShoesFromRack('sneakers')");
  assert.equal(g.run("gameState.inventory.includes('sneakers')"), true);
  assert.ok(g.get('living-shoe-rack').classList.contains('sneakers-away'));

  g.run("placeInventoryItem('workShoes','shoeRack',apartmentRooms.living.objects.shoeRack)");
  assert.equal(g.run("shoesAreOnRack('workShoes')"), true);
  assert.equal(g.run("gameState.inventory.includes('workShoes')"), false);
  assert.equal(g.get('living-shoe-rack').classList.contains('work-shoes-away'), false);

  g.run("saveGame();resetWorldState();loadGame()");
  assert.equal(g.run("shoesAreOnRack('workShoes')"), true);
  assert.equal(g.run("gameState.itemPlacements.sneakers.kind"), 'inventory');
  assert.equal(g.run("gameState.inventory.includes('sneakers')"), true);
  assert.match(styles, /item-work-shoes[^}]*work-shoes-icon-v2/);
  assert.match(styles, /item-sneakers[^}]*sneakers-icon-v2/);
  assert.match(markup, /id="shoeChoiceOverlay"/);
});
