// Opening cinematic. Change time here; the clock art has no baked-in digits.
const wakeupConfig = Object.freeze({
  time: '6:00',
  sleepMs: 2800, alarmMs: 3200, afterAlarmMs: 450,
  fadeOutMs: 800, blackMs: 200, fadeInMs: 1250
});
const wakeup = { active: false, phase: 'idle', timers: [], audio: null, tones: [] };

function alarmDigitsMarkup(time) {
  if (!/^\d{1,2}:\d{2}$/.test(time)) throw new Error('Alarm time must be H:MM or HH:MM');
  const digits = {0:'abcdef',1:'bc',2:'abdeg',3:'abcdg',4:'bcfg',5:'acdfg',6:'acdefg',7:'abc',8:'abcdefg',9:'abcdfg'};
  const segments = {
    a:'10,4 44,4 49,9 44,14 10,14 5,9',
    b:'46,16 51,11 56,16 56,45 51,50 46,45',
    c:'46,57 51,52 56,57 56,86 51,91 46,86',
    d:'10,88 44,88 49,93 44,98 10,98 5,93',
    e:'0,57 5,52 10,57 10,86 5,91 0,86',
    f:'0,16 5,11 10,16 10,45 5,50 0,45',
    g:'10,46 44,46 49,51 44,56 10,56 5,51'
  };
  let x=0, body='';
  for (const char of time) {
    if (char === ':') {
      body += '<g fill="#ee5b43"><rect x="'+(x+4)+'" y="30" width="7" height="7" rx="1"/><rect x="'+(x+4)+'" y="67" width="7" height="7" rx="1"/></g>';
      x += 23;
    } else {
      body += '<g transform="translate('+x+' 0)">'+Object.entries(segments).map(([key,points])=>'<polygon points="'+points+'" fill="'+(digits[char].includes(key)?'#ee5b43':'#35130f')+'"/>').join('')+'</g>';
      x += 69;
    }
  }
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+(x-13)+' 102" aria-hidden="true">'+body+'</svg>';
}

