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


    await call('Emulation.setDeviceMetricsOverride',{width:1800,height:1100,deviceScaleFactor:1,mobile:false});
    await evaluate("titleScreen.hidden=true;game.inert=false;document.body.classList.add('game-started');showRoom('street');Object.assign(movement,{x:52,y:streetFootY(52)});renderPlayer();messageBox.classList.add('hidden');scene.style.width='1672px';scene.style.height='941px';document.getElementById('sceneViewport').style.flex='none';");
    await delay(1000);
    const rect=await evaluate("(()=>{const r=scene.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()");
    assert.equal(rect.width,1672);assert.equal(rect.height,941);
    const shot=async name=>{
      const result=await call('Page.captureScreenshot',{format:'png',clip:rect});
      fs.writeFileSync(path.join(output,name),Buffer.from(result.result.data,'base64'));
    };
    await shot('bluestar-v2-closed.png');
    // Hold the real CSS transition halfway through, so shelf stability can be
    // compared at native pixels, rather than merely checking the endpoints.
    await evaluate("(()=>{const leaves=document.querySelectorAll('#street-bluestar .street-leaf');for(const leaf of leaves){leaf.style.transition='none';leaf.style.transform=leaf.classList.contains('left')?'translateX(-50%)':'translateX(50%)';}})()");
    await delay(100);
    await shot('bluestar-v2-half-open.png');
    assert.equal(await evaluate("getComputedStyle(document.getElementById('street-bluestar')).transform"),'none');
    await evaluate("document.querySelectorAll('#street-bluestar .street-leaf').forEach(el=>{el.style.transition='';el.style.transform=''});Object.assign(movement,{x:60,y:streetFootY(60)});renderPlayer()");
    await delay(750);
    assert.equal(await evaluate("document.getElementById('street-bluestar').classList.contains('is-open')"),true);
    await shot('bluestar-v2-open.png');
    await evaluate("handleTarget('bluestar')");await delay(1600);
    assert.equal(await evaluate('movement.y'),63.6);
    await shot('bluestar-v2-entered.png');
    console.log('Bluestar visual checks passed: native-resolution closed, half-open and open captures; proximity and entry remain functional.');
  } finally {socket?.close();child.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
