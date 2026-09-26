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


    const until=async expression=>{for(let i=0;i<250;i++){if(await evaluate(expression))return;await delay(20)}throw new Error('Timed out: '+expression)};
    const tilde=async()=>{await call('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'~',code:'Backquote',windowsVirtualKeyCode:192});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'~',code:'Backquote',windowsVirtualKeyCode:192})};
    // Scene Select also works straight from the title screen.
    await tilde();
    await until('devTools.open');
    assert.equal(await evaluate("document.querySelector('#devMenu .dev-paused').textContent"),'Title screen');
    await evaluate("document.getElementById('devBackBtn').click()");
    assert.equal(await evaluate('devTools.open'),false);
    assert.equal(await evaluate('titleScreen.hidden || titleScreen.inert'),false,'Back must return to a usable title screen');
    assert.equal(await evaluate("document.body.classList.contains('game-started')"),false);
    await tilde();
    await until('devTools.open');
    await evaluate("document.getElementById('devSceneSelectBtn').click()");
    assert.equal(await evaluate("document.querySelectorAll('#devSceneList [aria-current]').length"),0);
    await evaluate("document.querySelector('#devSceneList button:nth-child(7)').click()");
    assert.equal(await evaluate('gameState.currentRoom'),'alley');
    assert.equal(await evaluate("titleScreen.hidden && !game.inert && document.body.classList.contains('game-started')"),true);
    assert.equal(await evaluate('movement.x'),28.5);
    assert.equal(await evaluate('movement.facing'),'down');
    assert.equal(await evaluate('player.dataset.facing'),'down');
    await evaluate("titleScreen.hidden=true;game.inert=false;document.body.classList.add('game-started');showRoom('bedroom');Object.assign(movement,{x:42,y:84});renderPlayer();messageBox.classList.add('hidden');movePlayerTo(61,84)");
    await delay(220);
    assert.equal(await evaluate('movement.destination!==null'),true);
    await tilde();
    await until('devTools.open');
    await capture('developer-tools-menu-preview.png');
    const held=await evaluate('movement.x');
    await delay(500);
    assert.equal(await evaluate('movement.x'),held,'walking position must stay fixed during pause');
    assert.equal(await evaluate("document.getElementById('devTools').hidden"),false);
    await evaluate("document.getElementById('devSceneSelectBtn').click()");
    await capture('developer-tools-scene-select-preview.png');
    assert.deepEqual(await evaluate("[...document.querySelectorAll('#devSceneList button')].map(b=>b.querySelector('.dev-scene-label').textContent)"),['Wake-up intro','Bedroom','Living room & kitchen','Bathroom','Apartment forecourt','Laundry & Bluestar','Bluestar alley']);
    await evaluate("document.getElementById('devSceneBackBtn').click();document.getElementById('devBackBtn').click()");
    assert.equal(await evaluate('devTools.open'),false);
    await delay(260);
    assert.ok(await evaluate('movement.x')>held,'walking must resume from the held position');
    await tilde();
    await evaluate("gameState.outfit='future-test-outfit';gameState.laundryDoorOpen=true;document.getElementById('devSceneSelectBtn').click()");
    await evaluate("document.querySelector('#devSceneList button:nth-child(6)').click()");
    assert.equal(await evaluate('gameState.currentRoom'),'street');
    assert.equal(await evaluate('movement.x'),3);
    assert.equal(await evaluate('gameState.laundryDoorOpen'),false);
    assert.equal(await evaluate('gameState.outfit'),'future-test-outfit');
    assert.equal(await evaluate('devTools.open'),false);
    assert.equal(await evaluate('gameTimers.paused'),false);
    await tilde();
    await evaluate("document.getElementById('devSceneSelectBtn').click();document.querySelector('#devSceneList button:first-child').click()");
    await until("wakeup.phase==='sleeping'");
    await until("wakeup.phase==='alarm'");
    await tilde();
    await until('devTools.open');
    const phase=await evaluate('wakeup.phase');
    await delay(500);
    assert.equal(await evaluate('wakeup.phase'),phase,'alarm sequence must pause');
    assert.equal(await evaluate('gameTimers.paused'),true);
    await evaluate("document.getElementById('devBackBtn').click()");
    await until("wakeup.phase==='idle'");
    assert.equal(await evaluate('gameState.currentRoom'),'bedroom');
    assert.equal(await evaluate('movement.x'),42);
    await evaluate("showRoom('bedroom');setCurtains(true)");
    await delay(150);await tilde();
    const cloth=await evaluate("getComputedStyle(document.querySelector('.curtain-left')).transform");
    await delay(400);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.curtain-left')).transform"),cloth,'CSS motion must stay frozen');
    await evaluate("document.getElementById('devBackBtn').click()");
    await delay(350);
    assert.notEqual(await evaluate("getComputedStyle(document.querySelector('.curtain-left')).transform"),cloth,'CSS motion must resume');
    console.log('Developer tools browser checks passed: ~ menu, all scenes, paused walking and alarm, Back resume, scene start and appearance preservation.');
  } finally {socket?.close();child.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
