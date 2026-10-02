// The narrow dollar Laundry has an open floor between its three machine walls.
// Coordinates are percentages of the 1672 x 941 room painting.
apartmentRooms.laundry = {
  name: 'Dollar Laundry interior',
  image: 'assets/used/laundry-room-bg-v3.png',
  floor: [19, 81, 50, 94],
  walkArea: [[36,50],[66,50],[70,55],[75,69],[81,94],[19,94],[25,69],[32,55]],
  obstacles: [
    [[18,61],[33,61],[33,88],[18,88]], // basket table at the left front window
    [[69,69],[82,69],[82,89],[69,89]], // short basket table at the right window
    [[71,59],[83,59],[83,70],[71,70]]  // waiting bench against the right wall
  ],
  objects: {
    entrance: { ...item('Laundry entrance mat', [42,85,16,11], [50,87], 'A slim dark mat marks the single storefront entrance. The way back to the street is at your feet.'), laundryExit: 'street', hotspotZ: 22 },
    leftMachines: item('left wall washing machines', [18,31,19,34], [38,60], 'A line of numbered front-loading washers follows the left wall. Their round steel doors look just like the machines visible through the street window.'),
    firstWasher: item('machine 1', [18,44,8,22], [35,69], 'The first washer has a round glass door and a small coin panel. It stands behind the basket table nearest the front window.'),
    leftWashers: item('machines 2 to 5', [25,35,12,29], [38,55], 'Machines 2 to 5 are coin-operated washers. One churns a blue load; the others wait with their doors closed.'),
    backMachines: item('back wall washing machines', [36,31,29,19], [50,52], 'Machines 6 to 10 run across the back wall. Their little numbered panels blink above round windows full of suds and clothes.'),
    machineSix: item('machine 6', [36,32,6,18], [40,52], 'A grey load rolls slowly behind the glass of machine 6. The last few minutes are taking their time.'),
    machineSeven: item('machine 7', [42,32,6,18], [46,52], 'A red shirt circles with darker washing in machine 7.'),
    machineEight: item('machine 8', [48,32,6,18], [52,52], 'Machine 8 is idle. Its drum smells faintly of powder and warm metal.'),
    rightMachines: item('right wall washing machines', [63,28,11,36], [66,60], 'More round-front washers continue down the right wall, with clear floor in front of them.'),
    stackedDryers: item('stacked dryers', [66,14,8,29], [67,53], 'A pair of tall stacked dryers rises above the right-hand washers. A few socks tumble in the upper drum.'),
    frontLeftTable: { ...item('front-left basket table', [18,59,15,30], [35,79], 'A waist-height metal table stands inside the left storefront window, where it can be seen from the street. A white wire basket rests on top.'), hotspotZ: 14 },
    leftBasket: item('left window laundry basket', [18,59,11,12], [35,74], 'The white wire basket on the left table holds a few blue garments, matching the basket in the exterior window.'),
    frontRightTable: { ...item('front-right basket table', [69,68,13,21], [66,83], 'A shorter metal table stands inside the right storefront window, leaving the middle of the Laundry open.'), hotspotZ: 16 },
    rightBasket: { ...item('right window laundry basket', [72,68,9,12], [66,80], 'A separate white wire basket sits on the short table just inside the right window.'), hotspotZ: 21 },
    payphone: { ...item('payphone', [79,33,4,28], [68,62], 'A blue-and-black wall payphone hangs on the right. Its handset, curled cord, keypad and coin slot all look well used.', 'You lift the handset. There is a dial tone, but you have no number in mind.'), hotspotZ: 22 },
    changeMachine: { ...item('coin changer', [77,28,3.5,25], [68,57], 'The blue CHANGE machine turns small notes into coins for the washers. A scratched label lists $1, $5 and $10.'), hotspotZ: 21 },
    detergentVendor: item('detergent dispenser', [74,18,4,33], [68,54], 'A wall dispenser sells single-use detergent, fabric softener and dryer sheets.'),
    bench: item('blue waiting bench', [71,59,11,13], [68,80], 'A blue wooden bench gives customers somewhere to wait while the machines run.'),
    laundryBin: item('small laundry bin', [18,73,5,17], [35,82], 'A blue bin beneath the left table takes empty detergent packets and stray scraps of paper.'),
    priceSign: item('one-dollar wash sign', [38,16,13,13], [50,52], 'The large $1 WASH sign promises a one-dollar wash. Drying and detergent cost extra.'),
    washDryFoldSign: item('Wash Dry Fold sign', [18,17,6,25], [35,56], 'The blue wall sign offers wash, dry and fold service on the same day.'),
    cleanPoster: item('Clean Brighter Cheaper poster', [51,15,8,15], [56,52], 'A cheerful blue poster says CLEAN BRIGHTER CHEAPER. It has faded a little around the edges.'),
    laundryTips: item('laundry tips poster', [59,16,6,15], [62,52], 'The poster advises sorting colours, loading the drum loosely, washing, drying and folding.'),
    noticeboard: item('community noticeboard', [26,13,6,19], [35,54], 'Local notices cover the board: lost keys, a room to rent, and a reminder to clean the lint filters.'),
    clock: item('laundry wall clock', [31,10,5,9], [36,53], 'The wall clock ticks above the machines. It is a few minutes slower than your phone.'),
    leftPlant: item('laundry plant', [24,28,7,18], [35,56], 'A broad-leaved plant softens the row of hard metal machines.'),
    rightPlant: item('plant by the bench', [79,63,5,27], [68,84], 'A hardy potted plant grows beside the bench, taking what daylight it can get.'),
    ceilingLights: item('laundry ceiling lights', [28,3,43,8], [50,52], 'Long warm fluorescent panels light the room, even under a grey sky.'),
    tiledAisle: { ...item('open laundry floor', [34,70,33,13], [50,77], 'Worn grey tile leaves a clear walking space between the three machine walls and the two front basket tables.'), floor: true, hotspotZ: 14 }
  }
};

function travelLaundry(to) {
  stopWalking();
  whenRoomReady(to, () => {
    showRoom(to);
    Object.assign(movement, to === 'laundry'
      ? { x: 50, y: 87, facing: 'up' }
      : { x: streetDoors.laundry.x, y: streetDoors.laundry.inside, facing: 'down' });
    renderPlayer();
    showMessage(to === 'laundry'
      ? 'The Laundry smells of warm cotton and soap. Washers turn along three walls.'
      : 'You step out of the Laundry onto the wet footpath.');
  });
}

function handleLaundryTarget(object, verb, onAction) {
  if (!object?.laundryExit) return false;
  if (verb === 'look') showMessage(object.description);
  else if (exitVerbs.has(verb)) movePlayerTo(...object.walk, () => { onAction?.(); travelLaundry(object.laundryExit); });
  else showMessage(refusal(verb, object));
  return true;
}
