const SAVE_KEY = 'theCracksBedroomSave';
const VERTICAL_CONE_DEGREES = 30;
const scene = document.getElementById('scene');
const player = document.getElementById('player');
const playerFrame = player.querySelector('.player-frame');
const statusText = document.getElementById('statusText');
const messageBox = document.getElementById('messageBox');
const curtainToggle = document.getElementById('curtainToggle');
const roomLight = document.getElementById('roomLight');
const titleScreen = document.getElementById('titleScreen');
const titleContent = titleScreen.querySelector('.title-content');
const game = document.getElementById('game');
const newGameBtn = document.getElementById('newGameBtn');
const optionsBtn = document.getElementById('optionsBtn');
const optionsDialog = document.getElementById('optionsDialog');
const goBackBtn = document.getElementById('goBackBtn');

function openOptions() {
  titleScreen.classList.add('options-open');
  titleContent.inert = true;
  optionsDialog.hidden = false;
  requestAnimationFrame(() => optionsDialog.classList.add('is-visible'));
  optionsBtn.setAttribute('aria-expanded', 'true');
  goBackBtn.focus();
}

function closeOptions() {
  optionsDialog.classList.remove('is-visible');
  titleScreen.classList.remove('options-open');
  optionsBtn.setAttribute('aria-expanded', 'false');
  setTimeout(() => {
    optionsDialog.hidden = true;
    titleContent.inert = false;
    optionsBtn.focus();
  }, 350);
}

function startNewGame() {
  if (titleScreen.classList.contains('is-leaving')) return;
  titleScreen.classList.add('is-leaving');
  titleScreen.setAttribute('aria-busy', 'true');
  setTimeout(() => {
    game.inert = false;
    game.setAttribute('aria-hidden', 'false');
    document.body.classList.add('game-started');
    titleScreen.hidden = true;
    showMessage('A quiet morning. Click the curtains to let in some light, or explore the room.', 4500);
  }, 760);
}

newGameBtn.addEventListener('click', startNewGame);
optionsBtn.addEventListener('click', openOptions);
goBackBtn.addEventListener('click', closeOptions);
document.addEventListener?.('keydown', event => {
  if (event.key === 'Escape' && !optionsDialog.hidden) closeOptions();
});

const gameState = {
  selectedVerb: 'walk', currentRoom: 'bedroom', livingTvOn: false, channel: 0, plantWatered: false, keysTaken: false,
  curtainsOpen: false,
  lampOn: true,
  tvOn: false,
  drawersOpen: false,
  alarmArmed: false
};