function prepareWakeupAudio() {
  const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Audio) return;
  try {
    wakeup.audio ||= new Audio();
    // Called directly from New Game's user gesture, before asynchronous decoding.
    wakeup.audio.resume().catch(()=>{});
  } catch { /* The visual alarm still plays if audio is unavailable. */ }
}
function playWakeupAlarm() {
  const audio=wakeup.audio;
  if (!audio || audio.state !== 'running') return;
  const end=wakeupConfig.alarmMs/1000;
  for(let group=0;group<end;group+=.75) {
    for(let pulse=0;pulse<3;pulse++) {
      const offset=group+pulse*.17;
      if(offset+.09>end) continue;
      const tone=audio.createOscillator(), gain=audio.createGain();
      tone.type='square';tone.frequency.value=880;
      tone.connect(gain);gain.connect(audio.destination);
      const start=audio.currentTime+offset;
      gain.gain.setValueAtTime(0,start);
      gain.gain.linearRampToValueAtTime(.018,start+.006);
      gain.gain.setValueAtTime(.018,start+.065);
      gain.gain.linearRampToValueAtTime(0,start+.09);
      tone.start(start);tone.stop(start+.1);
      tone.onended=()=>{tone.disconnect();gain.disconnect();};
      wakeup.tones.push(tone);
    }
  }
}
function stopWakeupAlarm() {
  for(const tone of wakeup.tones) {try {tone.stop();} catch {}}
  wakeup.tones=[];
}
function wakeupLater(delay,callback) {
  const timer={callback,due:performance.now()+delay,remaining:null};
  timer.id=setTimeout(()=>runWakeupTimer(timer),delay);
  wakeup.timers.push(timer);
}
function runWakeupTimer(timer) {
  wakeup.timers=wakeup.timers.filter(t=>t!==timer);
  if(wakeup.active) timer.callback();
}
function pauseWakeup() {
  for(const timer of wakeup.timers) {clearTimeout(timer.id);timer.remaining=Math.max(0,timer.due-performance.now());}
  // Freeze a fade mid-way; the next timer fires exactly when that fade would end.
  const fade=document.getElementById('wakeup-fade');
  wakeup.pausedFadeTarget=fade.style.opacity;
  const opacity=getComputedStyle(fade).opacity;
  fade.style.transitionDuration='0ms';
  fade.style.opacity=opacity;
  if(wakeup.audio?.state==='running') wakeup.audio.suspend().catch(()=>{});
}
function resumeWakeup() {
  for(const timer of wakeup.timers) {
    timer.due=performance.now()+timer.remaining;
    timer.id=setTimeout(()=>runWakeupTimer(timer),timer.remaining);
  }
  const fade=document.getElementById('wakeup-fade');
  const remaining=Math.min(...wakeup.timers.map(t=>t.remaining),Infinity);
  fade.getBoundingClientRect();
  fade.style.transitionDuration=(Number.isFinite(remaining)?remaining:0)+'ms';
  fade.style.opacity=wakeup.pausedFadeTarget;
  if(wakeup.audio?.state==='suspended') wakeup.audio.resume().catch(()=>{});
}
function setWakeupPhase(phase) {
  wakeup.phase=phase;
  scene.dataset.wakeupPhase=phase;
}
function beginWakeup() {
  cancelTransition();stopWalking();
  wakeup.active=true;
  Object.assign(gameState,{curtainsOpen:false,lampOn:false,bedroomMainLightOn:false});
  showRoom('bedroom');
  Object.assign(movement,{x:42,y:84,facing:'down',phase:0});
  renderPlayer();
  scene.classList.add('wakeup-active');
  scene.classList.remove('wakeup-standing');
  document.getElementById('interface').inert=true;
  document.getElementById('wakeup-bed').hidden=false;
  document.getElementById('skip-wakeup').hidden=false;
  document.getElementById('alarm-digits').innerHTML=alarmDigitsMarkup(wakeupConfig.time);
  document.getElementById('alarm-closeup').setAttribute('aria-label','Alarm clock ringing at '+wakeupConfig.time);
  document.getElementById('wakeup-fade').style.opacity='0';
  messageBox.classList.add('hidden');
  setWakeupPhase('sleeping');
  wakeupLater(wakeupConfig.sleepMs,()=>{
    setWakeupPhase('alarm');
    document.getElementById('alarm-closeup').hidden=false;
    playWakeupAlarm();
    wakeupLater(wakeupConfig.alarmMs,()=>{
      stopWakeupAlarm();
      document.getElementById('alarm-closeup').hidden=true;
      setWakeupPhase('after-alarm');
      wakeupLater(wakeupConfig.afterAlarmMs,()=>{
        setWakeupPhase('fade-out');
        const fade=document.getElementById('wakeup-fade');
        fade.style.transitionDuration=wakeupConfig.fadeOutMs+'ms';
        fade.style.opacity='1';
        wakeupLater(wakeupConfig.fadeOutMs,()=>{
          setWakeupPhase('black');
          // Remove the sleeping pose only while the entire scene is opaque.
          document.getElementById('wakeup-bed').hidden=true;
          scene.classList.add('wakeup-standing');
          wakeupLater(wakeupConfig.blackMs,()=>{
            setWakeupPhase('fade-in');
            fade.style.transitionDuration=wakeupConfig.fadeInMs+'ms';
            fade.style.opacity='0';
            wakeupLater(wakeupConfig.fadeInMs,finishWakeup);
          });
        });
      });
    });
  });
}
function cancelWakeup() {
  for(const timer of wakeup.timers) clearTimeout(timer.id);
  wakeup.timers=[];
  stopWakeupAlarm();
  if(wakeup.audio) {wakeup.audio.close().catch(()=>{});wakeup.audio=null;}
  wakeup.active=false;wakeup.phase='idle';
  scene.classList.remove('wakeup-active');
  scene.classList.remove('wakeup-standing');
  delete scene.dataset.wakeupPhase;
  document.getElementById('wakeup-bed').hidden=true;
  document.getElementById('alarm-closeup').hidden=true;
  document.getElementById('skip-wakeup').hidden=true;
  const fade=document.getElementById('wakeup-fade');
  fade.style.transitionDuration='0ms';fade.style.opacity='0';
  document.getElementById('interface').inert=false;
}
function finishWakeup() {
  if(!wakeup.active) return;
  cancelWakeup();
  renderPlayer();
  showMessage('6:00. A quiet morning. Click the curtains to let in some light, or explore the room.'.replace('6:00',wakeupConfig.time),4500);
}

