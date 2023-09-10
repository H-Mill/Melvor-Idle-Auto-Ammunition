const constant = {
	modTitle: "Auto Ammo Mod",
	verson: "1.5.0",
	id: {
		modEnabledId: "mod-enabled",
		enableArrowSwapId: "enable-arrow-swap",
		enableBoltSwapId: "enable-bolt-swap",
		enableKnifeSwapId: "enable-knife-swap",
		enableJavelinSwapId: "enable-javelin-swap",
		swapPriorityId: "swap-priority",
		arrowsId: "Arrows",
		boltsId: "Bolts",
		knivesId: "Knife",
		javelinsId: "Javelin",
	},
	friendlyTitle: {
		mod: "Auto Ammunition",
		autoArrows: "Auto Arrows",
		autoBolts: "Auto Bolts",
		autoKnives: "Auto Knives",
		autoJavelins: "Auto Javelins",
		swapPriority: "Swap Priority",
	},
};
const ctx = mod.getContext(import.meta);
let modIcon, ammoPouchIcon, settingsModal, characterStorage;
let ammoData = {},
	ammoTypeMap = {};
let swapType = null;

export function setup({
	onCharacterLoaded,
	onInterfaceReady,
	characterStorage,
}) {
	try {
		setupGlobals();
		setupSettings();
		ctx.patch(Character, "initializeForCombat").after(
			onInitializeForCombat
		);
		ctx.patch(Player, "attack").before(onBeforeAttack);
		ctx.patch(Player, "attack").after(onAfterAttack);
		onCharacterLoaded(() => onCharLoaded(characterStorage));
		onInterfaceReady(onUiReady);
		log("loaded!");
	} catch (e) {
		error(e);
	}
}

function onCharLoaded(charStorage) {
	populateAmmoData();
	characterStorage = charStorage;
}