// Positions and hit areas are percentages of the uncropped 16:9 bedroom.
const bedroomObjects = {
  bed: { name: 'bed', area: [8, 40, 36, 24], walk: [28, 72], description: 'A single bed, an unmade duvet, and a pillow that has seen better mornings.' },
  drawers: { name: 'chest of drawers', area: [44.5, 31, 11, 30], walk: [49, 69], description: 'The drawers at the foot of the bed hold T-shirts, socks, and the odd forgotten cable.' },
  cupboard: { name: 'cupboard', area: [56, 12, 12, 49], walk: [61, 69], description: 'Shirts hang from mismatched hangers. Folded clothes and shoes fill the shelves below.' },
  door: { ...door('living room door', [72.8,14,9.5,42.5], [68,69], 'living', 'bedroomDoor'), hinge: 'right' },
  couch: { name: 'couch', area: [70.5, 61, 29, 31], walk: [67, 81], description: 'A well-worn couch facing the TV. The blanket has claimed one end.' },
  tv: { name: 'TV', area: [89.8, 29, 10, 23], walk: [67, 76], description: 'The TV sits against the right wall, within easy reach of the couch.' },
  console: { name: 'gaming console', area: [87, 52, 12, 9], walk: [67, 76], description: 'A console, a controller, and several games you keep meaning to finish.' },
  guitar: { name: 'guitar', area: [66.5, 33, 5, 27], walk: [66, 69], description: 'An acoustic guitar leaning beside the cupboard. It could use a little practice.' },
  books: { name: 'books', area: [0.6, 70, 5, 9], walk: [12, 82], description: 'A small stack of books. Some finished, some bookmarked halfway through.' },
  bookshelf: { name: 'small bookshelf', area: [0.2, 45.5, 4.7, 24.5], walk: [10, 73], description: 'A narrow wooden bookshelf beside the lamp table, filled with well-read paperbacks.' },
  lamp: { name: 'bedside lamp', area: [3.7, 40, 4.3, 11], walk: [12, 73], description: 'The lamp on the near side of the bed casts a small pool of warm light.' },
  alarm: { name: 'alarm clock', area: [8, 48.3, 2, 3.5], walk: [12, 73], description: 'The alarm clock is beside the lamp. At least the snooze button is easy to find.' },
  curtains: { name: 'curtains', area: [18.8, 8, 23.8, 33], walk: [32, 68] }
};
apartmentRooms.bedroom = { name: 'Bedroom', image: 'assets/bedroom_bg_reversed_door.png', imageOff: 'assets/bedroom_bg_lamp_off_reversed_door.png', floor: [10,68,66,94], objects: bedroomObjects };
let roomObjects = bedroomObjects;
let transition = null;
const channels = ['Weather: another grey morning', 'Cooking: something better than toast', 'Films: an old black-and-white favourite'];
const verbNames = { walk: 'Walk to', look: 'Look at', open: 'Open', close: 'Close', use: 'Use' };
const movement = { x: 42, y: 84, facing: 'down', destination: null, frame: null, lastTime: null, phase: 0 };
const sprite = {
  width: 1619 / 5,
  height: 971 / 3,
  lastPose: '',
  // All idle and walk poses share one image and exactly the same lighting.
  anchors: [
    [[150, 312], [143, 312], [155, 312], [165, 311], [172, 312]],
    [[149, 314], [142, 317], [154, 317], [163, 317], [171, 317]],
    [[148, 308], [142, 309], [151, 309], [160, 309], [167, 309]]
  ]
};
// Each room has measured perspective anchors. Widths are percentages of the
// 16:9 scene and already account for the sprite sheet's transparent padding.
// Door thresholds are explicit anchors, so every door has the same believable
// character-to-door ratio even when several doors sit at different depths.
const playerPerspectiveProfiles = Object.freeze({
  bedroom: Object.freeze({ anchors: Object.freeze([
    Object.freeze({ y: 56.5, width: 24.7, reference: 'bedroom door threshold' }),
    Object.freeze({ y: 94, width: 34.3, reference: 'bedroom foreground' })
  ]) }),
  living: Object.freeze({ anchors: Object.freeze([
    Object.freeze({ y: 39.6, width: 12.0, reference: 'recessed front door threshold' }),
    Object.freeze({ y: 52.5, width: 22.1, reference: 'bedroom and bathroom door thresholds' }),
    Object.freeze({ y: 94, width: 31.0, reference: 'living-room foreground' })
  ]) }),
  bathroom: Object.freeze({ anchors: Object.freeze([
    Object.freeze({ y: 67.5, width: 23.8, reference: 'bathroom door threshold' }),
    Object.freeze({ y: 82, width: 28.0, reference: 'bathroom foreground' })
  ]) }),
  outside: Object.freeze({ anchors: Object.freeze([
    Object.freeze({ y: 37.4, width: 10.2, reference: 'exterior door thresholds and patios' }),
    // At car depth the visible body is 1.8 / 1.4 times the cars' painted height.
    Object.freeze({ y: 92, width: 22.4, reference: '1.8 m player beside 1.4 m cars' })
  ]) })
});
function playerPerspective(roomId, y) {
  const profile = playerPerspectiveProfiles[roomId] || playerPerspectiveProfiles.living;
  const anchors = profile.anchors;
  if (y <= anchors[0].y) return { width: anchors[0].width, depth: 1, progress: 0, reference: anchors[0].reference };
  const last = anchors[anchors.length - 1];
  if (y >= last.y) return { width: last.width, depth: last.width / anchors[0].width, progress: 1, reference: last.reference };
  const upperIndex = anchors.findIndex(anchor => anchor.y >= y);
  const lower = anchors[upperIndex - 1], upper = anchors[upperIndex];
  const segmentProgress = (y - lower.y) / (upper.y - lower.y);
  const width = lower.width + (upper.width - lower.width) * segmentProgress;
  const progress = (y - anchors[0].y) / (last.y - anchors[0].y);
  return { width, depth: width / anchors[0].width, progress, reference: `${lower.reference} ? ${upper.reference}` };
}

