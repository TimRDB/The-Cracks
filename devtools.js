const devToolsOverlay = document.getElementById('devTools');
const devMenu = document.getElementById('devMenu');
const devSceneSelect = document.getElementById('devSceneSelect');
const devSceneList = document.getElementById('devSceneList');
const devStats = document.getElementById('devStats');
const devTools = { open: false, fromTitle: false, paused: null, previousFocus: null };

// Where the player stands when each scene starts: the new-game pose, or the
// arrival point from the scene's usual entrance.
const devScenes = [
  { id: 'wakeup', label: 'Wake-up intro', note: 'Bedroom, asleep as the alarm rings' },
  { id: 'bedroom', label: 'Bedroom', note: 'Standing, curtains closed', start: { x: 42, y: 84, facing: 'down' } },
  { id: 'living', label: 'Living room & kitchen', note: 'Inside the bedroom door', start: { x: 29, y: 60, facing: 'down' } },
  { id: 'bathroom', label: 'Bathroom', note: 'Inside the living room door', start: { x: 32.5, y: 77, facing: 'right' } },
  { id: 'outside', label: 'Apartment forecourt', note: 'On the patio by the front door', start: { x: 73, y: 37.4, facing: 'down' } },
  { id: 'street', label: 'Laundry & Bluestar', note: 'Arriving along the footpath', start: { x: 3, y: streetFootY(3), facing: 'right' } },
  { id: 'laundry', label: 'Dollar Laundry interior', note: 'Inside the entrance, beside the door mat', start: { x: 50, y: 87, facing: 'up' } },
  { id: 'bluestar', label: 'Bluestar interior', note: 'Inside the automatic entrance', start: { x: 43, y: 86, facing: 'up' } },
  { id: 'alley', label: 'Bluestar alley', note: 'Looking back toward the street', start: { x: 28.5, y: 48, facing: 'down' } },
  { id: 'garage', label: 'Workplace parking garage', note: 'Beside the elevator and parking bays', start: { x: 24, y: 54, facing: 'right' } }
];

function pauseGame() {
  devTools.paused = pauseWorld('developer');
}

function resumeGame() {
  resumeWorld('developer');
  devTools.paused = null;
}

function showDevScreen(screen) {
  devMenu.hidden = screen !== devMenu;
  devSceneSelect.hidden = screen !== devSceneSelect;
  devStats.hidden = screen !== devStats;
  screen.querySelector('button')?.focus();
}
function activeDevScreen() {
  return [devMenu, devSceneSelect, devStats].find(screen => !screen.hidden) || devMenu;
}

// Available on the title screen and throughout play; only the brief New Game
// fade (title leaving, game not yet started) is excluded.
function openDevTools() {
  const fadingIntoGame = titleScreen.classList.contains('is-leaving') && !document.body.classList.contains('game-started');
  if (devTools.open || fadingIntoGame) return;
  if (inventoryOverlay.hidden === false) closeInventory();
  if (shoeChoiceOverlay.hidden === false) closeShoeChoice();
  devTools.open = true;
  devTools.fromTitle = !document.body.classList.contains('game-started');
  devTools.previousFocus=document.activeElement;
  pauseGame();
  game.inert = true;
  titleScreen.inert = true;
  devMenu.querySelector('.dev-paused').textContent = devTools.fromTitle ? 'Title screen' : 'Game paused';
  devToolsOverlay.hidden = false;
  showDevScreen(devMenu);
}

function hideDevTools() {
  devTools.open = false;
  devToolsOverlay.hidden = true;
  titleScreen.inert = false;
  game.inert = devTools.fromTitle;
}

// Dismisses the title screen (and its options dialog) without the New Game fade.
function leaveTitleScreen() {
  devTools.fromTitle = false;
  optionsDialog.hidden = true;
  optionsDialog.classList.remove('is-visible');
  titleScreen.classList.remove('options-open');
  titleContent.inert = false;
  optionsBtn.setAttribute('aria-expanded', 'false');
  titleScreen.hidden = true;
  game.inert = false;
  game.setAttribute('aria-hidden', 'false');
  document.body.classList.add('game-started');
}

