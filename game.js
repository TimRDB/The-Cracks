// Pausable timers for world/UI transitions outside the opening cinematic.
const gameTimers=(()=>{
  let paused=false,next=0;
  const tasks=new Map();
  const now=()=>globalThis.performance?.now?.()??Date.now();
  function arm(id,task){
    task.native=setTimeout(()=>{
      if(paused)return;
      tasks.delete(id);task.callback();
    },Math.max(0,task.remaining));
    task.started=now();
  }
  return {
    get paused(){return paused;},
    schedule(callback,delay=0){
      const id=++next,task={callback,remaining:delay,native:null,started:0};
      tasks.set(id,task);if(!paused)arm(id,task);return id;
    },
    clear(id){const task=tasks.get(id);if(task && task.native!==null)clearTimeout(task.native);tasks.delete(id);},
    pause(){if(paused)return;paused=true;for(const task of tasks.values()){
      if(task.native!==null){clearTimeout(task.native);task.remaining=Math.max(0,task.remaining-(now()-task.started));task.native=null;}
    }},
    resume(){if(!paused)return;paused=false;for(const [id,task] of tasks)arm(id,task);},
    clearAll(){for(const id of [...tasks.keys()])this.clear(id);}
  };
})();
const SAVE_KEY = 'theCracksBedroomSave';
const VERTICAL_CONE_DEGREES = 30;
// Where the parked cars' tyres meet the forecourt road, in percent of scene height.
const CAR_GROUND_LINE = 85.5;
// Verbs that take the player through an opening; others get a refusal.
const exitVerbs = new Set(['walk', 'use', 'open']);
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
const roomBackgroundLayers = [document.getElementById('room-background-a'), document.getElementById('room-background-b')];
const bedroomClothes = document.getElementById('bedroom-clothes');
const clothesStateLayers = [document.getElementById('bedroom-clothes-a'), document.getElementById('bedroom-clothes-b')];
const livingToaster = document.getElementById('living-toaster');
const toasterStateLayers = [document.getElementById('living-toaster-a'), document.getElementById('living-toaster-b')];
const inventoryOverlay = document.getElementById('inventoryOverlay');
const inventoryItemsElement = document.getElementById('inventoryItems');
const inventoryButton = document.getElementById('inventoryBtn');
const inventoryCount = document.getElementById('inventoryCount');

// All modal systems share one pause owner registry. This freezes timers,
// requestAnimationFrame movement, door travel, the wake-up sequence and CSS
// animation without changing any world state.
const worldPause = { owners: new Set(), snapshot: null };
function pauseWorld(owner) {
  if (worldPause.owners.has(owner)) return worldPause.snapshot;
  if (worldPause.owners.size === 0) {
    const snapshot = {
      walking: movement.frame !== null,
      transition: Boolean(transition),
      wakeup: wakeup.active,
      animations: (game.getAnimations?.({ subtree: true }) || []).filter(animation => animation.playState === 'running' && animation.effect?.target?.id !== 'wakeup-fade')
    };
    gameTimers.pause();
    snapshot.animations.forEach(animation => { animation.pause(); animation.currentTime = animation.currentTime; });
    if (snapshot.walking) { cancelAnimationFrame(movement.frame); movement.frame = null; }
    if (snapshot.transition) cancelAnimationFrame(transition.frame);
    if (snapshot.wakeup) pauseWakeup();
    worldPause.snapshot = snapshot;
    document.body?.classList.add('game-paused');
  }
  worldPause.owners.add(owner);
  return worldPause.snapshot;
}
function resumeWorld(owner) {
  worldPause.owners.delete(owner);
  if (worldPause.owners.size || !worldPause.snapshot) return;
  const snapshot = worldPause.snapshot;
  worldPause.snapshot = null;
  document.body?.classList.remove('game-paused');
  snapshot.animations.forEach(animation => { if (animation.playState === 'paused') animation.play(); });
  gameTimers.resume();
  if (snapshot.wakeup && wakeup.active) resumeWakeup();
  if (snapshot.transition && transition) { transition.last = null; transition.frame = requestAnimationFrame(animateDoor); }
  if (snapshot.walking && movement.destination) { movement.lastTime = null; movement.frame = requestAnimationFrame(advanceWalk); }
}
function abandonWorldPause(owner) {
  worldPause.owners.delete(owner);
  if (worldPause.owners.size) return null;
  const snapshot = worldPause.snapshot;
  worldPause.snapshot = null;
  document.body?.classList.remove('game-paused');
  return snapshot;
}

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
  gameTimers.schedule(() => {
    optionsDialog.hidden = true;
    titleContent.inert = false;
    optionsBtn.focus();
  }, 350);
}

function startNewGame() {
  if (titleScreen.classList.contains('is-leaving')) return;
  prepareWakeupAudio();
  const ready = Promise.all([
    preloadRoomImage('assets/bedroom-wakeup-v1.png'),
    preloadRoomImage('assets/alarm-closeup-v1.png'),
    preloadRoomImage('assets/lighting/bedroom-states-v14/bedroom-c0-l0-m0.png')
  ]);
  titleScreen.classList.add('is-leaving');
  titleScreen.setAttribute('aria-busy', 'true');
  gameTimers.schedule(async () => {
    await ready;
    beginWakeup();
    game.inert = false;
    game.setAttribute('aria-hidden', 'false');
    document.body.classList.add('game-started');
    titleScreen.hidden = true;
  }, 760);
}

newGameBtn.addEventListener('click', startNewGame);
document.getElementById('skip-wakeup').addEventListener('click', finishWakeup);
optionsBtn.addEventListener('click', openOptions);
goBackBtn.addEventListener('click', closeOptions);
document.addEventListener?.('keydown', event => {
  if (event.key === 'Escape' && wakeup.active) { finishWakeup(); return; }
  if (event.key === 'Escape' && !optionsDialog.hidden) closeOptions();
});

const gameState = {
  selectedVerb: null, currentRoom: 'bedroom', livingTvOn: false, channel: 0, plantWatered: false, keysTaken: false,
  outfit: 'underwear', socksOn: false,
  curtainsOpen: false,
  lampOn: false,
  bedroomMainLightOn: false,
  livingCurtainsOpen: false,
  livingMainLightOn: false,
  kitchenLightsOn: false,
  hallwayLightOn: false,
  toasterTaken: false,
  bathroomCurtainsOpen: false,
  bathroomMainLightOn: false,
  tvOn: false,
  drawersOpen: false,
  alarmArmed: false,
  laundryDoorOpen: false,
  alleyManSpoken: false,
  alleyManCoffeeRequested: false,
  inventory: [],
  itemPlacements: { toaster: { kind: 'world', room: 'living', target: 'toaster' }, keys: { kind: 'world', room: 'living', target: 'keys' }, crumpledClothes: { kind: 'world', room: 'bedroom', target: 'crumpledClothes' }, cleanClothes: { kind: 'stored', room: 'bedroom', target: 'cupboard' }, socks: { kind: 'stored', room: 'bedroom', target: 'drawers' } }
};
const initialWorldState = Object.freeze(Object.fromEntries(Object.entries(gameState).filter(([key]) => !['currentRoom', 'inventory', 'itemPlacements'].includes(key))));
function resetWorldState() {
  Object.assign(gameState, initialWorldState, {
    inventory: [],
    itemPlacements: { toaster: { kind: 'world', room: 'living', target: 'toaster' }, keys: { kind: 'world', room: 'living', target: 'keys' }, crumpledClothes: { kind: 'world', room: 'bedroom', target: 'crumpledClothes' }, cleanClothes: { kind: 'stored', room: 'bedroom', target: 'cupboard' }, socks: { kind: 'stored', room: 'bedroom', target: 'drawers' } }
  });
}