function setVerb(verb) {
  gameState.selectedVerb = verbNames[verb] ? verb : 'walk';
  document.querySelectorAll('#verbs button').forEach(button => {
    const active = button.dataset.verb === gameState.selectedVerb;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  updateStatus();
}

function updateStatus(target) {
  statusText.textContent = `${verbNames[gameState.selectedVerb]}${target ? ' ' + roomObjects[target].name : ''}`;
}

function showMessage(text, duration = 3200) {
  clearTimeout(showMessage.timer);
  messageBox.textContent = text;
  messageBox.classList.remove('hidden');
  showMessage.timer = setTimeout(() => messageBox.classList.add('hidden'), duration);
}

function syncRoom() {
  const bedroom = gameState.currentRoom === 'bedroom';
  scene.dataset.room = gameState.currentRoom;
  scene.classList.toggle('curtains-open', gameState.curtainsOpen);
  scene.classList.toggle('curtains-closed', !gameState.curtainsOpen);
  scene.classList.toggle('lamp-off', !gameState.lampOn);
  scene.classList.toggle('tv-on', gameState.tvOn);
  const room = apartmentRooms[gameState.currentRoom];
  const image = gameState.currentRoom === 'bedroom' && !gameState.lampOn ? room.imageOff : room.image;
  scene.style.setProperty('--room-image', `url('${image}')`);
  curtainToggle.textContent = gameState.curtainsOpen ? 'Close curtains' : 'Open curtains';
  curtainToggle.setAttribute('aria-expanded', String(gameState.curtainsOpen));
  curtainToggle.hidden = !bedroom;
  roomLight.textContent = bedroom ? (gameState.curtainsOpen ? 'Curtains open' : 'Curtains closed') : apartmentRooms[gameState.currentRoom].name;
  const screen = document.getElementById('living-tv');
  screen.textContent = gameState.livingTvOn ? ['RAIN', 'COOK', 'FILM'][gameState.channel] : '';
  screen.style.opacity = gameState.livingTvOn ? '.85' : '0';
  screen.style.setProperty('--channel-color', ['#47667f', '#846841', '#777b7c'][gameState.channel]);
}

function setCurtains(open) {
  gameState.curtainsOpen = open;
  // CSS transitions start together and can reverse smoothly mid-animation.
  syncRoom();
  showMessage(open ? 'You draw the curtains apart. Grey daylight fills the room.' : 'You pull the curtains shut. The room settles back into the dark.');
}

function movementFacing(dx, dy) {
  if (Math.hypot(dx, dy) < 0.001) return movement.facing;
  const angle = Math.atan2(Math.abs(dx), Math.abs(dy)) * 180 / Math.PI;
  if (angle <= VERTICAL_CONE_DEGREES) return dy < 0 ? 'up' : 'down';
  return dx < 0 ? 'left' : 'right';
}

function renderPlayer(walking = false) {
  const outdoors = gameState.currentRoom === 'outside';
  const perspective = playerPerspective(gameState.currentRoom, movement.y);
  const stairProgress = movement.stairProgress || 0;
  player.style.setProperty('--step-lift', outdoors && walking && movement.destination?.stairs ? (-Math.sin(stairProgress * Math.PI) * 1.8) + '%' : '0%');
  player.style.setProperty('--stair-lean', outdoors && walking && movement.destination?.stairs ? (movement.facing === 'up' ? '-1deg' : '1deg') : '0deg');
  const row = movement.facing === 'up' ? 2 : movement.facing === 'down' ? 1 : 0;
  const column = walking ? 1 + Math.floor(movement.phase * 4) % 4 : 0;
  const key = `${row}:${column}`;
  player.dataset.facing = movement.facing;
  player.style.setProperty('--facing', movement.facing === 'left' ? -1 : 1);
  if (sprite.lastPose !== key) {
    sprite.lastPose = key;
    const [x, y] = sprite.anchors[row][column];
    playerFrame.style.backgroundPosition = `${column * 25}% ${row * 50}%`;
    playerFrame.style.transform = `translate(${50 - x / sprite.width * 100}%, ${100 - y / sprite.height * 100}%)`;
  }
  player.style.left = `${movement.x}%`;
  player.style.top = `${movement.y}%`;
  player.style.setProperty('--sprite-width', `${perspective.width}%`);
  player.style.setProperty('--depth', perspective.depth);
  scene.classList.toggle('player-behind-cars', outdoors && movement.y < 88);
  player.style.zIndex = Math.round(movement.y);
}

function floorPosition(x, y) {
  if (gameState.currentRoom === 'outside') {
    const point = outsideProjection(x, y);
    return { x: point.x, y: point.y };
  }
  const [left, right, top, bottom] = apartmentRooms[gameState.currentRoom].floor;
  const point = { x: Math.max(left, Math.min(right, x)), y: Math.max(top, Math.min(bottom, y)) };
  for (const [obstacleX, obstacleY, width, height] of apartmentRooms[gameState.currentRoom].obstacles || []) {
    if (point.x >= obstacleX && point.x <= obstacleX + width && point.y >= obstacleY && point.y <= obstacleY + height) {
      const options = [
        { distance: point.x - obstacleX, x: obstacleX - 2, y: point.y },
        { distance: obstacleX + width - point.x, x: obstacleX + width + 2, y: point.y },
        { distance: point.y - obstacleY, x: point.x, y: obstacleY - 2 }
      ].filter(option => option.x >= left && option.x <= right && option.y >= top && option.y <= bottom);
      const nearest = options.sort((a, b) => a.distance - b.distance)[0];
      point.x = nearest.x;
      point.y = nearest.y;
    }
  }
  return point;
}

function stopWalking() {
  movement.route = null;
  movement.stairProgress = 0;
  if (movement.frame !== null) cancelAnimationFrame(movement.frame);
  movement.frame = null;
  movement.destination = null;
  movement.lastTime = null;
  renderPlayer(false);
}

function movePlayerTo(x, y, callback) {
  if (transition) return;
  if (gameState.currentRoom === 'outside') {
    movement.route = outsideRoute(movement, { x, y });
    if (!movement.route.length) { stopWalking(); if (callback) callback(); return; }
    movement.route[movement.route.length-1].callback = callback;
    movement.destination = movement.route.shift();
    movement.segmentStart = { x: movement.x, y: movement.y };
  } else {
  movement.destination = { ...floorPosition(x, y), callback };
  }
  const dx = (movement.destination.x - movement.x) * scene.clientWidth;
  const dy = (movement.destination.y - movement.y) * scene.clientHeight;
  movement.facing = movementFacing(dx, dy);
  if (movement.frame === null) {
    movement.phase = 0;
    movement.lastTime = null;
    movement.frame = requestAnimationFrame(advanceWalk);
  }
  renderPlayer(true);
}

function advanceWalk(time) {
  const elapsed = movement.lastTime === null ? 0 : Math.min((time - movement.lastTime) / 1000, 0.05);
  movement.lastTime = time;
  const target = movement.destination;
  const ratio = scene.clientHeight / scene.clientWidth;
  const dx = target.x - movement.x;
  const dy = (target.y - movement.y) * ratio;
  const distance = Math.hypot(dx, dy);
  const step = (target.stairs ? 5 : gameState.currentRoom === 'outside' ? 14 : 18) * elapsed;
  if (distance <= step || distance < 0.001) {
    movement.x = target.x;
    movement.y = target.y;
    if (movement.route?.length) {
      movement.destination = movement.route.shift();
      movement.segmentStart = { x: movement.x, y: movement.y };
      movement.stairProgress = 0;
      renderPlayer(true);
      movement.frame = requestAnimationFrame(advanceWalk);
      return;
    }
    stopWalking();
    if (target.callback) target.callback();
    return;
  }
  movement.facing = movementFacing(dx, dy);
  movement.x += dx / distance * step;
  movement.y += dy / distance * step / ratio;
  const depth = playerPerspective(gameState.currentRoom, movement.y).depth;
  const width = player.offsetWidth / scene.clientWidth * 100;
  movement.phase = (movement.phase + step / (width * depth * 0.65)) % 1;
  if (target.stairs) {
    const total = Math.hypot(target.x-movement.segmentStart.x, (target.y-movement.segmentStart.y)*ratio);
    movement.stairProgress = Math.min(1, 1-Math.max(0,distance-step)/total);
    movement.phase = (movement.phase + elapsed * 1.2) % 1;
  }
  renderPlayer(true);
  movement.frame = requestAnimationFrame(advanceWalk);
}

function walkTo(target, callback) {
  movePlayerTo(...roomObjects[target].walk, callback);
}

function interact(target, verb) {
  if (transition) return;
  const object = roomObjects[target];
  if (object.locked) {
    showMessage(verb === 'look' || verb === 'walk' ? object.description : 'It is locked.');
    return;
  }
  if (object.portal) {
    if (verb === 'look') showMessage(object.description);
    else if (verb === 'close') showMessage('The door is already closed.');
    else if (object.to) beginTransition(object);
    else beginTransition(object, true);
    return;
  }
  if (gameState.currentRoom !== 'bedroom') { interactApartment(target, verb, object); return; }
  if (target === 'curtains') {
    if (verb === 'look') {
      showMessage(gameState.curtainsOpen ? 'The curtains are open. Beyond the glass: rooftops and a grey morning.' : 'Heavy curtains shut out the morning. Open them to let some daylight in.');
    } else if (verb === 'open' || verb === 'close') {
      const open = verb === 'open';
      if (gameState.curtainsOpen === open) showMessage(`The curtains are already ${open ? 'open' : 'closed'}.`);
      else setCurtains(open);
    } else setCurtains(!gameState.curtainsOpen);
    return;
  }
  if (verb === 'look' || verb === 'walk') { showMessage(object.description); return; }
  if (target === 'lamp' && verb === 'use') {
    gameState.lampOn = !gameState.lampOn;
    syncRoom();
    showMessage(gameState.lampOn ? 'You switch the bedside lamp on.' : 'You switch the bedside lamp off.');
  } else if ((target === 'tv' || target === 'console') && verb === 'use') {
    gameState.tvOn = !gameState.tvOn;
    syncRoom();
    showMessage(gameState.tvOn ? 'You switch on the console. The TV glows quietly.' : 'You switch off the TV and console.');
  } else if (target === 'alarm' && verb === 'use') {
    gameState.alarmArmed = !gameState.alarmArmed;
    showMessage(gameState.alarmArmed ? 'You set the alarm for tomorrow morning.' : 'You turn the alarm off.');
  } else if (target === 'drawers' && (verb === 'open' || verb === 'close')) {
    gameState.drawersOpen = verb === 'open';
    showMessage(gameState.drawersOpen ? 'You look in the top drawer: folded T-shirts, socks, and a charging cable.' : 'You push the drawer shut.');
  } else if (target === 'cupboard') {
    showMessage(verb === 'close' ? 'The cupboard has no doors. The clothes will have to stay on display.' : object.description);
  } else if (verb === 'use') {
    const responses = { bed: 'You straighten the pillow. Close enough for now.', couch: 'You test a cushion. Still the most comfortable spot in the room.', guitar: 'You pluck a quiet chord. A little out of tune.', books: 'You flick through a few pages, then put the book back.', bookshelf: 'You take down a paperback, check your old bookmark, and return it.' };
    showMessage(responses[target] || object.description);
  } else showMessage(`There is nothing to ${verb} on the ${object.name}.`);
}

function handleTarget(target) {
  if (transition) return;
  const verb = gameState.selectedVerb;
  updateStatus(target);
  walkTo(target, () => interact(target, verb));
}

function saveGame() {
  if (transition) { showMessage('Finish going through the doorway before saving.'); return; }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 2, state: gameState, player: { x: movement.x, y: movement.y, facing: movement.facing } }));
    showMessage('Apartment saved.');
  } catch { showMessage('The browser could not save this game.'); }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { showMessage('No bedroom save found.'); return; }
    const saved = JSON.parse(raw);
    if (![1,2].includes(saved.version) || !saved.state || !saved.player) throw new Error('Invalid save');
    cancelTransition();
    stopWalking();
    for (const key of ['curtainsOpen', 'lampOn', 'tvOn', 'drawersOpen', 'alarmArmed', 'livingTvOn', 'plantWatered', 'keysTaken']) {
      if (typeof saved.state[key] === 'boolean') gameState[key] = saved.state[key];
    }
    gameState.channel = Number.isInteger(saved.state.channel) && saved.state.channel >= 0 && saved.state.channel < 3 ? saved.state.channel : 0;
    showRoom(saved.version === 2 && Object.hasOwn(apartmentRooms, saved.state.currentRoom) ? saved.state.currentRoom : 'bedroom');
    const x = Number.isFinite(saved.player.x) ? saved.player.x : 42;
    const y = Number.isFinite(saved.player.y) ? saved.player.y : 84;
    Object.assign(movement, floorPosition(x, y));
    movement.facing = ['up', 'down', 'left', 'right'].includes(saved.player.facing) ? saved.player.facing : 'down';
    setVerb(saved.state.selectedVerb);
    syncRoom();
    renderPlayer();
    showMessage('Apartment loaded.');
  } catch { showMessage('The bedroom save could not be loaded.'); }
}

