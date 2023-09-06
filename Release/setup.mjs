const constant = {
	modTitle: "Auto Ammo Mod",
	verson: 1.4,
	id: {
		storage: "auto-ammo-storage",
		modEnabledId: "mod-enabled",
		enableArrowSwapId: "enable-arrow-swap",
		enableBoltSwapId: "enable-bolt-swap",
		enableKnifeSwapId: "enable-knife-swap",
		enableJavelinSwapId: "enable-javelin-swap",
	},
	friendlyTitle: {
		mod: "Auto Ammunition",
	},
	ammoTypeMap: {
		arrow: "0",
		bolt: "1",
		javelin: "2",
		knife: "3",
	},
};
const ctx = mod.getContext(import.meta);
let ammoData;
let modIcon, ammoPouchIcon;
let swapType = null;

export async function setup({ onInterfaceReady, loadData }) {
	try {
		setupGlobals();
		setupSettings();
		populateAmmoData(loadData);
		ctx.patch(Character, "initializeForCombat").after(
			onInitializeForCombat
		);
		ctx.patch(Player, "attack").before(onBeforeAttack);
		ctx.patch(Player, "attack").after(onAfterAttack);
		onInterfaceReady(onUiReady);
		log("loaded!");
	} catch (e) {
		error(e);
	}
}

function onUiReady() {
	try {
		const { friendlyTitle } = constant;
		const getColoredHtml = (
			text,
			success = false,
			successModifier = "Enabled",
			failureModifier = "Disabled"
		) =>
			`<p class="text-${success ? "success" : "danger"}">${text}: ${
				success ? successModifier : failureModifier
			}</p>`;
		const formatInactiveTextIfNeeded = (isPurchased) =>
			"Enabled" +
			(!isPurchased
				? ' <span class="text-danger">(Inactive)</span>'
				: "");
		let purchasedElement = document.createElement("img");
		purchasedElement.id = "combat-menu-item-auto-ammo";
		purchasedElement.src = ammoPouchIcon;
		purchasedElement.className =
			"combat-equip-img border-rounded-equip p-1 m-1 pointer-enabled";
		purchasedElement.onclick = () => {
			try {
				const _isModEnabled = isModEnabled();
				const _isAutoAmmoPurchased = isAutoAmmoPurchased();
				const _shouldAutoSwapArrows = shouldAutoSwapArrows();
				const _shouldAutoSwapBolts = shouldAutoSwapBolts();
				const _shouldAutoSwapKnives = shouldAutoSwapKnives();
				const _shouldAutoSwapJavelins = shouldAutoSwapJavelins();
				Swal.fire({
					title: friendlyTitle.mod,
					icon: ammoPouchIcon,
					html:
						'<i style="font-size: 0.75rem;">These settings can be modified in the Mod Settings sidebar.</i>' +
						`<p>${getColoredHtml("Mod", _isModEnabled)}</p>` +
						`<p>${getColoredHtml(
							"Upgrade",
							_isAutoAmmoPurchased,
							"Purchased",
							"Not Purchased"
						)}</p>` +
						`<p>${getColoredHtml(
							"Auto Arrows",
							_shouldAutoSwapArrows,
							formatInactiveTextIfNeeded(_isAutoAmmoPurchased)
						)}</p>` +
						`<p>${getColoredHtml(
							"Auto Bolts",
							_shouldAutoSwapBolts,
							formatInactiveTextIfNeeded(_isAutoAmmoPurchased)
						)}</p>` +
						`<p>${getColoredHtml(
							"Auto Knives",
							_shouldAutoSwapKnives,
							formatInactiveTextIfNeeded(_isAutoAmmoPurchased)
						)}</p>` +
						`<p>${getColoredHtml(
							"Auto Javelins",
							_shouldAutoSwapJavelins,
							formatInactiveTextIfNeeded(_isAutoAmmoPurchased)
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
			content: friendlyTitle.mod,
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
		if (!isModEnabled()) return;
		if (!isAutoAmmoPurchased()) return;
		if (!isRangedAttack()) return;
		if (!settingShouldAutoSwap()) return;
		if (!shouldEquipAmmoOnInitializeCombat()) return;

		setSwapType(getAmmoType());
		autoEquipAmmo();
	} catch (e) {
		error(e);
	}
}

function onBeforeAttack() {
	try {
		if (!isModEnabled()) return;
		if (!isAutoAmmoPurchased()) return;
		if (!isRangedAttack()) return;
		if (!settingShouldAutoSwap()) return;

		const quiver = getQuiver();
		if (quiver.quantity > 1) return;

		setSwapType(getAmmoType());
	} catch (e) {
		error(e);
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
			modEnabledId,
			enableArrowSwapId,
			enableBoltSwapId,
			enableKnifeSwapId,
			enableJavelinSwapId,
		} = constant.id;
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
	} catch (e) {
		error(e);
	}
}

function shouldEquipAmmoOnInitializeCombat() {
	const ammoType = getAmmoType();
	const { arrow, bolt, javelin, knife } = constant.ammoTypeMap;
	if (ammoType === javelin) return false;
	if (ammoType === knife) return false;

	const quiver = getQuiver();
	if (ammoType === arrow) {
		if (equippedAmmoMatchesType(arrow)) return quiver.quantity === 0;
		return true;
	} else if (ammoType === bolt) {
		if (equippedAmmoMatchesType(bolt)) return quiver.quantity === 0;
		return true;
	}

	return false;
}

function equippedAmmoMatchesType(expectedAmmoType) {
	return getQuiver().item.ammoType === expectedAmmoType;
}

async function populateAmmoData(loadData) {
	try {
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
	} catch (e) {
		error(e);
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
	let type =
		getWeapon().item.ammoTypeRequired ??
		getQuiver().item.ammoType ??
		getSwapType();
	return type + "";
}

function isRangedAttack() {
	return getWeapon().item.attackType === "ranged";
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

function getAmmoPouchIcon() {
	return ctx.getResourceUrl("assets/ammo-pouch.png");
}

function getModIcon() {
	return ctx.getResourceUrl("assets/icon.png");
}

function getGeneralSettings() {
	return ctx.settings.section("General");
}

function isModEnabled() {
	return getGeneralSettings().get(constant.id.modEnabledId);
}

function shouldAutoSwapArrows() {
	return getGeneralSettings().get(constant.id.enableArrowSwapId);
}

function shouldAutoSwapBolts() {
	return getGeneralSettings().get(constant.id.enableBoltSwapId);
}

function shouldAutoSwapKnives() {
	return getGeneralSettings().get(constant.id.enableKnifeSwapId);
}

function shouldAutoSwapJavelins() {
	return getGeneralSettings().get(constant.id.enableJavelinSwapId);
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
		(modIcon ? `<img src="${modIcon}" style="width: 32px;height: 32px;margin-right: 1rem;"></img>` : '') +
		`<span style="justify-self: center;">${constant.friendlyTitle.mod}</span>` +
		"</div>" +
		`<span style="margin: auto;">${text}</span>` +
		'</div>'
	);
}

function log(msg) {
	const { modTitle } = constant;
	console.log(`[${modTitle}]: ${msg}`);
}
