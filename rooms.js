// Artwork-aligned hit areas, floor bounds and reciprocal doorway connections.
const item = (name, area, walk, description, response) => ({ name, area, walk, description, response });
const door = (name, area, walk, to, entry) => ({ name, area, walk, to, entry, description: `The ${name}.`, portal: [area[0] + area[2] / 2, area[1] + area[3]] });
const apartmentRooms = {
  living: {
    name: 'Living room & kitchen', image: 'assets/living_bg.png', floor: [8, 95, 57, 94], obstacles: [[28, 64, 45, 30], [80, 55, 19, 31]],
    objects: {
      bedroomDoor: { ...door('bedroom door', [18.4,14.5,8.5,38], [29,60], 'bedroom', 'door'), hinge: 'right' },
      bathroomDoor: { ...door('bathroom door', [67.5,12.5,10.1,39.7], [72.5,61], 'bathroom', 'livingDoor'), panel: [68.6,14.1,8,37.5], appearance: 'glass', hinge: 'right' },
      exit: { ...door('apartment exit', [87,14.5,9.3,37], [91,54]), hinge: 'left', description: 'The apartment exit. The corridor beyond is quiet.' },
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
      sink: item('kitchen sink', [51,31,7,7], [54,60], 'A sink beside a rack of drying dishes.'),
      counter: item('cooking area and drawers', [46,35,5,18], [49,60], 'A chopping board, cooking utensils and drawers full of cutlery.', 'You tidy the board and put a spoon in the drawer.'),
      plant: item('living room plant', [6,36,4,10], [11,59], 'The apartment’s only plant droops slightly beside the bookshelf.'),
      coffee: item('coffee machine', [61,29,3.3,8], [62,60], 'The coffee machine looks like the hardest-working appliance here.'),
      keys: item('key hooks', [79,26.5,4.7,5], [78,56], 'Keys hang on hooks beside the apartment exit.'),
      entryDrawers: item('entryway drawers', [78.4,37,6,16], [78,56], 'A small chest holds post, spare batteries and takeaway menus.')
    }
  },
  bathroom: {
    name: 'Bathroom', image: 'assets/bathroom_bg.png', floor: [23, 77, 65, 82],
    objects: {
      livingDoor: { ...door('living room door', [62.5,23.5,11,44], [67.5,77], 'living', 'bathroomDoor'), panel: [63.7,25.9,8.8,41.1], appearance: 'glass', hinge: 'left' },
      bath: item('bath and shower', [22,18,15.5,60], [38,76], 'A compact bathtub, shower and lightly worn curtain.', 'You straighten the shower curtain.'),
      toilet: item('toilet', [38.5,45,7.7,23], [47,76], 'A small toilet on the left side of the bathroom.', 'You flush the toilet.'),
      sink: item('basin and cupboard', [47.3,45,10.8,23], [54,76], 'A washbasin with a worn wooden cupboard beneath it.'),
      mirror: item('mirrored medicine cabinet', [48.5,24,8.3,22], [54,76], 'A mirrored medicine cabinet above the basin. Short hair, a little stubble, and a very early morning.'),
      laundry: item('laundry basket', [57.4,52,5.8,16], [60,76], 'The laundry basket is almost full.'),
      towels: item('towel', [58,36,3.5,14], [60,76], 'A dark towel hangs beside the mirrored cabinet.'),
      bathMat: item('bath mat', [43.5,66,16,10], [51,78], 'A dark bath mat lies on the worn white linoleum floor.')
    }
  }
};
