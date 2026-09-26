// Coordinates measured against the street painting; original backgrounds stay intact.
const streetFootY = x => 64 + .09*x;
const streetDoors = {
  laundry: { panel:[40.67,49,3.72,15.3], x:42.53, threshold:64.3, inside:62.5 },
  bluestar: { panel:[62.2009569378,48.9904357067,6.5789473684,16.3655685441], x:65.48, threshold:65.4, inside:63.6 }
};
apartmentRooms.street = {
  name:'Laundry & Bluestar', image:'assets/street_bg_counter_v2.png', floor:[1,99,56,74],
  objects:{
    apartments:{...item('footpath back to the apartments',[0,60,4,9],[1,streetFootY(1)],'The footpath leads back to the apartment forecourt.'),streetExit:'outside'},
    laundry:{...item('Laundry glass door',[40.3,48,4.5,17],[42.53,streetFootY(42.53)],'A glass-panelled door leads into the dollar laundry. Open it, then walk across the threshold.'),streetDoor:'laundry'},
    bluestar:{...item('Bluestar automatic doors',[61.8,48,7.4,18.5],[65.48,streetFootY(65.48)],'The centre-opening glass doors slide apart as you approach. Walk into the opening to enter.'),streetDoor:'bluestar'},
    laundryWindow:item('dollar laundry',[30.5,39,9.5,23],[36,streetFootY(36)],'Laundry. A dollar a wash; rows of washing machines turn behind the glass.'),
    prices:item('Bluestar prices',[69.4,48,4.5,14],[72,streetFootY(72)],'Milk $3. Bread $2. The shop windows are crowded with everyday essentials.'),
    rubbish:item('rubbish bin',[74.2,58.8,3.5,9.8],[76,streetFootY(76)],'The dark bin is labelled RUBBISH.'),
    recycling:item('recycling bin',[77.7,58.8,3.5,9.8],[79.5,streetFootY(79.5)],'The blue bin is labelled RECYCLING.'),
    foodWaste:item('food waste bin',[81.2,58.8,3.7,9.8],[83,streetFootY(83)],'The green bin is labelled FOOD WASTE.'),
    hydrant:item('fire hydrant',[4.8,62.5,2.3,7.5],[7.8,streetFootY(7.8)],'A weathered red fire hydrant stands beside the kerb.'),
    alley:item('alley beside Bluestar',[85,49,6.5,19],[87.5,64.5],'A narrow, damp alley runs along the side of Bluestar.'),
    parkedCars:{...item('parked cars',[4,74,90,17],[55,streetFootY(55)],'Three cars are parked along the wet road. Their doors are locked.'),locked:true}
  }
};
apartmentRooms.outside.objects.streetExit={
  ...item('footpath to Laundry and Bluestar',[94,51,6,8],[96,55],'The footpath continues right, towards the local shops.'),streetExit:'street'
};
function streetGraph() {
  const nodes=[1,42.53,65.48,87.7,99].map(x=>({x,y:streetFootY(x)}));
  const edges=[[0,1],[1,2],[2,3],[3,4]];
  for(const [key,index] of [['laundry',1],['bluestar',2]]) {
    const d=streetDoors[key], end=nodes.push({x:d.x,y:d.threshold})-1;
    edges.push([index,end]);
    if(key==='bluestar'||gameState.laundryDoorOpen) {
      nodes.push({x:d.x,y:d.inside});edges.push([end,nodes.length-1]);
    }
  }
  nodes.push({x:87.5,y:64.5});edges.push([3,nodes.length-1]);
  return {nodes,edges};
}
function streetProject(x,y,graph=streetGraph()) {
  let best;
  graph.edges.forEach(([ai,bi],edge)=>{
    const a=graph.nodes[ai],b=graph.nodes[bi],dx=b.x-a.x,dy=(b.y-a.y)*9/16;
    const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*9/16*dy)/(dx*dx+dy*dy)));
    const p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,edge};
    const distance=Math.hypot(x-p.x,(y-p.y)*9/16);
    if(!best||distance<best.distance) best={...p,distance};
  });
  return best;
}
function streetRoute(from,to) {
  const graph=streetGraph(),start=streetProject(from.x,from.y,graph),end=streetProject(to.x,to.y,graph);
  const nodes=[...graph.nodes,start,end],first=nodes.length-2,last=nodes.length-1,edges=[...graph.edges];
  for(const [p,id] of [[start,first],[end,last]]) {const [a,b]=graph.edges[p.edge];edges.push([a,id],[b,id]);}
  if(start.edge===end.edge) edges.push([first,last]);
  const dist=nodes.map(()=>Infinity),previous=[],pending=new Set(nodes.map((_,i)=>i));dist[first]=0;
  while(pending.size) {
    const current=[...pending].reduce((a,b)=>dist[a]<dist[b]?a:b);
    if(current===last) break;
    pending.delete(current);
    for(const [a,b] of edges) {
      const next=a===current?b:b===current?a:-1;
      if(!pending.has(next)) continue;
      const cost=dist[current]+Math.hypot(nodes[next].x-nodes[current].x,(nodes[next].y-nodes[current].y)*9/16);
      if(cost<dist[next]) {dist[next]=cost;previous[next]=current;}
    }
  }
  const route=[];
  for(let i=last;i!==first;i=previous[i]) route.unshift({x:nodes[i].x,y:nodes[i].y});
  return route.filter((p,i)=>Math.hypot(p.x-(i?route[i-1].x:start.x),p.y-(i?route[i-1].y:start.y))>.001);
}
function travelStreet(to) {
  stopWalking();showRoom(to);
  Object.assign(movement,to==='street'?{x:3,y:streetFootY(3),facing:'right'}:{x:93,y:55,facing:'left'});
  renderPlayer();
  showMessage(to==='street'?'Laundry and Bluestar. The footpath continues past the shops to a narrow alley.':'Back at the apartment forecourt.');
}
function streetArrival(x,y,callback) {
  const to=gameState.currentRoom==='outside'&&x>=95&&y>=51&&y<=59?'street':
    gameState.currentRoom==='street'&&x<=1.5?'outside':null;
  return to?()=>travelStreet(to):callback;
}
function syncStreetDoors() {
  if(gameState.currentRoom!=='street') return;
  const d=streetDoors.bluestar,distance=Math.hypot(movement.x-d.x,(movement.y-d.threshold)*9/16);
  const auto=document.getElementById('street-bluestar');
  // Hysteresis avoids chattering. The sensor only opens leaves, never moves the player.
  auto.classList.toggle('is-open',distance<(auto.classList.contains('is-open')?8:6));
  document.getElementById('street-laundry').classList.toggle('is-open',!!gameState.laundryDoorOpen);
}
function handleStreetTarget(object,verb) {
  if(object.streetExit) {
    if(verb==='look') showMessage(object.description);
    else movePlayerTo(...object.walk,()=>travelStreet(object.streetExit));
    return true;
  }
  if(!object.streetDoor) return false;
  const key=object.streetDoor,d=streetDoors[key];
  if(verb==='look') {showMessage(object.description);return true;}
  movePlayerTo(...object.walk,()=>{
    if(key==='laundry') {
      if(verb==='close') {gameState.laundryDoorOpen=false;syncStreetDoors();showMessage('You close the Laundry door.');return;}
      const wasOpen=gameState.laundryDoorOpen;
      gameState.laundryDoorOpen=true;syncStreetDoors();
      if(verb==='open'||(verb==='use'&&!wasOpen)) {
        showMessage('You open the Laundry door. Walk into the doorway to step inside.');return;
      }
    } else if(verb==='close'||verb==='open') {
      showMessage('The sensor keeps the doors open while you stand nearby. Walk into the opening to enter.');return;
    }
    movePlayerTo(d.x,d.inside,()=>showMessage(key==='laundry'
      ?'You step inside the Laundry entrance. The machines hum. Click the footpath to step back outside.'
      :'You step inside Bluestar. Shelves of groceries line the entrance. Click the footpath to step back outside.'));
  });
  return true;
}

