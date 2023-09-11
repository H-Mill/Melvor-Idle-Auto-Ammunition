let constant = (function () {
	const equipAmountInfinite = 0;
	const equipAmountMin = 50;
	return {
		modTitle: "Auto Ammunition",
		verson: "1.6.0",
		setting: {
			modEnabled: {
				id: "mod-enabled",
				displayName: "Enable Mod",
				hint: "Enable mod functionality.",
				defaultValue: true,
			},
			arrowSwap: {
				id: "enable-arrow-swap",
				displayName: "Auto Arrows",
				hint: "Automatically equip arrows during combat when a bow is equipped.",
				defaultValue: true,
				registeredObjectSearch: "Arrows",
			},
			boltSwap: {
				id: "enable-bolt-swap",
				displayName: "Auto Bolts",
				hint: "Automatically equip bolts during combat when a crossbow is equipped.",
				defaultValue: true,
				registeredObjectSearch: "Bolts",
			},
			knifeSwap: {
				id: "enable-knife-swap",
				displayName: "Auto Knives",
				hint: "Automatically equip knives during combat when knives are equipped (knives must be manually equipped at the start!).",
				defaultValue: true,
				registeredObjectSearch: "Knife",
			},
			javelinSwap: {
				id: "enable-javelin-swap",
				displayName: "Auto Javelins",
				hint: "Automatically equip javelins during combat when javelins are equipped (javelins must be manually equipped at the start!).",
				defaultValue: true,
				registeredObjectSearch: "Javelin",
			},
			swapPriority: {
				id: "swap-priority",
				displayName: "Swap Priority",
				hint: "The priority of what order to swap ammunition (high to low, or low to high).",
				options: [
					{
						value: "highToLow",
						display: "High to Low",
					},
					{
						value: "lowToHigh",
						display: "Low To High",
					},
				],
			},
			equipAmountUpgrade: {
				id: "equip-amount",
				displayName: "Equip Amount",
				min: equipAmountMin,
				allOwned: equipAmountInfinite,
				hint: `The amount of ammunition (minimum ${equipAmountMin})to automatically equip when auto equipping ammo. Manually entering ${equipAmountInfinite} will result in all the ammo you have being equipped.`,
			},
		},
	};
})();
const ctx = mod.getContext(import.meta);
let modIcon, ammoPouchIcon;
let ammoData = {},
	ammoTypeMap = {};
let swapType = null;

export function setup({ onCharacterLoaded, onInterfaceReady }) {
	try {
		setupGlobals();
		setupSettings();
		ctx.patch(Character, "initializeForCombat").after(
			onInitializeForCombat
		);
		ctx.patch(Player, "attack").before(onBeforeAttack);
		ctx.patch(Player, "attack").after(onAfterAttack);
		onCharacterLoaded(onCharLoaded);
		onInterfaceReady(onUiReady);
		log("loaded!");
	} catch (e) {
		error(e);
	}
}

function onCharLoaded() {
	populateAmmoData();
}

