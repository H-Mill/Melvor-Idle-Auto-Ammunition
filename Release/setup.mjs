const constant = {
	modTitle: "Auto Ammo Mod",
	verson: 1.4,
	modEnabledId: "mod-enabled",
	enableArrowSwapId: "enable-arrow-swap",
	enableBoltSwapId: "enable-bolt-swap",
	enableKnifeSwapId: "enable-knife-swap",
	enableJavelinSwapId: "enable-javelin-swap",
	ammoTypeMap: {
		arrow: "0",
		bolt: "1",
		javelin: "2",
		knife: "3",
	},
};
const { modTitle } = constant;
const ctx = mod.getContext(import.meta);
let ammoData;
let swapType = null;
let combatMenuIcon = null;

export async function setup({ loadData, onInterfaceReady }) {
	setupSettings();
	try {
		populateAmmoData(loadData);
	} catch (e) {
		log(`issue loading ammo data: ${e}`);
	}
	ctx.patch(Character, "initializeForCombat").after(onInitializeForCombat);
	ctx.patch(Player, "attack").before(onBeforeAttack);
	ctx.patch(Player, "attack").after(onAfterAttack);

	onInterfaceReady(() => {
		const getColoredHtml = (text, success = false, successModifier = 'Enabled', failureModifier = 'Disabled') => `<p class="text-${success ? 'success' : 'danger'}">${text}: ${success ? successModifier : failureModifier}</p>`;
		let iconUrl = ctx.getResourceUrl('assets/ammo-pouch.png');
		let purchasedElement = document.createElement('img');
		purchasedElement.id = 'combat-menu-item-auto-ammo';
		purchasedElement.src = iconUrl;
		purchasedElement.className = 'combat-equip-img border-rounded-equip p-1 m-1 pointer-enabled'
		purchasedElement.onclick = () => {
			const _isModEnabled = isModEnabled();
			const _isAutoAmmoPurchased = isAutoAmmoPurchased();
			const _shouldAutoSwapArrows = shouldAutoSwapArrows();
			const _shouldAutoSwapBolts = shouldAutoSwapBolts();
			const _shouldAutoSwapKnives = shouldAutoSwapKnives();
			const _shouldAutoSwapJavelins = shouldAutoSwapJavelins();
			Swal.fire({
				title: 'Auto Ammunition',
				icon: iconUrl,
				html: `<p>${getColoredHtml('Mod', _isModEnabled)}</p>`
					+ `<p>${getColoredHtml('Upgrade', _isAutoAmmoPurchased, 'Purchased', 'Not Purchased')}</p>`
					+ `<p>${getColoredHtml('Auto Arrows', _shouldAutoSwapArrows)}</p>`
					+ `<p>${getColoredHtml('Auto Bolts', _shouldAutoSwapBolts)}</p>`
					+ `<p>${getColoredHtml('Auto Knives', _shouldAutoSwapKnives)}</p>`
					+ `<p>${getColoredHtml('Auto Javelins', _shouldAutoSwapJavelins)}</p>`,
				showCloseButton: true
			});
		}
	
		const combatMenuItems = document.querySelectorAll('[id^=combat-menu-item-]');
		const lastMenuItem = combatMenuItems[combatMenuItems.length-1];
		lastMenuItem.after(purchasedElement);
		combatMenuIcon = purchasedElement;
		tippy(purchasedElement, {
			content: 'Auto Ammunition',
			placement: 'bottom',
			interactive: false,
			animation: false,
		});
    });
	log("loaded!");
}

function setupSettings() {
	const {
		modEnabledId,
		enableArrowSwapId,
		enableBoltSwapId,
		enableKnifeSwapId,
		enableJavelinSwapId,
	} = constant;
	const generalSection = ctx.settings.section("General");
	generalSection.add({
		type: "switch",
		name: modEnabledId,
		label: "Enable Mod",
		hint: "Enable mod functionality.",
		default: true,
	});

	generalSection.add({
		type: "switch",
		name: enableArrowSwapId,
		label: "Auto Arrows",
		hint: "Automatically equip arrows during combat when a bow is equipped.",
		default: true,
	});

	generalSection.add({
		type: "switch",
		name: enableBoltSwapId,
		label: "Auto Bolts",
		hint: "Automatically equip bolts during combat when a crossbow is equipped.",
		default: true,
	});

	generalSection.add({
		type: "switch",
		name: enableKnifeSwapId,
		label: "Auto Knives",
		hint: "Automatically equip knives during combat when knives are equipped (knives must be manually equipped at the start!).",
		default: true,
	});

	generalSection.add({
		type: "switch",
		name: enableJavelinSwapId,
		label: "Auto Javelins",
		hint: "Automatically equip javelins during combat when javelins are equipped (javelins must be manually equipped at the start!).",
		default: true,
	});
}

function onInitializeForCombat() {
	try {
		if (!isModEnabled()) return;
		if (!isAutoAmmoPurchased()) return;
		if (!isRangedAttack()) return;
		if (!settingShouldAutoSwap()) return;
		if (!shouldEquipAmmoOnInitializeCombat()) return;

		setSwapType(getAmmoType());
		autoEquipAmmo();
	} catch (e) {
		error(`issue during initializeForCombat: ${e}`);
	}
}

