// Artwork-aligned hit areas, floor bounds and reciprocal doorway connections.
const item = (name, area, walk, description, response) => ({ name, area, walk, description, response });
const door = (name, area, walk, to, entry) => ({ name, area, walk, to, entry, description: `The ${name}.`, portal: [area[0] + area[2] / 2, area[1] + area[3]] });
const apartmentRooms = {
  outside: {
    name: 'Apartment forecourt', image: 'assets/outside_bg.png', floor: [5, 96, 36, 96],
    objects: {
      frontDoor: { ...door('front door', [70.2,17.4,5,18.7], [73,37.4], 'living', 'exit'), hinge: 'left', swing: 1, description: 'The front door opens inward into the apartment.' },
      neighbourLeft: { ...item('left apartment door', [21,17.3,5,19], [23.5,37.4], 'A dark green front door. The neighbouring apartment is locked.'), locked: true },
      neighbourMiddle: { ...item('middle apartment door', [45.6,17.4,5,19], [48,37.4], 'A burgundy front door. This neighbouring apartment is locked too.'), locked: true },
      blueCar: { ...item('blue hatchback', [75.5,56,22,30], [87,92], 'A blue Lonza Experience hatchback. Rain beads on its windows. The doors are locked.'), locked: true },
      burgundyCar: { ...item('burgundy sedan', [2,56,21,30], [13,92], 'A burgundy Arven Vale sedan, with faded paint around the boot. Its doors are locked.'), locked: true },
      silverCar: { ...item('silver estate', [52,56,18,30], [61,92], 'A silver Veyra Solis estate. A folded blanket sits behind the rear seats. The doors are locked.'), locked: true },
      emptyBay: item('empty parking space', [25,65,23,24], [36,80], 'One of the four marked parking spaces is empty.'),
      smallTree: item('young tree', [0,9,10,49], [8,55], 'A young tree, supported by wooden stakes, stands beside the curbside lawn.'),
      largeTree: item('mature tree', [94,2,6,51], [94,55], 'A mature tree spreads its branches over the forecourt.'),
      lawn: item('curbside lawn', [53,48,15,5], [60,55], 'A narrow lawn separates the raised patios from the parking spaces.'),
      leftSteps: item('left concrete steps', [17.7,37,9,12], [22,49], 'Concrete steps with weathered metal railings lead to the left apartment.'),
      middleSteps: item('middle concrete steps', [43.5,37,8.4,12], [47.5,49], 'A short flight of concrete steps leads to the middle apartment.'),
      steps: item('patio steps', [69,37,9,12], [74,49], 'Five concrete steps descend from the patio between black metal railings.')
    }
  },
  living: {
    name: 'Living room & kitchen', image: 'assets/lighting/living-master-v2.png', floor: [8, 95, 57, 94], obstacles: [[28, 64, 45, 30], [80, 55, 19, 31]],
    objects: {
      bedroomDoor: { ...door('bedroom door', [18.4,14.5,8.5,38], [29,60], 'bedroom', 'door'), hinge: 'right', swing: -1, destinationSwing: true },
      bathroomDoor: { ...door('bathroom door', [67.5,12.5,10.1,39.7], [72.5,61], 'bathroom', 'livingDoor'), panel: [68.6,14.1,8,37.5], appearance: 'glass', hinge: 'right' },
      exit: { ...door('apartment exit at the end of the hallway', [85.5,7,13.5,47], [91.5,55], 'outside', 'frontDoor'), portal: [91.7,39.6], panel: [88.3971,18.491,4.5455,20.085], hinge: 'right', swing: 1, description: 'A short recessed hallway leads to the front door and the concrete patio outside.' },
      tv: item('living room TV', [80.8,41.5,18,44], [77,80], 'The TV stands to the right of the couch, angled left toward the seating area.'),
      channelBox: item('channel switching box', [84.8,62.5,9,8], [77,75], 'The set-top box switches between three channels. Use it to change channel.'),
      couch: item('couch', [28,64,45,30], [76,80], 'The sagging couch sits in the middle of the room facing the TV.', 'You straighten the blanket and test a cushion.'),
      chair: item('armchair', [5.5,53,21,29], [27,84], 'An armchair with a well-established dent.', 'You pat the cushion. Still comfortable.'),
      bookshelf: item('bookshelf', [0,8,7,55], [10,68], 'Paperbacks, old photographs and mismatched ornaments.', 'You leaf through an old paperback.'),
      coffeeTable: item('coffee table', [40,59,20,13], [76,72], 'A mug, books and the TV remote sit between the couch and television.'),
      rug: item('rug', [14,59,77,35], [82,86], 'The faded rug makes this tired room feel warmer.'),
      fridge: item('fridge', [30.8,18,7.5,20], [39,59], 'Milk, leftovers and a suspicious jar live in the fridge.'),
      freezer: item('freezer', [30.8,38.5,7.5,15], [39,59], 'The freezer holds peas, ice and a forgotten pizza.'),
      stove: item('oven and stove', [39,35,7,18], [43,60], 'An old cooker, a kettle, and a few stubborn cooking stains.', 'You check the cooker knobs. All safely off.'),
      microwave: item('microwave', [58.5,20,6,6], [59,60], 'A microwave with a slightly sticky start button.', 'The microwave beeps. Nothing inside to heat.'),
      sink: item('kitchen sink', [51,31,7,7], [54,60], 'A sink beside a rack of drying dishes, with the cutting board stored behind it.'),
      counter: item('cooking area and drawers', [46,35,5,18], [49,60], 'Cooking utensils and drawers full of cutlery.', 'You put a spoon back in the drawer.'),
      toaster: { ...item('toaster', [45.3,30.2,4.2,7.5], [49,60], 'A compact two-slot toaster sits beside the stove.'), portableState: 'toasterTaken' },
      plant: item('living room plant', [6,36,4,10], [11,59], 'The apartment’s only plant droops slightly beside the bookshelf.'),
      coffee: item('coffee machine', [61,29,3.3,8], [62,60], 'The coffee machine looks like the hardest-working appliance here.'),
      keys: item('key hooks', [77.7,26.5,4,5], [78,56], 'Four keys hang on the shortened rack beside the bathroom door.'),
      entryDrawers: item('entryway drawers', [78.4,37,6,16], [78,56], 'A small chest holds post, spare batteries and takeaway menus.'),
      livingCurtains: { ...item('living room curtains', [37,0,26,8], [50,92], 'The living room window is in the wall behind you. Its curtains control the daylight entering the room.'), curtainRoom: 'living' },
      mainLightSwitch: { ...item('main light switch', [27.3,27.5,2.5,7], [29,60], 'The main light switch is logically placed beside the bedroom door.'), lightCircuit: 'livingMain' },
      kitchenLightSwitch: { ...item('kitchen bench light switch', [65.2,26.5,2.1,6.5], [64,60], 'The switch left of the bathroom door controls the under-cupboard bench lights.'), lightCircuit: 'kitchen' },
      hallwayLightSwitch: { ...item('hallway light switch', [82,26.5,2.2,6.5], [82,58], 'The switch immediately right of the key rack controls the hallway light.'), lightCircuit: 'hallway' }
    }
  },
  bathroom: {
    name: 'Bathroom', image: 'assets/bathroom_bg_reversed_master.png', floor: [23, 77, 65, 82],
    objects: {
      livingDoor: { ...door('living room door', [26.5,23.5,11,44], [32.5,77], 'living', 'bathroomDoor'), panel: [27.5,25.9,8.8,41.1], appearance: 'glass', hinge: 'left' },
      laundry: item('laundry basket', [36.8,52,5.8,16], [40,76], 'A woven laundry basket sits just inside the bathroom.'),
      towels: item('towel', [38.5,36,3.5,14], [40,76], 'A dark towel hangs between the entrance and the basin.'),
      sink: item('basin and storage cabinet', [41.9,45,10.8,23], [47,76], 'A ceramic basin has a roomy, worn wooden storage cabinet beneath it.'),
      mirror: item('bathroom mirror', [43.2,24,8.3,22], [47,76], 'The old mirror hangs directly above the basin. Short hair, a little stubble, and a very early morning.'),
      toilet: item('toilet', [53.8,45,7.7,23], [58,76], 'The toilet sits between the vanity and the bath.', 'You flush the toilet.'),
      picture: item('framed city picture', [53,28,7,14], [58,76], 'A small faded city picture hangs above the toilet.'),
      bath: item('bath and shower', [62.5,18,15.5,60], [62,76], 'A tiled bathtub and shower fill the right end of the room behind a dark curtain.', 'You straighten the shower curtain.'),
      bathMat: item('bath mat', [40.5,66,16,10], [49,78], 'A dark bath mat lies on the old tiled floor.'),
      bathroomCurtains: { ...item('bathroom curtains', [39,0,22,11], [50,82], 'The unseen front-wall window is reflected in the mirror. Its curtains can be opened for daylight.'), curtainRoom: 'bathroom' },
      mainLightSwitch: { ...item('bathroom light switch', [37.4,35,2,6.5], [40,76], 'The bathroom main-light switch is set low on the wall just inside the door.'), lightCircuit: 'bathroomMain' }
    }
  }
};