// Positions and hit areas are percentages of the uncropped 16:9 bedroom.
const bedroomObjects = {
  bed: { name: 'bed', area: [8, 40, 36, 24], walk: [28, 72], description: 'A single bed, an unmade duvet, and a pillow that has seen better mornings.' },
  crumpledClothes: { name: 'crumpled clothes', placementName: 'carpet', area: [18,72,14.5,12], walk: [35,86], description: 'Black trousers, a pale blue striped work shirt, and a jacket lie where you dropped them. A couple of faint food marks have dried into the folds.', interactions: { talk: "You have nothing to say to yesterday's clothes.", place: 'The crumpled clothes are already on the carpet.', use: 'You sort through the pile, then leave it in much the same shape.' } },
  drawers: { name: 'chest of drawers', area: [44.5, 31, 11, 30], walk: [49, 69], description: 'The drawers at the foot of the bed hold T-shirts, socks, and the odd forgotten cable.' },
  cupboard: { name: 'wardrobe', area: [56, 12, 12, 49], walk: [61, 69], description: 'A narrow wardrobe holding your cleaner work clothes on hangers, with folded clothes and shoes on the shelves below.' },
  door: { ...door('living room door', [72.8,14,9.5,42.5], [68,69], 'living', 'bedroomDoor'), description: 'A painted interior door leading from the bedroom into the living room and kitchen.', panel: [72.9665,14.0276,9.2105,43.2519], hinge: 'right', destinationSwing: true },
  couch: { name: 'couch', area: [78.5, 57, 21.5, 38], walk: [72, 81], description: 'A shortened well-worn couch facing the TV. The blanket has claimed one end.' },
  tv: { name: 'TV', area: [89.8, 29, 10, 23], walk: [67, 76], description: 'The TV sits against the right wall, within easy reach of the couch.' },
  console: { name: 'gaming console', area: [87, 52, 12, 9], walk: [67, 76], description: 'A console, a controller, and several games you keep meaning to finish.' },
  guitar: { name: 'guitar', area: [66.5, 33, 5, 27], walk: [66, 69], description: 'An acoustic guitar leaning beside the wardrobe. It could use a little practice.' },
  books: { name: 'books', area: [0.6, 70, 5, 9], walk: [12, 82], description: 'A small stack of books. Some finished, some bookmarked halfway through.' },
  bookshelf: { name: 'small bookshelf', area: [0.2, 45.5, 4.7, 24.5], walk: [10, 73], description: 'A narrow wooden bookshelf beside the lamp table, filled with well-read paperbacks.' },
  lamp: { name: 'bedside lamp', area: [3.7, 40, 4.3, 11], walk: [12, 73], description: 'The lamp on the near side of the bed casts a small pool of warm light.', lightCircuit: 'bedroomLamp' },
  alarm: { name: 'alarm clock', area: [8, 48.3, 2, 3.5], walk: [12, 73], description: 'The alarm clock is beside the lamp. At least the snooze button is easy to find.' },
  curtains: { name: 'bedroom curtains', area: [18.8, 8, 23.8, 33], walk: [32, 68], description: 'Heavy curtains cover the bedroom window and keep the grey morning light outside.', curtainRoom: 'bedroom' },
  mainLightSwitch: { name: 'bedroom light switch', area: [69.6, 28.5, 2.5, 7], walk: [68,69], description: 'A wall switch to the left of the bedroom door controls the overhead light.', lightCircuit: 'bedroomMain' }
};
apartmentRooms.bedroom = { name: 'Bedroom', image: 'assets/bedroom_bg_reversed_door.png', imageOff: 'assets/bedroom_bg_lamp_off_reversed_door.png', floor: [10,68,66,94], objects: bedroomObjects };
let roomObjects = bedroomObjects;
let transition = null;
const channels = ['Weather: another grey morning', 'Cooking: something better than toast', 'Films: an old black-and-white favourite'];
const verbNames = { pickup: 'Pick up', place: 'Place', look: 'Look at', use: 'Use', talk: 'Talk to' };
const displayName = value => value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
const objectDisplayName = object => displayName(object?.name || '');
const legacyVerbMap = Object.freeze({ walk: 'pickup', open: 'use', close: 'use' });
const curtainStateKeys = Object.freeze({ bedroom: 'curtainsOpen', living: 'livingCurtainsOpen', bathroom: 'bathroomCurtainsOpen' });
const lightCircuits = Object.freeze({
  bedroomLamp: Object.freeze({ state: 'lampOn', name: 'lamp' }),
  bedroomMain: Object.freeze({ state: 'bedroomMainLightOn', name: 'bedroom light' }),
  livingMain: Object.freeze({ state: 'livingMainLightOn', name: 'living room light' }),
  kitchen: Object.freeze({ state: 'kitchenLightsOn', name: 'bench lights' }),
  hallway: Object.freeze({ state: 'hallwayLightOn', name: 'hallway light' }),
  bathroomMain: Object.freeze({ state: 'bathroomMainLightOn', name: 'bathroom light' })
});
const itemDefinitions = Object.freeze({
  toaster: Object.freeze({
    name: 'toaster',
    description: 'A compact two-slot toaster. It is unplugged while you carry it.',
    source: Object.freeze({ room: 'living', target: 'toaster' }),
    iconClass: 'item-toaster'
  }),
  keys: Object.freeze({
    name: 'apartment keys',
    description: 'Your apartment keys on a small metal ring.',
    source: Object.freeze({ room: 'living', target: 'keys' }),
    iconClass: 'item-keys'
  }),
  crumpledClothes: Object.freeze({
    name: 'crumpled clothes',
    description: 'Black trousers, a pale blue striped work shirt, and a black jacket, all slightly crumpled and faintly stained.',
    source: Object.freeze({ room: 'bedroom', target: 'crumpledClothes' }),
    iconClass: 'item-crumpled-clothes'
  }),
  socks: Object.freeze({
    name: 'socks',
    description: 'A pair of plain white socks from the chest of drawers.',
    source: Object.freeze({ room: 'bedroom', target: 'drawers' }),
    iconClass: 'item-socks'
  }),
  cleanClothes: Object.freeze({
    name: 'clean clothes',
    description: 'A neat black jacket, a smooth green work shirt, and clean brown work trousers.',
    source: Object.freeze({ room: 'bedroom', target: 'cupboard' }),
    iconClass: 'item-clean-clothes'
  })
});
const placementTargets = Object.freeze({
  bedroom: Object.freeze({ crumpledClothes: 'on', drawers: 'in', cupboard: 'in' }),
  living: Object.freeze({ toaster: 'on', keys: 'on', counter: 'in', fridge: 'in', freezer: 'in', entryDrawers: 'in' }),
  bathroom: Object.freeze({ sink: 'in' })
});
// Empty registration point for later character statistics. No stats are
// defined or updated yet; the save envelope and developer screen can adopt
// definitions later without another format migration.
const gameSystems = { characterStats: { schemaVersion: 1, definitions: {}, values: {}, displayMode: null } };
const interactionSelection = { itemId: null };
let inventoryMode = null;
let inventoryPreviousFocus = null;
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
  street: Object.freeze({ anchors: Object.freeze([
    Object.freeze({ y: 57.5, width: 7.8, reference: 'shop doorway interiors' }),
    Object.freeze({ y: 64.3, width: 8.5, reference: 'street shop thresholds' }),
    Object.freeze({ y: 74, width: 10.0, reference: 'near footpath' })
  ]) }),
  // Painted height is width * 1.63 percent of the scene height. A 1.8 m player
  // is 1.8 / 1.07 times the 107 px wheelie bins, about 1.85 times the seated
  // man's 180 px, and 86% of the 470 px service door at the foot of its steps.
  // A smooth curve joins the anchors so growth never changes rate abruptly.
  // The alley's scale changes 3x, so its gait is size-relative: speed and
  // stride are fractions of the painted width, giving a constant leg cadence
  // that matches the bedroom's (about one walk cycle per second). Depth travel
  // is foreshortened: moving toward or away from the camera covers screen
  // height at depthPace of the lateral rate, so his size changes gradually
  // while his legs keep the same cadence.
  alley: Object.freeze({ smooth: true, gait: Object.freeze({ pace: .6, stride: .65, depthPace: .6 }), anchors: Object.freeze([
    Object.freeze({ y: 48, width: 11.7, reference: 'street opening, fence and wheelie bins' }),
    Object.freeze({ y: 58.5, width: 19.8, reference: 'seated man' }),
    Object.freeze({ y: 68, width: 26.5, reference: 'foot of the service-door steps' }),
    Object.freeze({ y: 90, width: 34.5, reference: 'alley foreground' })
  ]) }),
  outside: Object.freeze({ anchors: Object.freeze([
    Object.freeze({ y: 37.4, width: 10.2, reference: 'exterior door thresholds and patios' }),
    // At car depth the visible body is 1.8 / 1.4 times the cars' painted height.
    Object.freeze({ y: 92, width: 22.4, reference: '1.8 m player beside 1.4 m cars' })
  ]) })
});
// Monotone cubic (Fritsch-Butland) interpolation: it passes through every
// anchor with a continuous rate of growth and never overshoots between them.
function smoothAnchorWidth(anchors, index, t) {
  const slopes = anchors.slice(1).map((anchor, i) => (anchor.width - anchors[i].width) / (anchor.y - anchors[i].y));
  const tangent = i => i === 0 ? slopes[0] : i === anchors.length - 1 ? slopes[i - 1]
    : slopes[i - 1] * slopes[i] <= 0 ? 0 : 2 / (1 / slopes[i - 1] + 1 / slopes[i]);
  const a = anchors[index], b = anchors[index + 1], h = b.y - a.y, t2 = t * t, t3 = t2 * t;
  return (2*t3 - 3*t2 + 1) * a.width + (t3 - 2*t2 + t) * h * tangent(index)
    + (3*t2 - 2*t3) * b.width + (t3 - t2) * h * tangent(index + 1);
}

function playerPerspective(roomId, y) {
  const profile = playerPerspectiveProfiles[roomId] || playerPerspectiveProfiles.living;
  const anchors = profile.anchors;
  if (y <= anchors[0].y) return { width: anchors[0].width, depth: 1, progress: 0, reference: anchors[0].reference };
  const last = anchors[anchors.length - 1];
  if (y >= last.y) return { width: last.width, depth: last.width / anchors[0].width, progress: 1, reference: last.reference };
  const upperIndex = anchors.findIndex(anchor => anchor.y >= y);
  const lower = anchors[upperIndex - 1], upper = anchors[upperIndex];
  const segmentProgress = (y - lower.y) / (upper.y - lower.y);
  const width = profile.smooth ? smoothAnchorWidth(anchors, upperIndex - 1, segmentProgress)
    : lower.width + (upper.width - lower.width) * segmentProgress;
  const progress = (y - anchors[0].y) / (last.y - anchors[0].y);
  return { width, depth: width / anchors[0].width, progress, reference: `${lower.reference} ? ${upper.reference}` };
}

