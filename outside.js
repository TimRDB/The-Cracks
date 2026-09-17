// Walkable centre lines follow the painted patios, individual stair treads,
// shared footpath, the gaps between cars and the clear foreground lane.
const outsidePaths = { nodes: [], edges: [] };
function outsideNode(x, y) {
  outsidePaths.nodes.push({ x, y });
  return outsidePaths.nodes.length - 1;
}
function outsideEdge(a, b, stairs = false) {
  outsidePaths.edges.push({ a, b, stairs });
}
const outsideFootpath = [5, 22, 36, 47.5, 60, 74, 94].map(x => outsideNode(x, 55));
outsideFootpath.slice(1).forEach((id, i) => outsideEdge(outsideFootpath[i], id));
[[23.5,22,1], [48,47.5,3], [73,74,5]].forEach(([topX, bottomX, footIndex]) => {
  let previous = outsideNode(topX, 37.4);
  for (let tread = 1; tread <= 5; tread++) {
    const node = outsideNode(topX + (bottomX - topX) * tread / 5, 37.4 + 11.6 * tread / 5);
    outsideEdge(previous, node, true);
    previous = node;
  }
  outsideEdge(previous, outsideFootpath[footIndex]);
});
// The verticals are centred on the empty bay and the visible gaps between cars.
// Their lower ends join one continuous lane in front of the parked vehicles.
const outsideLaneXs = [5, 24, 36, 50, 72.7, 96];
const outsideLane = outsideLaneXs.map(x => outsideNode(x, 92));
outsideLane.slice(1).forEach((id, i) => outsideEdge(outsideLane[i], id));
outsideEdge(outsideFootpath[2], outsideLane[2]); // empty parking bay
[
  [24, 1, 2, 1],
  [50, 3, 4, 3],
  [72.7, 4, 5, 4]
].forEach(([x, leftFoot, rightFoot, laneIndex]) => {
  const top = outsideNode(x, 55);
  outsideEdge(outsideFootpath[leftFoot], top);
  outsideEdge(top, outsideFootpath[rightFoot]);
  outsideEdge(top, outsideLane[laneIndex]);
});

// Broad, overlapping regions let clicks retain their exact position wherever
// there is clear ground. The narrow regions between vehicles connect the rear
// footpath to the foreground, while the empty bay is fully explorable.
const outsideFreeAreas = Object.freeze([
  Object.freeze({ left: 5, right: 96, top: 52, bottom: 58, name: 'footpath' }),
  Object.freeze({ left: 5, right: 96, top: 88, bottom: 96, name: 'foreground parking lot' }),
  Object.freeze({ left: 24, right: 50, top: 55, bottom: 92, name: 'empty parking bay' }),
  Object.freeze({ left: 21.5, right: 26.5, top: 55, bottom: 92, name: 'left car gap' }),
  Object.freeze({ left: 47.5, right: 53, top: 55, bottom: 92, name: 'middle car gap' }),
  Object.freeze({ left: 69, right: 75.5, top: 55, bottom: 92, name: 'right car gap' })
]);

function outsidePointIsFree(x, y) {
  return outsideFreeAreas.some(area => x >= area.left && x <= area.right && y >= area.top && y <= area.bottom);
}

function outsideFreeSegment(a, b) {
  const distance = Math.hypot(b.x-a.x, (b.y-a.y)*9/16);
  const samples = Math.max(1, Math.ceil(distance / .5));
  for (let i = 0; i <= samples; i++) {
    const progress = i / samples;
    if (!outsidePointIsFree(a.x + (b.x-a.x)*progress, a.y + (b.y-a.y)*progress)) return false;
  }
  return true;
}

function outsideProjection(x, y) {
  if (outsidePointIsFree(x, y)) return { x, y, edge: null, free: true };
  let nearest;
  outsidePaths.edges.forEach((edge, index) => {
    const a = outsidePaths.nodes[edge.a], b = outsidePaths.nodes[edge.b];
    const dx = b.x - a.x, dy = (b.y - a.y) * 9 / 16;
    const t = Math.max(0, Math.min(1, ((x-a.x)*dx + (y-a.y)*9/16*dy)/(dx*dx+dy*dy)));
    const point = { x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t, edge: index };
    const distance = Math.hypot(x-point.x, (y-point.y)*9/16);
    if (!nearest || distance < nearest.distance) nearest = { ...point, distance };
  });
  return nearest;
}

function outsideRoute(from, to) {
  const start = outsideProjection(from.x, from.y);
  const end = outsideProjection(to.x, to.y);
  const nodes = [...outsidePaths.nodes, start, end];
  const startId = nodes.length-2, endId = nodes.length-1;
  const edges = [...outsidePaths.edges];
  for (const [point, id] of [[start, startId], [end, endId]]) {
    if (point.edge !== null) {
      const edge = outsidePaths.edges[point.edge];
      edges.push({ a: edge.a, b: id, stairs: edge.stairs }, { a: id, b: edge.b, stairs: edge.stairs });
    } else {
      outsidePaths.nodes.forEach((node, nodeId) => {
        if (outsideFreeSegment(point, node)) edges.push({ a: id, b: nodeId, stairs: false });
      });
    }
  }
  if (start.edge !== null && start.edge === end.edge) edges.push({ a: startId, b: endId, stairs: outsidePaths.edges[start.edge].stairs });
  if (start.free && end.free && outsideFreeSegment(start, end)) edges.push({ a: startId, b: endId, stairs: false });
  const distance = nodes.map(() => Infinity), previous = [], pending = new Set(nodes.map((_, i) => i));
  distance[startId] = 0;
  while (pending.size) {
    const current = [...pending].reduce((a,b) => distance[a] < distance[b] ? a : b);
    if (current === endId) break;
    pending.delete(current);
    for (const edge of edges) {
      const next = edge.a === current ? edge.b : edge.b === current ? edge.a : -1;
      if (!pending.has(next)) continue;
      const cost = distance[current] + Math.hypot(nodes[next].x-nodes[current].x, (nodes[next].y-nodes[current].y)*9/16);
      if (cost < distance[next]) { distance[next] = cost; previous[next] = { id: current, stairs: edge.stairs }; }
    }
  }
  const route = [];
  for (let id = endId; id !== startId; id = previous[id].id) {
    route.unshift({ x: nodes[id].x, y: nodes[id].y, stairs: previous[id].stairs });
  }
  return route.filter((point, i) => Math.hypot(point.x-(i ? route[i-1].x : start.x), point.y-(i ? route[i-1].y : start.y)) > .001);
}
