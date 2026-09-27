// Real mouse clicks on floor items and the alley man: node tests/clicks-browser.cjs
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cracks-clicks-'));
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
    await evaluate("titleScreen.hidden=true;game.inert=false;document.body.classList.add('game-started');messageBox.classList.add('hidden')");
    const at = (x, y) => evaluate("(()=>{const r=scene.getBoundingClientRect();return {x:r.left+r.width*"+x+"/100,y:r.top+r.height*"+y+"/100}})()");
    const click = async (x, y) => {
      const point = await at(x, y);
      await call('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
      await call('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
      for (let i = 0; i < 300 && await evaluate('movement.destination!==null'); i++) await delay(25);
    };
    const place = (room, start) => evaluate("stopWalking();showRoom('"+room+"');Object.assign(movement,"+JSON.stringify(start)+");renderPlayer();setVerb(null);messageBox.classList.add('hidden')");
    const near = async (x, y) => Math.abs(await evaluate('movement.x') - x) < .2 && Math.abs(await evaluate('movement.y') - y) < .2; // Clicks land on whole screen pixels.
    // A direct click on a floor item walks exactly where the floor was clicked.
    for (const [room, start, x, y] of [
      ['living', {x:50,y:60}, 18, 88], ['living', {x:50,y:60}, 76, 60],
      ['outside', {x:36,y:55}, 30, 72], ['outside', {x:36,y:55}, 42, 85],
      ['bathroom', {x:32.5,y:77}, 45, 72]
    ]) {
      await place(room, start);
      await click(x, y);
      assert.ok(await near(x, y), room+' floor click at '+x+','+y+' ended at '+await evaluate('movement.x')+','+await evaluate('movement.y'));
    }
    // Beside the burgundy car, a click stops on its parking line.
    await place('outside', {x:36,y:55});
    await click(24, 75);
    assert.equal(await evaluate('outsidePointIsFree(movement.x,movement.y)'), true);
    assert.ok(await evaluate('movement.x') > 25, 'the player stays right of the parking line');
    // Talk to the man by clicking his head and chest.
    await place('alley', {x:28.5,y:48,facing:'down'});
    for (const [x, y] of [[49.5, 40], [49, 47], [45, 58]]) {
      assert.equal(await evaluate("(()=>{const r=scene.getBoundingClientRect();return document.elementFromPoint(r.left+r.width*"+x+"/100,r.top+r.height*"+y+"/100).dataset.target})()"), 'man');
    }
    await place('alley', {x:28.5,y:48,facing:'down'});
    await evaluate("setVerb('talk')");
    await click(49.5, 40);
    assert.equal(await evaluate('gameState.alleyManSpoken'), true);
    console.log('Click browser checks passed: floor items walk to the clicked spot, the parking line stops clicks beside the car, and the alley man answers a click on his head.');
  } finally {
    socket?.close();
    child.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
