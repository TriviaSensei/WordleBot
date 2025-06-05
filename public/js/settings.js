import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';
import { createSortTag } from './utils/sortTag.js';

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
	dataArea.remove();
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

	data.dataItems.forEach((d) => {
		const uu = document.querySelector(
			`.accordion-item[data-game="${d.game}"] .unselected-sorts`
		);
		if (!uu) return;
		if (d.sortItems)
			d.sortItems.forEach((s) => {
				const tag = createSortTag(d.game, s);

				uu.appendChild(tag);
			});
	});
	data.serverData.customStats.forEach((c) => {
		const uu = document.querySelector(
			`.accordion-item[data-game="${c.game}"] .unselected-sorts`
		);
		if (!uu) return;
		c.stats.forEach((s) => {
			const tag = createSortTag(c.game, {
				id: s.id,
				label: s.name,
			});
			uu.appendChild(tag);
		});
	});

	//populate sort orders
	data.serverData.settings.forEach((s) => {
		const ss = s.settings.find((setting) => setting.name === 'sort');
		if (!ss) return;

		const sortOrder =
			!ss.value || ss.value.length === 0 ? ss.default : ss.value;

		const area = document.querySelector(
			`.accordion-item[data-game="${s.name}"]`
		);
		const used = area.querySelector('.selected-sorts');
		sortOrder.forEach((item) => {
			const tag = area.querySelector(`.sort-tag[data-id="${item}"]`);
			if (tag) used.appendChild(tag);
		});
	});

	const handleMoveTag = (e) => {
		const sc = e.target.parentElement.parentElement;
		if (!sc || !sc.classList.contains('sort-container')) return;

		const selectedTag = sc.querySelector(
			'.sort-tag:has(input[type="radio"]:checked)'
		);
		if (!selectedTag) return;

		const container = selectedTag.parentElement;

		if (e.target.classList.contains('move-over')) {
			let other;
			if (container.classList.contains('unselected-sorts'))
				other = sc.querySelector('.selected-sorts');
			else if (container.classList.contains('selected-sorts'))
				other = sc.querySelector('.unselected-sorts');
			else return;

			other.appendChild(selectedTag);
		} else if (container.classList.contains('selected-sorts')) {
			const tags = getElementArray(container, '.sort-tag');
			console.log(tags);
			if (e.target.classList.contains('move-up')) {
				tags.some((t, i) => {
					if (i === tags.length - 1) return false;
					if (tags[i + 1] === selectedTag) {
						console.log('found it');
						container.insertBefore(selectedTag, t);
						return true;
					}
				});
			} else if (e.target.classList.contains('move-down')) {
				tags.some((t, i) => {
					if (i === 0) return false;
					if (tags[i - 1] === selectedTag) {
						container.insertBefore(t, selectedTag);
						return true;
					}
				});
			} else return;
		} else return;
	};

	getElementArray(
		document,
		'button.move-over, button.move-down, button.move-up'
	).forEach((b) => b.addEventListener('click', handleMoveTag));

	const evt = new CustomEvent('data-update', { detail: data });
	document.dispatchEvent(evt);
});
