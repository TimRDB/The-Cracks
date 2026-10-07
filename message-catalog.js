// The catalogue is derived, never a second copy of the game's message text.
// Live objects supply concrete replies; Acorn reads display expressions from
// loaded functions, including branches, local response maps and helper returns.
// Nothing parsed here is executed. This also works when index.html uses file://.
const messageCategories = Object.freeze({
  hover: 'Hover', look: 'Look at', pickup: 'Pick up', place: 'Place',
  walk: 'Walk to', use: 'Use', talk: 'Talk to', dialogue: 'Dialogue',
  inventory: 'Inventory', open: 'Open / close', system: 'System / interface'
});

function buildMessageCatalog() {
  const entries = new Map();
  function add(text, categories, trigger, speaker = 'Narration', definition = '') {
    if (typeof text !== 'string' || !text.trim() || /^\{[^{}]*\}$/.test(text)) return;
    const entry = { text, categories: [...new Set(categories)], trigger, speaker, definition, template: /\{[^{}]+\}/.test(text) };
    const key = JSON.stringify([text, trigger, speaker]);
    const previous = entries.get(key);
    if (previous) previous.categories = [...new Set([...previous.categories, ...entry.categories])];
    else entries.set(key, entry);
  }

  // Use the real hover formatter while restoring every value it reads/writes.
  // No movement, interaction handler, timer or room render runs in this pass.
  const saved = { room: gameState.currentRoom, verb: gameState.selectedVerb, objects: roomObjects,
    item: interactionSelection.itemId, status: statusText.textContent };
  try {
    for (const [roomId, room] of Object.entries(apartmentRooms)) {
      gameState.currentRoom = roomId; roomObjects = room.objects;
      for (const [target, object] of Object.entries(room.objects)) {
        const location = `${room.name}: ${object.name}`;
        for (const verb of [null, 'look', 'pickup', 'place', 'walk', 'use', 'talk', 'open', 'close']) {
          gameState.selectedVerb = verb; interactionSelection.itemId = null;
          // Only the five supported toolbar verbs have hover labels. Legacy
          // engine actions still contribute replies, never invented labels.
          if (verb === null || verbNames[verb]) {
            updateStatus(target);
            add(statusText.textContent, ['hover', ...(verb ? [verb] : [])], `Hover • ${verb || 'contextual / name'} • ${location}`);
          }
          if (verb) add(interactionReply(target, object, verb), [verb === 'close' ? 'open' : verb], `${verb} • ${location} • default reply (specific handlers can override)`);
        }
        if (object.response) add(object.response, ['use'], `Use • ${location} • object response`, object.speaker || 'Narration');
        if (object.lockedResponse) add(object.lockedResponse, ['use', 'open'], `Use / open • ${location} • locked`);
        for (const [verb, reply] of Object.entries(object.interactions || {})) {
          add(reply, [verb === 'close' ? 'open' : verb, ...(verb === 'talk' && object.speaker ? ['dialogue'] : [])], `${verb} • ${location} • custom response`, object.speaker || 'Narration');
        }
        for (const [id, definition] of Object.entries(itemDefinitions)) {
          interactionSelection.itemId = id;
          for (const verb of ['use', 'place']) {
            gameState.selectedVerb = verb; updateStatus(target);
            add(statusText.textContent, ['hover', verb], `Hover • ${verb} ${definition.name} • ${location}`);
          }
          const source = definition.source;
          if ((source.room !== roomId || source.target !== target) && !(id === 'extensionCord' && isExtensionCordDrawer(target, roomId))) {
            for (const reply of placementRefusals) add(reply, ['place'], `Place ${definition.name} • ${location} • rejected target • random selection`);
          }
          add(inventoryUseReply(id, target, object), ['use', 'inventory'], `Use ${definition.name} with ${object.name} • ${room.name}`);
        }
      }
    }
  } finally {
    gameState.currentRoom = saved.room; gameState.selectedVerb = saved.verb;
    roomObjects = saved.objects; interactionSelection.itemId = saved.item; statusText.textContent = saved.status;
  }
  for (const [id, definition] of Object.entries(itemDefinitions)) {
    add(definition.description, ['inventory', 'look'], `Inventory • select ${definition.name}`);
    add(`You pick up the ${definition.name}.`, ['pickup'], `Pick up • ${definition.name} • portable pickup formatter`);
    const object = apartmentRooms[definition.source.room].objects[definition.source.target];
    const preposition = placementTargets[definition.source.room]?.[definition.source.target];
    if (id !== 'extensionCord' && preposition) add(`You place the ${definition.name} ${preposition} the ${object.placementName || object.name}.`, ['place'], `Place ${definition.name} • original location • ${apartmentRooms[definition.source.room].name}`);
  }

  const functions = new Map();
  for (const name of Object.getOwnPropertyNames(globalThis)) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name);
    if (typeof descriptor?.value !== 'function' || /Catalog|MessageCategories/.test(name)) continue;
    const source = Function.prototype.toString.call(descriptor.value);
    if (source.includes('[native code]')) continue;
    try {
      const ast = acorn.parse(`(${source})`, { ecmaVersion: 'latest' });
      functions.set(name, { ast, source: `(${source})`, name });
    } catch { /* Browser host functions need not be JavaScript source. */ }
  }
  const known = { channels, itemDefinitions, apartmentRooms, lightCircuits, verbNames, wakeupConfig, placementRefusals };
  const stringify = (info, node) => info.source.slice(node.start, node.end);
  function walk(node, visit, parents = []) {
    if (!node || typeof node.type !== 'string') return;
    visit(node, parents);
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(child => walk(child, visit, [...parents, node]));
      else if (value?.type) walk(value, visit, [...parents, node]);
    }
  }
  function locals(info) {
    if (info.locals) return info.locals;
    const result = new Map();
    walk(info.ast, node => { if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init) result.set(node.id.name, node.init); });
    return info.locals = result;
  }
  function branches(info, parents, node) {
    const result = [];
    for (let i = 0; i < parents.length; i++) {
      const parent = parents[i], child = parents[i + 1] || node;
      if (parent.type === 'IfStatement' || parent.type === 'ConditionalExpression') {
        result.push(`${child === parent.alternate ? 'not ' : ''}(${stringify(info, parent.test)})`);
      }
    }
    return result;
  }
  function values(value) {
    if (typeof value === 'string') return [{ text: value, conditions: [] }];
    if (value && typeof value === 'object') return Object.values(value).flatMap(values);
    return [];
  }
  function knownValue(node) {
    if (node.type === 'Identifier') return known[node.name];
    if (node.type === 'MemberExpression') {
      const object = knownValue(node.object);
      const key = node.computed ? node.property.type === 'Literal' ? node.property.value : undefined : node.property.name;
      if (object && key !== undefined) return object[key];
    }
  }
  function combine(a, b) {
    return a.flatMap(left => b.map(right => ({ text: left.text + right.text, conditions: [...left.conditions, ...right.conditions] })));
  }
  function resolve(info, node, depth = 0, trail = new Set()) {
    if (!node) return [];
    const placeholder = () => [{ text: `{${stringify(info, node)}}`, conditions: [] }];
    if (depth > 8) return placeholder();
    const next = child => resolve(info, child, depth + 1, trail);
    if (node.type === 'Literal') return typeof node.value === 'string' ? [{ text: node.value, conditions: [] }] : placeholder();
    if (node.type === 'TemplateLiteral') {
      let parts = [{ text: node.quasis[0].value.cooked, conditions: [] }];
      node.expressions.forEach((expression, i) => {
        parts = combine(parts, next(expression));
        parts = combine(parts, [{ text: node.quasis[i + 1].value.cooked, conditions: [] }]);
      });
      return parts;
    }
    if (node.type === 'ConditionalExpression') return [
      ...next(node.consequent).map(entry => ({ ...entry, conditions: [...entry.conditions, stringify(info, node.test)] })),
      ...next(node.alternate).map(entry => ({ ...entry, conditions: [...entry.conditions, `not (${stringify(info, node.test)})`] }))
    ];
    if (node.type === 'BinaryExpression' && node.operator === '+') return combine(next(node.left), next(node.right));
    if (node.type === 'LogicalExpression') return [...next(node.left), ...next(node.right)];
    if (node.type === 'ArrayExpression') return node.elements.flatMap(next);
    if (node.type === 'ObjectExpression') return node.properties.flatMap(property => next(property.value).map(entry => ({ ...entry, conditions: [...entry.conditions, `entry: ${property.key.name || property.key.value}`] })));
    if (node.type === 'Identifier') {
      const local = locals(info).get(node.name);
      if (local && !trail.has(local)) return resolve(info, local, depth + 1, new Set([...trail, local]));
      const value = values(knownValue(node));
      return value.length ? value : placeholder();
    }
    if (node.type === 'MemberExpression') {
      const value = values(knownValue(node));
      if (value.length) return value;
      // An indexed local response map / channel list: list each defined reply.
      const binding = node.object.type === 'Identifier' && locals(info).get(node.object.name);
      if (binding?.type === 'ObjectExpression' || binding?.type === 'ArrayExpression') return next(binding);
      if (node.object.type === 'Identifier' && known[node.object.name] && node.computed && node.property.type !== 'Literal') {
        const data = Object.values(known[node.object.name]);
        if (data.every(value => typeof value === 'string')) return data.flatMap(values);
      }
      return placeholder();
    }
    if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
      const helper = functions.get(node.callee.name);
      // Object replies are already expanded above; avoid recursing into them.
      if (helper && !['interactionReply', 'refusal', 'displayName', 'targetObjectName'].includes(helper.name) && !trail.has(helper)) {
        const result = [];
        walk(helper.ast, (child, parents) => {
          if (child.type === 'ReturnStatement' && child.argument) {
            result.push(...resolve(helper, child.argument, depth + 1, new Set([...trail, helper])).map(entry => ({ ...entry, conditions: [...entry.conditions, ...branches(helper, parents, child)] })));
          }
        });
        if (result.length) return result;
      }
    }
    return placeholder();
  }
  function categoriesFor(info, conditions, text, hover) {
    const categories = hover ? ['hover'] : [];
    // Negated ancestor tests describe paths that were NOT taken. They must
    // not tag dialogue as Look at merely because its preceding branch did.
    const trigger = conditions.filter(condition => !/^not\b/.test(condition)).join(' ');
    for (const [verb, category] of Object.entries({ pickup: 'pickup', place: 'place', walk: 'walk', look: 'look', use: 'use', talk: 'talk', open: 'open', close: 'open' })) {
      if (new RegExp(`['"]${verb}['"]`).test(trigger)) categories.push(category);
    }
    if (/pickUp|takeWorldItem|takeShoes/.test(info.name)) categories.push('pickup');
    if (/placeInventory|put.*Away/.test(info.name)) categories.push('place');
    if (/wear|Wardrobe|Socks/.test(info.name)) categories.push('use');
    if (/Inventory|inventory/.test(info.name)) categories.push('inventory');
    if (/travel|Travel|resetGame|startGame/.test(info.name)) categories.push('walk');
    if (/curtain|Light/.test(info.name)) categories.push('use');
    if (/[“”]/.test(text)) categories.push('dialogue');
    return categories.length ? categories : ['system'];
  }
  for (const info of functions.values()) {
    if (info.name === 'buildMessageCatalog' || /DevMessage|MessageCatalog/.test(info.name)) continue;
    walk(info.ast, (node, parents) => {
      let expression, hover = false;
      if (node.type === 'CallExpression' && node.callee.type === 'Identifier') {
        if (node.callee.name === 'showMessage') expression = node.arguments[0];
        if (node.callee.name === 'changeWardrobe') expression = node.arguments[1];
      }
      if (node.type === 'AssignmentExpression' && node.left.type === 'MemberExpression' && node.left.property.name === 'textContent') {
        expression = node.right;
        hover = node.left.object.name === 'statusText';
      }
      if (!expression) return;
      const conditions = branches(info, parents, node);
      for (const entry of resolve(info, expression)) {
        const trigger = `${hover ? 'Hover formatter' : 'Message'} • ${info.name} • ${[...conditions, ...entry.conditions].join(' • ') || 'when called'}`;
        const categories = categoriesFor(info, [...conditions, ...entry.conditions], entry.text, hover);
        // Speaker metadata lives with characters, rather than copied dialogue.
        const characters = Object.values(apartmentRooms).flatMap(room => Object.values(room.objects)).filter(object => object.speaker);
        const character = characters.find(object => Object.keys(object).some(key => object[key] === true && (info.source.includes(`object.${key}`) || info.source.includes(`object?.${key}`))));
        const speaker = categories.includes('dialogue') ? character?.speaker || 'Unspecified speaker' : hover ? 'Interface' : 'Narration';
        add(entry.text, categories, trigger, speaker, `${info.name}: ${stringify(info, expression)}`);
      }
    });
  }
  return [...entries.values()].sort((a, b) => a.trigger.localeCompare(b.trigger) || a.text.localeCompare(b.text));
}

function filterMessageCatalog(entries, categories, search = '') {
  const query = search.toLocaleLowerCase().trim();
  return entries.filter(entry => entry.categories.some(category => categories.has(category)) &&
    (!query || `${entry.text} ${entry.trigger} ${entry.speaker} ${entry.definition}`.toLocaleLowerCase().includes(query)));
}
