// Real-browser workplace garage and elevator check: node tests/garage-browser.cjs
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'cracks-garage-'));
const chrome = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const child = spawn(chrome, ['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=0','--user-data-dir='+profile,'--window-size=1600,1000',pathToFileURL(path.resolve(__dirname,'../index.html')).href], { windowsHide:true });
let log='';
child.stderr.on('data', chunk => { log += chunk; });
(async()=>{
  let socket;
  try {
    for(let i=0;i<100 && !/DevTools listening on (ws:\/\/[^\s]+)/.test(log);i++) await delay(100);
    const endpoint=log.match(/DevTools listening on (ws:\/\/[^\s]+)/)?.[1];
    assert.ok(endpoint,'Chrome debugging endpoint must start');
    const origin=new URL(endpoint).origin.replace('ws:','http:');
    const pages=await (await fetch(origin+'/json/list')).json();
    const page=pages.find(page=>page.type==='page');
    socket=new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
    let sequence=0;
    const pending=new Map();
    const errors=[];
    socket.addEventListener('message',event=>{
      const message=JSON.parse(event.data);
      if(message.method==='Runtime.exceptionThrown') errors.push(message.params);
      if(pending.has(message.id)){pending.get(message.id)(message);pending.delete(message.id);}
    });
    const call=(method,params={})=>new Promise(resolve=>{const id=++sequence;pending.set(id,resolve);socket.send(JSON.stringify({id,method,params}));});
    const evaluate=async expression=>{
      const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
      assert.ok(!result.result.exceptionDetails,JSON.stringify(result));
      return result.result.result.value;
    };
    const until=async(expression,limit=500)=>{for(let i=0;i<limit;i++){if(await evaluate(expression))return;await delay(20);}throw new Error('Timed out: '+expression);};
    const output=path.resolve(__dirname,'../output');
    fs.mkdirSync(output,{recursive:true});
    const capture=async name=>{const result=await call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,name),Buffer.from(result.result.data,'base64'));};
    await call('Runtime.enable');
    await delay(900);
    await evaluate("titleScreen.hidden=true;game.inert=false;document.body.classList.add('game-started');gameState.outfit='clean';gameState.socksOn=true;showRoom('garage');Object.assign(movement,{x:24,y:54,facing:'right'});renderPlayer();messageBox.classList.add('hidden')");
    await until("gameState.currentRoom==='garage' && getComputedStyle(document.getElementById('room-background-a')).backgroundImage.includes('workplace-garage')");
    const dimensions=await evaluate("(async()=>{const image=new Image();image.src='assets/used/workplace-garage-bg-v3.png';await image.decode();return [image.naturalWidth,image.naturalHeight]})()");
    assert.deepEqual(dimensions,[1672,941]);
    assert.match(await evaluate("getComputedStyle(document.querySelector('.player-frame')).backgroundImage"),/player-sheet-clean-socks-v19/);
    assert.equal(await evaluate("document.querySelectorAll('#hotspots .hotspot').length"),17);
    assert.equal(await evaluate("(()=>{const b=document.querySelector('[data-target=elevatorCall]').getBoundingClientRect();return document.elementFromPoint(b.left+b.width/2,b.top+b.height/2)?.dataset.target})()"),'elevatorCall');
    assert.equal(await evaluate("(()=>{const r=scene.getBoundingClientRect();return document.elementFromPoint(r.left+r.width*.5,r.top+r.height*.65)?.classList.contains('hotspot')||false})()"),false);
    await capture('garage-scene-preview.png');

    await evaluate("setVerb(null);document.querySelector('[data-target=elevatorCall]').click()");
    await until("document.getElementById('garage-elevator').classList.contains('is-open')");
    await delay(200);
    assert.ok(await evaluate("Number(getComputedStyle(document.getElementById('garage-up-indicator')).opacity)>.8"));
    await capture('garage-elevator-open-preview.png');
    await until("garageSequenceActive && !document.getElementById('garage-elevator').classList.contains('is-called')",700);
    await delay(180);
    assert.ok(await evaluate("Number(getComputedStyle(document.getElementById('garage-up-indicator')).opacity)<.1"));
    await until("garageSequenceActive===false",700);
    assert.equal(await evaluate('gameState.currentRoom'),'garage');
    assert.ok(Math.abs(await evaluate('movement.x')-20.4)<.01);
    assert.equal(await evaluate("document.getElementById('garage-elevator').classList.contains('is-open')"),false);
    assert.match(await evaluate("getComputedStyle(document.querySelector('.player-frame')).backgroundImage"),/player-sheet-clean-socks-v19/);
    await capture('garage-elevator-reset-preview.png');
    assert.deepEqual(errors,[]);
    console.log('Garage browser checks passed: native scene, hotspots, preserved outfit, elevator call/open/entry/close/fade/reset. Screenshots in output/.');
  } finally {
    socket?.close();
    child.kill();
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