function closeDevTools() {
  if (!devTools.open) return;
  hideDevTools();
  resumeGame();
  devTools.previousFocus?.focus?.();
}

function openSceneSelect() {
  devSceneList.replaceChildren(...devScenes.map(scene => {
    const button = document.createElement('button');
    button.className = 'dev-choice dev-scene';
    const current = !devTools.fromTitle && (scene.id === 'wakeup' ? wakeup.active : !wakeup.active && scene.id === gameState.currentRoom);
    if (current) button.setAttribute('aria-current', 'true');
    const label = document.createElement('span');
    label.className = 'dev-scene-label';
    label.textContent = scene.label;
    const note = document.createElement('span');
    note.className = 'dev-scene-note';
    note.textContent = current ? `${scene.note} (current)` : scene.note;
    button.append(label, note);
    button.addEventListener('click', () => teleportToScene(scene));
    return button;
  }));
  showDevScreen(devSceneSelect);
}

// Teleports reset the world to its new-game state; the player's appearance is untouched.
function teleportToScene(target) {
  hideDevTools();
  if (devTools.fromTitle) leaveTitleScreen();
  const paused = abandonWorldPause('developer');
  devTools.paused = null;
  paused?.animations.forEach(animation => animation.cancel());
  gameTimers.clearAll();
  gameTimers.resume();
  cancelWakeup();
  cancelGarageElevatorRide();
  cancelTransition();
  stopWalking();
  const appearance = { outfit: gameState.outfit, socksOn: gameState.socksOn };
  resetWorldState();
  Object.assign(gameState, appearance);
  const wornItems = [
    appearance.outfit === 'crumpled' && 'crumpledClothes',
    appearance.outfit === 'clean' && 'cleanClothes',
    appearance.socksOn && 'socks'
  ].filter(Boolean);
  for (const id of wornItems) {
    gameState.itemPlacements[id] = { kind: 'worn' };
    if (!gameState.inventory.includes(id)) gameState.inventory.push(id);
  }
  setVerb(null);
  cancelRoomSwitch();
  if (target.id === 'wakeup') { prepareWakeupAudio(); beginWakeup(); return; }
  whenRoomReady(target.id, () => {
    showRoom(target.id);
    Object.assign(movement, target.start, { phase: 0 });
    syncRoom();
    renderPlayer();
    showMessage(`${apartmentRooms[target.id].name}.`);
  });
}

document.getElementById('devSceneSelectBtn').addEventListener('click', openSceneSelect);
document.getElementById('devStatsBtn').addEventListener('click', () => showDevScreen(devStats));
const devHighlightObjectsBtn = document.getElementById('devHighlightObjectsBtn');
devHighlightObjectsBtn.addEventListener('click', () => {
  const enabled = !document.body.classList.contains('highlight-objects');
  document.body.classList.toggle('highlight-objects', enabled);
  devHighlightObjectsBtn.setAttribute('aria-pressed', String(enabled));
  devHighlightObjectsBtn.textContent = `Highlight Objects: ${enabled ? 'On' : 'Off'}`;
});
document.getElementById('devBackBtn').addEventListener('click', closeDevTools);
document.getElementById('devSceneBackBtn').addEventListener('click', () => showDevScreen(devMenu));
document.getElementById('devStatsBackBtn').addEventListener('click', () => showDevScreen(devMenu));
// Capture phase, so Escape here never also skips the wake-up intro.
window.addEventListener('keydown', event => {
  const tilde = event.code === 'Backquote' || event.key === '~' || event.key === '`';
  if (tilde) {
    event.preventDefault();
    if (event.repeat) return;
    if (devTools.open) closeDevTools(); else openDevTools();
    return;
  }
  if (devTools.open && event.key === 'Tab') {
    const buttons=[...activeDevScreen().querySelectorAll('button')];
    const index=buttons.indexOf(document.activeElement);
    event.preventDefault();
    buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();
    return;
  }
  if (devTools.open && event.key === 'Escape') {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (activeDevScreen() !== devMenu) showDevScreen(devMenu); else closeDevTools();
  }
}, true);
