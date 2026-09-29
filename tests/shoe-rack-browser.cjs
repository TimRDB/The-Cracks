// Real-browser living-room shoe rack, chooser and persistence check.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cracks-shoe-rack-'));
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const child = spawn(chrome, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0',
  '--user-data-dir='+profile, '--window-size=1600,1000',
  pathToFileURL(path.resolve(__dirname, '../index.html')).href
], { windowsHide: true });
let log = '';
child.stderr.on('data', chunk => { log += chunk; });

(async () => {
  let socket;
  try {
    for (let i=0; i<100 && !/DevTools listening on (ws:\/\/[^\s]+)/.test(log); i++) await delay(100);
    const endpoint = log.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
    assert.ok(endpoint, 'Chrome debugging endpoint must start');
    const origin = new URL(endpoint).origin.replace('ws:', 'http:');
    const pages = await (await fetch(origin+'/json/list')).json();
    const page = pages.find(candidate => candidate.type === 'page');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
    let sequence = 0;
    const pending = new Map();
    const errors = [];
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data);
      if (message.method === 'Runtime.exceptionThrown') errors.push(message.params);
      if (pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    });
    const call = (method, params = {}) => new Promise(resolve => {
      const id = ++sequence;
      pending.set(id, resolve);
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async expression => {
      const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      assert.ok(!result.result.exceptionDetails, JSON.stringify(result));
      return result.result.result.value;
    };
    const until = async (expression, attempts=400) => {
      for (let i=0; i<attempts; i++) { if (await evaluate(expression)) return; await delay(25); }
      assert.fail('Timed out waiting for '+expression);
    };
    const output = path.resolve(__dirname, '../output');
    fs.mkdirSync(output, { recursive: true });
    const capture = async name => {
      const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(output, name), Buffer.from(result.result.data, 'base64'));
    };

    await call('Runtime.enable');
    await delay(800);
    await evaluate("titleScreen.hidden=true;game.inert=false;document.body.classList.add('game-started');showRoom('living');Object.assign(movement,{x:80,y:72,facing:'right'});syncRoom();renderPlayer();messageBox.classList.add('hidden')");
    await until("gameState.currentRoom==='living' && getComputedStyle(livingShoeRack).display==='block'");

    assert.match(await evaluate("getComputedStyle(document.getElementById('room-background-a')).backgroundImage"), /lighting\/hard-states-v7\/living-c0-m0-b0-h0\.png/);
    assert.deepEqual(await evaluate("Promise.all(['assets/used/living-shoe-rack-v3.png','assets/used/work-shoes-icon-v2.png','assets/used/sneakers-icon-v2.png'].map(src=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve([image.naturalWidth,image.naturalHeight]);image.onerror=()=>resolve(null);image.src=src})))"), [[1145,1374],[1448,1086],[1536,1024]]);
    assert.equal(await evaluate("livingShoeRack.className"), '');
    await capture('shoe-rack-preview.png');

    await evaluate("setVerb('pickup');openShoeChoice()");
    assert.equal(await evaluate('shoeChoiceOverlay.hidden'), false);
    assert.equal(await evaluate('gameTimers.paused'), true);
    assert.equal(await evaluate('takeWorkShoesButton.disabled'), false);
    assert.equal(await evaluate('takeSneakersButton.disabled'), false);
    await capture('shoe-rack-choice-preview.png');

    await evaluate('takeWorkShoesButton.click()');
    assert.equal(await evaluate("gameState.inventory.includes('workShoes')"), true);
    assert.equal(await evaluate("livingShoeRack.classList.contains('work-shoes-away')"), true);
    assert.equal(await evaluate("livingShoeRack.classList.contains('sneakers-away')"), false);
    assert.equal(await evaluate('gameTimers.paused'), false);

    await evaluate('inventoryBtn.click()');
    assert.equal(await evaluate("document.querySelector('.inventory-card')?.dataset.item"), 'workShoes');
    assert.match(await evaluate("getComputedStyle(document.querySelector('.inventory-item-icon')).backgroundImage"), /work-shoes-icon-v2/);
    await evaluate('closeInventory()');

    await evaluate('openShoeChoice()');
    assert.equal(await evaluate('takeWorkShoesButton.disabled'), true);
    assert.equal(await evaluate('takeSneakersButton.disabled'), false);
    await evaluate('takeSneakersButton.click()');
    assert.equal(await evaluate("gameState.inventory.includes('sneakers')"), true);
    assert.equal(await evaluate("livingShoeRack.classList.contains('work-shoes-away') && livingShoeRack.classList.contains('sneakers-away')"), true);

    await evaluate("placeInventoryItem('workShoes','shoeRack',roomObjects.shoeRack)");
    assert.equal(await evaluate("gameState.inventory.includes('workShoes')"), false);
    assert.equal(await evaluate("livingShoeRack.classList.contains('work-shoes-away')"), false);
    assert.equal(await evaluate("livingShoeRack.classList.contains('sneakers-away')"), true);

    await evaluate("saveGame();gameState.itemPlacements.workShoes={kind:'inventory'};gameState.inventory.push('workShoes');syncShoeRack();loadGame()");
    await until("gameState.currentRoom==='living'");
    assert.equal(await evaluate("gameState.itemPlacements.workShoes.target"), 'shoeRack');
    assert.equal(await evaluate("gameState.itemPlacements.sneakers.kind"), 'inventory');
    assert.equal(await evaluate("livingShoeRack.classList.contains('work-shoes-away')"), false);
    assert.equal(await evaluate("livingShoeRack.classList.contains('sneakers-away')"), true);
    assert.deepEqual(errors, []);
    console.log('Shoe rack browser checks passed: native overlay, paused chooser, independent pairs, inventory art, place-back and save/load persistence.');
  } finally {
    socket?.close();
    child.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