function resetGame() {
  cancelTransition();
  stopWalking();
  try { localStorage.removeItem(SAVE_KEY); } catch { /* The room still resets if storage is unavailable. */ }
  Object.assign(gameState, { selectedVerb: 'walk', curtainsOpen: false, lampOn: true, tvOn: false, drawersOpen: false, alarmArmed: false, livingTvOn: false, channel: 0, plantWatered: false, keysTaken: false });
  showRoom('bedroom');
  Object.assign(movement, { x: 42, y: 84, facing: 'down', phase: 0 });
  setVerb('walk');
  syncRoom();
  renderPlayer();
  showMessage('A quiet room. The curtains are closed.');
}

function showRoom(id) {
  // Room lighting must already be correct when the transition fade reveals it.
  // Curtain toggles still use their normal animated transition outside this block.
  scene.classList.add('lighting-snap');
  gameState.currentRoom = id;
  roomObjects = apartmentRooms[id].objects;
  scene.style.setProperty('--room-image', `url('${apartmentRooms[id].image}')`);
  scene.setAttribute('aria-label', apartmentRooms[id].name);
  buildHotspots();
  syncRoom();
  updateStatus();
  void document.getElementById('room-dimmer').offsetWidth;
  scene.classList.remove('lighting-snap');
}

function interactApartment(target, verb, object) {
  if (verb === 'look' || verb === 'walk') { showMessage(object.description); return; }
  if (gameState.currentRoom === 'living' && (target === 'tv' || target === 'channelBox') && verb === 'use') {
    if (target === 'tv') gameState.livingTvOn = !gameState.livingTvOn;
    else { gameState.channel = (gameState.channel + 1) % channels.length; gameState.livingTvOn = true; }
    syncRoom();
    showMessage(gameState.livingTvOn ? channels[gameState.channel] : 'You switch the living room TV off.');
  } else if (target === 'plant' && verb === 'use') {
    showMessage(gameState.plantWatered ? 'The plant has had enough water for now.' : 'You give the drooping plant a little water.');
    gameState.plantWatered = true;
  } else if (target === 'keys' && verb === 'use') {
    gameState.keysTaken = !gameState.keysTaken;
    showMessage(gameState.keysTaken ? 'You take your apartment keys from the hook.' : 'You hang your keys back on the hook.');
  } else if (target === 'coffee' && verb === 'use') showMessage('The machine whirrs and fills a mug with hot coffee.');
  else if (target === 'sink' && verb === 'use') showMessage('You run the tap, rinse your hands, then turn it off.');
  else if (verb === 'open' && ['fridge','freezer','entryDrawers','counter'].includes(target)) showMessage(`You open the ${object.name}, look inside, then shut it. ${object.description}`);
  else if (verb === 'close') showMessage(`The ${object.name} is already closed, or has nothing to close.`);
  else showMessage(object.response || object.description);
}

