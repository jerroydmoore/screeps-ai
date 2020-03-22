Yet Another Screeps AI
=======================

This AI will quickly upgrade the controller level to 2. At which point, it will laydown a network a roads, and build extensions near the sources. When the controller level upgrades, it will check if it can build towers and more extensions. As the room's energy capacity increases, creepers spawned will become more powerful, maxing out at 700 energies (for now).

It also has limited capability to scout out other rooms, and can very soon claim another room.

## Development
If you're running Screeps on MacOS, Screep's deployment directories in `Gruntfile.js` is already set correctly. Otherwise, you'll have to update them before the deploy commands will work.

```
npm install
npm run deploy:local
```

On MacOS, Screeps's deployment directories should be set to `/Users/$USER/Library/Application Support/Screeps/scripts/$SERVER/default` where `$SERVER` is either `screeps.com` or `127_0_0_1___21025` for localhost.

### Useful Commands

* `npm run lint` for linting
* `npm run deploy:local` to copy `./src` into the localhost screeps instance.
* `npm run deploy:server` to copy `./src` into the screeps.com's local cache directory on the file system

## AI Strategy

The AI employs a number of strategies to achieve both room objectives and game objectives.

### Room Objective 1: Spawning in a New Room

The following directives are set in order build an extensive Road network, build Extensions, and build Containers.

1. Start spawning creeps to be self-sufficient.
2. Queue up road construction orders to make way for larger and slower creeps.
3. Build Containers by the Sources.
4. Upgrade the Controller in order to build Extensions.
5. Build Extensions.

### Room Objective 2: Establish Regular Colony Behavior

The following directives are added in order to establish regular coloney behavior and build a Tower.

1. Spawn Miners, that do nothing be harvest Sources and transfer energies to nearby Containers and Storage structures.
2. All other creeps will try to get energy from these containers and storage structures.
3. If a container becomes full, build another container next to it. (?)
4. Continue to upgrade the Controller.
5. Build towers near Sources and then Controllers.

### Room Objective 3: Defense

The following directives are added in order to establish defense:

1. Builder creeps no longer repair. Towers repair.
2. Find each exit and build walls and ramparts around it
3. Spawn defenders when enemies enter the room.

### Room Objective 4: Mature Room Behavior

The following directive are added once the controller reaches level eight:

1. Minimize unneeded Creeps (?)

### Game Objective 1: Expansion Into Other Rooms

This game objective should be triggered when a room has two towers.

1. Send Scouts to discover other rooms, avoiding enemy rooms. Periodically recheck the room to see if other players have laid claim.
2. Spawned Settlers will go two rooms away to reserve a room with two Sources and a Controller. Sending a defender and two harvesters along the way.

### Game Objective 2: Aggressive Expansion

This game objective should be triggered when there are no more unexplored safe rooms.

1. Build an army and send it to a room at the top of the desirable room queue that has an enemy.