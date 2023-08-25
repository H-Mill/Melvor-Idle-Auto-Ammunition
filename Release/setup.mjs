const constant = {
    modTitle: 'Auto Ammo Mod',
    verson: 1.1
};
const { modTitle } = constant;
const ctx = mod.getContext(import.meta);
let ammoData;
let swapType = null;

function log (msg) {
    console.log(`[${modTitle}]: ${msg}`);
}

async function populateAmmoData(loadData){
    ammoData = await loadData('src/ammoData.json');
    ammoData = new Map(Object.entries(ammoData));
    for(let i = 0; i < ammoData.size; i++){
        let ammoDataType = ammoData.get(i+'');
        for(let j = 0; j < ammoDataType.length; j++){
            let item = game.items.getObjectByID(ammoDataType[j+'']);
            ammoDataType[j] = item;
        }
        ammoData.set(i+'', ammoDataType);
    }
}

function setSwapType(typeValue) {
    swapType = typeValue + '';
}

function getSwapType() {
    return swapType;
}

function shouldAutoEquip() {
    return swapType !== null;
}

function resetSwapType() {
    swapType = null;
}

function getAmmoType(){
    const equipmentSlots = game.combat.player.equipment.slots;
    return equipmentSlots.Quiver.item.ammoType 
        ?? equipmentSlots.Weapon.item.ammoTypeRequired
        ?? getSwapType();
}

function isRangedAttack() {
    const weapon = game.combat.player.equipment.slots.Weapon;
    return weapon.item.attackType === 'ranged';
}

function autoEquipAmmo() {
    if(!isRangedAttack())
        return;
        
    if(!shouldAutoEquip())
        return;

    const ammoType = getAmmoType();
    const ammoChoices = ammoData.get(ammoType+'')
        .filter(c => c.equipRequirements !== null 
             && c.equipRequirements !== undefined 
             && c.equipRequirements.find(r => r.level <= game.ranged.level));

    for(let i = 0; i < ammoChoices.length; i++){
        const ammoChoice = ammoChoices[i];
        if(game.bank.hasItem(ammoChoice)){
            const ownedQty = game.bank.getQty(ammoChoice);
            game.combat.player.equipItem(ammoChoice, game.combat.player.selectedEquipmentSet, 'Default', ownedQty);
            break;
        }
    }

    resetSwapType();
}

export async function setup({ loadData }) {
    populateAmmoData(loadData);

    ctx.patch(Character, 'initializeForCombat').after(function() {
        if(!isRangedAttack())
            return;

        const weapon = game.combat.player.equipment.slots.Weapon;
        const quiver = game.combat.player.equipment.slots.Quiver;
        if(weapon.item.ammoTypeRequired !== 0 && quiver.quantity >= 1
            || weapon.item.ammoTypeRequired !== 1 && quiver.quantity >= 1)
            return;

        setSwapType(getAmmoType());
        autoEquipAmmo();
    });

    ctx.patch(Player, 'attack').before(function() {
        if(!isRangedAttack())
                return;

        const autoAmmoPurchased = [...game.shop.upgradesPurchased.keys()]
            .some(p => p._localID === 'hm_auto_ammo_upgrade');
        if(!autoAmmoPurchased)
            return;

        const quiver = game.combat.player.equipment.slots.Quiver;
        if(quiver.quantity > 1)
            return;

        setSwapType(getAmmoType());
    });

    ctx.patch(Player, 'attack').after(function() {
        if(!isRangedAttack())
            return;
        autoEquipAmmo();
    });
    log('loaded!');
}

