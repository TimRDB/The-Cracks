// Reviewed by room and target, rather than guessing behaviour from names.
// Entries: [physical kind, Use reply, optional fuller description]. Stateful
// handlers still own travel, lighting, wardrobe, TV and portable-item actions.
const reviewedObjects = {
  outside: {
    frontDoor: ['door'], neighbourLeft: ['door'], neighbourMiddle: ['door'],
    blueCar: ['car'], burgundyCar: ['car'], silverCar: ['car'],
    emptyBay: ['ground', 'You check the painted lines. There is room for one car here.'],
    smallTree: ['plant', 'You check the wooden supports. The young tree is standing securely.'],
    largeTree: ['plant', 'You pause beneath the branches, then leave the tree alone.'],
    lawn: ['ground', 'You stay on the paving rather than tread through the wet grass.'],
    leftSteps: ['steps', 'You check the wet steps and railing. The neighbouring apartment is not your destination.'],
    middleSteps: ['steps', 'You leave the middle apartment steps clear for whoever lives there.'],
    steps: ['steps', 'The railing gives you something to hold while using the patio steps.'],
    streetExit: ['path']
  },
  living: {
    bedroomDoor: ['door'], bathroomDoor: ['door'], exit: ['door'],
    tv: ['screen'], channelBox: ['device'],
    couch: ['furniture'],
    chair: ['furniture', null, 'A padded armchair stands beside the couch. Its seat has a deep, familiar dent and worn fabric on the arms.'],
    bookshelf: ['furniture', null, 'A tall bookshelf against the left wall holds well-read paperbacks, old photographs and mismatched ornaments.'],
    coffeeTable: ['furniture'],
    rug: ['fabric', 'You smooth a curled edge of the rug back against the floor.'],
    fridge: ['cabinet'], freezer: ['cabinet'], stove: ['appliance'], microwave: ['appliance'],
    sink: ['fixture', 'You run the tap, rinse your hands, then turn it off.'],
    counter: ['drawer', 'You check the cutlery and cooking utensils, then close the kitchen drawer.', 'A short kitchen worktop beside the stove has drawers of cutlery and cooking utensils underneath. These drawers are separate from the small chest in the living room.'],
    toaster: ['worktop', 'The toaster belongs on this section of bench beside the stove.'],
    plant: ['plant'],
    coffee: ['appliance', 'The machine whirrs and fills a mug with hot coffee.', 'A compact coffee machine sits on the kitchen worktop beside its cups. Its buttons and drip tray bear the marks of daily use.'],
    keys: ['fixture', 'The hooks are for your apartment keys.'],
    entryDrawers: ['drawer'], entryTopDrawer: ['drawer'], entrySecondDrawer: ['drawer'], entryThirdDrawer: ['drawer'],
    entryBottomDrawer: ['drawer', 'You check the reusable shopping bags and close the bottom drawer.'],
    powerOutlet: ['fixture'], livingCurtains: ['curtain'],
    mainLightSwitch: ['switch'], kitchenLightSwitch: ['switch'], hallwayLightSwitch: ['switch'],
    shoeRack: ['furniture', 'The shoe rack holds your work shoes and sneakers. Use it to choose a pair.']
  },
  bathroom: {
    livingDoor: ['door'],
    laundry: ['basket', 'You straighten the laundry in the woven basket and leave it beside the bathroom door.'],
    towels: ['personal', 'You dry your hands on the towel and hang it back in place.'],
    sink: ['cabinet', 'You rinse your hands in the basin and turn the tap off again.'],
    mirror: ['fixture', 'You check your reflection and rub a little sleep from your eyes.'],
    toilet: ['fixture'],
    picture: ['decoration', 'You straighten the frame against the bathroom wall.'],
    bath: ['fixture'], bathMat: ['fabric', 'You straighten the bath mat without blocking the way to the basin.'],
    bathroomCurtains: ['curtain'], mainLightSwitch: ['switch']
  },
  bedroom: {
    bed: ['furniture', 'You straighten the pillow. Close enough for now.'],
    crumpledClothes: ['personal'], drawers: ['drawer'], cupboard: ['cabinet'], door: ['door'],
    couch: ['furniture', 'You test a cushion. Still the most comfortable spot in the room.'],
    tv: ['screen'], console: ['device'],
    guitar: ['personal', 'You pluck a quiet chord. A little out of tune.'],
    books: ['personal', 'You flick through a few pages, then put the book back.'],
    bookshelf: ['furniture', 'You take down a paperback, check your old bookmark, and return it.'],
    lamp: ['fixture', null, 'A small bedside lamp stands on the table beside the bed. Its shade directs light down toward the pillow and alarm clock.'],
    alarm: ['device'], curtains: ['curtain'], mainLightSwitch: ['switch']
  },
  street: {
    apartments: ['path'], laundry: ['door'], bluestar: ['door'],
    laundryWindow: ['window', 'You look through the glass at the washers and basket tables. The entrance is the single door beside the window.'],
    prices: ['sign', 'You read the offer again: milk is $3 and bread is $2.'],
    rubbish: ['bin', 'You check the label on the rubbish bin. You have no rubbish to leave here.', 'A dark wheelie bin beside Bluestar is labelled RUBBISH. Its closed lid keeps the street litter inside.'],
    recycling: ['bin', 'The blue bin is for recycling. You have nothing suitable to put in it.', 'A blue wheelie bin beside Bluestar is labelled RECYCLING. It stands between the rubbish and food waste bins.'],
    foodWaste: ['bin', 'The green bin is for food scraps. You have none to dispose of.', 'A green wheelie bin at the end of the row is labelled FOOD WASTE. Its lid is shut.'],
    hydrant: ['fixture', 'You leave the hydrant and its valve caps alone. It is here for the fire service.'],
    alley: ['path'], parkedCars: ['car']
  },
  bluestar: {
    entrance: ['threshold'], coffeeMachine: ['appliance'],
    coffeeCups: ['stock', 'You check the cup sizes, lids and stirrers. You do not need one without a drink.'],
    nuts: ['stock', 'You compare the Saltwick packets and put them back in their rack.'],
    pastries: ['stock', 'You read the pastry card through the clear cover and leave the buns for sale.'],
    frontCounter: ['worktop', 'You check the clear part of the wooden counter. There is room to prepare a coffee here.'],
    checkout: ['worktop', 'You wait on the customer side of the checkout. The cashier station is empty.'],
    till: ['device', 'You leave the till and scanner for the cashier. There is no purchase to ring up.'],
    cardTerminal: ['device', 'The terminal is waiting for a sale. Tapping it without a purchase would do nothing.'],
    cashierSpace: ['ground', 'You leave the space behind the checkout clear for the cashier.'],
    smallBin: ['bin', 'You leave the till-roll cores and receipts in the checkout bin.'],
    cigarettes: ['stock', 'You read the labels from the customer side. The cigarettes are kept behind the counter.'],
    vapes: ['stock', 'The vape cabinet is locked. You would need the cashier to open it.'],
    counterSundries: ['stock', 'You inspect the small trays without taking the lighters, pens or mints.'],
    fireExtinguisher: ['emergency', 'There is no fire. You leave the extinguisher on its bracket.'],
    securityCamera: ['fixture', 'You glance at the camera and leave its settings alone.'],
    convexMirror: ['fixture', 'You use the curved reflection to check the aisles without moving the mirror.'],
    leftSnacks: ['stock', 'You compare the crackers and crisps, then leave the packets arranged on the shelf.'],
    atm: ['appliance', 'The ATM asks for a bank card. You do not start a withdrawal.'],
    colaDrinks: ['cooler', 'You check the chilled Koru Cola and other fizzy drinks through the glass.'],
    energyDrinks: ['cooler', 'You compare the BlueBolt and Pulse cans through the cooler door.'],
    water: ['cooler', 'You check the still and sparkling Tidal Water bottles without taking one.'],
    milk: ['cooler', 'You check the chilled milk and yoghurt drinks, then leave the cabinet closed.'],
    juice: ['cooler', 'You compare the juices and Northbank coffee drinks through the glass.'],
    pantryShelf: ['shelf', 'You browse the pantry labels without rearranging the shelf.'],
    cannedGoods: ['stock', 'You turn a Harbour tin to read its label, then return it to the stack.'],
    flourRice: ['stock', 'You check the bag sizes. The flour, rice and lentils stay on the lower shelf.'],
    condiments: ['stock', 'You read a chutney label and put the jar back with the sauces.'],
    cereal: ['stock', 'You compare the cereal boxes and leave them lined up on the shelf.'],
    snackShelf: ['shelf', 'You browse the snacks and bread without moving the shelving.'],
    chips: ['stock', 'You check the flavours on the Saltwick packets without opening them.'],
    biscuits: ['stock', 'You compare the biscuits and sweets, then leave the sealed packets for sale.'],
    bread: ['stock', 'You check the HeartLoaf labels without squeezing another loaf.'],
    instantMeals: ['stock', 'You read the cooking instructions. The sealed meals stay on the shelf.'],
    householdShelf: ['shelf', 'You browse the household supplies without moving the display.'],
    cleaningGoods: ['stock', 'You read the CleanNest labels. There is no reason to open the cleaning bottles here.'],
    oralCare: ['stock', 'You compare the brushes and Freshfield toothpaste without opening the packaging.'],
    paperGoods: ['stock', 'You check the pack sizes and leave the paper goods stacked neatly.'],
    electronics: ['stock', 'You check the VoltGo connector types through their packaging.'],
    batteries: ['stock', 'You compare the AA, AAA and button-cell sizes without opening a pack.'],
    alcoholCoolers: ['cooler', 'You read the beer and wine labels through the cooler doors.'],
    beer: ['stock', 'You inspect the North Pier and Harbour labels without opening a bottle.'],
    wine: ['stock', 'You check the wine labels and prices, then leave the bottles in the cabinet.'],
    wallElectronics: ['stock', 'You inspect the plugs and headphone connections through their packaging.'],
    iceCream: ['cooler', 'You check the freezer display and leave the ice creams cold inside.'],
    shopLights: ['fixture', 'The shop lighting is controlled by the staff. You leave it on.'],
    tiledFloor: ['ground', 'You keep the tiled aisles clear for people browsing the shelves.']
  },
  laundry: {
    entrance: ['threshold'],
    leftMachines: ['washer', 'You check the numbered coin panels. You are not starting a wash without a load ready.'],
    firstWasher: ['washer', 'Machine 1 is waiting for a load, detergent and coins. You leave it idle.'],
    leftWashers: ['washer', 'You leave the turning blue load to finish and check the idle washers beside it.'],
    backMachines: ['washer', 'The back-row washers are running. You leave their controls alone.'],
    machineSix: ['washer', 'Machine 6 is still washing. You let the grey load finish its cycle.'],
    machineSeven: ['washer', 'You leave machine 7 running rather than interrupt the red shirt and darker clothes.'],
    machineEight: ['washer', 'Machine 8 is empty and waiting for coins. You do not start an empty wash.', 'An empty drum is visible through machine 8\'s closed glass door. Its coin panel is waiting for the next load.'],
    rightMachines: ['washer', 'You check the right-hand coin panels without changing anyone else\'s wash.'],
    stackedDryers: ['dryer', 'You leave the tumbling socks to dry. The controls belong to whoever paid for this cycle.'],
    frontLeftTable: ['worktop', 'You straighten the wire basket on the left table and keep the folding surface clear.'],
    leftBasket: ['basket', 'The blue garments belong to another customer. You leave them in their basket.'],
    frontRightTable: ['worktop', 'You check the short table and leave it clear around the basket.'],
    rightBasket: ['basket', 'You leave the right-window basket where its owner can find it.'],
    payphone: ['fixture'],
    changeMachine: ['appliance', 'The changer asks for a note before it will dispense coins. You leave the slot empty.'],
    detergentVendor: ['appliance', 'You read the detergent and dryer-sheet choices. The dispenser needs payment first.'],
    bench: ['furniture', 'You test the edge of the waiting bench, then stand again and leave room for customers.'],
    laundryBin: ['bin', 'You check the small bin. You have no empty detergent packets to throw away.'],
    priceSign: ['sign', 'You check the price: a wash costs $1; drying and detergent are extra.'],
    washDryFoldSign: ['sign', 'You read the same-day wash, dry and fold offer. There is no load to hand over.'],
    cleanPoster: ['sign', 'You read the faded slogan and leave the poster on the wall.'],
    laundryTips: ['sign', 'You read the advice about sorting colours and leaving room in the drum.'],
    noticeboard: ['sign', 'You browse the lost-key notice, room advert and lint-filter reminder without removing them.'],
    clock: ['fixture', 'You check the time on the wall clock. You leave its hands where they are.'],
    leftPlant: ['plant', 'You check the broad leaves and leave the plant beside the machines.'],
    rightPlant: ['plant', 'You move a leaf away from the bench and leave the pot in its place.'],
    ceilingLights: ['fixture', 'The fluorescent lights serve the whole Laundry. You leave their controls alone.'],
    tiledAisle: ['ground', 'You leave the centre aisle clear for baskets and customers.']
  },
  alley: {
    street: ['path'],
    shelter: ['belongings', 'The shelter is Owen\'s. You leave the cartons arranged to keep his bedding dry.'],
    sleepingBag: ['belongings', 'You leave Owen\'s sleeping bag rolled out on its dry cardboard.'],
    bags: ['belongings', 'The tied bags hold Owen\'s belongings. You do not open them.'],
    dumpster: ['bin', 'You leave the dumpster lid shut. There is nothing you need from inside.'],
    bushes: ['plant', 'You ease past the wet leaves without breaking the branches.'],
    bins: ['bin', 'You check the waste and recycling bins and leave their lids shut.'],
    fence: ['fixture', 'You check the wooden slats. The fence is solid, and the concrete path stays clear beside it.'],
    man: ['person']
  },
  garage: {
    elevator: ['door'], elevatorCall: ['switch'],
    directionIndicators: ['fixture', 'The indicators show the lift\'s direction. The call button is below and to the right.'],
    blueCar: ['car'],
    darkCar: ['car', 'You leave the estate car alone. It belongs to someone else.'],
    silverCar: ['car', 'You leave the silver sedan in its marked bay. It is not your car.'],
    emptyBay: ['ground', 'You check bay sixteen. It is clear apart from the old tyre mark.'],
    foregroundLeftCar: ['car', 'You leave the nearest dark car alone and keep to the driving aisle.'],
    foregroundRightCar: ['car', 'You step around the burgundy car without trying its doors.'],
    leftPillar: ['structure', 'You check the warning stripes and keep clear of the pillar\'s scraped corner.'],
    rightPillar: ['structure', 'You check the gap beside the pillar. There is room to reach your car.'],
    safetyPoster: ['sign', 'You read the safety notice and leave it posted for the other employees.', 'A faded safety notice on the garage wall reminds employees to keep the driving aisle and lift entrance clear.'],
    employeeParkingSign: ['sign', 'You check the employee-parking sign. These marked bays are reserved for staff.'],
    fireExtinguisher: ['emergency', 'There is no fire. You leave the inspected extinguisher ready on its bracket.'],
    sprinklers: ['emergency', 'You leave the sprinkler pipes and valves alone. They protect the whole garage.'],
    securityCamera: ['fixture', 'You glance at the dome camera and leave it watching the parking bays.'],
    drain: ['ground', 'You check the grate without lifting it. The dirty water is draining away.']
  }
};

