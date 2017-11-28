module.exports = {
    MemoryKey: {
        [LOOK_CONSTRUCTION_SITES]: 'cId',
        [LOOK_SOURCES]: 'sId'
    },
    RoomLevel: {
        0: { spawnRange: 10 },
        1: { spawnRange: 10 },
        2: { spawnRange: 10, extensionRange: 5 },
        3: { spawnRange: 10, extensionRange: 5,  towerRange: 5 },
        4: { spawnRange: 10, extensionRange: 8, towerRange: 5 },
        5: { spawnRange: 10, extensionRange: 8, towerRange: 5 },
        6: { spawnRange: 10, extensionRange: 11, towerRange: 5 },
        7: { spawnRange: 10, extensionRange: 11, towerRange: 5 },
        8: { spawnRange: 10, extensionRange: 11, towerRange: 15 }
        // TODO build towers by entrances
    }
}