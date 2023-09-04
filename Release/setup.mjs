const constant = {
	modTitle: "Auto Ammo Mod",
	verson: 1.3,
	modEnabledId: "mod-enabled",
};
const { modTitle } = constant;
const ctx = mod.getContext(import.meta);
let ammoData;
let swapType = null;

function log(msg) {
	console.log(`[${modTitle}]: ${msg}`);
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
	return (
		equipmentSlots.Weapon.item.ammoTypeRequired ??
		equipmentSlots.Quiver.item.ammoType ??
		getSwapType()
	);
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

function error(msg) {
	toast(
		`${constant.modTitle} experienced an error. It will be fixed ASAP, ${game.characterName} :). If this error persists go ahead and disable the mod via settings until a fix is available!`,
		5000
	);
	log(`issue during initializeForCombat: ${msg}`);
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

function isModEnabled() {
	return ctx.settings.section("General").get(constant.modEnabledId);
}

export async function setup({ loadData }) {
	ctx.settings.section("General").add({
		type: "switch",
		name: constant.modEnabledId,
		label: "Enable Mod",
		hint: "Automatically equip ammo before/during combat for the equipped ranged weapon.",
		default: true,
	});

	try {
		populateAmmoData(loadData);
	} catch (e) {
		log(`issue loading ammo data: ${e}`);
	}

	ctx.patch(Character, "initializeForCombat").after(function () {
		try {
			if (!isModEnabled) return;
			if (!isRangedAttack()) return;

			const weapon = game.combat.player.equipment.slots.Weapon;
			const quiver = game.combat.player.equipment.slots.Quiver;
			if (
				(weapon.item.ammoTypeRequired !== 0 &&
					quiver.item.ammoType !== 0 &&
					quiver.quantity >= 1) ||
				(weapon.item.ammoTypeRequired !== 1 &&
					quiver.item.ammoType !== 1 &&
					quiver.quantity >= 1)
			)
				return;

			setSwapType(getAmmoType());
			autoEquipAmmo();
		} catch (e) {
			error(`issue during initializeForCombat: ${e}`);
		}
	});

	ctx.patch(Player, "attack").before(function () {
		try {
			if (!isModEnabled) return;
			if (!isRangedAttack()) return;

			const autoAmmoPurchased = [
				...game.shop.upgradesPurchased.keys(),
			].some((p) => p._localID === "hm_auto_ammo_upgrade");
			if (!autoAmmoPurchased) return;

			const quiver = game.combat.player.equipment.slots.Quiver;
			if (quiver.quantity > 1) return;

			setSwapType(getAmmoType());
		} catch (e) {
			error(`issue during attack(before): ${e}`);
		}
	});

	ctx.patch(Player, "attack").after(function () {
		try {
			if (!isModEnabled) return;
			if (!shouldAutoEquip()) return;

			autoEquipAmmo();
		} catch (e) {
			error(`issue during attack(after): ${e}`);
		}
	});
	log("loaded!");
}