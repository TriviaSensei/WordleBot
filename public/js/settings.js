import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';
const buttons = getElementArray(document, 'button.new-stat');
const sel = document.querySelector('#data-items');
const calculationSel = document.querySelector('#calculation-data-item');
const sortSel = document.querySelector('#sort-data-item');
const gameName = document.querySelector('#game-name');
const filterType = getElementArray(
	document,
	'input[type="radio"][name="filter-type"]'
);
document.addEventListener('DOMContentLoaded', () => {
	const dataArea = document.querySelector('#data-area');
	const data = JSON.parse(dataArea.getAttribute('data'));
	console.log(data);
	const tooltipTriggerList = document.querySelectorAll(
		'[data-bs-toggle="tooltip"]'
	);
	[...tooltipTriggerList].map(
		(tooltipTriggerEl) => new bootstrap.Tooltip(tooltipTriggerEl)
	);

	const desc = document.querySelector('#server-description');
	const isPublic = document.querySelector('#is-public');
	const inviteLink = document.querySelector('#server-invite-link');

	if (data.serverData.serverDescription)
		desc.value = data.serverData.serverDescription;
	if (data.serverData.isPublic) isPublic.checked = true;
	if (data.serverData.inviteLink) inviteLink.value = data.serverData.inviteLink;

	const handleSelectChange = (e) => {
		const desc = e.target
			.closest('.input-container')
			?.querySelector('.select-description');
		const sel = e.target.closest('select');
		const ind = sel.selectedIndex;
		const opt = sel.options[ind];
		if (!opt || !desc) return;
		const description = opt.getAttribute('data-description');
		if (!description) return;
		desc.innerHTML = description;
	};

	getElementArray(document, 'select').forEach((sel) => {
		const desc = sel
			.closest('.input-container')
			?.querySelector('.select-description');

		if (!desc) return;

		sel.addEventListener('change', handleSelectChange);
		handleSelectChange({ target: sel });
	});

	const populateDataItems = (e) => {
		const game = e.target.getAttribute('data-game');
		gameName.value = game;
		if (!game) return;
		sel.innerHTML = '';
		const calcOpts = getElementArray(calculationSel, 'option[data-display]');
		calcOpts.forEach((o) => o.remove());
		const sortOpts = getElementArray(sortSel, 'option[data-display]');
		sortOpts.forEach((o) => o.remove());
		const dataItem = data.dataItems.find((d) => d.game === game);
		if (!dataItem) return;
		dataItem.items.forEach((di) => {
			const opt = createElement('option', { display: di.display });
			opt.innerHTML = di.display;
			opt.value = di.name;
			const opt2 = opt.cloneNode(true);
			const opt3 = opt.cloneNode(true);
			sel.appendChild(opt);
			calculationSel.appendChild(opt2);
			sortSel.appendChild(opt3);
		});
	};
	buttons.forEach((b) => {
		b.addEventListener('click', populateDataItems);
	});

	const disableFilterInputs = (e) => {
		const name = e.target.getAttribute('name');
		const allInputs = getElementArray(document, `input[name="${name}"]`);
		allInputs.forEach((el) => {
			const id = el.getAttribute('id');
			const lbl = document.querySelector(`label[for="${id}"]`);
			if (!lbl) return;
			const inputs = getElementArray(lbl, 'input, select');
			inputs.forEach((i) => (i.disabled = !el.checked));
		});
	};
	filterType.forEach((f) => {
		f.addEventListener('change', disableFilterInputs);
	});

	const evt = new CustomEvent('data-update', { detail: data });
	document.dispatchEvent(evt);
});
