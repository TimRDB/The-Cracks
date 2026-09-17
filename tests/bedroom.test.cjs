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
  assert.equal(fresh.get('hotspots').children.length, 13);
});
test('bedroom lighting is correct on first paint and snaps behind room fades', () => {
  assert.match(markup, /id="scene"[^>]*class="curtains-closed"[^>]*data-room="bedroom"/);
  assert.match(markup, /id="room-dimmer"/);
  assert.match(styles, /#scene\.lighting-snap #room-dimmer[^}]*transition:\s*none/);
  assert.match(styles, /#room-dimmer\s*\{[^}]*opacity:\s*\.52[^}]*transition:\s*opacity/);
  assert.match(styles, /\.curtains-open #room-dimmer\s*\{\s*opacity:\s*0/);
  assert.doesNotMatch(styles, /#room-art\s*\{[^}]*(?:filter|transition)/);
  const g = game();
  assert.equal(g.get('scene').dataset.room, 'bedroom');
  assert.equal(g.get('scene').classList.contains('lighting-snap'), false);
  g.run('showRoom("living"); showRoom("bedroom");');
  assert.equal(g.get('scene').classList.contains('lighting-snap'), false);
  g.run('setCurtains(true);');
  assert.equal(g.get('scene').classList.contains('curtains-open'), true);
  assert.equal(g.get('scene').classList.contains('lighting-snap'), false);
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
test('vertical travel uses corrected walking frames and the bedroom character is larger', () => {
  const g = game();
  g.run('movement.facing="down"; movement.phase=0; renderPlayer(true);');
  assert.equal(g.get('player').child.style.backgroundPosition, '25% 50%');
  g.run('movement.phase=.26; renderPlayer(true);');
  assert.equal(g.get('player').child.style.backgroundPosition, '50% 50%');
  g.run('movement.facing="up"; movement.phase=.75; renderPlayer(true);');
  assert.equal(g.get('player').child.style.backgroundPosition, '100% 100%');
  g.run('renderPlayer(false);');
  assert.equal(g.get('player').child.style.backgroundPosition, '0% 100%');
  assert.match(styles, /data-room="bedroom"[^}]*\.sprite\s*\{\s*width:\s*30\.5%/);
});
test('player scale reads as an adult against the apartment doors', () => {
  assert.match(styles, /\.sprite\s*\{[^}]*width:\s*27\.5%/);
  const backgroundHeight = 941;
  const spriteWidth = 1672 * 0.275;
  const visibleBodyRatio = 314 / (971 / 3);
  const rearRoomDepth = 1 + (71 - 80) * 0.009;
  const renderedBodyHeight = spriteWidth * visibleBodyRatio * rearRoomDepth;
  assert.ok(renderedBodyHeight / backgroundHeight > 0.43);
});
test('bedroom objects respond, with independent lamp and TV toggles', () => {
  const g = game();
  for (const target of g.run('Object.keys(roomObjects).filter(k => k !== "door")')) for (const verb of ['look','open','close','use']) g.run(`interact('${target}','${verb}');`);
  g.run('gameState.lampOn=true;interact("lamp","use");'); assert.ok(g.get('scene').classList.contains('lamp-off'));
  assert.equal(g.get('scene').style['--room-image'], "url('assets/bedroom_bg_lamp_off_reversed_door.png')");
  assert.match(markup, /rel="preload" as="image" href="assets\/bedroom_bg_lamp_off_reversed_door\.png"/);
  assert.doesNotMatch(markup, /id="lamp-wall-off"|id="lamp-shade"/);
  assert.doesNotMatch(styles, /#lamp-wall-off|#lamp-shade/);
  assert.match(markup, /id="room-dimmer"[^]*id="lamp-constant"[^]*id="lamp-halo"/);
  assert.match(styles, /#lamp-constant\s*\{[^}]*z-index:\s*13[^}]*bedroom_bg\.png[^}]*mask-image:\s*radial-gradient/);
  assert.match(styles, /\.lamp-off :is\(#lamp-constant, #lamp-halo\)\s*\{\s*opacity:\s*0/);
  assert.doesNotMatch(styles, /\.curtains-open #lamp-halo/);
  assert.match(styles, /#lamp-halo\s*\{[^}]*z-index:\s*14[^}]*background:\s*transparent[^}]*backdrop-filter:\s*brightness\(1\.12\)/);
  assert.doesNotMatch(styles, /#lamp-halo\s*\{[^}]*(?:#ffd08f|#f5b85b|#d88930|mix-blend-mode)/);
  g.run('interact("lamp","use");'); assert.equal(g.get('scene').classList.contains('lamp-off'), false);
  assert.equal(g.get('scene').style['--room-image'], "url('assets/bedroom_bg_reversed_door.png')");
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
  assert.equal(g.get('hotspots').children.length, 13);
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
  assert.match(g.get('door-surface').style.backgroundImage, /bathroom_bg_reversed_master\.png/);
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
  assert.match(g.get('door-surface').style.backgroundImage, /living_bg_hallway_glass_reversed\.png/);
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
  assert.match(g.get('door-surface').style.backgroundImage, /bedroom_bg_reversed_door\.png/);
  for (let i = 0; i < 12; i++) g.tick(50);
  assert.match(g.get('door-face').style.transform, /rotateY\(-/);
  g.finish();
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
  assert.match(g.get('door-surface').style.backgroundImage, /living_bg_hallway_glass_reversed\.png/);
  g.finish();
  assert.equal(g.run('gameState.currentRoom'), 'living');
});

test('outside paths descend stairs and route around cars to the rear lane', () => {
  const g = game();
  g.run('showRoom("outside"); movement.x=73; movement.y=37.4; handleTarget("blueCar");');
  let stairs = 0, bay = false, lift = false;
  for (let i=0; i<2200 && g.run('movement.destination !== null'); i++) {
    g.tick();
    const x = g.run('movement.x'), y = g.run('movement.y');
    if (g.run('movement.destination?.stairs')) {
      stairs++;
      assert.ok(x >= 73 && x <= 74);
      lift ||= parseFloat(g.get('player').style['--step-lift']) < -.2;
    }
    if (y > 56 && y < 91) { assert.ok(Math.abs(x-36) < .01); bay = true; }
  }
  assert.ok(stairs > 10 && lift && bay);
  assert.equal(g.run('movement.destination'), null);
  assert.equal(g.run('movement.x'), 87);
  assert.equal(g.run('movement.y'), 92);
  assert.doesNotMatch(g.get('messageBox').textContent, /your car|belongs to you/i);
  assert.match(g.get('messageBox').textContent, /Lonza Experience/);
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
