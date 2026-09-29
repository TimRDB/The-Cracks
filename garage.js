// Workplace parking garage. The scene is currently reached through Developer
// Tools; its elevator ride resets locally until the destination floor exists.
apartmentRooms.garage = {
  name: 'Workplace parking garage',
  image: 'assets/used/workplace-garage-bg-v3.png',
  floor: [4, 96, 36, 78],
  // A broad driving aisle with a short recess into the elevator doorway.
  walkArea: [[4,43],[9.5,43],[9.5,36],[17.2,36],[17.2,42],[20,43],[96,43],[96,78],[4,78]],
  objects: {
    elevator: {
      ...item('elevator doors', [8.6,15.2,10,26], [13.6,43], 'Closed brushed-metal elevator doors lead up into the workplace.'),
      interactions: {
        use: 'The doors have no handle. The call button is beside them.',
        talk: "You don't feel like talking to the elevator doors."
      }
    },
    elevatorCall: {
      ...item('elevator call button', [18.65,25.1,1.65,7.2], [20.4,44], 'A worn metal call button sits to the right of the elevator.'),
      garageCall: true
    },
    directionIndicators: item('elevator direction indicators', [11.7,12.8,4.1,3.2], [13.6,43], 'Separate up and down indicators sit above the elevator. Both are dark.'),
    blueCar: {
      ...item('blue Lonza Experience', [79,22.4,19.2,23.8], [79.2,46], 'Your blue Lonza Experience waits in bay seventeen. There is enough room beside the driver’s door to get in without squeezing.'),
      interactions: { use: 'You check the driver’s door, then leave the car where it is for now.' }
    },
    darkCar: item('dark estate car', [29.3,22.4,14.5,22], [36.5,45], 'A dark estate car occupies bay fourteen, backed hard against the wall.'),
    silverCar: item('silver sedan', [45.9,23.6,12.3,20.6], [52,45], 'A silver sedan sits squarely between the lines in bay fifteen.'),
    emptyBay: { ...item('empty parking space', [58,28,13.2,17], [64.5,46], 'Bay sixteen is empty. A dark tyre mark curves across the concrete.'), floor: true },
    foregroundLeftCar: item('left foreground car', [0,49,22,51], [23,70], 'A dark car fills the nearest bay on the left, its side windows reflecting the strip lights.'),
    foregroundRightCar: item('right foreground car', [75,56,25,44], [73,70], 'A burgundy car occupies the nearest bay on the right and narrows the view into the aisle.'),
    leftPillar: item('left concrete pillar', [23.5,5.5,4.8,39], [29,45], 'A square concrete pillar carries the low roof. Its corners are scarred above the warning stripes.'),
    rightPillar: item('right concrete pillar', [71.8,4.5,4.8,40], [70,45], 'Another heavy pillar divides the empty bay from your car. Old scrapes mark its base.'),
    safetyPoster: item('faded safety poster', [2.7,16.5,4.6,14], [8,44], 'A faded safety poster tries to make the basement feel like part of a workplace.'),
    employeeParkingSign: item('employee parking sign', [61.5,17.2,4.2,9.5], [63.5,45], 'A worn sign reserves these bays for employees. The rule seems to enforce itself.'),
    fireExtinguisher: item('fire extinguisher', [24.5,24.8,2.2,11.4], [27.4,44], 'A red fire extinguisher hangs from the first pillar, inspected recently enough to still have a tag.'),
    sprinklers: item('sprinkler system', [0,0,100,12.5], [50,45], 'Red sprinkler pipes run beneath the concrete roof between the fluorescent fittings.'),
    securityCamera: item('surveillance camera', [70.3,0.8,5.2,7.2], [72.5,45], 'An opaque black dome camera watches the garage. A tiny status light flashes only occasionally.'),
    drain: { ...item('floor drain', [78.5,49.5,9.5,4.2], [82,55], 'A grated drain catches a thin run of dirty water from the parking bays.'), floor: true }
  }
};

const garageElevator = document.getElementById('garage-elevator');
const garageFade = document.getElementById('scene-fade');
let garageSequenceActive = false;
let garageSequenceTimers = [];

function garageSchedule(callback, delay) {
  const timer = gameTimers.schedule(callback, delay);
  garageSequenceTimers.push(timer);
  return timer;
}

function clearGarageVisuals() {
  garageElevator.classList.remove('is-called', 'is-open', 'is-closing');
  garageFade.style.transition = '';
  garageFade.style.opacity = '0';
  player.style.opacity = '1';
  scene.removeAttribute?.('aria-busy');
}

function cancelGarageElevatorRide() {
  garageSequenceTimers.forEach(timer => gameTimers.clear(timer));
  garageSequenceTimers = [];
  garageSequenceActive = false;
  clearGarageVisuals();
}

function syncGarageScene() {
  if (!garageSequenceActive) clearGarageVisuals();
}

function finishGarageElevatorRide() {
  Object.assign(movement, { x: 20.4, y: 44, facing: 'left', phase: 0 });
  garageElevator.classList.remove('is-called', 'is-open', 'is-closing');
  player.style.opacity = '1';
  renderPlayer();
  garageFade.style.transition = 'opacity .65s ease-out';
  garageFade.style.opacity = '0';
  garageSchedule(() => {
    garageSequenceActive = false;
    garageSequenceTimers = [];
    garageFade.style.transition = '';
    scene.removeAttribute?.('aria-busy');
    showMessage('The elevator returns you to the garage for now. The workplace floor has not been built yet.');
    updateStatus();
  }, 680);
}

function beginGarageElevatorRide() {
  if (garageSequenceActive || gameState.currentRoom !== 'garage') return;
  garageSequenceActive = true;
  stopWalking();
  scene.setAttribute('aria-busy', 'true');
  showMessage('You press the elevator call button. Somewhere above, machinery starts moving.');
  garageSchedule(() => garageElevator.classList.add('is-called'), 650);
  garageSchedule(() => {
    garageElevator.classList.add('is-open');
    showMessage('The up indicator lights and the metal doors slide apart.');
  }, 1200);
  garageSchedule(() => {
    movePlayerTo(13.6, 37.2, () => {
      movement.facing = 'up';
      renderPlayer();
      garageSchedule(() => {
        garageElevator.classList.remove('is-open');
        garageElevator.classList.add('is-closing');
      }, 220);
      garageSchedule(() => {
        player.style.opacity = '0';
        showMessage('The doors close, and the lift begins to rise.');
      }, 980);
      garageSchedule(() => garageElevator.classList.remove('is-called'), 1080);
      garageSchedule(() => {
        garageFade.style.transition = 'opacity .55s ease-in';
        garageFade.style.opacity = '1';
      }, 1420);
      garageSchedule(finishGarageElevatorRide, 2050);
    });
  }, 1950);
}

function handleGarageTarget(target, object, verb) {
  if (gameState.currentRoom !== 'garage') return false;
  if (object?.garageCall) {
    if (verb === 'look' || verb === 'walk') showMessage(object.description);
    else if (verb === 'use') beginGarageElevatorRide();
    else showMessage(interactionReply(target, object, verb));
    return true;
  }
  return false;
}