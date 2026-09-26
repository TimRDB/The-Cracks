const devToolsOverlay = document.getElementById('devTools');
const devMenu = document.getElementById('devMenu');
const devSceneSelect = document.getElementById('devSceneSelect');
const devSceneList = document.getElementById('devSceneList');
const devTools = { open: false, fromTitle: false, paused: null, animations: [], previousFocus: null };

// Where the player stands when each scene starts: the new-game pose, or the
// arrival point from the scene's usual entrance.
const devScenes = [
  { id: 'wakeup', label: 'Wake-up intro', note: 'Bedroom, asleep as the alarm rings' },
  { id: 'bedroom', label: 'Bedroom', note: 'Standing, curtains closed', start: { x: 42, y: 84, facing: 'down' } },
  { id: 'living', label: 'Living room & kitchen', note: 'Inside the bedroom door', start: { x: 29, y: 60, facing: 'down' } },
  { id: 'bathroom', label: 'Bathroom', note: 'Inside the living room door', start: { x: 32.5, y: 77, facing: 'right' } },
  { id: 'outside', label: 'Apartment forecourt', note: 'On the patio by the front door', start: { x: 73, y: 37.4, facing: 'down' } },
  { id: 'street', label: 'Laundry & Bluestar', note: 'Arriving along the footpath', start: { x: 3, y: streetFootY(3), facing: 'right' } },
  { id: 'alley', label: 'Bluestar alley', note: 'Looking back toward the street', start: { x: 28.5, y: 48, facing: 'down' } }
];

function pauseGame() {
  const paused = { walking: movement.frame !== null, transition: Boolean(transition), wakeup: wakeup.active };
  gameTimers.pause();
  devTools.animations=(game.getAnimations?.({subtree:true})||[]).filter(a=>a.playState==='running' && a.effect?.target?.id!=='wakeup-fade');
  devTools.animations.forEach(a=>{
    a.pause();
    // Pin the hold time immediately; otherwise Chromium may advance a CSS
    // animation by a fraction of one frame while its pause task settles.
    a.currentTime = a.currentTime;
  });
  if (paused.walking) { cancelAnimationFrame(movement.frame); movement.frame = null; }
  if (paused.transition) cancelAnimationFrame(transition.frame);
  if (paused.wakeup) pauseWakeup();
  devTools.paused = paused;
  document.body.classList.add('game-paused');
}

function resumeGame() {
  const paused = devTools.paused;
  devTools.paused = null;
  document.body.classList.remove('game-paused');
  devTools.animations.forEach(a=>{if(a.playState==='paused')a.play();});
  devTools.animations=[];
  gameTimers.resume();
  if (!paused) return;
  if (paused.wakeup && wakeup.active) resumeWakeup();
  if (paused.transition && transition) { transition.last = null; transition.frame = requestAnimationFrame(animateDoor); }
  if (paused.walking && movement.destination) { movement.lastTime = null; movement.frame = requestAnimationFrame(advanceWalk); }
}

function showDevScreen(screen) {
  devMenu.hidden = screen !== devMenu;
  devSceneSelect.hidden = screen !== devSceneSelect;
  screen.querySelector('button')?.focus();
}

// Available on the title screen and throughout play; only the brief New Game
// fade (title leaving, game not yet started) is excluded.
function openDevTools() {
  const fadingIntoGame = titleScreen.classList.contains('is-leaving') && !document.body.classList.contains('game-started');
  if (devTools.open || fadingIntoGame) return;
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
  devTools.paused = null;
  document.body.classList.remove('game-paused');
  devTools.animations.forEach(a=>a.cancel());
  devTools.animations=[];
  gameTimers.clearAll();
  gameTimers.resume();
  cancelWakeup();
  cancelTransition();
  stopWalking();
  const appearance=Object.fromEntries(Object.entries(gameState).filter(([key])=>/clothes|clothing|outfit|appearance|wearing|costume/i.test(key)));
  Object.assign(gameState, initialWorldState, appearance);
  setVerb('walk');
  if (target.id === 'wakeup') { prepareWakeupAudio(); beginWakeup(); return; }
  showRoom(target.id);
  Object.assign(movement, target.start, { phase: 0 });
  syncRoom();
  renderPlayer();
  showMessage(`${apartmentRooms[target.id].name}.`);
}

document.getElementById('devSceneSelectBtn').addEventListener('click', openSceneSelect);
document.getElementById('devBackBtn').addEventListener('click', closeDevTools);
document.getElementById('devSceneBackBtn').addEventListener('click', () => showDevScreen(devMenu));
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
    const buttons=[...(devSceneSelect.hidden?devMenu:devSceneSelect).querySelectorAll('button')];
    const index=buttons.indexOf(document.activeElement);
    event.preventDefault();
    buttons[(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();
    return;
  }
  if (devTools.open && event.key === 'Escape') {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!devSceneSelect.hidden) showDevScreen(devMenu); else closeDevTools();
  }
}, true);
