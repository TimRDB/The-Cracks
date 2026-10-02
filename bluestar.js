// Bluestar's cutaway interior. Coordinates are percentages of the 1672 x 941 art.
// The narrow strips between the shelves stay open so every aisle can be walked.
apartmentRooms.bluestar = {
  name: 'Bluestar interior',
  image: 'assets/used/bluestar-store-bg-v2.png',
  floor: [2, 98, 32, 97],
  walkArea: [[3,35],[31,35],[31,31],[87,31],[87,37],[96,38],[98,88],[83,96],[54,98],[28,96],[2,89]],
  obstacles: [
    [[2,67],[28,64],[29,86],[2,87]],                 // front coffee counter
    [[20,36],[32,31],[33,54],[29,62],[19,59]],      // checkout return
    [[41,37],[51,36],[52,70],[37,70]],              // pantry shelf
    [[60,36],[67,35],[69,73],[57,73]],              // snacks and bread shelf
    [[73,35],[80,34],[83,70],[70,70]],              // household shelf
    [[86,58],[97,58],[98,86],[89,86]]               // ice-cream chest
  ],
  objects: {
    // Entry and counter. The room contains no visible door leaf or barrier.
    entrance: { ...item('Bluestar entrance mat', [27,85,23,13], [43,86], 'A dark mat catches rain from customers coming in off the street. The way back outside is clear.'), bluestarExit: 'street', hotspotZ: 22 },
    coffeeMachine: { ...item('coffee machine', [20.5,44,8,24], [33.5,71], 'A tall black Northbank bean-to-cup tower stands at the right end of the wooden counter, just like the machine in the shopfront window. A lit panel offers espresso, flat white and hot chocolate.', 'The machine hums and asks you to choose a drink before it will make one.'), hotspotZ: 22 },
    coffeeCups: item('coffee cups and stirrers', [3.3,49,11,18], [31,73], 'Stacks of paper cups, lids, sugar sachets and wooden stirrers are ready for the morning rush.'),
    nuts: item('nuts and snack rack', [12.8,50,8,19], [31,73], 'A little wire rack offers Saltwick peanuts, honey cashews, trail mix and a few packets of dried mango.'),
    pastries: item('counter pastries', [6,51,9,12], [31,72], 'Croissants and iced buns sit under clear lids. The handwritten card promises they were delivered this morning.'),
    frontCounter: { ...item('wooden coffee counter', [2,67,27,19], [33,82], 'The warm wooden counter makes a small coffee stop just inside Bluestar. Its right end supports the tall machine; the left end holds cups and snacks.'), hotspotZ: 14 },
    checkout: item('checkout counter', [21,34,12,28], [35,57], 'The checkout has a clear standing place for the cashier behind its long wooden return. A screen, barcode scanner and card terminal face the customer aisle.'),
    till: item('cash register', [24.5,35,5,9], [35,55], 'A compact till and barcode scanner sit beside a roll of receipt paper.'),
    cardTerminal: item('payment terminal', [22.5,42,4,7], [35,57], 'The card terminal takes tap payments and still has a slot for older cards.'),
    cashierSpace: item('cashier station', [13.5,38,7.5,13], [18,56], 'A clear space behind the counter is ready for the cashier. The cigarette wall and a small bin are within reach.'),
    smallBin: item('small rubbish bin', [19.5,32,3.5,12], [18,52], 'A small black bin beside the checkout holds till-roll cores and the odd discarded receipt.'),
    cigarettes: item('cigarette display', [4,23,14,25], [18,53], 'Rows of cigarettes sit behind the counter: Calder, Northline and Silver Quay. The health notice is hard to miss.'),
    vapes: item('vape display', [14,23,7,15], [19,51], 'A locked section of the counter wall holds rechargeable vapes and small bottles of liquid.'),
    counterSundries: item('counter sundries', [8,38,12,10], [18,56], 'Lighters, pens, mints and travel tissues fill the small trays behind the till.'),
    // Left wall and back corner.
    fireExtinguisher: item('fire extinguisher', [2,35,3,18], [10,54], 'A red extinguisher is fixed beside the tobacco display, with its inspection tag still attached.'),
    securityCamera: item('security camera', [7,7,6,9], [10,47], 'A small camera watches the front counter and the entrance mat.'),
    convexMirror: item('security mirror', [31,4,6,8], [35,36], 'The convex mirror gives the cashier a warped view down every aisle.'),
    leftSnacks: item('crackers and chips', [17,8,13,31], [34,39], 'High shelves carry crisp packets, savoury crackers, oat biscuits and packets of Saltwick pretzels.'),
    atm: item('ATM', [31,13,5.5,17], [35,37], 'The back-left ATM glows blue. It offers withdrawals, balances and a printed receipt for a small fee.'),
    // The drinks line is split so each type can be inspected independently.
    colaDrinks: item('fizzy drinks cooler', [36,8,7,22], [40,35], 'Koru Cola, lemonade and orange soda fill the red-lit cooler.'),
    energyDrinks: item('energy drinks cooler', [43,8,7,22], [47,35], 'BlueBolt and Pulse energy drinks crowd the next cabinet, from sugar-free cans to oversized bottles.'),
    water: item('bottled water cooler', [50,8,7,22], [54,35], 'Tidal Water comes still, sparkling and lightly flavoured. The larger bottles occupy the bottom shelf.'),
    milk: item('milk and dairy cooler', [57,8,8,22], [61,35], 'Fresh Dairy milk, chocolate milk and little yoghurt drinks line the bright cabinet.'),
    juice: item('juices and coffee drinks', [65,8,9,22], [69,35], 'Orange, apple and tropical juices share space with chilled Northbank coffees and iced tea.'),
    // Middle gondolas: multiple look targets on every face.
    pantryShelf: item('pantry shelf', [37,26,15,44], [35,54], 'A long middle shelf separates the aisles, packed with canned food, flour, rice and everyday pantry goods.'),
    cannedGoods: item('canned goods', [38,40,9,18], [35,53], 'Harbour beans, tomato soup, peaches and tinned tuna are stacked by colour, though a few labels face backwards.'),
    flourRice: item('flour and rice', [38,57,10,13], [35,65], 'Bags of Meadow flour, oats, rice and lentils weigh down the bottom shelves.'),
    condiments: item('sauces and condiments', [45,26,7,31], [54.5,52], 'Tomato sauce, pickle, cooking oil and jars of chutney take up the far side of the pantry gondola.'),
    cereal: item('breakfast cereal', [47,39,5,23], [54.5,60], 'Bright boxes of Honey Moons, Bran Trail and plain rolled oats promise several versions of breakfast.'),
    snackShelf: item('snack and bread shelf', [57,25,12,48], [55,56], 'The second gondola carries chips, crackers, noodles, biscuits and loaves of bread.'),
    chips: item('chips and crackers', [58,26,10,17], [55,48], 'Saltwick crisps, pepper crackers and little bags of corn chips fill the upper racks.'),
    biscuits: item('biscuits and sweets', [59,44,10,18], [55,58], 'Tea biscuits, chocolate bars and fruit chews are wedged into the middle shelves.'),
    bread: item('bread loaves', [60,40,7,11], [69.5,49], 'HeartLoaf wholemeal, white and seeded loaves arrived this morning. A few are already squeezed flat.'),
    instantMeals: item('instant meals', [60,61,9,12], [55,70], 'Noodles, boxed macaroni and microwave rice sit close to the front of the aisle.'),
    householdShelf: item('household goods shelf', [70,25,13,45], [69.5,55], 'The rightmost gondola brings together cleaners, bathroom supplies, batteries and small electronics.'),
    cleaningGoods: item('cleaning goods', [71,29,12,18], [84,47], 'CleanNest sprays, washing liquid, sponges and rubber gloves fill the top half of the shelf.'),
    oralCare: item('toothbrushes and toothpaste', [75,43,8,13], [84,55], "Soft brushes, children's brushes and Freshfield toothpaste hang in tidy rows."),
    paperGoods: item('toilet paper and tissues', [73,55,10,15], [84,65], 'Four-packs of toilet paper, tissues and kitchen towels occupy the lower shelf.'),
    electronics: item('chargers and cables', [77,36,6,18], [84,53], 'VoltGo phone chargers, USB cables, adapters, earbuds and a few power banks hang in white cartons.'),
    batteries: item('batteries', [77,53,5.5,8], [84,61], 'AA, AAA and button batteries sit beside a tiny test torch.'),
    // Right wall and front-right corner.
    alcoholCoolers: item('beer and wine coolers', [83,10,13,49], [84.5,46], 'Glass cabinets keep local beer, cider, red wine and white wine under the Beer & Wine sign.'),
    beer: item('beer bottles and cans', [85,21,7,25], [84.5,45], 'North Pier lager, Harbour Dark and a row of pale ales chill behind the left cooler door.'),
    wine: item('wine bottles', [91,21,5,34], [84.5,49], 'Red, white and rosé bottles occupy the right cabinet. The cheapest labels are down by the floor.'),
    wallElectronics: item('small electronics wall', [95,17,3,41], [86,55], 'More VoltGo cables, plugs and headphones hang on the narrow wall beside the alcohol section.'),
    iceCream: item('ice-cream freezer', [86,57,12,30], [84,76], 'A Northbank chest freezer holds ice blocks, tubs and individually wrapped ice creams.'),
    shopLights: item('ceiling lights', [18,2,63,7], [55,40], 'Bright strip lights make the shelves easy to read even on a rainy afternoon.'),
    tiledFloor: { ...item('tiled aisles', [50,75,34,17], [55,80], 'Grey tile runs between the counter and every shelf. The open aisles lead around the store and up to the drinks wall.'), floor: true, hotspotZ: 14 }
  }
};

function travelBluestar(to) {
  stopWalking();
  whenRoomReady(to, () => {
    showRoom(to);
    Object.assign(movement, to === 'bluestar'
      ? { x: 43, y: 86, facing: 'up' }
      : { x: streetDoors.bluestar.x, y: streetDoors.bluestar.inside, facing: 'down' });
    renderPlayer();
    showMessage(to === 'bluestar'
      ? 'Bluestar smells of coffee and fresh bread. The aisles stretch back to the drink coolers.'
      : 'You step back onto the damp footpath outside Bluestar.');
  });
}

function handleBluestarTarget(object, verb, onAction) {
  if (!object?.bluestarExit) return false;
  if (verb === 'look') showMessage(object.description);
  else if (exitVerbs.has(verb)) movePlayerTo(...object.walk, () => { onAction?.(); travelBluestar(object.bluestarExit); });
  else showMessage(refusal(verb, object));
  return true;
}
