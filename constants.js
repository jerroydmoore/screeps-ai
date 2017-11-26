module.exports = {
    MemoryKey: {
        [LOOK_CONSTRUCTION_SITES]: 'cId',
        [LOOK_SOURCES]: 'sId'
    },
    RoomLevel: {
        0: {},
        1: {},
        2: { extensionRange: 5, },
        3: { extensionRange: 5,  towerRange: 5 },
        4: { extensionRange: 8, towerRange: 5 },
        5: { extensionRange: 8, towerRange: 5 },
        6: { extensionRange: 11, towerRange: 5 },
        7: { extensionRange: 11, towerRange: 5 },
        8: { extensionRange: 11, towerRange: 10 }, // TODO build towers by entrances
    }
}