function onUiReady() {
	try {
		const { friendlyTitle, id } = constant;
		settingsModal = AutoAmmoSettings({
			modName: `${friendlyTitle.mod} Settings`,
			itemImgButtonProps: {
				ammoTypes: Object.values(ammoData),
			},
			switchesProps: {
				settings: [
					{
						id: id.modEnabledId,
						label: "Mod Enabled",
						tip: "Enable/Disable mod functionality.",
						defaultValue: true,
						value: true,
					},
					{
						id: id.enableArrowSwapId,
						label: "Auto Arrows",
						tip: "Automatically equip arrows during combat when a bow is equipped.",
						defaultValue: true,
						value: true,
					},
					{
						id: id.enableBoltSwapId,
						label: "Auto Bolts",
						tip: "Automatically equip bolts during combat when a crossbow is equipped.",
						defaultValue: true,
						value: true,
					},
					{
						id: id.enableKnifeSwapId,
						label: "Auto Knives",
						tip: "Automatically equip knives during combat when knives are equipped (knives must be manually equipped at the start!).",
						defaultValue: true,
						value: true,
					},
					{
						id: id.enableJavelinSwapId,
						label: "Auto Javelins",
						tip: "Automatically equip javelins during combat when javelins are equipped (javelins must be manually equipped at the start!).",
						defaultValue: true,
						value: true,
					},
				],
			},
		});
		ui.create(settingsModal, document.body);

		let purchasedElement = document.createElement("img");
		purchasedElement.id = "combat-menu-item-auto-ammo";
		purchasedElement.src = ammoPouchIcon;
		purchasedElement.className =
			"combat-equip-img border-rounded-equip p-1 m-1 pointer-enabled";
		purchasedElement.onclick = () => {
			try {
				showSettingsModal();
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

function showSettingsModal() {
	populateSettingsModal();
	Swal.fire({
		html: $(".auto-ammo-settings")
	}).then(persistSettingUpdates);
}

function persistSettingUpdates() {
	let settings = settingsModal.switchesProps.settings;
	for (let i = 0; i < settings.length; i++) {
		let setting = settings.at(i);
		characterStorage.setItem(setting.id, setting.value);
	}
}

function populateSettingsModal() {
	let settings = settingsModal.switchesProps.settings;
	for (let i = 0; i < settings.length; i++) {
		let setting = settings.at(i);
		const storedValue = getSetting(setting.id);
		setting.value =
			storedValue === undefined ? setting.defaultValue : storedValue;
	}
}

function AutoAmmoSettings(props) {
	return {
		$template: "#auto-ammo-settings-template",
		modName: props.modName,
		ItemImgButton,
		itemImgButtonProps: props.itemImgButtonProps,
		Switches,
		switchesProps: props.switchesProps,
	};
}

function Switches(props) {
	return {
		$template: "#auto-ammo-switches-template",
		settings: props.settings,
		switchToggle(e) {
			const switchId = e.target.id;
			let setting = this.settings.find((x) => x.id === switchId);
			setting.value = !setting.value;
			log(JSON.stringify(setting));
		},
	};
}

function ItemImgButton(props) {
	return {
		$template: "#auto-ammo-img-button-template",
		ammoTypes: props.ammoTypes,
	};
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
		const { mod } = constant.friendlyTitle;
		const modSettingsItem = sidebar
			.category("Modding")
			.item("Mod Settings");

		modSettingsItem.subitem(mod, {
			name: createElement("span", {
				children: [
					createElement("img", {
						classList: ["mr-2"],
						attributes: [
							["src", modIcon],
							["height", "24"],
							["width", "24"],
						],
					}),
					mod,
				],
			}),
			onClick: () => showSettingsModal(),
		});
	} catch (e) {
		error(e);
	}
}

function shouldEquipAmmoOnInitializeCombat() {
	const ammoType = getAmmoType();
	const { arrowsId, boltsId, knivesId, javelinsId } = constant.id;

	if (ammoType == ammoTypeMap[knivesId]) return false;
	if (ammoType == ammoTypeMap[javelinsId]) return false;

	const quiver = getQuiver();
	const arrowType = ammoTypeMap[arrowsId];
	const boltType = ammoTypeMap[boltsId];
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
	const loadAmmoType = (filter) => {
		let loadedAmmo = Array.from(
			game.items.equipment.registeredObjects
		).filter((x) => x[0].includes(filter));
		let parsedEquipment = [];
		selectEquipment(loadedAmmo, parsedEquipment);
		const ammoId = selectAmmoType(parsedEquipment[0]);
		setAmmoData(ammoId, parsedEquipment);
		setAmmoTypeMap(filter, ammoId);
	};
	try {
		const { arrowsId, boltsId, knivesId, javelinsId } = constant.id;

		loadAmmoType(arrowsId);
		loadAmmoType(boltsId);
		loadAmmoType(knivesId);
		loadAmmoType(javelinsId);
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

function getSort() {
	const sortProperty = "rangedStrengthBonus";
	const swapPriority = getSwapPriority();
	const highToLowSort = (a, b) =>
		b.equipmentStats.find((x) => x.key === sortProperty).value -
		a.equipmentStats.find((x) => x.key === sortProperty).value;
	const lowToHighSort = (a, b) =>
		a.equipmentStats.find((x) => x.key === sortProperty).value -
		b.equipmentStats.find((x) => x.key === sortProperty).value;
	const { highToLowId, lowToHighId } = constant.id;
	switch (swapPriority) {
		case highToLowId:
			return highToLowSort;
		case lowToHighId:
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

function isModEnabled() {
	const { modEnabledId } = constant.id;
	const setting = getSetting(modEnabledId);
	return setting === undefined
		? settingsModal.switchesProps.settings.filter(
				(x) => x.id === modEnabledId
		  )
		: setting;
}

function shouldAutoSwapArrows() {
	const { shouldAutoSwapArrows } = constant.id;
	const setting = getSetting(shouldAutoSwapArrows);
	return setting === undefined
		? settingsModal.switchesProps.settings.filter(
				(x) => x.id === shouldAutoSwapArrows
		  )
		: setting;
}

function shouldAutoSwapBolts() {
	const { shouldAutoSwapBolts } = constant.id;
	const setting = getSetting(shouldAutoSwapBolts);
	return setting === undefined
		? settingsModal.switchesProps.settings.filter(
				(x) => x.id === shouldAutoSwapBolts
		  )
		: setting;
}

function shouldAutoSwapKnives() {
	const { shouldAutoSwapKnives } = constant.id;
	const setting = getSetting(shouldAutoSwapKnives);
	return setting === undefined
		? settingsModal.switchesProps.settings.filter(
				(x) => x.id === shouldAutoSwapKnives
		  )
		: setting;
}

function shouldAutoSwapJavelins() {
	const { shouldAutoSwapJavelins } = constant.id;
	const setting = getSetting(shouldAutoSwapJavelins);
	return setting === undefined
		? settingsModal.switchesProps.settings.filter(
				(x) => x.id === shouldAutoSwapJavelins
		  )
		: setting;
}

function getSwapPriority() {
	return getSetting(constant.id.swapPriorityId);
}

function getSetting(id) {
	return characterStorage.getItem(id);
}

function settingShouldAutoSwap() {
	const ammoType = getAmmoType();
	const { arrowsId, boltsId, knivesId, javelinsId } = constant.id;

	if (ammoType == ammoTypeMap[arrowsId]) return shouldAutoSwapArrows();
	else if (ammoType == ammoTypeMap[boltsId]) return shouldAutoSwapBolts();
	else if (ammoType == ammoTypeMap[javelinsId])
		return shouldAutoSwapJavelins();
	else if (ammoType == ammoTypeMap[knivesId]) return shouldAutoSwapKnives();

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
		`<span style="justify-self: center;">${constant.friendlyTitle.mod}</span>` +
		"</div>" +
		`<span style="margin: auto;">${text}</span>` +
		"</div>"
	);
}

function log(msg) {
	const { modTitle } = constant;
	console.log(`[${modTitle}]: ${msg}`);
}