function setVerb(verb, options = {}) {
  const selected = legacyVerbMap[verb] || verb;
  gameState.selectedVerb = verb === null ? null : (verbNames[selected] ? selected : 'pickup');
  if (!options.keepItem) interactionSelection.itemId = null;
  document.querySelectorAll('#verbs button').forEach(button => {
    const active = button.dataset.verb === gameState.selectedVerb;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  updateStatus();
}

function isContextualDoor(object) {
  return Boolean(object && (object.portal || object.streetDoor || object.streetExit || object.alleyExit || (object.locked && /door/i.test(object.name))));
}
function isLightSwitch(object) {
  return Boolean(object?.lightCircuit && /switch/i.test(object.name));
}
function fixedContextualReply(verb) {
  if (verb === 'talk') return "You don't feel like talking to that right now.";
  if (verb === 'pickup') return "It can't be picked up without power tools.";
  if (verb === 'place') return "It's already there.";
  return null;
}
function itemAtTarget(room, target) {
  return Object.keys(itemDefinitions).find(id => !gameState.inventory.includes(id) && gameState.itemPlacements[id]?.kind === 'world' && gameState.itemPlacements[id]?.room === room && gameState.itemPlacements[id]?.target === target);
}
function targetObjectName(target, object = roomObjects[target]) {
  if (target === 'crumpledClothes' && itemAtTarget(gameState.currentRoom, target) !== 'crumpledClothes') return 'carpet';
  return object?.name || '';
}
function updateStatus(target) {
  const object = target && roomObjects[target];
  const objectName = targetObjectName(target, object);
  if (object && gameState.selectedVerb && (object.lightCircuit || isContextualDoor(object) || (object.curtainRoom && gameState.selectedVerb === 'look'))) {
    statusText.textContent = `${verbNames[gameState.selectedVerb]} ${objectName}`;
    return;
  }
  if (object?.lightCircuit) {
    const light = lightCircuits[object.lightCircuit];
    statusText.textContent = `Turn ${gameState[light.state] ? 'off' : 'on'} ${light.name}`;
    return;
  }
  if (isContextualDoor(object)) {
    const action = object.streetDoor === 'laundry' && gameState.laundryDoorOpen ? 'Close' : 'Open';
    statusText.textContent = `${action} ${object.name}`;
    return;
  }
  if (object?.curtainRoom) {
    statusText.textContent = `${roomCurtainsOpen(object.curtainRoom) ? 'Close' : 'Open'} ${object.name}`;
    return;
  }
  if (object && gameState.selectedVerb === 'look') {
    statusText.textContent = `Look at ${objectName}`;
    return;
  }
  const itemId = interactionSelection.itemId;
  if (itemId && gameState.selectedVerb === 'use') {
    statusText.textContent = `Use ${itemDefinitions[itemId].name} with ${objectName || '_'}`;
    return;
  }
  if (itemId && gameState.selectedVerb === 'place') {
    const preposition = target && placementTargets[gameState.currentRoom]?.[target];
    statusText.textContent = preposition
      ? `Place ${itemDefinitions[itemId].name} ${preposition} ${object.placementName || objectName}`
      : `Place ${itemDefinitions[itemId].name} in/on _`;
    return;
  }
  const locatedItem = target && itemAtTarget(gameState.currentRoom, target);
  if (gameState.selectedVerb === 'pickup' && locatedItem) {
    statusText.textContent = `Pick up ${itemDefinitions[locatedItem].name}`;
    return;
  }
  statusText.textContent = gameState.selectedVerb ? `${verbNames[gameState.selectedVerb]}${object ? ' ' + objectName : ''}` : (object ? displayName(objectName) : 'No action selected');
}

function syncPortableState() {
  const toaster = gameState.itemPlacements.toaster;
  const keys = gameState.itemPlacements.keys;
  gameState.toasterTaken = !(toaster?.kind === 'world' && toaster.room === 'living' && toaster.target === 'toaster');
  gameState.keysTaken = !(keys?.kind === 'world' && keys.room === 'living' && keys.target === 'keys');
}
function renderInventory() {
  inventoryCount.textContent = String(gameState.inventory.length);
  inventoryButton.setAttribute('aria-label', `Inventory, ${gameState.inventory.length} item${gameState.inventory.length === 1 ? '' : 's'}`);
  inventoryItemsElement.replaceChildren();
  if (!gameState.inventory.length) {
    const empty = document.createElement('p');
    empty.className = 'inventory-empty';
    empty.textContent = 'You are not carrying anything.';
    inventoryItemsElement.appendChild(empty);
    return;
  }
  gameState.inventory.forEach(id => {
    const item = itemDefinitions[id];
    if (!item) return;
    const card = document.createElement('button');
    card.className = 'inventory-card';
    card.dataset.item = id;
    const icon = document.createElement('span');
    icon.className = `inventory-item-icon ${item.iconClass}`;
    icon.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    copy.className = 'inventory-item-copy';
    const name = document.createElement('strong');
    name.textContent = item.name[0].toUpperCase() + item.name.slice(1);
    const description = document.createElement('span');
    description.textContent = gameState.itemPlacements[id]?.kind === 'worn' ? 'You are wearing these' : item.description;
    copy.appendChild(name); copy.appendChild(description);
    card.appendChild(icon); card.appendChild(copy);
    card.addEventListener('click', () => selectInventoryItem(id));
    inventoryItemsElement.appendChild(card);
  });
}
function playerSheetForState() {
  if (gameState.outfit === 'crumpled') return gameState.socksOn ? 'assets/player-sheet-clothes-socks-v12.png' : 'assets/player-sheet-clothes-barefoot-v9.png';
  if (gameState.outfit === 'clean') return gameState.socksOn ? 'assets/player-sheet-clean-socks-v14.png' : 'assets/player-sheet-clean-barefoot-v11.png';
  return gameState.socksOn ? 'assets/player-sheet-underwear-socks-v6.png' : 'assets/player-sheet-keyed-v1.png';
}

let wardrobeChanging = false;
let wardrobeChangeTimers = [];
function cancelWardrobeChange() {
  wardrobeChangeTimers.forEach(timer => gameTimers.clear(timer));
  wardrobeChangeTimers = [];
  wardrobeChanging = false;
  scene.classList.remove('wardrobe-fade', 'wardrobe-reveal');
  const fade = document.getElementById('scene-fade');
  fade.style.opacity = '0';
  fade.style.transition = '';
  scene.removeAttribute?.('aria-busy');
}
function changeWardrobe(apply, message) {
  if (wardrobeChanging) return;
  wardrobeChanging = true;
  stopWalking();
  scene.setAttribute('aria-busy', 'true');
  scene.classList.remove('wardrobe-reveal', 'wardrobe-fade');
  const fade = document.getElementById('scene-fade');
  fade.style.transition = 'opacity .22s ease-in';
  fade.style.opacity = '0';
  void fade.offsetWidth;
  scene.classList.add('wardrobe-fade');
  fade.style.opacity = '1';
  wardrobeChangeTimers.push(gameTimers.schedule(() => {
    apply();
    syncPortableState(); syncRoom(); renderPlayer(); renderInventory(); updateStatus();
    wardrobeChangeTimers.push(gameTimers.schedule(() => {
      scene.classList.remove('wardrobe-fade');
      scene.classList.add('wardrobe-reveal');
      fade.style.transition = 'opacity .24s ease-out';
      fade.style.opacity = '0';
      wardrobeChangeTimers.push(gameTimers.schedule(() => {
        scene.classList.remove('wardrobe-reveal');
        fade.style.transition = '';
        fade.style.opacity = '0';
        scene.removeAttribute?.('aria-busy');
        wardrobeChanging = false;
        wardrobeChangeTimers = [];
        showMessage(message);
      }, 250));
    }, 50));
  }, 240));
}
function removeInventoryItem(id) {
  gameState.inventory = gameState.inventory.filter(item => item !== id);
}
function wearCrumpledClothes() {
  if (gameState.outfit === 'crumpled') { showMessage('You are already wearing the crumpled clothes.'); return; }
  const replacingClean = gameState.outfit === 'clean';
  changeWardrobe(() => {
    if (replacingClean) {
      gameState.itemPlacements.cleanClothes = { kind: 'stored', room: 'bedroom', target: 'cupboard' };
      removeInventoryItem('cleanClothes');
    }
    gameState.outfit = 'crumpled';
    setVerb(null);
    gameState.itemPlacements.crumpledClothes = { kind: 'worn' };
    if (!gameState.inventory.includes('crumpledClothes')) gameState.inventory.push('crumpledClothes');
  }, replacingClean ? 'You put the clean clothes back in the wardrobe and put on the crumpled clothes.' : 'You change into the crumpled clothes. The old food marks are still there.');
}
function wearCleanClothes() {
  if (gameState.outfit === 'clean') { showMessage("You're already wearing clean clothes."); return; }
  const replacingCrumpled = gameState.outfit === 'crumpled';
  changeWardrobe(() => {
    if (replacingCrumpled) {
      gameState.itemPlacements.crumpledClothes = { kind: 'world', room: 'bedroom', target: 'crumpledClothes' };
      removeInventoryItem('crumpledClothes');
    }
    gameState.outfit = 'clean';
    setVerb(null);
    gameState.itemPlacements.cleanClothes = { kind: 'worn' };
    if (!gameState.inventory.includes('cleanClothes')) gameState.inventory.push('cleanClothes');
  }, replacingCrumpled ? 'You throw the crumpled clothes back on the carpet and put on the clean clothes.' : 'You put on the clean clothes.');
}
function putCleanClothesAway() {
  if (gameState.outfit !== 'clean') { showMessage('The clean clothes are already in the wardrobe.'); return; }
  changeWardrobe(() => {
    gameState.outfit = 'underwear';
    removeInventoryItem('cleanClothes');
    gameState.itemPlacements.cleanClothes = { kind: 'stored', room: 'bedroom', target: 'cupboard' };
    interactionSelection.itemId = null;
    setVerb(null);
  }, 'You take off the clean clothes and put them back in the wardrobe.');
}
function wearSocks() {
  if (gameState.socksOn) { showMessage('You are already wearing socks.'); return; }
  gameState.socksOn = true;
  setVerb(null);
  gameState.itemPlacements.socks = { kind: 'worn' };
  if (!gameState.inventory.includes('socks')) gameState.inventory.push('socks');
  syncPortableState(); syncRoom(); renderPlayer(); renderInventory(); updateStatus();
  showMessage('You put on a pair of white socks.');
}
function putSocksAway() {
  if (!gameState.socksOn) { showMessage('The socks are already in the chest of drawers.'); return; }
  gameState.socksOn = false;
  removeInventoryItem('socks');
  gameState.itemPlacements.socks = { kind: 'stored', room: 'bedroom', target: 'drawers' };
  interactionSelection.itemId = null;
  setVerb(null);
  syncPortableState(); syncRoom(); renderPlayer(); renderInventory(); updateStatus();
  showMessage('You take off the socks and put them back in the chest of drawers.');
}
function toggleSocks() {
  if (gameState.socksOn) putSocksAway();
  else wearSocks();
}
function setInventoryMode(mode) {
  inventoryMode = mode;
  document.getElementById('inventoryUseBtn').classList.toggle('active', mode === 'use');
  document.getElementById('inventoryPlaceBtn').classList.toggle('active', mode === 'place');
}
function openInventory() {
  if (inventoryOverlay.hidden === false || transition || roomSwitch || wakeup.active || wardrobeChanging) return;
  inventoryPreviousFocus = document.activeElement;
  setInventoryMode(['use', 'place'].includes(gameState.selectedVerb) ? gameState.selectedVerb : null);
  renderInventory();
  pauseWorld('inventory');
  game.inert = true;
  inventoryOverlay.hidden = false;
  inventoryButton.setAttribute('aria-expanded', 'true');
  document.getElementById('inventoryCloseBtn').focus?.();
}
function closeInventory(options = {}) {
  if (inventoryOverlay.hidden !== false) return;
  inventoryOverlay.hidden = true;
  inventoryButton.setAttribute('aria-expanded', 'false');
  game.inert = false;
  if (options.resume !== false) resumeWorld('inventory');
  if (options.restoreFocus !== false) inventoryPreviousFocus?.focus?.();
  inventoryPreviousFocus = null;
}
function selectInventoryItem(id) {
  if (!gameState.inventory.includes(id)) return;
  if (inventoryMode === 'use' && ['crumpledClothes', 'cleanClothes'].includes(id)) {
    closeInventory();
    if (id === 'cleanClothes') wearCleanClothes();
    else wearCrumpledClothes();
    return;
  }
  if (!inventoryMode) {
    showMessage(itemDefinitions[id].description, 4200);
    return;
  }
  interactionSelection.itemId = id;
  setVerb(inventoryMode, { keepItem: true });
  closeInventory();
  updateStatus();
}
function pickUpItemAt(target, object = roomObjects[target]) {
  const id = itemAtTarget(gameState.currentRoom, target);
  if (!id) { showMessage(interactionReply(target, object, 'pickup')); return; }
  gameState.inventory = [...gameState.inventory, id];
  gameState.itemPlacements = { ...gameState.itemPlacements, [id]: { kind: 'inventory' } };
  syncPortableState(); syncRoom(); renderInventory(); updateStatus(target);
  showMessage(`You pick up the ${itemDefinitions[id].name}.`);
}
function placeInventoryItem(id, target, object) {
  const placement = gameState.itemPlacements[id];
  if (placement?.kind === 'worn' && id === 'crumpledClothes') {
    if (gameState.currentRoom !== 'bedroom' || target !== 'crumpledClothes') { showMessage('You need the clear patch of carpet beside the bed to take those off.'); return; }
    changeWardrobe(() => {
      gameState.outfit = 'underwear';
      gameState.inventory = gameState.inventory.filter(item => item !== id);
      gameState.itemPlacements.crumpledClothes = { kind: 'world', room: 'bedroom', target: 'crumpledClothes' };
      interactionSelection.itemId = null;
      setVerb(null);
    }, 'You change back into your underwear and leave the crumpled clothes on the carpet.');
    return;
  }
  if (placement?.kind === 'worn' && id === 'cleanClothes') {
    if (gameState.currentRoom !== 'bedroom' || target !== 'cupboard') { showMessage('The clean clothes belong back in the wardrobe.'); return; }
    putCleanClothesAway();
    return;
  }
  if (placement?.kind === 'worn' && id === 'socks') {
    if (gameState.currentRoom !== 'bedroom' || target !== 'drawers') { showMessage('The socks belong back in the chest of drawers.'); return; }
    putSocksAway();
    return;
  }
  const preposition = placementTargets[gameState.currentRoom]?.[target];
  if (!preposition) { showMessage(`You cannot place the ${itemDefinitions[id].name} there.`); return; }
  gameState.inventory = gameState.inventory.filter(item => item !== id);
  gameState.itemPlacements = { ...gameState.itemPlacements, [id]: { kind: 'world', room: gameState.currentRoom, target } };
  interactionSelection.itemId = null;
  syncPortableState(); syncRoom(); renderInventory(); updateStatus(target);
  showMessage(`You place the ${itemDefinitions[id].name} ${preposition} the ${object.placementName || object.name}.`);
}
function useInventoryItem(id, target, object) {
  showMessage(`You cannot use the ${itemDefinitions[id].name} with the ${object.name} yet.`);
  interactionSelection.itemId = null;
  updateStatus(target);
}

function showMessage(text, duration = 3200) {
  gameTimers.clear(showMessage.timer);
  messageBox.textContent = text;
  messageBox.classList.remove('hidden');
  showMessage.timer = gameTimers.schedule(() => messageBox.classList.add('hidden'), duration);
}

function roomCurtainsOpen(roomId = gameState.currentRoom) {
  const key = curtainStateKeys[roomId];
  return key ? gameState[key] : true;
}

function playerLightLevel(roomId = gameState.currentRoom, x = movement.x, y = movement.y) {
  if (roomId === 'outside' || roomId === 'street' || roomId === 'alley') return .88;
  let level = roomCurtainsOpen(roomId) ? .96 : .58;
  if (roomId === 'bedroom') {
    if (gameState.bedroomMainLightOn) level = Math.max(level, 1.04);
    if (gameState.lampOn) level = Math.max(level, .66 + .28 * Math.max(0, 1 - Math.hypot(x-7, (y-48)*.7)/38));
  } else if (roomId === 'living') {
    if (gameState.livingMainLightOn) level = Math.max(level, 1.02);
    if (gameState.kitchenLightsOn) level = Math.max(level, .64 + .24 * Math.max(0, 1 - Math.hypot((x-52)*.75, y-42)/31));
    if (gameState.hallwayLightOn) level = Math.max(level, .65 + .25 * Math.max(0, 1 - Math.hypot(x-91, y-32)/28));
  } else if (roomId === 'bathroom' && gameState.bathroomMainLightOn) level = Math.max(level, 1.03);
  return Math.min(1.08, level);
}

function curtainLightLevel(roomId = gameState.currentRoom) {
  if (roomId !== 'bedroom') return 1;
  let level = gameState.curtainsOpen ? .9 : .55;
  if (gameState.lampOn) level = Math.max(level, .82);
  if (gameState.bedroomMainLightOn) level = 1.04;
  return level;
}

function roomImageForState(roomId = gameState.currentRoom, state = gameState) {
  const bit = value => value ? 1 : 0;
  if (roomId === 'bedroom') return `assets/lighting/bedroom-states-v14/bedroom-c${bit(state.curtainsOpen)}-l${bit(state.lampOn)}-m${bit(state.bedroomMainLightOn)}.png`;
  if (roomId === 'living') return `assets/lighting/hard-states-v7/living-c${bit(state.livingCurtainsOpen)}-m${bit(state.livingMainLightOn)}-b${bit(state.kitchenLightsOn)}-h${bit(state.hallwayLightOn)}.png`;
  if (roomId === 'bathroom') return `assets/lighting/hard-states-v7/bathroom-c${bit(state.bathroomCurtainsOpen)}-m${bit(state.bathroomMainLightOn)}.png`;
  return apartmentRooms[roomId].image;
}

function toasterImageForState(state = gameState) {
  const bit = value => value ? 1 : 0;
  return `assets/lighting/toaster-states-v2/living-c${bit(state.livingCurtainsOpen)}-m${bit(state.livingMainLightOn)}-b${bit(state.kitchenLightsOn)}-h${bit(state.hallwayLightOn)}.png`;
}

function bedroomClothesImageForState(state = gameState) {
  const bit = value => value ? 1 : 0;
  return `assets/lighting/bedroom-clothes-v1/bedroom-c${bit(state.curtainsOpen)}-l${bit(state.lampOn)}-m${bit(state.bedroomMainLightOn)}.png`;
}

function bedroomDoorImageForState(state = gameState) {
  return roomImageForState('bedroom', state);
}

const decodedRoomImages = new Set();
const pendingRoomImages = new Map();
const roomStateKeys = Object.freeze({
  bedroom: Object.freeze(['curtainsOpen', 'lampOn', 'bedroomMainLightOn']),
  living: Object.freeze(['livingCurtainsOpen', 'livingMainLightOn', 'kitchenLightsOn', 'hallwayLightOn']),
  bathroom: Object.freeze(['bathroomCurtainsOpen', 'bathroomMainLightOn'])
});

function preloadRoomImage(path) {
  if (typeof Image === 'undefined' || decodedRoomImages.has(path)) return Promise.resolve(true);
  if (pendingRoomImages.has(path)) return pendingRoomImages.get(path);
  const image = new Image();
  image.decoding = 'async';
  const pending = new Promise(resolve => {
    image.onload = async () => {
      try { if (typeof image.decode === 'function') await image.decode(); } catch { /* Loaded pixels remain usable. */ }
      decodedRoomImages.add(path);
      pendingRoomImages.delete(path);
      resolve(true);
    };
    image.onerror = () => {
      pendingRoomImages.delete(path);
      resolve(false);
    };
    image.src = path;
  });
  pendingRoomImages.set(path, pending);
  return pending;
}

let activeRoomBackgroundLayer = 0;
let displayedRoomImage = 'assets/lighting/bedroom-states-v14/bedroom-c0-l0-m0.png';
let activeClothesStateLayer = 0;
let displayedClothesImage = '';
let activeToasterStateLayer = 0;
let displayedToasterImage = '';
const FAST_LIGHT_TRANSITION_MS = 220;
let fastLightTransitionTimer = null;
let roomLayerCleanupTimer = null;
let clothesLayerCleanupTimer = null;
let toasterLayerCleanupTimer = null;

function beginFastLightTransition() {
  scene.classList.add('light-switching');
  gameTimers.clear(fastLightTransitionTimer);
  fastLightTransitionTimer = gameTimers.schedule(() => {
    scene.classList.remove('light-switching');
    fastLightTransitionTimer = null;
  }, FAST_LIGHT_TRANSITION_MS + 50);
}

function setLayerVisibilityImmediately(layer, visible) {
  layer.style.transitionDuration = '0s';
  layer.classList.toggle('is-visible', visible);
  void layer.offsetWidth;
  layer.style.transitionDuration = '';
}

function commitClothesImage(path, immediate = false, fastLight = false) {
  if (path === displayedClothesImage && !immediate) return;
  gameTimers.clear(clothesLayerCleanupTimer);
  if (immediate) {
    clothesStateLayers.forEach((layer, index) => {
      layer.style.backgroundImage = `url('${path}')`;
      layer.style.zIndex = index === 0 ? 1 : 0;
      setLayerVisibilityImmediately(layer, index === 0);
    });
    activeClothesStateLayer = 0;
    displayedClothesImage = path;
    return;
  }
  const nextIndex = 1 - activeClothesStateLayer;
  const current = clothesStateLayers[activeClothesStateLayer];
  const next = clothesStateLayers[nextIndex];
  current.style.zIndex = 1;
  setLayerVisibilityImmediately(current, true);
  next.style.zIndex = 2;
  setLayerVisibilityImmediately(next, false);
  next.style.backgroundImage = `url('${path}')`;
  void next.offsetWidth;
  next.classList.add('is-visible');
  activeClothesStateLayer = nextIndex;
  displayedClothesImage = path;
  const transitionMs = fastLight ? FAST_LIGHT_TRANSITION_MS : 1400;
  clothesLayerCleanupTimer = gameTimers.schedule(() => {
    setLayerVisibilityImmediately(current, false);
    next.style.zIndex = 1;
    current.style.zIndex = 0;
    clothesLayerCleanupTimer = null;
  }, transitionMs + 30);
}

function commitToasterImage(path, immediate = false, fastLight = false) {
  if (path === displayedToasterImage && !immediate) return;
  gameTimers.clear(toasterLayerCleanupTimer);
  if (immediate) {
    toasterStateLayers.forEach((layer, index) => {
      layer.style.backgroundImage = `url('${path}')`;
      layer.style.zIndex = index === 0 ? 1 : 0;
      setLayerVisibilityImmediately(layer, index === 0);
    });
    activeToasterStateLayer = 0;
    displayedToasterImage = path;
    return;
  }
  const nextIndex = 1 - activeToasterStateLayer;
  const current = toasterStateLayers[activeToasterStateLayer];
  const next = toasterStateLayers[nextIndex];
  // Match the room-background swap: retain one fully opaque old state while
  // the decoded replacement fades over it. Fading both opaque toaster patches
  // at once makes their combined coverage dip and reads as a brief flash.
  current.style.zIndex = 1;
  setLayerVisibilityImmediately(current, true);
  next.style.zIndex = 2;
  setLayerVisibilityImmediately(next, false);
  next.style.backgroundImage = `url('${path}')`;
  void next.offsetWidth;
  next.classList.add('is-visible');
  activeToasterStateLayer = nextIndex;
  displayedToasterImage = path;
  const transitionMs = fastLight ? FAST_LIGHT_TRANSITION_MS : 1400;
  toasterLayerCleanupTimer = gameTimers.schedule(() => {
    setLayerVisibilityImmediately(current, false);
    next.style.zIndex = 1;
    current.style.zIndex = 0;
    toasterLayerCleanupTimer = null;
  }, transitionMs + 30);
}

function commitRoomImage(path, immediate = false, fastLight = false) {
  if (fastLight) beginFastLightTransition();
  scene.style.setProperty('--room-image', `url('${path}')`);
  if (gameState.currentRoom === 'bedroom') commitClothesImage(bedroomClothesImageForState(), immediate, fastLight);
  if (gameState.currentRoom === 'living') commitToasterImage(toasterImageForState(), immediate, fastLight);
  if (path === displayedRoomImage) return;
  gameTimers.clear(roomLayerCleanupTimer);
  if (immediate) {
    roomBackgroundLayers.forEach((layer, index) => {
      layer.style.backgroundImage = `url('${path}')`;
      layer.style.zIndex = index === 0 ? 1 : 0;
      setLayerVisibilityImmediately(layer, index === 0);
    });
    activeRoomBackgroundLayer = 0;
    displayedRoomImage = path;
    return;
  }
  const nextIndex = 1 - activeRoomBackgroundLayer;
  const current = roomBackgroundLayers[activeRoomBackgroundLayer];
  const next = roomBackgroundLayers[nextIndex];
  current.style.zIndex = 1;
  next.style.zIndex = 2;
  setLayerVisibilityImmediately(next, false);
  next.style.backgroundImage = `url('${path}')`;
  void next.offsetWidth;
  next.classList.add('is-visible');
  activeRoomBackgroundLayer = nextIndex;
  displayedRoomImage = path;
  const transitionMs = fastLight ? FAST_LIGHT_TRANSITION_MS : 1400;
  roomLayerCleanupTimer = gameTimers.schedule(() => {
    setLayerVisibilityImmediately(current, false);
    next.style.zIndex = 1;
    current.style.zIndex = 0;
    roomLayerCleanupTimer = null;
  }, transitionMs + 30);
}

function applyRoomImage(path, immediate = false, fastLight = false) {
  const clothesPath = gameState.currentRoom === 'bedroom' ? bedroomClothesImageForState() : null;
  const toasterPath = gameState.currentRoom === 'living' ? toasterImageForState() : null;
  const ready = decodedRoomImages.has(path) && (!clothesPath || decodedRoomImages.has(clothesPath)) && (!toasterPath || decodedRoomImages.has(toasterPath));
  if (typeof Image === 'undefined' || ready) {
    commitRoomImage(path, immediate, fastLight);
    return;
  }
  Promise.all([preloadRoomImage(path), clothesPath ? preloadRoomImage(clothesPath) : Promise.resolve(true), toasterPath ? preloadRoomImage(toasterPath) : Promise.resolve(true)]).then(loaded => {
    if (loaded.every(Boolean) && roomImageForState() === path) {
      const commit=()=>{if(roomImageForState()===path)commitRoomImage(path,immediate,fastLight);};
      if(gameTimers.paused)gameTimers.schedule(commit,0);else commit();
    }
  });
}

// Images a room draws besides its lighting background. They are decoded with
// the background, so no part of a room can appear before the rest of it.
const roomOverlayImages = Object.freeze({
  outside: Object.freeze(['assets/outside-cars-foreground-v1.png']),
  street: Object.freeze(['assets/street_bg.png', 'assets/street_doors_open.png', 'assets/bluestar-interior-v2.png', 'assets/bluestar-door-left-v2.png', 'assets/bluestar-door-right-v2.png']),
  alley: Object.freeze(['assets/alley-man-sprite-v6.png'])
});
// Rooms reachable in one step, warmed in advance so exits switch instantly.
const roomNeighbours = Object.freeze({
  bedroom: ['living'], living: ['bedroom', 'bathroom', 'outside'], bathroom: ['living'],
  outside: ['living', 'street'], street: ['outside', 'alley'], alley: ['street']
});

function roomAssetPaths(roomId, state = gameState) {
  return [roomImageForState(roomId, state), ...(roomId === 'bedroom' ? [bedroomClothesImageForState(state)] : []), ...(roomId === 'living' ? [toasterImageForState(state)] : []), ...(roomOverlayImages[roomId] || [])];
}

function roomAssetsReady(roomId, state = gameState) {
  return typeof Image === 'undefined' || roomAssetPaths(roomId, state).every(path => decodedRoomImages.has(path));
}

// Runs a room switch only once everything the destination draws is decoded, so
// the background, overlays and player change in the same frame. Input waits
// meanwhile; a newer switch, load, reset or teleport supersedes a pending one.
let roomSwitch = null;
function whenRoomReady(roomId, apply) {
  const token = {};
  roomSwitch = token;
  if (roomAssetsReady(roomId)) { roomSwitch = null; apply(); return; }
  Promise.all(roomAssetPaths(roomId).map(preloadRoomImage)).then(() => {
    const run = () => { if (roomSwitch !== token) return; roomSwitch = null; apply(); };
    if (gameTimers.paused) gameTimers.schedule(run, 0); else run();
  });
}

function cancelRoomSwitch() {
  roomSwitch = null;
}

function warmAdjacentRoomImages(roomId) {
  for (const key of roomStateKeys[roomId] || []) {
    const adjacentState = { ...gameState, [key]: !gameState[key] };
    preloadRoomImage(roomImageForState(roomId, adjacentState));
    if (roomId === 'bedroom') preloadRoomImage(bedroomClothesImageForState(adjacentState));
    if (roomId === 'living') preloadRoomImage(toasterImageForState(adjacentState));
  }
  for (const path of roomOverlayImages[roomId] || []) preloadRoomImage(path);
  for (const neighbour of roomNeighbours[roomId] || []) roomAssetPaths(neighbour).forEach(preloadRoomImage);
}

function syncRoom(options = {}) {
  if (options.fastLight) beginFastLightTransition();
  const bedroom = gameState.currentRoom === 'bedroom';
  const curtainsOpen = roomCurtainsOpen();
  scene.dataset.room = gameState.currentRoom;
  scene.classList.toggle('curtains-open', curtainsOpen);
  scene.classList.toggle('curtains-closed', !curtainsOpen);
  scene.classList.toggle('tv-on', gameState.tvOn);
  syncPortableState();
  const clothes = gameState.itemPlacements.crumpledClothes;
  bedroomClothes.classList.toggle('is-away', !(clothes?.kind === 'world' && clothes.room === 'bedroom' && clothes.target === 'crumpledClothes'));
  const clothesHotspot = [...document.getElementById('hotspots').children].find(button => button.dataset.target === 'crumpledClothes');
  clothesHotspot?.setAttribute('aria-label', displayName(targetObjectName('crumpledClothes', bedroomObjects.crumpledClothes)));
  livingToaster.classList.toggle('is-taken', gameState.toasterTaken);
  renderInventory();
  scene.style.setProperty('--curtain-light', curtainLightLevel());
  player.style.setProperty('--player-light', playerLightLevel());
  const image = roomImageForState();
  applyRoomImage(image, options.immediate, options.fastLight);
  if (bedroom) preloadRoomImage(bedroomDoorImageForState());
  warmAdjacentRoomImages(gameState.currentRoom);
  curtainToggle.textContent = curtainsOpen ? 'Close curtains' : 'Open curtains';
  curtainToggle.setAttribute('aria-expanded', String(curtainsOpen));
  curtainToggle.hidden = !bedroom;
  const summaries = {
    bedroom: `${curtainsOpen ? 'Curtains open' : 'Curtains closed'} ? Main ${gameState.bedroomMainLightOn ? 'on' : 'off'}`,
    living: `${curtainsOpen ? 'Curtains open' : 'Curtains closed'} ? Main ${gameState.livingMainLightOn ? 'on' : 'off'} ? Bench ${gameState.kitchenLightsOn ? 'on' : 'off'} ? Hall ${gameState.hallwayLightOn ? 'on' : 'off'}`,
    bathroom: `${curtainsOpen ? 'Curtains open' : 'Curtains closed'} ? Main ${gameState.bathroomMainLightOn ? 'on' : 'off'}`
  };
  roomLight.textContent = summaries[gameState.currentRoom] || apartmentRooms[gameState.currentRoom].name;
  const screen = document.getElementById('living-tv');
  screen.textContent = gameState.livingTvOn ? ['RAIN', 'COOK', 'FILM'][gameState.channel] : '';
  screen.style.opacity = gameState.livingTvOn ? '.85' : '0';
  screen.style.setProperty('--channel-color', ['#47667f', '#846841', '#777b7c'][gameState.channel]);
}

function setCurtains(open, roomId = gameState.currentRoom) {
  if (wakeup.active) return;
  const key = curtainStateKeys[roomId];
  if (!key) return;
  gameState[key] = open;
  // CSS transitions start together and can reverse smoothly mid-animation.
  syncRoom();
  renderPlayer();
  if (roomId === 'bedroom') showMessage(open ? 'You draw the curtains apart. Grey daylight fills the room.' : 'You pull the curtains shut. The room settles back into the dark.');
  else showMessage(open ? `You open the ${roomId} curtains on the unseen front wall. Daylight changes the room.` : `You close the ${roomId} curtains on the unseen front wall.`);
}

function toggleLight(circuit) {
  if (wakeup.active) return;
  const definition = lightCircuits[circuit];
  if (!definition) return;
  gameState[definition.state] = !gameState[definition.state];
  syncRoom({ fastLight: true });
  renderPlayer();
  showMessage(`You switch the ${definition.name} ${gameState[definition.state] ? 'on' : 'off'}.`);
}

function movementFacing(dx, dy) {
  if (Math.hypot(dx, dy) < 0.001) return movement.facing;
  const angle = Math.atan2(Math.abs(dx), Math.abs(dy)) * 180 / Math.PI;
  if (angle <= VERTICAL_CONE_DEGREES) return dy < 0 ? 'up' : 'down';
  return dx < 0 ? 'left' : 'right';
}

function renderPlayer(walking = false) {
  playerFrame.style.setProperty('--player-sheet', `url('${playerSheetForState()}')`);
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
  player.style.setProperty('--player-light', playerLightLevel());
  scene.classList.toggle('player-behind-cars', outdoors && movement.y < CAR_GROUND_LINE);
  scene.classList.toggle('player-behind-tv', playerBehindOccluder(apartmentRooms[gameState.currentRoom]?.tvOccluder));
  player.style.zIndex = Math.round(movement.y);
  syncStreetDoors();
}

// True when the player's feet are behind an occluder's front ground line
// (a left-to-right polyline, extended flat beyond its ends).
function playerBehindOccluder(occluder) {
  if (!occluder) return false;
  const line = occluder.groundLine;
  if (movement.x <= line[0][0]) return movement.y < line[0][1];
  for (let i = 1; i < line.length; i++) {
    const [x0, y0] = line[i - 1], [x1, y1] = line[i];
    if (movement.x <= x1) return movement.y < y0 + (y1 - y0) * (movement.x - x0) / (x1 - x0);
  }
  return movement.y < line[line.length - 1][1];
}

const polygonClipPath = (points, [left, top, width, height] = [0, 0, 100, 100]) =>
  `polygon(${points.map(([x, y]) => `${(x - left) / width * 100}% ${(y - top) / height * 100}%`).join(', ')})`;
document.getElementById('tv-foreground').style.clipPath = polygonClipPath(apartmentRooms.living.tvOccluder.silhouette);

function floorPosition(x, y) {
  if (gameState.currentRoom === 'street') {
    const point = streetProject(x, y);
    return { x: point.x, y: point.y };
  }
  if (gameState.currentRoom === 'alley') {
    const point = alleyProject(x, y);
    return { x: point.x, y: point.y };
  }
  if (gameState.currentRoom === 'outside') {
    const point = outsideProjection(x, y);
    return { x: point.x, y: point.y };
  }
  const room = apartmentRooms[gameState.currentRoom];
  const point = { x, y };
  if (isFloorPoint(point, room)) return point;
  // Otherwise take the nearest walkable point on the floor edge, or just
  // outside the nearest obstacle edge.
  const candidates = [];
  const area = roomWalkArea(room);
  area.forEach((a, i) => candidates.push(closestOnSegment(point, a, area[(i + 1) % area.length])));
  for (const obstacle of roomObstacles(room)) {
    const cx = obstacle.reduce((sum, p) => sum + p[0], 0) / obstacle.length;
    const cy = obstacle.reduce((sum, p) => sum + p[1], 0) / obstacle.length;
    obstacle.forEach((a, i) => {
      const b = obstacle[(i + 1) % obstacle.length];
      const edge = closestOnSegment(point, a, b);
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      let nx = (b[1] - a[1]) / length, ny = -(b[0] - a[0]) / length;
      if (nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
      candidates.push({ x: edge.x + nx * 2, y: edge.y + ny * 2 });
    });
  }
  const valid = candidates.filter(candidate => isFloorPoint(candidate, room));
  const pool = valid.length ? valid : candidates;
  return pool.sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
}

// Apartment floors are polygons in scene percentages. Rooms without a walkArea
// use their floor rectangle; obstacles are [x, y, width, height] rectangles or
// polygons.
function roomWalkArea(room) {
  if (room.walkArea) return room.walkArea;
  const [left, right, top, bottom] = room.floor;
  return [[left, top], [right, top], [right, bottom], [left, bottom]];
}

function roomObstacles(room) {
  return (room.obstacles || []).map(obstacle => Array.isArray(obstacle[0]) ? obstacle
    : [[obstacle[0], obstacle[1]], [obstacle[0] + obstacle[2], obstacle[1]], [obstacle[0] + obstacle[2], obstacle[1] + obstacle[3]], [obstacle[0], obstacle[1] + obstacle[3]]]);
}

function closestOnSegment(point, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((point.x - a[0]) * dx + (point.y - a[1]) * dy) / (dx * dx + dy * dy)));
  return { x: a[0] + dx * t, y: a[1] + dy * t };
}

function onPolygonEdge(point, polygon) {
  return polygon.some((a, i) => {
    const edge = closestOnSegment(point, a, polygon[(i + 1) % polygon.length]);
    return Math.hypot(edge.x - point.x, edge.y - point.y) < 1e-6;
  });
}

function insidePolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
    if ((yi > point.y) !== (yj > point.y) && point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// The floor's edge is walkable; an obstacle's edge is not.
function isFloorPoint(point, room) {
  const area = roomWalkArea(room);
  if (!insidePolygon(point, area) && !onPolygonEdge(point, area)) return false;
  return !roomObstacles(room).some(obstacle => insidePolygon(point, obstacle) || onPolygonEdge(point, obstacle));
}

function floorSegmentClear(a, b, room) {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / .4);
  for (let i = 1; i < steps; i++) {
    if (!isFloorPoint({ x: a.x + (b.x - a.x) * i / steps, y: a.y + (b.y - a.y) * i / steps }, room)) return false;
  }
  return true;
}

// Shortest route across an apartment floor, turning just outside obstacle
// corners and inside the floor's corners (such as the hallway opening).
function apartmentRoute(from, to, room) {
  const start = isFloorPoint(from, room) ? { x: from.x, y: from.y } : floorPosition(from.x, from.y);
  const lead = start.x === from.x && start.y === from.y ? [] : [start];
  if (floorSegmentClear(start, to, room)) return [...lead, to];
  const nodes = [start, to];
  for (const polygon of [roomWalkArea(room), ...roomObstacles(room)]) {
    polygon.forEach((v, i) => {
      const prev = polygon[(i + polygon.length - 1) % polygon.length], next = polygon[(i + 1) % polygon.length];
      const ax = v[0] - prev[0], ay = v[1] - prev[1], bx = v[0] - next[0], by = v[1] - next[1];
      const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      let dx = ax / la + bx / lb, dy = ay / la + by / lb;
      const length = Math.hypot(dx, dy) || 1;
      dx /= length; dy /= length;
      for (const side of [1, -1]) {
        const node = { x: v[0] + dx * side * 2.5, y: v[1] + dy * side * 2.5 };
        if (isFloorPoint(node, room)) nodes.push(node);
      }
    });
  }
  // Screen distance: the scene is 16:9, so a vertical percent is shorter.
  const cost = (a, b) => Math.hypot(a.x - b.x, (a.y - b.y) * 9 / 16);
  const distance = nodes.map(() => Infinity), previous = nodes.map(() => -1), done = nodes.map(() => false);
  distance[0] = 0;
  for (;;) {
    let current = -1;
    nodes.forEach((_, i) => { if (!done[i] && distance[i] < Infinity && (current < 0 || distance[i] < distance[current])) current = i; });
    if (current < 0 || current === 1) break;
    done[current] = true;
    nodes.forEach((node, i) => {
      if (done[i]) return;
      const total = distance[current] + cost(nodes[current], node);
      if (total < distance[i] && floorSegmentClear(nodes[current], node, room)) { distance[i] = total; previous[i] = current; }
    });
  }
  if (previous[1] < 0) return [...lead, to];
  const path = [];
  for (let i = 1; i > 0; i = previous[i]) path.unshift({ x: nodes[i].x, y: nodes[i].y });
  return [...lead, ...path];
}

function cancelPendingAction() {
  gameTimers.clear(movement.pendingTimer);
  movement.pendingTimer = null;
}

function stopWalking() {
  cancelPendingAction();
  movement.route = null;
  movement.stairProgress = 0;
  if (movement.frame !== null) cancelAnimationFrame(movement.frame);
  movement.frame = null;
  movement.destination = null;
  movement.lastTime = null;
  renderPlayer(false);
}

function movePlayerTo(x, y, callback) {
  if (wakeup.active || wardrobeChanging) return;
  if (transition || roomSwitch) return;
  cancelPendingAction();
  callback = streetArrival(x, y, callback);
  movement.route = gameState.currentRoom === 'street' ? streetRoute(movement, { x, y })
    : gameState.currentRoom === 'alley' ? alleyRoute(movement, { x, y })
    : gameState.currentRoom === 'outside' ? outsideRoute(movement, { x, y })
    : apartmentRoute(movement, floorPosition(x, y), apartmentRooms[gameState.currentRoom]);
  if (!movement.route.length) { stopWalking(); if (callback) callback(); return; }
  movement.route[movement.route.length-1].callback = callback;
  movement.destination = movement.route.shift();
  movement.segmentStart = { x: movement.x, y: movement.y };
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
  const perspective = playerPerspective(gameState.currentRoom, movement.y);
  const gait = playerPerspectiveProfiles[gameState.currentRoom]?.gait;
  // Walked distance: vertical screen travel counts extra where depth is foreshortened.
  const distance = Math.hypot(dx, dy / (gait?.depthPace || 1));
  const step = (target.stairs ? 5 : gait ? perspective.width * gait.pace : gameState.currentRoom === 'street' ? 9 : gameState.currentRoom === 'outside' ? 14 : 18) * elapsed;
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
  // Stride is a fixed fraction of the exact rendered size in every room, so the
  // feet cover ground at the pace they move and never slide near the camera.
  const { width } = playerPerspective(gameState.currentRoom, movement.y);
  movement.phase = (movement.phase + step / (width * (gait?.stride ?? .65))) % 1;
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
  if (wakeup.active) return;
  if (transition || roomSwitch) return;
  const object = roomObjects[target];
  const fixedReply = (isLightSwitch(object) || isContextualDoor(object)) && fixedContextualReply(verb);
  if (fixedReply) { showMessage(fixedReply); return; }
  if (handleAlleyTarget(target, object, verb)) return;
  if (handleStreetTarget(object, verb)) return;
  if (object.locked) {
    if (verb === 'look' || verb === 'walk') showMessage(object.description);
    else if (verb === 'use') showMessage(object.lockedResponse || 'It is locked.');
    else showMessage(interactionReply(target, object, verb));
    return;
  }
  if (object.portal) {
    if (verb === 'look') showMessage(object.description);
    else if (verb === 'close') showMessage('The door is already closed.');
    else if (verb === 'talk') showMessage(refusal(verb, object));
    else if (object.to) beginTransition(object);
    else beginTransition(object, true);
    return;
  }
  if (object.curtainRoom) {
    const open = roomCurtainsOpen(object.curtainRoom);
    if (verb === 'look') showMessage(open ? `The ${object.curtainRoom} curtains are open.` : object.description);
    else if (verb === 'open' || verb === 'close') {
      const requested = verb === 'open';
      if (open === requested) showMessage(`The curtains are already ${requested ? 'open' : 'closed'}.`);
      else setCurtains(requested, object.curtainRoom);
    } else if (verb === 'use' || verb === 'walk') setCurtains(!open, object.curtainRoom);
    else showMessage(interactionReply(target, object, verb));
    return;
  }
  if (object.lightCircuit) {
    if (verb === 'look' || verb === 'walk') showMessage(object.description);
    else if (verb === 'use') toggleLight(object.lightCircuit);
    else showMessage(interactionReply(target, object, verb));
    return;
  }
  if (gameState.currentRoom !== 'bedroom') { interactApartment(target, verb, object); return; }
  if (target === 'crumpledClothes' && itemAtTarget('bedroom', target) !== 'crumpledClothes') {
    if (verb === 'look' || verb === 'walk') showMessage("It's the carpet.");
    else showMessage(interactionReply(target, { name: 'carpet', description: "It's the carpet.", floor: true }, verb));
    return;
  }
  if (verb === 'look' || verb === 'walk') { showMessage(object.description); return; }
  if (target === 'crumpledClothes' && verb === 'use') {
    if (itemAtTarget('bedroom', 'crumpledClothes') === 'crumpledClothes') wearCrumpledClothes();
    else showMessage('The clothes are no longer on the carpet.');
  } else if (target === 'lamp' && verb === 'use') {
    gameState.lampOn = !gameState.lampOn;
    syncRoom();
    renderPlayer();
    showMessage(gameState.lampOn ? 'You switch the bedside lamp on.' : 'You switch the bedside lamp off.');
  } else if ((target === 'tv' || target === 'console') && verb === 'use') {
    gameState.tvOn = !gameState.tvOn;
    syncRoom();
    showMessage(gameState.tvOn ? 'You switch on the console. The TV glows quietly.' : 'You switch off the TV and console.');
  } else if (target === 'alarm' && verb === 'use') {
    gameState.alarmArmed = !gameState.alarmArmed;
    showMessage(gameState.alarmArmed ? 'You set the alarm for tomorrow morning.' : 'You turn the alarm off.');
  } else if (target === 'drawers' && verb === 'use') {
    toggleSocks();
  } else if (target === 'drawers' && (verb === 'open' || verb === 'close')) {
    gameState.drawersOpen = verb === 'open';
    showMessage(gameState.drawersOpen ? 'You open the top drawer: folded T-shirts, socks, and a charging cable.' : 'You push the drawer shut.');
  } else if (target === 'cupboard' && verb === 'use') {
    if (gameState.outfit === 'clean') putCleanClothesAway();
    else wearCleanClothes();
  } else if (target === 'cupboard') {
    showMessage(interactionReply(target, object, verb));
  } else if (verb === 'use') {
    const responses = { bed: 'You straighten the pillow. Close enough for now.', couch: 'You test a cushion. Still the most comfortable spot in the room.', guitar: 'You pluck a quiet chord. A little out of tune.', books: 'You flick through a few pages, then put the book back.', bookshelf: 'You take down a paperback, check your old bookmark, and return it.' };
    showMessage(responses[target] || object.description);
  } else showMessage(interactionReply(target, object, verb));
}

const quietTalkTargets = new Set(['tv', 'console', 'channelBox', 'blueCar', 'burgundyCar', 'silverCar', 'parkedCars']);
const liftBrieflyTargets = new Set(['books', 'guitar', 'towels', 'picture']);
const heavyObjectPattern = /bed|couch|chair|table|drawers|fridge|freezer|stove|oven|microwave|machine|dumpster|car|bath|toilet|cabinet|bookshelf/i;
const fixedObjectPattern = /switch|door|window|curtain|sink|basin|mirror|tree|bush|fence|steps|hydrant|lawn|rug|mat|parking|footpath|alley|street/i;

function interactionReply(target, object, verb) {
  const custom = object.interactions?.[verb];
  if (custom) return custom;
  const name = object.name.toLowerCase();
  if (verb === 'look' || verb === 'walk') return object.description;
  if (verb === 'talk') {
    if (target === 'tv' || /television|tv/i.test(name)) return "You don't feel like talking to the TV.";
    if (['blueCar', 'burgundyCar', 'silverCar'].includes(target) || /car/i.test(name)) return "You don't feel like talking to the car.";
    if (quietTalkTargets.has(target)) return `You don't feel like talking to the ${name}.`;
    if (target === 'mirror') return 'You almost speak to your reflection, then decide the silence is easier.';
    if (target === 'plant') return 'The plant leans toward the window. It seems unfair to ask it for conversation as well.';
    if (/appliance|fridge|freezer|stove|oven|microwave|toaster|machine|sink|toilet/i.test(name)) return `The ${name} offers only the usual household silence.`;
    return `There is nothing you feel like saying to the ${name}.`;
  }
  if (verb === 'pickup') {
    if (liftBrieflyTargets.has(target)) return `You lift the ${name} for a moment, then put it back where it was.`;
    if (heavyObjectPattern.test(name)) return `The ${name} is far too heavy to carry around.`;
    if (fixedObjectPattern.test(name) || object.floor) return `The ${name} is fixed in place, or close enough to it.`;
    return `You test the weight of the ${name}, then leave it where it is.`;
  }
  if (verb === 'place') return `The ${name} is already where it has ended up.`;
  if (verb === 'use') return object.response || `You try the ${name}, but nothing useful comes of it.`;
  if (verb === 'open') return `The ${name} does not open.`;
  if (verb === 'close') return `The ${name} is already closed, or has nothing to close.`;
  return `Nothing useful happens with the ${name}.`;
}

// A short reply for legacy callers and object-specific handlers.
function refusal(verb, object) {
  return interactionReply('', object, verb);
}

function scenePoint(event) {
  const rect = scene.getBoundingClientRect();
  return [(event.clientX - rect.left) / rect.width * 100, (event.clientY - rect.top) / rect.height * 100];
}

function handleTarget(target, event) {
  if (wakeup.active || transition || roomSwitch || wardrobeChanging || worldPause.owners.size) return;
  const object = roomObjects[target];
  const verb = gameState.selectedVerb;
  const lightControl = Boolean(object?.lightCircuit);
  const switchOrDoor = Boolean(isLightSwitch(object) || isContextualDoor(object));
  if (verb === 'look' && (lightControl || object?.curtainRoom || isContextualDoor(object))) {
    walkTo(target, () => interact(target, 'look'));
    return;
  }
  if (switchOrDoor && verb && verb !== 'use') {
    const reply = fixedContextualReply(verb);
    walkTo(target, () => showMessage(reply));
    return;
  }
  if (lightControl && verb && verb !== 'use') {
    walkTo(target, () => interact(target, verb));
    return;
  }
  updateStatus(target);
  if (lightControl) {
    walkTo(target, () => {
      toggleLight(object.lightCircuit);
      if (verb === 'use') setVerb(null);
      updateStatus(target);
    });
    return;
  }
  if (object?.curtainRoom && verb && verb !== 'use') {
    walkTo(target, () => interact(target, verb));
    return;
  }
  if (object?.curtainRoom) {
    if (verb) setVerb(null);
    walkTo(target, () => { setCurtains(!roomCurtainsOpen(object.curtainRoom), object.curtainRoom); updateStatus(target); });
    return;
  }
  if (isContextualDoor(object)) {
    const clearSelection = verb === 'use' ? () => setVerb(null) : null;
    if (object.streetDoor === 'laundry' && gameState.laundryDoorOpen) { handleStreetTarget(object, 'close', clearSelection); return; }
    if (object.alleyExit) { handleAlleyTarget(target, object, 'use', clearSelection); return; }
    if (object.streetExit || object.streetDoor) { handleStreetTarget(object, 'use', clearSelection); return; }
    walkTo(target, () => { if (clearSelection) clearSelection(); interact(target, 'use'); });
    return;
  }
  if (verb === 'look') {
    walkTo(target, () => interact(target, 'look'));
    return;
  }
  const itemId = interactionSelection.itemId;
  if (object?.floor && event?.detail > 0 && !itemId && !verb) {
    movePlayerTo(...scenePoint(event));
    return;
  }
  if (verb === 'pickup') { walkTo(target, () => pickUpItemAt(target, object)); return; }
  if (verb === 'place' && itemId) { walkTo(target, () => placeInventoryItem(itemId, target, object)); return; }
  if (verb === 'use' && itemId) { walkTo(target, () => useInventoryItem(itemId, target, object)); return; }
  if (verb === 'place' && !itemId) { walkTo(target, () => interact(target, 'place')); return; }
  if (!verb) { walkTo(target); return; }
  walkTo(target, () => interact(target, verb));
}

function saveGame() {
  if (wakeup.active) return;
  if (transition || roomSwitch || wardrobeChanging) { showMessage('Finish going through the doorway before saving.'); return; }
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ version: 7, state: gameState, systems: gameSystems, player: { x: movement.x, y: movement.y, facing: movement.facing } }));
    showMessage('Apartment saved.');
  } catch { showMessage('The browser could not save this game.'); }
}