function onUiReady() {
	try {
		const getColoredHtml = (
			text,
			success = false,
			successModifier = "Enabled",
			failureModifier = "Disabled"
		) =>
			`<p>${text}: <span class="text-${success ? "success" : "danger"}">${
				success ? successModifier : failureModifier
			}</span></p>`;
		const formatInactiveTextIfNeeded = (...purchases) =>
			purchases.some((p) => p === false)
				? ' <span class="text-danger">(Inactive)</span>'
				: "";
		let purchasedElement = document.createElement("img");
		purchasedElement.id = "combat-menu-item-auto-ammo";
		purchasedElement.src = ammoPouchIcon;
		purchasedElement.className =
			"combat-equip-img border-rounded-equip p-1 m-1 pointer-enabled";
		purchasedElement.onclick = () => {
			try {
				const {
					arrowSwap,
					boltSwap,
					knifeSwap,
					javelinSwap,
					swapPriority,
					equipAmountUpgrade,
				} = constant.setting;
				const isModEnabled = isModEnabledSetting();
				const isAutoAmmoPurchased = isAutoAmmoPurchasedSetting();
				const isAutoAmmoQuantityPurchased =
					isAutoAmmoQuantityPurchasedSetting();
				const shouldAutoSwapArrows = shouldAutoSwapArrowsSetting();
				const shouldAutoSwapBolts = shouldAutoSwapBoltsSetting();
				const shouldAutoSwapKnives = shouldAutoSwapKnivesSetting();
				const shouldAutoSwapJavelins = shouldAutoSwapJavelinsSetting();
				Swal.fire({
					title: constant.modTitle,
					icon: ammoPouchIcon,
					html:
						'<i style="font-size: 0.75rem;">These settings can be modified in the Mod Settings sidebar.</i>' +
						`<p>${getColoredHtml("Mod", isModEnabled)}</p>` +
						`<p>${getColoredHtml(
							"Upgrade",
							isAutoAmmoPurchased,
							"Purchased",
							"Not Purchased"
						)}</p>` +
						`<p>${getColoredHtml(
							arrowSwap.displayName,
							shouldAutoSwapArrows,
							"Enabled" +
								formatInactiveTextIfNeeded(isAutoAmmoPurchased)
						)}</p>` +
						`<p>${getColoredHtml(
							boltSwap.displayName,
							shouldAutoSwapBolts,
							"Enabled" +
								formatInactiveTextIfNeeded(isAutoAmmoPurchased)
						)}</p>` +
						`<p>${getColoredHtml(
							knifeSwap.displayName,
							shouldAutoSwapKnives,
							"Enabled" +
								formatInactiveTextIfNeeded(isAutoAmmoPurchased)
						)}</p>` +
						`<p>${getColoredHtml(
							javelinSwap.displayName,
							shouldAutoSwapJavelins,
							"Enabled" +
								formatInactiveTextIfNeeded(isAutoAmmoPurchased)
						)}</p>` +
						`<p>${
							swapPriority.displayName
						}: <span class="text-success">${
							swapPriority.options.filter(
								(x) => x.value === getSwapPrioritySetting()
							)[0].display
						}</span> ${formatInactiveTextIfNeeded(
							isAutoAmmoPurchased
						)}</p>` +
						`<p>${
							equipAmountUpgrade.displayName
						}: <span class="text-success">${getEquipAmountDisplay()}</span> ${formatInactiveTextIfNeeded(
							isAutoAmmoPurchased,
							isAutoAmmoQuantityPurchased
						)}</p>`,
					showCloseButton: true,
				});
			} catch (e) {
				error(e);
			}
		};

		const combatMenuItems = document.querySelectorAll(
			"[id^=combat-menu-item-]"
		);
		const lastMenuItem = combatMenuItems[combatMenuItems.length - 1];
		lastMenuItem.after(purchasedElement);
		tippy(purchasedElement, {
			content: constant.modTitle,
			placement: "bottom",
			interactive: false,
			animation: false,
		});
	} catch (e) {
		error(e);
	}
}

function onInitializeForCombat() {
	try {
		if (!isModEnabledSetting()) return;
		if (!isAutoAmmoPurchasedSetting()) return;
		if (!isRangedAttack()) return;
		if (!shouldAutoSwap()) return;
		if (!shouldEquipAmmoOnInitializeCombat()) return;

		setSwapType(getAmmoType());
		autoEquipAmmo();
	} catch (e) {
		error(e);
	}
}

function onBeforeAttack() {
	try {
		if (!isModEnabledSetting()) return;
		if (!isAutoAmmoPurchasedSetting()) return;
		if (!isRangedAttack()) return;
		if (!shouldAutoSwap()) return;

		const quiver = getQuiver();
		if (quiver.quantity > 1) return;

		setSwapType(getAmmoType());
	} catch (e) {
		error(e);
	}
}

function onAfterAttack() {
	try {
		if (!isModEnabledSetting()) return;
		if (!isAutoAmmoPurchasedSetting()) return;
		if (!shouldAutoEquip()) return;
		if (!shouldAutoSwap()) return;

		autoEquipAmmo();
	} catch (e) {
		error(e);
	}
}

function setupGlobals() {
	try {
		modIcon = getModIcon();
		ammoPouchIcon = getAmmoPouchIcon();
	} catch (e) {
		error(e);
	}
}

function setupSettings() {
	try {
		const {
			modEnabled,
			arrowSwap,
			boltSwap,
			knifeSwap,
			javelinSwap,
			swapPriority,
			equipAmountUpgrade,
		} = constant.setting;
		const generalSection = ctx.settings.section("General");
		generalSection.add({
			type: "switch",
			name: modEnabled.id,
			label: modEnabled.displayName,
			hint: modEnabled.hint,
			default: modEnabled.defaultValue,
		});

		generalSection.add({
			type: "switch",
			name: arrowSwap.id,
			label: arrowSwap.displayName,
			hint: arrowSwap.hint,
			default: arrowSwap.defaultValue,
		});

		generalSection.add({
			type: "switch",
			name: boltSwap.id,
			label: boltSwap.displayName,
			hint: boltSwap.hint,
			default: true,
		});

		generalSection.add({
			type: "switch",
			name: knifeSwap.id,
			label: knifeSwap.displayName,
			hint: knifeSwap.hint,
			default: knifeSwap.defaultValue,
		});

		generalSection.add({
			type: "switch",
			name: javelinSwap.id,
			label: javelinSwap.displayName,
			hint: javelinSwap.hint,
			default: javelinSwap.defaultValue,
		});

		generalSection.add({
			type: "dropdown",
			name: swapPriority.id,
			label: swapPriority.displayName,
			hint: swapPriority.hint,
			options: swapPriority.options,
			default: "highToLow",
		});

		generalSection.add({
			type: "number",
			name: equipAmountUpgrade.id,
			label: equipAmountUpgrade.displayName,
			hint: equipAmountUpgrade.hint,
			min: equipAmountUpgrade.min,
			default: equipAmountUpgrade.allOwned,
		});
	} catch (e) {
		error(e);
	}
}

