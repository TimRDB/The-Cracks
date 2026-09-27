// Artwork-aligned hit areas, floor bounds and reciprocal doorway connections.
const item = (name, area, walk, description, response) => ({ name, area, walk, description, response });
const door = (name, area, walk, to, entry) => ({ name, area, walk, to, entry, description: `The ${name}.`, portal: [area[0] + area[2] / 2, area[1] + area[3]] });
// Traced outline of the living-room TV, its stand and the cabinet it sits on.
const livingTvSilhouette = [[84.1,41.25],[84.07,41.33],[84.07,56.73],[83.49,56.76],[83.2,56.87],[82.74,56.89],[82.6,56.97],[82.29,56.97],[81.89,57.08],[81.15,57.16],[80.96,57.24],[80.87,57.4],[80.88,58.25],[81.11,58.54],[81.12,73.07],[81.26,73.29],[81.36,73.31],[81.45,73.26],[81.51,73.13],[81.51,72.38],[81.56,72.38],[86.73,77.88],[91.51,83.41],[91.56,83.41],[91.57,85.35],[91.65,85.51],[91.84,85.67],[92.25,86.15],[92.56,86.17],[92.7,86.07],[92.92,86.07],[93.08,85.96],[93.16,85.85],[93.17,83.97],[93.22,83.86],[93.4,83.83],[93.53,83.73],[93.76,83.73],[93.89,83.62],[94.12,83.59],[94.19,83.51],[94.48,83.51],[94.61,83.41],[94.95,83.41],[95.09,83.3],[95.28,83.3],[95.42,83.41],[95.61,83.44],[95.97,84.02],[96.54,84.05],[97.09,84.66],[97.53,84.68],[97.66,84.58],[97.93,84.58],[98.02,84.52],[98.14,84.29],[98.14,82.93],[98.3,82.9],[98.32,82.37],[98.32,67.07],[98.5,66.83],[98.6,66.75],[98.68,66.59],[98.68,65.66],[98.56,65.42],[97.96,65],[97.47,64.55],[97.36,64.52],[97.21,64.33],[96.94,64.2],[96.75,64.01],[96.64,63.99],[96.33,63.7],[96.22,63.67],[95.97,63.43],[95.21,62.93],[95.09,62.79],[95.09,45.44],[94.33,45.1],[93.94,44.99],[84.97,41.35],[84.37,41.14]];
const apartmentRooms = {
  outside: {
    name: 'Apartment forecourt', image: 'assets/outside_bg.png', floor: [5, 96, 36, 96],
    objects: {
      frontDoor: { ...door('front door', [70.2,17.4,5,18.7], [73,37.4], 'living', 'exit'), hinge: 'left', swing: 1, description: 'The front door opens inward into the apartment.' },
      neighbourLeft: { ...item('left apartment door', [21,17.3,5,19], [23.5,37.4], 'A dark green front door with scuffed paint around the handle.'), locked: true, lockedResponse: 'The door is locked.' },
      neighbourMiddle: { ...item('middle apartment door', [45.6,17.4,5,19], [48,37.4], 'A burgundy front door sits slightly loose in its frame.'), locked: true, lockedResponse: "You think it's open, but have no desire to barge in." },
      blueCar: { ...item('blue hatchback', [75.5,56,22,30], [87,92], 'A blue Lonza Experience hatchback. Rain beads on its windows. The doors are locked.'), locked: true },
      burgundyCar: { ...item('burgundy sedan', [2,56,21,30], [13,92], 'A burgundy Arven Vale sedan, with faded paint around the boot. Its doors are locked.'), locked: true },
      silverCar: { ...item('silver estate', [52,56,18,30], [61,92], 'A silver Veyra Solis estate. A folded blanket sits behind the rear seats. The doors are locked.'), locked: true },
      emptyBay: { ...item('empty parking space', [25,65,23,24], [36,80], 'One of the four marked parking spaces is empty.'), floor: true },
      smallTree: item('young tree', [0,9,10,49], [8,55], 'A young tree, supported by wooden stakes, stands beside the curbside lawn.'),
      largeTree: item('mature tree', [94,2,6,51], [94,55], 'A mature tree spreads its branches over the forecourt.'),
      lawn: { ...item('curbside lawn', [53,48,15,5], [60,55], 'A narrow lawn separates the raised patios from the parking spaces.'), floor: true },
      leftSteps: item('left concrete steps', [17.7,37,9,12], [22,49], 'Concrete steps with weathered metal railings lead to the left apartment.'),
      middleSteps: item('middle concrete steps', [43.5,37,8.4,12], [47.5,49], 'A short flight of concrete steps leads to the middle apartment.'),
      steps: item('patio steps', [69,37,9,12], [74,49], 'Five concrete steps descend from the patio between black metal railings.')
    }
  },
  living: {
    name: 'Living room & kitchen', image: 'assets/lighting/living-master-v2.png', floor: [8, 98.6, 39.8, 94],
    // The floor runs up the recessed hallway to the front door and behind the
    // TV cabinet, out to the cabinet's right edge.
    walkArea: [[8,57],[85.8,57],[85.8,52],[86.3,46],[88,39.8],[93.4,39.8],[95.2,46],[96.8,50.5],[98.6,55],[98.6,94],[8,94]],
    // The couch, and the TV cabinet's angled floor footprint.
    obstacles: [[28, 64, 45, 30], [[80.4,72.4],[87.6,68.8],[99,83.3],[92.4,85.9]]],
    // Drawn over the player whenever they stand behind the cabinet's front ground line.
    tvOccluder: {
      silhouette: livingTvSilhouette,
      groundLine: [[80.4,72.4],[92.4,85.9],[99,83.3]]
    },
    objects: {
      bedroomDoor: { ...door('bedroom door', [18.4,14.5,8.5,38], [29,60], 'bedroom', 'door'), description: 'A painted interior door leading back into the bedroom.', hinge: 'right', swing: -1, destinationSwing: true },
      bathroomDoor: { ...door('bathroom door', [67.5,12.5,10.1,39.7], [72.5,61], 'bathroom', 'livingDoor'), description: 'A two-panel frosted-glass door leading into the bathroom.', panel: [68.6,14.1,8,37.5], appearance: 'glass', hinge: 'right' },
      exit: { ...door('apartment exit at the end of the hallway', [87.8,16.5,6.3,23], [91.2,42], 'outside', 'frontDoor'), portal: [91.7,39.6], panel: [88.3971,18.491,4.5455,20.085], hinge: 'right', swing: 1, description: 'A short recessed hallway leads to the front door and the concrete patio outside.' },
      tv: { ...item('living room TV', [80.7,41,17.9,45.1], [77,80], 'The TV stands to the right of the couch, angled left toward the seating area.'), shape: livingTvSilhouette },
      channelBox: item('channel switching box', [84.8,62.5,9,8], [77,75], 'The set-top box switches between three channels. Use it to change channel.'),
      couch: item('couch', [28,64,45,30], [76,80], 'The sagging couch sits in the middle of the room facing the TV.', 'You straighten the blanket and test a cushion.'),
      chair: item('armchair', [5.5,53,21,29], [27,84], 'An armchair with a well-established dent.', 'You pat the cushion. Still comfortable.'),
      bookshelf: item('bookshelf', [0,8,7,55], [10,68], 'Paperbacks, old photographs and mismatched ornaments.', 'You leaf through an old paperback.'),
      coffeeTable: item('coffee table', [40,59,20,13], [76,72], 'A mug, two books and the TV remote crowd the low table between the couch and television.', 'You straighten the books and leave the remote where it is.'),
      rug: { ...item('rug', [14,59,77,35], [82,86], 'The faded rug makes this tired room feel warmer.'), floor: true },
      fridge: item('fridge', [30.8,18,7.5,20], [39,59], 'Milk, leftovers and a suspicious jar live in the fridge.', 'You open the fridge, feel the cold air, then close it again.'),
      freezer: item('freezer', [30.8,38.5,7.5,15], [39,59], 'The freezer holds peas, ice and a forgotten pizza.', 'You check the freezer. The forgotten pizza is still there.'),
      stove: item('oven and stove', [39,35,7,18], [43,60], 'An old cooker, a kettle, and a few stubborn cooking stains.', 'You check the cooker knobs. All safely off.'),
      microwave: item('microwave', [58.5,20,6,6], [59,60], 'A microwave with a slightly sticky start button.', 'The microwave beeps. Nothing inside to heat.'),
      sink: item('kitchen sink', [51,31,7,7], [54,60], 'A sink beside a rack of drying dishes, with the cutting board stored behind it.'),
      counter: item('cooking area and drawers', [46,35,5,18], [49,60], 'Cooking utensils and drawers full of cutlery.', 'You put a spoon back in the drawer.'),
      toaster: { ...item('bench', [45.3,30.2,4.2,7.5], [49,60], 'A compact two-slot toaster sits on this short section of kitchen bench beside the stove.'), portableState: 'toasterTaken' },
      plant: item('living room plant', [6,36,4,10], [11,59], 'The apartment’s only plant droops slightly beside the bookshelf.'),
      coffee: item('coffee machine', [61,29,3.3,8], [62,60], 'The coffee machine looks like the hardest-working appliance here.'),
      keys: item('key hooks', [77.7,26.5,4,5], [78,56], 'Your apartment keys hang from the shortened rack beside the bathroom door.'),
      entryDrawers: item('entryway drawers', [78.4,37,6,16], [78,56], 'A small chest holds post, spare batteries and takeaway menus.', 'You check the top drawer and push it closed again.'),
      livingCurtains: { ...item('living room curtains', [37,0,26,8], [50,92], 'The living room window is in the wall behind you. Its curtains control the daylight entering the room.'), curtainRoom: 'living' },
      mainLightSwitch: { ...item('main light switch', [27.3,27.5,2.5,7], [29,60], 'A plain wall switch beside the bedroom door controls the living-room ceiling light.'), lightCircuit: 'livingMain' },
      kitchenLightSwitch: { ...item('kitchen bench light switch', [65.2,26.5,2.1,6.5], [64,60], 'The switch left of the bathroom door controls the under-cupboard bench lights.'), lightCircuit: 'kitchen' },
      hallwayLightSwitch: { ...item('hallway light switch', [82,26.5,2.2,6.5], [82,58], 'A small switch beside the key rack controls the recessed hallway light.'), lightCircuit: 'hallway' }
    }
  },
  bathroom: {
    name: 'Bathroom', image: 'assets/bathroom_bg_reversed_master.png', floor: [23, 77, 65, 82],
    objects: {
      livingDoor: { ...door('living room door', [26.5,23.5,11,44], [32.5,77], 'living', 'bathroomDoor'), description: 'The frosted-glass door leads back to the living room and kitchen.', panel: [27.5,25.9,8.8,41.1], appearance: 'glass', hinge: 'left' },
      laundry: item('laundry basket', [36.8,52,5.8,16], [40,76], 'A woven laundry basket sits just inside the bathroom.'),
      towels: item('towel', [38.5,36,3.5,14], [40,76], 'A dark towel hangs between the entrance and the basin.'),
      sink: item('basin and storage cabinet', [41.9,45,10.8,23], [47,76], 'A ceramic basin has a roomy, worn wooden storage cabinet beneath it.'),
      mirror: item('bathroom mirror', [43.2,24,8.3,22], [47,76], 'The old mirror hangs directly above the basin. Short hair, a little stubble, and a very early morning.'),
      toilet: item('toilet', [53.8,45,7.7,23], [58,76], 'The toilet sits between the vanity and the bath.', 'You flush the toilet.'),
      picture: item('framed city picture', [53,28,7,14], [58,76], 'A small faded city picture hangs above the toilet.'),
      bath: item('bath and shower', [62.5,18,15.5,60], [62,76], 'A tiled bathtub and shower fill the right end of the room behind a dark curtain.', 'You straighten the shower curtain.'),
      bathMat: { ...item('bath mat', [40.5,66,16,10], [49,78], 'A dark bath mat lies on the old tiled floor.'), floor: true },
      bathroomCurtains: { ...item('bathroom curtains', [39,0,22,11], [50,82], 'The unseen front-wall window is reflected in the mirror. Its curtains can be opened for daylight.'), curtainRoom: 'bathroom' },
      mainLightSwitch: { ...item('bathroom light switch', [37.4,35,2,6.5], [40,76], 'The bathroom main-light switch is set low on the wall just inside the door.'), lightCircuit: 'bathroomMain' }
    }
  }
};