function applyObjectReview() {
  for (const [roomId, targets] of Object.entries(reviewedObjects)) {
    for (const [target, [kind, use, description]] of Object.entries(targets)) {
      const object = apartmentRooms[roomId].objects[target];
      object.kind = kind;
      if (description) object.description = description;
      if (use) object.response = use;
      const name = object.name;
      if (kind === 'car' && object.locked) object.lockedResponse = `The doors are locked. You leave the ${name} alone.`;
      const replies = { place: 'Choose an item from Inventory to place.' };
      if (kind === 'drawer') replies.pickup = "You don't want to pick up the drawer.";
      else if (['fixture', 'switch', 'door', 'window', 'curtain', 'structure', 'emergency', 'ground', 'steps', 'path', 'threshold'].includes(kind)) replies.pickup = `The ${name} is fixed in place, or needs to stay where it is.`;
      else if (['furniture', 'worktop', 'cabinet', 'shelf', 'cooler', 'washer', 'dryer', 'car', 'appliance'].includes(kind)) replies.pickup = `You don't want to move the ${name} away from its place.`;
      else if (kind === 'stock') replies.pickup = `You leave the ${name} on display. You haven't bought anything.`;
      else if (kind === 'belongings') replies.pickup = `The ${name} belongs to Owen. You leave it where he put it.`;
      else if (kind === 'basket') replies.pickup = `You leave the ${name} and its contents where they are.`;
      else if (kind === 'bin') replies.pickup = `You leave the ${name} in place rather than carry a waste bin around.`;
      else if (kind === 'sign') replies.pickup = `You leave the ${name} displayed for everyone to read.`;
      else if (kind === 'plant') replies.pickup = `You leave the ${name} growing where it is.`;
      else if (kind === 'screen' || kind === 'device') replies.pickup = `You leave the ${name} with its cables and controls in place.`;
      else if (kind === 'fabric') replies.pickup = `The ${name} needs to stay on the floor rather than travel with you.`;
      else if (kind === 'decoration') replies.pickup = `You straighten the ${name}, then leave it on the wall.`;
      else if (kind === 'personal') replies.pickup = `You check the ${name}, then leave it where it belongs.`;
      else if (kind === 'person') replies.pickup = 'You can talk to Owen. You are not going to pick him up.';

      if (kind === 'stock') replies.talk = `You read the labels on the ${name}. There is no one to talk to in the display.`;
      else if (kind === 'sign') replies.talk = `You read the ${name} rather than talk to it.`;
      else if (kind === 'washer' || kind === 'dryer') replies.talk = `The ${name} answers with the hum of laundry equipment.`;
      else if (kind === 'belongings') replies.talk = 'You can speak to Owen rather than talk to his belongings.';
      else if (['door', 'switch', 'curtain', 'path', 'threshold'].includes(kind)) replies.talk = `You have nothing to say to the ${name}.`;

      if (kind === 'drawer' || kind === 'cabinet') {
        replies.open = `You check inside the ${name}, then close it again. ${object.description}`;
        replies.close = `The ${name} is already closed.`;
      } else if (kind === 'cooler') {
        replies.open = 'You check through the glass rather than leave the chilled goods warming up.';
        replies.close = 'The cooler is already closed to keep its contents cold.';
      } else if (kind === 'door') {
        replies.open = 'Use the door to go through, or inspect it to check where it leads.';
        replies.close = 'The door is already closed.';
      } else if (kind === 'car') {
        replies.open = 'You leave the car doors shut and stay beside the parking bay.';
        replies.close = 'The car doors are already shut.';
      } else if (kind === 'basket') {
        replies.open = 'The basket is open-topped. You can see its contents without opening anything.';
        replies.close = 'There is no lid to close on this basket.';
      } else if (kind === 'washer' || kind === 'dryer') {
        replies.open = 'You leave the laundry doors alone rather than interrupt a cycle or handle someone else\'s washing.';
        replies.close = 'The laundry doors are already shut.';
      } else if (kind === 'stock') {
        replies.open = 'You leave the shop packaging sealed. These goods are still for sale.';
        replies.close = 'The stock is already sealed or arranged on its display.';
      } else if (kind === 'belongings') {
        replies.open = 'You do not open Owen\'s belongings.';
        replies.close = 'You leave Owen\'s shelter and belongings as he arranged them.';
      } else if (kind === 'bin') {
        replies.open = `You leave the ${name} shut; you have nothing to dispose of.`;
        replies.close = `The ${name} does not need closing.`;
      } else {
        replies.open = `There is nothing to open on the ${name}.`;
        replies.close = `There is nothing to close on the ${name}.`;
      }
      object.interactions = { ...replies, ...object.interactions };
    }
  }
  // More precise replies where a type-wide response would imply an action
  // that the artwork or current scene state does not support.
  apartmentRooms.living.objects.microwave.placementPreposition = 'in';
  apartmentRooms.living.objects.powerOutlet.interactions.open = 'The outlet cover stays on the wall. The sockets are accessible without opening it.';
  apartmentRooms.garage.objects.elevator.interactions.open = 'The lift doors open when the elevator arrives. Use the call button beside them.';
  apartmentRooms.bluestar.objects.vapes.interactions.open = 'The vape cabinet is locked. The cashier would need to open it.';
  apartmentRooms.laundry.objects.machineEight.interactions.open = 'You check the empty drum in machine 8, then close the door again.';
  apartmentRooms.laundry.objects.firstWasher.interactions.open = 'You check the empty drum in machine 1, then close its door again.';
  apartmentRooms.bathroom.objects.toilet.interactions.open = 'You lift the toilet lid, then lower it again.';
  apartmentRooms.bathroom.objects.toilet.interactions.close = 'The toilet lid is already down.';
  apartmentRooms.bathroom.objects.bath.interactions.open = 'You draw the shower curtain aside to check the bath, then pull it back.';
  apartmentRooms.bathroom.objects.bath.interactions.close = 'The shower curtain is already drawn across the bath.';
  apartmentRooms.street.objects.laundryWindow.interactions.open = 'The storefront glazing is fixed. Use the single door beside it to enter.';
  apartmentRooms.bedroom.objects.books.interactions.open = 'You open a book at its bookmark, read a few lines, then close it again.';
}
applyObjectReview();
