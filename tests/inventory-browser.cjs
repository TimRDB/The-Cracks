// Rendered contextual interface, paused inventory and persistent item placement.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cracks-inventory-'));
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir='+profile, '--window-size=1600,1000', pathToFileURL(path.resolve(__dirname, '../index.html')).href], { windowsHide: true });
let log = '';
child.stderr.on('data', chunk => { log += chunk; });

(async () => {
  let socket;
  try {
    for (let i=0;i<100 && !/DevTools listening on (ws:\/\/[^\s]+)/.test(log);i++) await delay(100);
    const endpoint = log.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
    assert.ok(endpoint, 'Chrome debugging endpoint must start');
    const origin = new URL(endpoint).origin.replace('ws:', 'http:');
    const pages = await (await fetch(origin+'/json/list')).json();
    const page = pages.find(candidate => candidate.type === 'page');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
    let sequence = 0;
    const pending = new Map();
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    });
    const call = (method, params = {}) => new Promise(resolve => {
      const id = ++sequence; pending.set(id, resolve); socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      assert.ok(!result.result.exceptionDetails, JSON.stringify(result));
      return result.result.result.value;
    };
    const until = async (expression, attempts=300) => {
      for (let i=0;i<attempts;i++) { if (await evaluate(expression)) return; await delay(25); }
      assert.fail('Timed out waiting for '+expression);
    };
    await delay(700);
    await evaluate("titleScreen.hidden=true;game.inert=false;document.body.classList.add('game-started');showRoom('living');Object.assign(movement,{x:50,y:82,facing:'up'});gameState.livingMainLightOn=true;syncRoom();renderPlayer();messageBox.classList.add('hidden')");
    assert.deepEqual(await evaluate("[...document.querySelectorAll('#verbs button[data-verb]')].map(button=>button.textContent)"), ['Pick up','Place','Look at','Use','Talk to']);
    assert.equal(await evaluate("clearVerb.textContent"), "\u00d7");
    assert.equal(await evaluate("getComputedStyle(document.getElementById('roomControls')).display"), 'none');
    assert.notEqual(await evaluate("getComputedStyle(document.getElementById('inventoryControl')).display"), 'none');

    await evaluate("showRoom('bedroom');updateStatus('door')");
    assert.equal(await evaluate('statusText.textContent'), 'Open living room door');
    await evaluate("updateStatus('mainLightSwitch')");
    assert.equal(await evaluate('statusText.textContent'), 'Turn on bedroom light');

    await evaluate("showRoom('living');pickUpItemAt('toaster');movePlayerTo(80,90);inventoryBtn.click()");
    assert.equal(await evaluate('gameTimers.paused'), true);
    assert.equal(await evaluate('movement.frame'), null);
    assert.equal(await evaluate('gameState.livingMainLightOn'), true);
    assert.equal(await evaluate('inventoryOverlay.hidden'), false);
    assert.equal(await evaluate("document.querySelectorAll('.inventory-card').length"), 1);
    assert.match(await evaluate("getComputedStyle(document.querySelector('.inventory-item-icon')).backgroundImage"), /living-master-v2/);
    const image = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.resolve(__dirname, '../output/inventory-preview.png'), Buffer.from(image.result.data, 'base64'));

    await evaluate("inventoryUseBtn.click();document.querySelector('.inventory-card').click();updateStatus('coffee')");
    assert.equal(await evaluate('inventoryOverlay.hidden'), true);
    assert.equal(await evaluate('gameTimers.paused'), false);
    assert.equal(await evaluate('statusText.textContent'), 'Use toaster with coffee machine');
    assert.notEqual(await evaluate('movement.frame'), null);
    await evaluate('stopWalking()');

    await evaluate("inventoryBtn.click();inventoryPlaceBtn.click();document.querySelector('.inventory-card').click();handleTarget('counter')");
    await until('movement.destination===null');
    assert.equal(await evaluate('gameState.inventory.length'), 0);
    assert.equal(await evaluate('gameState.itemPlacements.toaster.target'), 'counter');
    assert.equal(await evaluate('gameState.toasterTaken'), true);
    await evaluate("saveGame();resetWorldState();showRoom('bedroom');loadGame()");
    await until("gameState.currentRoom==='living'");
    assert.equal(await evaluate('gameState.itemPlacements.toaster.target'), 'counter');
    assert.equal(await evaluate('gameState.livingMainLightOn'), true);

    await evaluate("showRoom('bedroom');setVerb(null);wearCleanClothes()");
    await until("gameState.outfit==='clean'&&!wardrobeChanging");
    assert.match(await evaluate("playerFrame.style.getPropertyValue('--player-sheet')"), /player-sheet-clean-barefoot-v16/);
    assert.equal(await evaluate("Promise.all(['assets/used/player-sheet-clean-barefoot-v16.png','assets/used/player-sheet-clean-socks-v19.png'].map(src=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image.naturalWidth===1619&&image.naturalHeight===971);image.onerror=()=>resolve(false);image.src=src}))).then(results=>results.every(Boolean))"), true);
    await evaluate('toggleSocks()');
    assert.match(await evaluate("playerFrame.style.getPropertyValue('--player-sheet')"), /player-sheet-clean-socks-v19/);
    await evaluate('toggleSocks();putCleanClothesAway()');
    await until("gameState.outfit==='underwear'&&!wardrobeChanging");

    await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'~',code:'Backquote',bubbles:true}))");
    assert.equal(await evaluate('devTools.open'), true);
    await evaluate('devStatsBtn.click()');
    assert.equal(await evaluate('devStats.hidden'), false);
    assert.equal(await evaluate("devStats.querySelector('.dev-stats-empty').children.length"), 0);
    console.log('Inventory browser checks passed: five-verb bar, contextual labels, paused modal, item graphic, Use/Place flow, save/load, rendered clean wardrobe sheets and empty developer stats.');
  } finally {
    socket?.close();
    child.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