function loadGame() {
  if (wakeup.active) return;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) { showMessage('No bedroom save found.'); return; }
    const saved = JSON.parse(raw);
    if (![1,2,3,4,5,6,7].includes(saved.version) || !saved.state || !saved.player) throw new Error('Invalid save');
    cancelTransition();
    cancelWardrobeChange();
    stopWalking();
    gameState.laundryDoorOpen = false; // Saves from before the street start with its door closed.
    for (const key of ['curtainsOpen', 'lampOn', 'bedroomMainLightOn', 'socksOn', 'livingCurtainsOpen', 'livingMainLightOn', 'kitchenLightsOn', 'hallwayLightOn', 'toasterTaken', 'bathroomCurtainsOpen', 'bathroomMainLightOn', 'tvOn', 'drawersOpen', 'alarmArmed', 'livingTvOn', 'plantWatered', 'keysTaken', 'laundryDoorOpen', 'alleyManSpoken', 'alleyManCoffeeRequested']) {
      if (typeof saved.state[key] === 'boolean') gameState[key] = saved.state[key];
    }
    gameState.outfit = saved.state.outfit === 'clean' ? 'clean' : (['crumpled', 'clothes'].includes(saved.state.outfit) ? 'crumpled' : 'underwear');
    gameState.channel = Number.isInteger(saved.state.channel) && saved.state.channel >= 0 && saved.state.channel < 3 ? saved.state.channel : 0;
    if (saved.version >= 6) {
      gameState.inventory = Array.isArray(saved.state.inventory) ? saved.state.inventory.filter(id => Object.hasOwn(itemDefinitions, id)) : [];
      const placements = saved.state.itemPlacements && typeof saved.state.itemPlacements === 'object' ? saved.state.itemPlacements : {};
      gameState.itemPlacements = {};
      for (const id of Object.keys(itemDefinitions)) {
        const placement = placements[id];
        const legacyTakenKey = ({ toaster: 'toasterTaken', keys: 'keysTaken' })[id];
        const fallback = id === 'socks' ? { kind: 'stored', room: 'bedroom', target: 'drawers' } : (id === 'cleanClothes' ? { kind: 'stored', room: 'bedroom', target: 'cupboard' } : { kind: 'world', ...itemDefinitions[id].source });
        gameState.itemPlacements[id] = placement && typeof placement === 'object' ? { ...placement } : (legacyTakenKey && saved.state[legacyTakenKey] ? { kind: 'inventory' } : fallback);
        if (['inventory','worn'].includes(gameState.itemPlacements[id].kind) && !gameState.inventory.includes(id)) gameState.inventory.push(id);
      }
      if (saved.systems?.characterStats?.schemaVersion === 1) {
        gameSystems.characterStats.values = { ...(saved.systems.characterStats.values || {}) };
        gameSystems.characterStats.displayMode = saved.systems.characterStats.displayMode ?? null;
      }
    } else {
      gameState.inventory = [gameState.toasterTaken && 'toaster', gameState.keysTaken && 'keys'].filter(Boolean);
      gameState.itemPlacements = {
        toaster: gameState.toasterTaken ? { kind: 'inventory' } : { kind: 'world', room: 'living', target: 'toaster' },
        keys: gameState.keysTaken ? { kind: 'inventory' } : { kind: 'world', room: 'living', target: 'keys' },
        crumpledClothes: { kind: 'world', room: 'bedroom', target: 'crumpledClothes' },
        cleanClothes: { kind: 'stored', room: 'bedroom', target: 'cupboard' },
        socks: { kind: 'stored', room: 'bedroom', target: 'drawers' }
      };
    }
    syncPortableState();
    const room = saved.version >= 2 && Object.hasOwn(apartmentRooms, saved.state.currentRoom) ? saved.state.currentRoom : 'bedroom';
    whenRoomReady(room, () => {
      showRoom(room);
      const x = Number.isFinite(saved.player.x) ? saved.player.x : 42;
      const y = Number.isFinite(saved.player.y) ? saved.player.y : 84;
      Object.assign(movement, floorPosition(x, y));
      movement.facing = ['up', 'down', 'left', 'right'].includes(saved.player.facing) ? saved.player.facing : 'down';
      setVerb(saved.state.selectedVerb == null ? null : saved.state.selectedVerb);
      syncRoom();
      renderPlayer();
      showMessage('Apartment loaded.');
    });
  } catch { showMessage('The bedroom save could not be loaded.'); }
}

