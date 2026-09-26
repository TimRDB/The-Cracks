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


    const errors=[];
    socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Runtime.exceptionThrown')errors.push(m.params);});
    await call('Runtime.enable');
    const until=async expression=>{
      for(let i=0;i<500;i++){if(await evaluate(expression))return;await delay(20);}
      throw new Error('Timed out: '+expression);
    };
    await evaluate("document.querySelector('#newGameBtn').focus()");
    const button=await evaluate("(()=>{const r=newGameBtn.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()");
    await call('Input.dispatchMouseEvent',{type:'mousePressed',...button,button:'left',clickCount:1});
    await call('Input.dispatchMouseEvent',{type:'mouseReleased',...button,button:'left',clickCount:1});
    await until("wakeup.phase==='sleeping'");
    assert.equal(await evaluate("getComputedStyle(player).visibility"),'hidden');
    assert.equal(await evaluate("document.getElementById('wakeup-bed').hidden"),false);
    await delay(1100);
    await capture('wakeup-sleeping-preview.png');
    await until("wakeup.phase==='alarm'");
    assert.equal(await evaluate("document.getElementById('alarm-closeup').hidden"),false);
    assert.equal(await evaluate("wakeup.audio?.state"),'running');
    assert.ok(await evaluate('wakeup.tones.length>0'));
    await delay(400);
    await capture('wakeup-alarm-preview.png');
    await until("wakeup.phase==='after-alarm'");
    assert.equal(await evaluate("document.getElementById('alarm-closeup').hidden"),true);
    assert.equal(await evaluate('wakeup.tones.length'),0);
    await until("wakeup.phase==='black'");
    assert.equal(await evaluate("document.getElementById('wakeup-bed').hidden"),true);
    assert.ok(Number(await evaluate("getComputedStyle(document.getElementById('wakeup-fade')).opacity"))>.98);
    await capture('wakeup-black-preview.png');
    await until("wakeup.phase==='idle'");
    assert.equal(await evaluate("getComputedStyle(player).visibility"),'visible');
    assert.equal(await evaluate("document.getElementById('interface').inert"),false);
    assert.equal(await evaluate('movement.x'),42);
    assert.equal(await evaluate('movement.y'),84);
    await evaluate("messageBox.classList.add('hidden')");
    await capture('wakeup-standing-preview.png');
    // After a real New Game, ~ must still open Developer Tools during play.
    const tilde=async()=>{await call('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'~',code:'Backquote',windowsVirtualKeyCode:192});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'~',code:'Backquote',windowsVirtualKeyCode:192})};
    await tilde();
    await until('devTools.open');
    assert.equal(await evaluate("document.querySelector('#devMenu .dev-paused').textContent"),'Game paused');
    await tilde();
    await until('!devTools.open');
    await evaluate("movePlayerTo(50,84)");await delay(800);
    assert.equal(await evaluate('movement.x'),50);
    await evaluate('beginWakeup()');
    await evaluate("document.getElementById('skip-wakeup').click()");
    assert.equal(await evaluate('wakeup.active'),false);
    await delay(2900);
    assert.equal(await evaluate('wakeup.phase'),'idle');
    assert.deepEqual(errors,[]);
    console.log('Wake-up browser checks passed: actual New Game click, sleeping pose, audible alarm, editable 6:00 display, black-frame swap, standing reveal, input unlock and skip.');
  } finally {socket?.close();child.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