function shouldEquipAmmoOnInitializeCombat() {
	const ammoType = getAmmoType();
	const { arrowSwap, boltSwap, knifeSwap, javelinSwap } = constant.setting;

	if (ammoType == ammoTypeMap[knifeSwap.id]) return false;
	if (ammoType == ammoTypeMap[javelinSwap.id]) return false;

	const quiver = getQuiver();
	const arrowType = ammoTypeMap[arrowSwap.id];
	const boltType = ammoTypeMap[boltSwap.id];
	if (ammoType == arrowType) {
		if (equippedAmmoMatchesType(arrowType)) return quiver.quantity === 0;
		return true;
	} else if (ammoType == boltType) {
		if (equippedAmmoMatchesType(boltType)) return quiver.quantity === 0;
		return true;
	}

	return false;
}

function equippedAmmoMatchesType(expectedAmmoType) {
	return getQuiver().item.ammoType == expectedAmmoType;
}

function populateAmmoData() {
	const selectEquipment = (loadedAmmo, parsedEquipment) => {
		for (let i = 0; i < loadedAmmo.length; i++) {
			let equipmentArray = loadedAmmo[i];
			parsedEquipment.push(equipmentArray[equipmentArray.length - 1]);
		}
	};
	const selectAmmoType = (equipmentItem) => equipmentItem.ammoType;
	const setAmmoData = (ammoId, ammo) => (ammoData[ammoId] = ammo);
	const setAmmoTypeMap = (filter, ammoId) => (ammoTypeMap[filter] = ammoId);
	const loadAmmoType = (setting) => {
		let loadedAmmo = Array.from(
			game.items.equipment.registeredObjects
		).filter((x) => x[0].includes(setting.registeredObjectSearch));
		let parsedEquipment = [];
		selectEquipment(loadedAmmo, parsedEquipment);
		const ammoId = selectAmmoType(parsedEquipment[0]);
		setAmmoData(ammoId, parsedEquipment);
		setAmmoTypeMap(setting.id, ammoId);
	};
	try {
		const { arrowSwap, boltSwap, knifeSwap, javelinSwap } =
			constant.setting;

		loadAmmoType(arrowSwap);
		loadAmmoType(boltSwap);
		loadAmmoType(knifeSwap);
		loadAmmoType(javelinSwap);
	} catch (e) {
		error(e);
	}
}

function isAutoAmmoPurchasedSetting() {
	return [...game.shop.upgradesPurchased.keys()].some(
		(p) => p._localID === "hm_auto_ammo_upgrade"
	);
}

function isAutoAmmoQuantityPurchasedSetting() {
	return [...game.shop.upgradesPurchased.keys()].some(
		(p) => p._localID === "hm_auto_ammo_equip_amount_upgrade"
	);
}

function setSwapType(typeValue) {
	swapType = typeValue;
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
	let type =
		getWeapon().item.ammoTypeRequired ??
		getQuiver().item.ammoType ??
		getSwapType();
	return type;
}

function isRangedAttack() {
	return getWeapon().item.attackType === "ranged";
}

function autoEquipAmmo() {
	const ammoType = getAmmoType();
	const ammoChoices = ammoData[ammoType]
		.sort(getSort())
		.filter(
			(c) =>
				c.equipRequirements !== null &&
				c.equipRequirements !== undefined &&
				c.equipRequirements.find((r) => r.level <= game.ranged.level)
		);

	for (let i = 0; i < ammoChoices.length; i++) {
		const ammoChoice = ammoChoices[i];
		if (game.bank.hasItem(ammoChoice)) {
			const amountToEquip = getEquipAmount(ammoChoice);
			game.combat.player.equipItem(
				ammoChoice,
				game.combat.player.selectedEquipmentSet,
				"Default",
				amountToEquip
			);
			break;
		}
	}

	resetSwapType();
}

