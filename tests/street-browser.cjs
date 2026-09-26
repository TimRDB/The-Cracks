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
﻿
    const errors=[];
    socket.addEventListener('message',event=>{
      const m=JSON.parse(event.data);
      if(m.method==='Runtime.exceptionThrown') errors.push(m.params);
    });
    await call('Runtime.enable');
    await evaluate("titleScreen.hidden=true;game.inert=false;document.body.classList.add('game-started');showRoom('outside');Object.assign(movement,{x:92,y:55});renderPlayer();movePlayerTo(99,55)");
    await delay(1400);
    assert.equal(await evaluate('gameState.currentRoom'),'street');
    await evaluate("messageBox.classList.add('hidden')");
    await delay(500);
    await capture('street-entry-preview.png');
    await evaluate("movePlayerTo(60,streetFootY(60))");
    await delay(6700);
    assert.equal(await evaluate("document.getElementById('street-bluestar').classList.contains('is-open')"),true);
    assert.equal(await evaluate('movement.x'),60);
    await capture('street-automatic-open-preview.png');
    await evaluate("setVerb('walk');handleTarget('bluestar')");
    await delay(1900);
    assert.equal(await evaluate('movement.y'),63.6);
    await evaluate("messageBox.classList.add('hidden')");
    await capture('street-bluestar-entry-preview.png');
    await evaluate("setVerb('open');handleTarget('laundry')");
    await delay(4200);
    assert.equal(await evaluate('gameState.laundryDoorOpen'),true);
    assert.equal(await evaluate("document.getElementById('street-bluestar').classList.contains('is-open')"),false);
    await evaluate("messageBox.classList.add('hidden')");
    await capture('street-laundry-open-preview.png');
    await evaluate("setVerb('walk');handleTarget('laundry')");
    await delay(1400);
    assert.equal(await evaluate('movement.y'),62.5);
    await evaluate("saveGame();showRoom('bedroom');loadGame()");
    assert.equal(await evaluate('gameState.currentRoom'),'street');
    assert.equal(await evaluate('movement.y'),62.5);
    await evaluate("setVerb('close');handleTarget('laundry')");
    await delay(1300);
    assert.equal(await evaluate('gameState.laundryDoorOpen'),false);
    await evaluate("setVerb('walk');handleTarget('alley')");
    await delay(6500);
    assert.equal(await evaluate('gameState.currentRoom'),'alley');
    assert.equal(await evaluate('movement.facing'),'down');
    // Without moving, back out: he turns to the street, then crosses and faces the road.
    await evaluate("handleTarget('street')");
    assert.equal(await evaluate('movement.facing'),'up');
    await delay(600);
    assert.equal(await evaluate('gameState.currentRoom'),'street');
    assert.equal(await evaluate('movement.y'),64.5);
    assert.equal(await evaluate('movement.facing'),'down');
    await evaluate("messageBox.classList.add('hidden')");
    await capture('street-alley-preview.png');
    const size=await evaluate("(async()=>{const im=new Image();im.src='assets/street_doors_open.png';await im.decode();return [im.naturalWidth,im.naturalHeight]})()");
    assert.deepEqual(size,[1672,941]);
    assert.deepEqual(errors,[]);
    console.log('Street browser checks passed: travel, proximity, manual entry, laundry, save/load and alley. Screenshots in output/.');
  } finally {
    socket?.close();child.kill();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});