// A single cancellable animation owns door travel; floor clicks cannot interrupt
// halfway between rooms. On arrival, the panel uses the destination door's clean
// artwork (so handles and surrounding furniture cannot jump onto it) while keeping
// the departing room's swing direction, so it closes behind the character.
function positionDoor(object) {
  // The hotspot may include trim for forgiving interaction, while panel is the
  // exact moving leaf. Keeping those rectangles separate leaves the jamb static.
  const [x,y,w,h] = object.panel || object.area;
  const doorway = document.getElementById('doorway');
  const face = document.getElementById('door-face');
  const surface = document.getElementById('door-surface');
  doorway.classList.remove('hidden');
  delete doorway.dataset.swingSide;
  delete doorway.dataset.visualRoom;
  doorway.dataset.appearance = object.appearance || 'painted';
  doorway.dataset.hinge = object.hinge || 'left';
  Object.assign(doorway.style, { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });
  Object.assign(face.style, {
    transform: 'rotateY(0deg)',
    transformOrigin: `${object.hinge || 'left'} center`
  });
  Object.assign(surface.style, {
    backgroundImage: `url('${gameState.currentRoom === 'bedroom' && !gameState.lampOn ? apartmentRooms.bedroom.imageOff : apartmentRooms[gameState.currentRoom].image}')`,
    backgroundSize: `${10000/w}% ${10000/h}%`,
    backgroundPosition: `${x/(100-w)*100}% ${y/(100-h)*100}%`
  });
}
function cancelTransition() {
  if (transition) cancelAnimationFrame(transition.frame);
  transition = null;
  const doorway = document.getElementById('doorway');
  doorway.classList.add('hidden');
  delete doorway.dataset.motion;
  delete doorway.dataset.swingSide;
  delete doorway.dataset.visualRoom;
  document.getElementById('scene-fade').style.opacity = '0';
  player.style.opacity = '1';
  scene.setAttribute('aria-busy', 'false');
}
function beginTransition(object, peek = false) {
  stopWalking();
  positionDoor(object);
  transition = {
    object, peek, elapsed: 0, last: null, switched: false,
    start: [movement.x, movement.y], frame: null
  };
  document.getElementById('doorway').dataset.motion = 'opening';
  scene.setAttribute('aria-busy', 'true');
  messageBox.classList.add('hidden');
  transition.frame = requestAnimationFrame(animateDoor);
}
function animateDoor(time) {
  const t = transition;
  if (!t) return;
  const dt = t.last === null ? 0 : Math.min((time-t.last)/1000, .05);
  t.last = time; t.elapsed += dt;
  const e = t.elapsed;
  const face = document.getElementById('door-face');
  const fade = document.getElementById('scene-fade');
  const clamp = n => Math.max(0, Math.min(1,n));
  if (t.peek) {
    const direction = t.object.swing ?? (t.object.hinge === 'right' ? 1 : -1);
    document.getElementById('doorway').dataset.motion = e < 1.35 ? 'opening' : 'closing';
    face.style.transform = `rotateY(${direction * 78 * Math.min(clamp(e/.45),clamp((1.8-e)/.45))}deg)`;
    if (e >= 1.8) { cancelTransition(); showMessage('The door opens onto the apartment corridor. Exploring outside will come later. You close it again.'); return; }
  } else {
    if (e >= 1.45 && !t.switched) {
      showRoom(t.object.to);
      t.incoming = roomObjects[t.object.entry];
      positionDoor(t.incoming);
      document.getElementById('doorway').dataset.swingSide = 'source';
      document.getElementById('doorway').dataset.visualRoom = gameState.currentRoom;
      t.switched = true;
      document.getElementById('doorway').dataset.motion = 'closing';
    }
    const incoming = t.switched;
    const object = incoming ? t.incoming : t.object;
    const direction = t.object.swing ?? (t.object.hinge === 'right' ? 1 : -1);
    const progress = incoming ? clamp((e-1.7)/.7) : clamp((e-.4)/.75);
    const start = incoming ? object.portal : t.start;
    const end = incoming ? object.walk : object.portal;
    const dx = end[0]-start[0], dy = end[1]-start[1];
    movement.x = start[0]+dx*progress; movement.y = start[1]+dy*progress;
    movement.facing = movementFacing(dx*scene.clientWidth,dy*scene.clientHeight);
    movement.phase = (movement.phase + dt*1.5)%1;
    renderPlayer(progress > 0 && progress < 1);
    player.style.opacity = incoming ? clamp(progress*3) : 1-clamp((progress-.65)/.35);
    face.style.transform = `rotateY(${direction * 78 * (incoming ? 1-clamp((e-2.4)/.45) : clamp(e/.4))}deg)`;
    fade.style.opacity = incoming ? 1-clamp((e-1.45)/.3) : clamp((e-1.15)/.3);
    if (e >= 2.85) {
      Object.assign(movement, floorPosition(...object.walk));
      cancelTransition(); renderPlayer();
      showMessage(apartmentRooms[gameState.currentRoom].name + '. Click a door to walk through, or explore the room.');
      return;
    }
  }
  t.frame = requestAnimationFrame(animateDoor);
}

