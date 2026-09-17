// Optional real-browser smoke check: node tests/outside-browser.cjs
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cracks-exterior-'));
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const child = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', '--user-data-dir='+profile, '--window-size=1600,1000', pathToFileURL(path.resolve(__dirname, '../index.html')).href], { windowsHide: true });
let log = '';
child.stderr.on('data', chunk => { log += chunk; });
(async () => {
  let socket;
  try {
    for(let i=0;i<100 && !/DevTools listening on (ws:\/\/[^\s]+)/.test(log);i++) await delay(100);
    const endpoint = log.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
    assert.ok(endpoint, 'Chrome debugging endpoint must start');
    const origin = new URL(endpoint).origin.replace('ws:', 'http:');
    const pages = await (await fetch(origin+'/json/list')).json();
    const page = pages.find(page => page.type === 'page');
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
    await delay(800);
    assert.equal(await evaluate('typeof outsideRoute'), 'function');
    const output = path.resolve(__dirname, '../output');
    fs.mkdirSync(output, { recursive: true });
    const capture = async name => {
      const result = await call('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(output, name), Buffer.from(result.result.data, 'base64'));
    };
    await evaluate("titleScreen.hidden=true; game.inert=false; document.body.classList.add('game-started'); showRoom('living'); movement.x=91; movement.y=54; interact('exit','open');");
    await delay(1000);
    assert.equal(await evaluate('gameState.currentRoom'), 'living');
    assert.ok(await evaluate("parseFloat(document.getElementById('player').style.getPropertyValue('--sprite-width'))") < 18);
    await capture('living-hallway-scale-preview.png');
    for (let i=0; i<12 && await evaluate('gameState.currentRoom') !== 'outside'; i++) await delay(100);
    assert.equal(await evaluate('gameState.currentRoom'), 'outside');
    assert.equal(await evaluate("document.getElementById('doorway').dataset.hinge"), 'left');
    assert.match(await evaluate("document.getElementById('door-face').style.transform"), /rotateY\([1-9]/);
    assert.match(await evaluate("document.getElementById('door-surface').style.backgroundImage"), /outside_bg\.png/);
    await capture('outside-door-closing-preview.png');
    await delay(1500);
    assert.equal(await evaluate('gameState.currentRoom'), 'outside');
    assert.equal(await evaluate('transition'), null);
    assert.ok(Math.abs(await evaluate("parseFloat(document.getElementById('player').style.getPropertyValue('--sprite-width'))") - 10.2) < .001);
    await evaluate("messageBox.classList.add('hidden');");
    await delay(300);
    await capture('outside-patio-preview.png');
    await evaluate("movePlayerTo(74,49);");
    await delay(750);
    assert.equal(await evaluate('!!movement.destination.stairs'), true);
    await capture('outside-stairs-preview.png');
    await delay(1800);
    await evaluate("movePlayerTo(72.7,92);");
    await delay(2600);
    assert.equal(await evaluate('movement.destination'), null);
    assert.ok(Math.abs(await evaluate('movement.x') - 72.7) < .001);
    assert.equal(await evaluate('movement.y'), 92);
    assert.ok(Math.abs(await evaluate("parseFloat(document.getElementById('player').style.getPropertyValue('--sprite-width'))") - 22.4) < .001);
    await capture('outside-between-cars-preview.png');
    await evaluate("movePlayerTo(91,90);");
    await delay(1800);
    assert.equal(await evaluate('movement.destination'), null);
    assert.ok(Math.abs(await evaluate('movement.x') - 91) < .001);
    assert.ok(Math.abs(await evaluate('movement.y') - 90) < .001);
    await evaluate("movePlayerTo(42,72);");
    await delay(5000);
    assert.equal(await evaluate('movement.destination'), null);
    assert.ok(Math.abs(await evaluate('movement.x') - 42) < .001);
    assert.ok(Math.abs(await evaluate('movement.y') - 72) < .001);
    await capture('outside-free-parking-preview.png');
    await evaluate("movePlayerTo(72.7,70);");
    await delay(6000);
    assert.equal(await evaluate('movement.destination'), null);
    assert.equal(await evaluate("document.getElementById('scene').classList.contains('player-behind-cars')"), true);
    await capture('outside-car-mask-preview.png');
    await evaluate("handleTarget('frontDoor');");
    await delay(8000);
    assert.equal(await evaluate('gameState.currentRoom'), 'living');
    console.log('Browser checks passed: perspective scale, front door, patio, stairs, car passages, free parking-lot movement and return. Screenshots saved in output/.');
  } finally {
    socket?.close();
    child.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