function getEquipAmount(ammoChoice) {
	const quantityUpgradePurchased = isAutoAmmoQuantityPurchasedSetting();
	const settingValue = getEquipAmountSetting();
	const amountOwned = game.bank.getQty(ammoChoice);

	if (!quantityUpgradePurchased) return amountOwned;
	if (settingValue <= 0) return amountOwned;
	if (amountOwned < settingValue) return amountOwned;
	return settingValue;
}

function getEquipAmountDisplay() {
	const quantityUpgradePurchased = isAutoAmmoQuantityPurchasedSetting();
	const settingValue = getEquipAmountSetting();
	const equipAmountUpgrade = constant.setting.equipAmountUpgrade;
	const infinite = "∞";
	if (!quantityUpgradePurchased) return infinite;
	if (settingValue <= equipAmountUpgrade.allOwned) return infinite;
	if (settingValue < equipAmountUpgrade.min) return equipAmountUpgrade.min;
	return settingValue;
}

function getSort() {
	const sortProperty = "rangedStrengthBonus";
	const swapPriority = getSwapPrioritySetting();
	const highToLowSort = (a, b) =>
		b.equipmentStats.find((x) => x.key === sortProperty).value -
		a.equipmentStats.find((x) => x.key === sortProperty).value;
	const lowToHighSort = (a, b) =>
		a.equipmentStats.find((x) => x.key === sortProperty).value -
		b.equipmentStats.find((x) => x.key === sortProperty).value;
	const { options } = constant.setting.swapPriority;
	switch (swapPriority) {
		case options[0].id:
			return highToLowSort;
		case options[1].id:
			return lowToHighSort;
	}
	return highToLowSort;
}

function getAmmoPouchIcon() {
	return ctx.getResourceUrl("assets/ammo-pouch.png");
}

function getModIcon() {
	return ctx.getResourceUrl("assets/icon.png");
}

function getGeneralSettings() {
	return ctx.settings.section("General");
}

function isModEnabledSetting() {
	return getGeneralSettings().get(constant.setting.modEnabled.id);
}

function shouldAutoSwapArrowsSetting() {
	return getGeneralSettings().get(constant.setting.arrowSwap.id);
}

function shouldAutoSwapBoltsSetting() {
	return getGeneralSettings().get(constant.setting.boltSwap.id);
}

function shouldAutoSwapKnivesSetting() {
	return getGeneralSettings().get(constant.setting.knifeSwap.id);
}

function shouldAutoSwapJavelinsSetting() {
	return getGeneralSettings().get(constant.setting.javelinSwap.id);
}

function getEquipAmountSetting() {
	return getGeneralSettings().get(constant.setting.equipAmountUpgrade.id);
}

function getSwapPrioritySetting() {
	return getGeneralSettings().get(constant.setting.swapPriority.id);
}

function shouldAutoSwap() {
	const ammoType = getAmmoType();
	const { arrowSwap, boltSwap, knifeSwap, javelinSwap } = constant.setting;

	if (ammoType == ammoTypeMap[arrowSwap.id])
		return shouldAutoSwapArrowsSetting();
	else if (ammoType == ammoTypeMap[boltSwap.id])
		return shouldAutoSwapBoltsSetting();
	else if (ammoType == ammoTypeMap[javelinSwap.id])
		return shouldAutoSwapJavelinsSetting();
	else if (ammoType == ammoTypeMap[knifeSwap.id])
		return shouldAutoSwapKnivesSetting();

	return false;
}

function getQuiver() {
	return game.combat.player.equipment.slots.Quiver;
}

function getWeapon() {
	return game.combat.player.equipment.slots.Weapon;
}

function error(text) {
	log(text);
	toast(text, 5000);
}

function toast(text, duration = 2000) {
	Toastify({
		text: generateToastHtml(text),
		duration,
		gravity: "bottom",
		position: "center",
		backgroundColor: "#181818",
		stopOnFocus: true,
		class: "text-success",
	}).showToast();
}

function generateToastHtml(text) {
	return (
		'<div style="display: flex; flex-direction: column;background: #404040;padding: 1rem;margin: 0 5px;max-width: 50vw;">' +
		'<div style="background: #404040;padding: 0 0 0.5rem 0;display: flex;flex-direction: row; align-items: center;">' +
		(modIcon
			? `<img src="${modIcon}" style="width: 32px;height: 32px;margin-right: 1rem;"></img>`
			: "") +
		`<span style="justify-self: center;">${constant.modTitle}</span>` +
		"</div>" +
		`<span style="margin: auto;">${text}</span>` +
		"</div>"
	);
}

function log(msg) {
	const { modTitle } = constant;
	console.log(`[${modTitle}]: ${msg}`);
}
