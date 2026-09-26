// Artwork-aligned walkable ground and interactions for the alley beside Bluestar.
// The outline follows the concrete between the dumpster and the building line,
// stepping around the bins, cardboard shelter, door steps, bags and crate. The
// front edge runs straight across from the dumpster's wheels to the bushes.
const alleyWalkArea = Object.freeze([
  [19.5, 47.5], [33, 47.5], [34, 50], [41, 50.5], [40, 57], [45, 62], [51, 63.5],
  [58.5, 64.5], [58.5, 69.5], [62, 72.5], [63.5, 76], [66, 80], [69, 84], [71.5, 88], [72.5, 90],
  [21, 90], [21, 72], [27, 69], [27, 63], [23.5, 58], [21.5, 52]
].map(([x, y]) => Object.freeze({ x, y })));

apartmentRooms.alley = {
  name: 'Bluestar alley', image: 'assets/alley-bg-npc-v2.png', floor: [19.5, 72.5, 47.5, 90],
  objects: {
    street: {
      ...item('street beside Bluestar', [16, 29, 13, 23], [28.5, 48], 'The wet street is visible at the mouth of the alley.'),
      alleyExit: 'street', exitFacing: 'up'
    },
    man: {
      ...item('man sheltering in the alley', [42.5, 36, 14.5, 24], [42, 64], 'A bearded man in an olive rain jacket sits on flattened cardboard beside the wall.'),
      alleyPerson: true
    },
    shelter: item('cardboard shelter', [44, 38, 10, 18], [40, 62], 'Flattened cartons have been propped into a small lean-to against the brick wall.'),
    sleepingBag: item('sleeping bag', [40, 52, 16, 11], [42, 65], 'A dark sleeping bag is arranged over dry layers of cardboard.'),
    bags: item('plastic bags', [52.5, 47, 8, 13], [45, 66], 'Several tied bags keep a few belongings out of the rain.'),
    dumpster: item('commercial dumpster', [0, 31, 21, 58], [29, 68], 'A rain-streaked commercial dumpster stands along the left side of the alley.'),
    bushes: item('alley bushes', [61, 48, 39, 45], [58, 73], 'Glossy green bushes run along the building edge, dotted with yellow leaves.'),
    bins: item('recycling and waste bins', [32, 36, 12, 17], [30, 55], 'Blue, green and dark wheelie bins stand together beside the fence.'),
    fence: item('wooden fence', [30, 20, 13, 32], [29, 54], 'A weathered horizontal-slat fence screens the service area from the street.')
  }
};

// Attach the new reciprocal entrance without changing the established street art.
// Both openings lie away from the camera, so the player faces up to go through.
Object.assign(apartmentRooms.street.objects.alley, { alleyExit: 'alley', exitFacing: 'up' });

// Distances are measured in screen proportions so diagonal travel is not skewed.
function alleyDistance(a, b) {
  return Math.hypot(b.x - a.x, (b.y - a.y) * 9 / 16);
}

function alleyNearestOnEdge(x, y, a, b) {
  const dx = b.x - a.x, dy = (b.y - a.y) * 9 / 16;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * 9 / 16 * dy) / (dx * dx + dy * dy)));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function alleyEdges() {
  return alleyWalkArea.map((a, index) => [a, alleyWalkArea[(index + 1) % alleyWalkArea.length]]);
}

// Points on the outline count as walkable, so routes may follow its edges.
function alleyPointIsFree(x, y) {
  let inside = false;
  for (const [a, b] of alleyEdges()) {
    if (alleyDistance({ x, y }, alleyNearestOnEdge(x, y, a, b)) < .02) return true;
    if ((a.y > y) !== (b.y > y) && x < a.x + (y - a.y) * (b.x - a.x) / (b.y - a.y)) inside = !inside;
  }
  return inside;
}

function alleyFreeSegment(a, b) {
  const samples = Math.max(1, Math.ceil(alleyDistance(a, b) / .25));
  for (let i = 0; i <= samples; i++) {
    const progress = i / samples;
    if (!alleyPointIsFree(a.x + (b.x - a.x) * progress, a.y + (b.y - a.y) * progress)) return false;
  }
  return true;
}

