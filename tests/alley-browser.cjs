// Optional real-browser alley check: node tests/alley-browser.cjs
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cracks-alley-'));
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
    await delay(700);
    await evaluate("titleScreen.hidden=true;game.inert=false;document.body.classList.add('game-started');showRoom('alley');Object.assign(movement,{x:28.5,y:48,facing:'right'});renderPlayer();messageBox.classList.add('hidden')");
    await delay(500);
    assert.equal(await evaluate('gameState.currentRoom'), 'alley');
    assert.equal(await evaluate("document.querySelectorAll('#verbs button').length"), 6);
    assert.equal(await evaluate("roomObjects.man.name"), 'man sheltering in the alley');
    assert.equal(await evaluate("getComputedStyle(document.getElementById('alley-npc')).display"), 'block');
    assert.match(await evaluate("getComputedStyle(document.getElementById('alley-npc')).backgroundImage"), /alley-man-sprite-v6/);
    assert.equal(await evaluate("getComputedStyle(document.getElementById('alley-npc')).animationName"), 'alley-npc-blink');
    // Painted height (width * 1.63% of 941 px) against the bins, seated man and 470 px door.
    assert.ok(Math.abs(await evaluate("playerPerspective('alley',48).width * 1.63 * 9.41") - 107 * 1.8 / 1.07) < 5);
    assert.ok(Math.abs(await evaluate("playerPerspective('alley',68).width * 1.63 * 9.41") - 470 * .86) < 5);
    assert.ok(await evaluate("playerPerspective('alley',90).width > playerPerspective('alley',68).width"));
    // Growth is smooth: no abrupt change in rate anywhere between the anchors.
    const widths = await evaluate("Array.from({length:421},(_,i)=>playerPerspective('alley',48+i*.1).width)");
    for (let i = 2; i < widths.length; i++) assert.ok(Math.abs((widths[i]-widths[i-1]) - (widths[i-1]-widths[i-2])) < .002, 'scale rate jumps near y '+(48+i*.1).toFixed(1));
    assert.match(await evaluate("roomImageForState('alley')"), /alley-bg-npc-v2/);
    const output = path.resolve(__dirname, '../output');
    fs.mkdirSync(output, { recursive: true });
    const capture = await call('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(output, 'alley-scene-preview.png'), Buffer.from(capture.result.data, 'base64'));
    // Walking toward the camera covers less screen distance than walking sideways.
    const screenTravel = async (start, to) => {
      await evaluate("stopWalking();Object.assign(movement,"+JSON.stringify(start)+");renderPlayer();movePlayerTo("+to+")");
      await delay(600);
      return evaluate("(()=>{const r=scene.clientHeight/scene.clientWidth,d=Math.hypot(movement.x-"+start.x+",(movement.y-"+start.y+")*r);stopWalking();return d})()");
    };
    const sideways = await screenTravel({x:24,y:80},'60,80'), depthward = await screenTravel({x:40,y:78},'40,89');
    assert.ok(depthward < sideways * .7, 'depth travel must be slower on screen: '+depthward+' vs '+sideways);
    await evaluate("setVerb('talk');handleTarget('man')");
    for (let i=0;i<250 && await evaluate('movement.destination!==null');i++) await delay(20);
    assert.equal(await evaluate('gameState.alleyManSpoken'), true);
    assert.match(await evaluate('messageBox.textContent'), /Morning/);
    console.log('Alley browser checks passed: selected background, stable two-frame NPC sprite, player scale, entry, dialogue, and routing.');
  } finally {
    socket?.close();
    child.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