function resetGame() {
  cancelWakeup();
  cancelWardrobeChange();
  cancelTransition();
  cancelRoomSwitch();
  stopWalking();
  try { localStorage.removeItem(SAVE_KEY); } catch { /* The room still resets if storage is unavailable. */ }
  resetWorldState();
  interactionSelection.itemId = null;
  gameSystems.characterStats.values = {};
  gameSystems.characterStats.displayMode = null;
  showRoom('bedroom');
  Object.assign(movement, { x: 42, y: 84, facing: 'down', phase: 0 });
  setVerb(null);
  syncRoom();
  renderPlayer();
  showMessage('A quiet room. The curtains are closed.');
}

function showRoom(id) {
  // Room lighting must already be correct when the transition fade reveals it.
  // Curtain toggles still use their normal animated transition outside this block.
  gameState.currentRoom = id;
  roomObjects = apartmentRooms[id].objects;
  scene.setAttribute('aria-label', apartmentRooms[id].name);
  buildHotspots();
  syncRoom({ immediate: true });
  updateStatus();
}

function interactApartment(target, verb, object) {
  if (target === 'toaster' && (verb === 'look' || verb === 'walk')) {
    showMessage(gameState.toasterTaken ? 'A clear patch of bench remains beside the stove. The toaster is elsewhere.' : object.description);
    return;
  }
  if (target === 'keys' && (verb === 'look' || verb === 'walk')) {
    showMessage(gameState.keysTaken ? 'The shortened key rack is empty.' : object.description);
    return;
  }
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
    showMessage('Use Pick up to take the apartment keys from their hook.');
  } else if (target === 'toaster' && verb === 'use') {
    showMessage('The toaster needs something to use it with. Pick it up, then choose Use from Inventory.');
  } else if (target === 'coffee' && verb === 'use') showMessage('The machine whirrs and fills a mug with hot coffee.');
  else if (target === 'sink' && verb === 'use') showMessage('You run the tap, rinse your hands, then turn it off.');
  else if (verb === 'open' && ['fridge','freezer','entryDrawers','counter'].includes(target)) showMessage(`You open the ${object.name}, look inside, then shut it. ${object.description}`);
  else if (verb === 'close') showMessage(`The ${object.name} is already closed, or has nothing to close.`);
  else if (verb === 'use') showMessage(object.response || interactionReply(target, object, verb));
  else showMessage(interactionReply(target, object, verb));
}