// Clicks on open ground are kept exactly; anything else snaps to the nearest edge.
function alleyProject(x, y) {
  if (alleyPointIsFree(x, y)) return { x, y };
  let best;
  for (const [a, b] of alleyEdges()) {
    const point = alleyNearestOnEdge(x, y, a, b);
    const distance = alleyDistance({ x, y }, point);
    if (!best || distance < best.distance) best = { ...point, distance };
  }
  return { x: best.x, y: best.y };
}

// Shortest route through the outline's corners whenever a straight line would
// leave the concrete, such as walking around the shelter or the crate.
function alleyRoute(from, to) {
  const start = alleyProject(from.x, from.y), end = alleyProject(to.x, to.y);
  const nodes = [...alleyWalkArea, start, end];
  const startId = nodes.length - 2, endId = nodes.length - 1;
  const distance = nodes.map(() => Infinity), previous = [], pending = new Set(nodes.map((_, i) => i));
  distance[startId] = 0;
  while (pending.size) {
    const current = [...pending].reduce((a, b) => distance[a] < distance[b] ? a : b);
    if (current === endId || distance[current] === Infinity) break;
    pending.delete(current);
    for (const next of pending) {
      const cost = distance[current] + alleyDistance(nodes[current], nodes[next]);
      if (cost < distance[next] && alleyFreeSegment(nodes[current], nodes[next])) {
        distance[next] = cost;
        previous[next] = current;
      }
    }
  }
  if (distance[endId] === Infinity) return [];
  const route = [];
  for (let id = endId; id !== startId; id = previous[id]) route.unshift({ x: nodes[id].x, y: nodes[id].y });
  return route.filter((point, index) => alleyDistance(point, index ? route[index - 1] : from) > .001);
}

function travelAlley(to) {
  stopWalking();
  showRoom(to);
  Object.assign(movement, to === 'alley'
    ? { x: 28.5, y: 48, facing: 'down' }
    : { x: 87.5, y: 64.5, facing: 'down' });
  renderPlayer();
  showMessage(to === 'alley'
    ? 'The rain is quieter between the buildings. Someone has made a shelter farther down the alley.'
    : 'You step out beside Bluestar.');
}

// A player already standing at an opening visibly turns toward it, pauses
// briefly, then goes through. Any new walk during the pause cancels the exit.
const alleyTurnDelay = 280;
function faceAlleyExit(facing, callback) {
  if (movement.facing === facing) { callback(); return; }
  movement.facing = facing;
  renderPlayer();
  const { x, y } = movement, room = gameState.currentRoom;
  gameTimers.schedule(() => {
    if (gameState.currentRoom === room && movement.destination === null && movement.x === x && movement.y === y) callback();
  }, alleyTurnDelay);
}

function handleAlleyTarget(target, object, verb) {
  if (object?.alleyExit) {
    if (verb === 'look') showMessage(object.description);
    else movePlayerTo(...object.walk, () => faceAlleyExit(object.exitFacing, () => travelAlley(object.alleyExit)));
    return true;
  }
  if (!object?.alleyPerson) return false;
  if (verb === 'look' || verb === 'walk') {
    showMessage(object.description);
  } else if (verb === 'talk') {
    if (!gameState.alleyManSpoken) {
      gameState.alleyManSpoken = true;
      showMessage('“Morning,” he says, settling back against the wall. “Rain finally eased up.”', 4800);
    } else if (gameState.alleyManCoffeeRequested) {
      showMessage('“Coffee would still be welcome,” he says. “Only if you’re heading inside.”', 4400);
    } else {
      showMessage('“Name’s Owen,” he says. “I try to keep the delivery path clear.”', 4600);
    }
  } else if (verb === 'use') {
    gameState.alleyManCoffeeRequested = true;
    showMessage('You ask if he needs anything. “A hot coffee from Bluestar would be good.”', 4800);
  } else {
    showMessage('It is better to talk to him than disturb his shelter.');
  }
  return true;
}