function buildHotspots() {
document.getElementById('hotspots').replaceChildren();
for (const [target, object] of Object.entries(roomObjects)) {
  const button = document.createElement('button');
  button.className = 'hotspot';
  button.dataset.target = target;
  button.setAttribute('aria-label', object.name);
  const [left, top, width, height] = object.area;
  Object.assign(button.style, { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` });
  button.addEventListener('mouseenter', () => updateStatus(target));
  button.addEventListener('focus', () => updateStatus(target));
  button.addEventListener('mouseleave', () => updateStatus());
  button.addEventListener('blur', () => updateStatus());
  button.addEventListener('click', event => { event.stopPropagation(); handleTarget(target); });
  document.getElementById('hotspots').appendChild(button);
}
}
document.querySelectorAll('#verbs button').forEach(button => button.addEventListener('click', () => setVerb(button.dataset.verb)));
scene.addEventListener('click', event => {
  if (event.target.closest('button, #messageBox') || gameState.selectedVerb !== 'walk') return;
  const rect = scene.getBoundingClientRect();
  movePlayerTo((event.clientX - rect.left) / rect.width * 100, (event.clientY - rect.top) / rect.height * 100);
});
curtainToggle.addEventListener('click', () => { if (!transition && gameState.currentRoom === 'bedroom') walkTo('curtains', () => setCurtains(!gameState.curtainsOpen)); });
document.getElementById('saveBtn').addEventListener('click', saveGame);
document.getElementById('loadBtn').addEventListener('click', loadGame);
document.getElementById('resetBtn').addEventListener('click', resetGame);
// Every fresh launch starts here, without restoring an old level or auto-loading a save.
setVerb('walk');
showRoom('bedroom');
syncRoom();
renderPlayer();
showMessage('A quiet morning. Click the curtains to let in some light, or explore the room.', 4500);