// A single cancellable animation owns door travel; floor clicks cannot interrupt
// halfway between rooms. On arrival, the panel uses the destination door's clean
// artwork (so handles and surrounding furniture cannot jump onto it). The
// reciprocal bedroom doorway uses the destination-side swing after the room
// switch, keeping its single physical leaf inside the bedroom in both directions.
// Other established portals retain their source-side closing motion.
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
  doorway.dataset.foreground = object.foreground || '';
  Object.assign(doorway.style, { left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` });
  Object.assign(face.style, {
    transform: 'rotateY(0deg)',
    transformOrigin: `${object.hinge || 'left'} center`
  });
  const isolatedBedroomDoor = object.foreground === 'bedroom-couch' && gameState.currentRoom === 'bedroom';
  Object.assign(surface.style, {
    backgroundImage: `url('${isolatedBedroomDoor ? bedroomDoorImageForState() : roomImageForState(gameState.currentRoom)}')`,
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
  delete doorway.dataset.foreground;
  document.getElementById('scene-fade').style.opacity = '0';
  player.style.opacity = '1';
  scene.setAttribute('aria-busy', 'false');
}
function beginTransition(object, peek = false) {
  stopWalking();
  if (!peek) roomAssetPaths(object.to).forEach(preloadRoomImage);
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
    // The fade is fully black here; wait on it until the next room is decoded.
    if (e >= 1.45 && !t.switched && !roomAssetsReady(t.object.to)) {
      t.elapsed = 1.45;
      if (!t.loading) { t.loading = true; roomAssetPaths(t.object.to).forEach(preloadRoomImage); }
      t.frame = requestAnimationFrame(animateDoor);
      return;
    }
    if (e >= 1.45 && !t.switched) {
      showRoom(t.object.to);
      t.incoming = roomObjects[t.object.entry];
      t.useDestinationSwing = Boolean(t.object.destinationSwing || t.incoming.destinationSwing);
      positionDoor(t.incoming);
      document.getElementById('doorway').dataset.swingSide = t.useDestinationSwing ? 'destination' : 'source';
      document.getElementById('doorway').dataset.visualRoom = gameState.currentRoom;
      t.switched = true;
      document.getElementById('doorway').dataset.motion = 'closing';
    }
    const incoming = t.switched;
    const object = incoming ? t.incoming : t.object;
    const swingObject = incoming && t.useDestinationSwing ? object : t.object;
    const direction = swingObject.swing ?? (swingObject.hinge === 'right' ? 1 : -1);
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
  button.setAttribute('aria-label', displayName(targetObjectName(target, object)));
  const [left, top, width, height] = object.area;
  Object.assign(button.style, { left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` });
  if (object.shape) button.style.clipPath = polygonClipPath(object.shape, object.area);
  button.addEventListener('mouseenter', () => updateStatus(target));
  button.addEventListener('focus', () => updateStatus(target));
  button.addEventListener('mouseleave', () => updateStatus());
  button.addEventListener('blur', () => updateStatus());
  button.addEventListener('click', event => { event.stopPropagation(); handleTarget(target, event); });
  document.getElementById('hotspots').appendChild(button);
}
}
document.querySelectorAll('#verbs button[data-verb]').forEach(button => button.addEventListener('click', () => setVerb(button.dataset.verb)));
document.getElementById('clearVerb').addEventListener('click', () => setVerb(null));
scene.addEventListener('click', event => {
  if (event.target.closest('button, #messageBox') || worldPause.owners.size) return;
  movePlayerTo(...scenePoint(event));
});
curtainToggle.addEventListener('click', () => {
  if (transition || !curtainStateKeys[gameState.currentRoom]) return;
  const target = gameState.currentRoom === 'bedroom' ? 'curtains' : gameState.currentRoom === 'living' ? 'livingCurtains' : 'bathroomCurtains';
  walkTo(target, () => setCurtains(!roomCurtainsOpen()));
});
document.getElementById('saveBtn').addEventListener('click', saveGame);
document.getElementById('loadBtn').addEventListener('click', loadGame);
document.getElementById('resetBtn').addEventListener('click', resetGame);
inventoryButton.addEventListener('click', openInventory);
document.getElementById('inventoryCloseBtn').addEventListener('click', () => closeInventory());
document.getElementById('inventoryUseBtn').addEventListener('click', () => setInventoryMode('use'));
document.getElementById('inventoryPlaceBtn').addEventListener('click', () => setInventoryMode('place'));
inventoryOverlay.addEventListener('click', event => { if (event.target === inventoryOverlay) closeInventory(); });
document.addEventListener?.('keydown', event => {
  if (event.key === 'Escape' && inventoryOverlay.hidden === false) { event.preventDefault(); event.stopImmediatePropagation(); closeInventory(); }
}, true);
// Every fresh launch starts here, without restoring an old level or auto-loading a save.
setVerb(null);
showRoom('bedroom');
syncRoom();
renderPlayer();
showMessage('A quiet morning. Click the curtains to let in some light, or explore the room.', 4500);