function shouldEquipAmmoOnInitializeCombat() {
	const quiver = game.combat.player.equipment.slots.Quiver;
	const ammoType = getAmmoType();
	const { arrow, bolt, javelin, knife } = constant.ammoTypeMap;
	if (ammoType === javelin) return false;
	if (ammoType === knife) return false;

	if (ammoType === arrow) {
		if(equippedAmmoMatchesType(arrow))
			return quiver.quantity === 0;
		return true;
	}
	else if (ammoType === bolt){
		if(equippedAmmoMatchesType(bolt))
			return quiver.quantity === 0;
		return true;
	} 

	return false;
}

function equippedAmmoMatchesType(expectedAmmoType) {
	const quiver = game.combat.player.equipment.slots.Quiver;
	return quiver.item.ammoType === expectedAmmoType;
}

function onBeforeAttack() {
	try {
		if (!isModEnabled()) return;
		if (!isAutoAmmoPurchased()) return;
		if (!isRangedAttack()) return;
		if (!settingShouldAutoSwap()) return;
		

		const quiver = game.combat.player.equipment.slots.Quiver;
		if (quiver.quantity > 1) return;

		setSwapType(getAmmoType());
	} catch (e) {
		error(`issue during attack(before): ${e}`);
	}
}

function onAfterAttack() {
	try {
		if (!isModEnabled()) return;
		if (!isAutoAmmoPurchased()) return;
		if (!shouldAutoEquip()) return;
		if (!settingShouldAutoSwap()) return;

		autoEquipAmmo();
	} catch (e) {
		error(`issue during attack(after): ${e}`);
	}
}

async function populateAmmoData(loadData) {
	ammoData = await loadData("src/ammoData.json");
	ammoData = new Map(Object.entries(ammoData));
	for (let i = 0; i < ammoData.size; i++) {
		let ammoDataType = ammoData.get(i + "");
		for (let j = 0; j < ammoDataType.length; j++) {
			let item = game.items.getObjectByID(ammoDataType[j + ""]);
			ammoDataType[j] = item;
		}
		ammoData.set(i + "", ammoDataType);
	}
}

function isAutoAmmoPurchased() {
	return [...game.shop.upgradesPurchased.keys()].some(
		(p) => p._localID === "hm_auto_ammo_upgrade"
	);
}

function setSwapType(typeValue) {
	swapType = typeValue + "";
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

function getAmmoType() {
	const equipmentSlots = game.combat.player.equipment.slots;
	let type =
		equipmentSlots.Weapon.item.ammoTypeRequired ??
		equipmentSlots.Quiver.item.ammoType ??
		getSwapType();
	return type + "";
}

function isRangedAttack() {
	const weapon = game.combat.player.equipment.slots.Weapon;
	return weapon.item.attackType === "ranged";
}

function autoEquipAmmo() {
	const ammoType = getAmmoType();
	const ammoChoices = ammoData
		.get(ammoType + "")
		.filter(
			(c) =>
				c.equipRequirements !== null &&
				c.equipRequirements !== undefined &&
				c.equipRequirements.find((r) => r.level <= game.ranged.level)
		);

	for (let i = 0; i < ammoChoices.length; i++) {
		const ammoChoice = ammoChoices[i];
		if (game.bank.hasItem(ammoChoice)) {
			const ownedQty = game.bank.getQty(ammoChoice);
			game.combat.player.equipItem(
				ammoChoice,
				game.combat.player.selectedEquipmentSet,
				"Default",
				ownedQty
			);
			break;
		}
	}

	resetSwapType();
}

function toast(text, duration = 2000) {
	Toastify({
		text,
		duration,
		gravity: "bottom",
		position: "center",
		backgroundColor: "black",
		stopOnFocus: false,
	}).showToast();
}

function getGeneralSettings() {
	return ctx.settings.section("General");
}

function isModEnabled() {
	return getGeneralSettings().get(constant.modEnabledId);
}

function shouldAutoSwapArrows() {
	return getGeneralSettings().get(constant.enableArrowSwapId);
}

function shouldAutoSwapBolts() {
	return getGeneralSettings().get(constant.enableBoltSwapId);
}

function shouldAutoSwapKnives() {
	return getGeneralSettings().get(constant.enableKnifeSwapId);
}

function shouldAutoSwapJavelins() {
	return getGeneralSettings().get(constant.enableJavelinSwapId);
}

function settingShouldAutoSwap() {
	const ammoType = getAmmoType();
	const { arrow, bolt, javelin, knife } = constant.ammoTypeMap;
	if (ammoType === arrow) return shouldAutoSwapArrows();
	else if (ammoType === bolt) return shouldAutoSwapBolts();
	else if (ammoType === javelin) return shouldAutoSwapJavelins();
	else if (ammoType === knife) return shouldAutoSwapKnives();

	return false;
}

function log(msg) {
	console.log(`[${modTitle}]: ${msg}`);
}

function error(msg) {
	toast(
		`${constant.modTitle} experienced an error. It will be fixed ASAP, ${game.characterName} :). If this error persists go ahead and disable the mod via settings until a fix is available!`,
		5000
	);
	log(`issue during initializeForCombat: ${msg}`);
}
