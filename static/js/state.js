export const OriaState = {
    level: 1,
    xp: 0,
    coins: 0,
    quests: [],
    daily_quests: [],
    owned_skins: ["default"],
    equipped_skin: "default"
};

export const storeItems = [
    { id: 'default', name: 'Original', cost: 0, image: '/static/img/IMG_8442.PNG' },
    { id: 'skin_1', name: 'Variant Alpha', cost: 100, image: '/static/img/skins/IMG_8473.PNG' },
    { id: 'skin_2', name: 'Variant Beta', cost: 100, image: '/static/img/skins/IMG_8474.PNG' },
    { id: 'skin_3', name: 'Variant Gamma', cost: 100, image: '/static/img/skins/IMG_8475.PNG' },
    { id: 'skin_4', name: 'Variant Delta', cost: 100, image: '/static/img/skins/IMG_8476.PNG' },
    { id: 'skin_5', name: 'Variant Epsilon', cost: 100, image: '/static/img/skins/IMG_8477.PNG' },
    { id: 'skin_6', name: 'Variant Zeta', cost: 100, image: '/static/img/skins/IMG_8478.PNG' }
];

export function setState(newState) {
    Object.assign(OriaState, newState);
}
