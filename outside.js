// Walkable centre lines follow the painted patios, individual stair treads,
// shared footpath, empty bay and the clear lane behind the parked cars.
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
const outsideBay = outsideNode(36, 92);
outsideEdge(outsideFootpath[2], outsideBay);
outsideEdge(outsideNode(5, 92), outsideBay);
outsideEdge(outsideBay, outsideNode(96, 92));

function outsideProjection(x, y) {
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
    const edge = outsidePaths.edges[point.edge];
    edges.push({ a: edge.a, b: id, stairs: edge.stairs }, { a: id, b: edge.b, stairs: edge.stairs });
  }
  if (start.edge === end.edge) edges.push({ a: startId, b: endId, stairs: outsidePaths.edges[start.edge].stairs });
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
