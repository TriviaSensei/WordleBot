import { StateHandler } from './utils/stateHandler.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { createElement } from './utils/createElementFromSelector.js';
import { handleRequest } from './utils/requestHandler.js';
import { gameList } from './gameList.js';

const initialFilter = {
	id: null,
	name: '',
	type: 'keep',
	dataItem: '',
	dataItemName: '',
	keepValue: null,
	comparator: '',
	dataValue: null,
};
const initialStat = {
	id: null,
	name: '',
	heading: '',
	description: '',
	allowFillIn: false,
	defaultSort: false,
	sortOrder: 1,
	decimalPlaces: 2,
	format: 'number',
	filters: [],
	calc: null,
	game: null,
};

const calculationItemChildren = {
	add: ['.first', 'span', '.second'],
	subtract: ['.first', 'span', '.second'],
	multiply: ['.first', 'span', '.second'],
	divide: ['.numerator', '.denominator'],
	sqrt: ['.radicand'],
	max: ['.first', 'span', '.second'],
	min: ['.first', 'span', '.second'],
	power: ['.base', '.exponent'],
	abs: ['.inner'],
	sum: ['.inner'],
	count: ['.inner'],
	avg: ['.inner'],
	constant: ['.inner'],
	data: ['.inner'],
};

const activeFilter = new StateHandler({ ...initialFilter });
const activeStat = new StateHandler({ ...initialStat });
const activeCalculation = new StateHandler(null);
const statList = new StateHandler([]);

const statId = document.querySelector('#stat-id');
const gameName = document.querySelector('#game-name');
const statName = document.querySelector('#stat-name');
const statHeader = document.querySelector('#stat-header');
const statDescription = document.querySelector('#stat-description');
const allowFillIn = document.querySelector('#allow-fill-in');
const defaultSort = document.querySelector('#default-sort');
const newStatButtons = getElementArray(document, 'button.new-stat');
const sortOrder = getElementArray(
	document,
	'input[type="radio"][name="default-sort-direction"]'
);
const resultFormat = getElementArray(
	document,
	'input[type="radio"][name="result-format"]'
);
const decimalPlaces = document.querySelector('#decimal-places');

const filterId = document.querySelector('#filter-id');
const filterName = document.querySelector('#filter-name');
const keepFilter = document.querySelector('#keep-filter');
const dataFilter = document.querySelector('#data-filter');
const keepN = document.querySelector('#keep-n');
const keepDrop = document.querySelector('#keep-drop');
const bestWorst = document.querySelector('#best-worst');
const comparators = document.querySelector('#comparators');
const compareN = document.querySelector('#compare-n');
const newFilter = document.querySelector('#new-filter');
const saveFilter = document.querySelector('#save-filter');
const closeFilter = document.querySelector('#close-filter');
const filterArea = document.querySelector('.filter-container');
const bestWorstDataItems = document.querySelector('#sort-data-item');
const comparatorDataItems = document.querySelector('#data-items');

const editCalculation = document.querySelector('#edit-calculation');
const calculationPreview = document.querySelector('#calculation-preview');
const calculationArea = document.querySelector('#calculation-area');
const operators = getElementArray(document, 'button[data-type="operator"]');
const aggregators = getElementArray(document, 'button[data-type="aggregator"]');
const deleteItem = document.querySelector('#delete-item');
const clearAll = document.querySelector('#clear-all');
const cancelClearAll = document.querySelector('#cancel-clear-all');
const confirmClearAll = document.querySelector('#confirm-clear-all');
const addData = document.querySelector('#add-data');
const calculationSel = document.querySelector('#calculation-data-item');
const calculationConstant = document.querySelector('#calculation-constant');
const saveCalculation = document.querySelector('#save-calculation');
const closeCalculation = document.querySelector('#close-calculation');

const saveStat = document.querySelector('#save-stat');
const closeStat = document.querySelector('#close-stat');
const confirmDeleteStat = document.querySelector('#confirm-delete-stat');
const cancelDeleteStat = document.querySelector('#cancel-delete-stat');
const deleteGame = document.querySelector('#delete-game');
const deleteId = document.querySelector('#delete-id');

const statModal = new bootstrap.Modal('#new-stat-modal');
const filterModal = new bootstrap.Modal('#new-filter-modal');
const calculationModal = new bootstrap.Modal('#calculation-modal');
const clearAllModal = new bootstrap.Modal('#clear-all-modal');
const deleteStatModal = new bootstrap.Modal('#delete-stat-modal');
const saveSettingsModal = new bootstrap.Modal('#save-settings-modal');
const saveButtons = getElementArray(document, '.save-settings-button');

const getFilterString = (f) => {
	if (f.type === 'data') {
		const symbols = {
			lte: '≤',
			lt: '<',
			eq: '=',
			gt: '>',
			gte: '≥',
		};
		const sym = symbols[f.comparator];
		if (!sym) return '';
		return `${f.dataItemName} ${sym} ${f.dataValue}`;
	} else
		return `${f.keepValue > 0 ? 'Keep the best' : 'Drop the worst'} ${
			Math.abs(f.keepValue) === 1
				? 'result'
				: `${Math.abs(f.keepValue)} results`
		}`;
};
const isEmptyObject = (obj) => {
	if ((typeof obj).toLowerCase() !== 'object') return false;
	return Object.getOwnPropertyNames(obj).length === 0;
};

const modalTransition = (toHide, toShow) => {
	document.addEventListener('hidden.bs.modal', () => toShow.show(), {
		once: true,
	});
	toHide.hide();
};
const hideAllTooltips = () => {
	getElementArray(document, '[role="tooltip"]').forEach((t) => t.remove());
};

//mostly filter stuff
const loadFilter = (e) => {
	const id = e.target.closest('.filter')?.getAttribute('data-id');
	if (!id) return;
	const filters = activeStat.getState().filters;
	const filter = filters.find((f) => f.id === id);
	console.log(filter);
	if (!filter) return showMessage('error', 'Filter not found');
	activeFilter.setState(filter);
	statModal.hide();
	filterModal.show();
};
const deleteFilter = (e) => {
	const filterItem = e.target.closest('.filter');
	if (!filterItem) return;
	const id = filterItem.getAttribute('data-id');
	if (!id) return;
	activeStat.setState((prev) => {
		return {
			...prev,
			filters: prev.filters.filter((f) => f.id !== id),
		};
	});
	filterItem.remove();
};
activeStat.addWatcher(filterArea, (e) => {
	getElementArray(filterArea, '.filter').forEach((f) => {
		if (
			!e.detail.filters.some((fil) => {
				return fil.id === f.getAttribute('data-id');
			})
		)
			f.remove();
	});
	e.detail.filters.forEach((f) => {
		const existingFilter = document.querySelector(`.filter[data-id="${f.id}"]`);
		if (existingFilter) {
			filterArea.appendChild(existingFilter);
			return;
		}
		const filter = createElement('.filter', {
			id: f.id,
			'bs-toggle': 'tooltip',
			'bs-placement': 'right',
			'bs-title': getFilterString(f),
		});
		const fName = createElement('.filter-name');
		fName.innerHTML = f.name;
		const db = createElement('button.delete-button');
		filter.appendChild(db);
		const eb = createElement('button.edit-button');
		eb.addEventListener('click', loadFilter);
		db.addEventListener('click', (e) => {
			tt.hide();
			deleteFilter(e);
		});
		filter.appendChild(eb);
		filter.appendChild(fName);

		filterArea.appendChild(filter);
		const tt = new bootstrap.Tooltip(filter);
	});
});
activeFilter.addWatcher(filterId, (e) => {
	if (!e.detail.id) e.target.setAttribute('value', '');
	else e.target.setAttribute('value', e.detail.id);
});
activeFilter.addWatcher(filterName, (e) => {
	if (!e.detail.name) e.target.value = '';
	else e.target.value = e.detail.name;
});
const handleChangeBestWorst = (e) => {
	if (e.target.value === 'best') {
		keepN.setAttribute('max', 28);
		keepN.setAttribute('min', 10);
	} else {
		keepN.setAttribute('min', 1);
		keepN.setAttribute('max', 10);
	}
	keepN.value = '';
};
activeFilter.addWatcher(null, (state) => {
	hideAllTooltips();
	const evt = new CustomEvent('change');
	if (state.type === 'keep' || state.type === 'drop') {
		keepFilter.checked = true;
		keepDrop.selectedIndex = getElementArray(keepDrop, 'option').findIndex(
			(o) => o.value === state.type
		);
		const bestWorstIndex = getElementArray(bestWorst, 'option').findIndex(
			(o) =>
				o.value ===
				(isNaN(state.keepValue) || state.keepValue > 0 ? 'best' : 'worst')
		);
		bestWorst.selectedIndex = bestWorstIndex || 0;
		handleChangeBestWorst({ target: bestWorst });
		keepN.value = isNaN(Number(state.keepValue))
			? null
			: Math.abs(state.keepValue);

		const dataItemIndex = getElementArray(
			bestWorstDataItems,
			'option'
		).findIndex((o) => o.value === state.dataItem);
		bestWorstDataItems.selectedIndex = dataItemIndex || 0;
		compareN.value = null;
		keepFilter.dispatchEvent(evt);
	} else {
		dataFilter.checked = true;
		compareN.value = state.dataValue;
		keepN.value = null;
		comparatorDataItems.selectedIndex = getElementArray(
			comparatorDataItems,
			'option'
		).findIndex((o) => o.value === state.dataItem);
		comparators.selectedIndex = getElementArray(
			comparators,
			'option'
		).findIndex((o) => o.value === state.comparator);
		dataFilter.dispatchEvent(evt);
	}
});
saveFilter.addEventListener('click', () => {
	const state = activeStat.getState();
	const filters = state.filters;
	const stats = statList.getState();
	if (!filterName.value) return showMessage('error', 'Filter name is required');
	if (
		filters.some((f) => f.name === filterName.value && f.id !== filterId.value)
	)
		return showMessage('error', 'Duplicate filter names are not allowed');

	const name = filterName.value;
	if (!name) return showMessage('error', 'Filter name is required');
	let type = document.querySelector(
		'input[type="radio"][name="filter-type"]:checked'
	)?.value;
	if (type === 'keep') type = keepDrop.value;

	if (!type) return showMessage('error', 'Choose a filter type');

	const dataItemSelect =
		type === 'data' ? comparatorDataItems : bestWorstDataItems;
	const dataItem = dataItemSelect?.value || '';
	if (type === 'data' && !dataItem)
		return showMessage('error', 'You must pick a data item for this filter');
	const si = dataItemSelect.selectedIndex;
	const dataItemName = dataItemSelect.options[si].getAttribute('data-display');

	let keepValue = Number(keepN.value);
	if (type === 'keep' && (keepValue <= 0 || isNaN(keepValue)))
		return showMessage(
			'error',
			'Invalid value for number of results to keep/drop'
		);
	if (type === 'keep' || type === 'drop') {
		if (bestWorst.value === 'worst') keepValue = -keepValue;
	}

	const dataValue = Number(compareN.value);
	if (type === 'data' && isNaN(Number(dataValue)))
		return showMessage('error', 'Invalid value data item comparison');

	const comparator = type === 'data' ? comparators.value : '';

	const body = {
		id: activeFilter.getState().id || crypto.randomUUID(),
		name: filterName.value,
		type,
		dataItem,
		dataItemName,
		keepValue: type === 'data' ? null : keepValue,
		comparator,
		dataValue: type === 'data' ? dataValue : null,
	};

	filters.push(body);
	activeStat.setState(state);
	activeFilter.setState(initialFilter);
	modalTransition(filterModal, statModal);
});

bestWorst.addEventListener('change', handleChangeBestWorst);
closeFilter.addEventListener('click', () => {
	activeFilter.setState(initialFilter);
	modalTransition(filterModal, statModal);
});
newFilter.addEventListener('click', () => {
	modalTransition(statModal, filterModal);
});

//mostly calculation stuff
const handleMoveStat = (e) => {
	const game = e.target.closest('.accordion-item')?.getAttribute('data-game');
	const id = e.target.closest('.custom-stat')?.getAttribute('data-id');
	if (!game || !id) return;
	const direction = e.target.classList.contains('move-up') ? -1 : 1;

	const stats = statList.getState();

	stats.some((g) => {
		if (g.game !== game) return false;
		const oldIndex = g.stats.findIndex((s) => s.id === id);
		const newIndex = oldIndex + direction;
		if (
			oldIndex >= 0 &&
			oldIndex < g.stats.length &&
			newIndex >= 0 &&
			newIndex < g.stats.length
		) {
			[g.stats[oldIndex], g.stats[newIndex]] = [
				{ ...g.stats[newIndex] },
				{ ...g.stats[oldIndex] },
			];
		}
		return true;
	});
	hideAllTooltips();
	statList.setState(stats);
};
const handleDeleteStat = (e) => {
	hideAllTooltips();
	const statDiv = e.target.closest('.custom-stat');
	if (!statDiv) return;
	const id = statDiv.getAttribute('data-id');
	if (!id) return;
	deleteId.value = id;
	const settingDiv = e.target.closest('.accordion-item');
	if (!settingDiv) return;
	const game = settingDiv.getAttribute('data-game');
	if (!game) return;
	deleteGame.value = game;
};
const deleteStat = () => {
	const game = deleteGame?.value;
	const id = deleteId?.value;
	if (!game || !id) return;
	statList.setState((prev) => {
		return prev.map((g) => {
			if (g.game !== game) return g;
			return {
				...g,
				stats: g.stats.filter((s) => s.id !== id),
			};
		});
	});
	const statDiv = document.querySelector(
		`.accordion-item[data-game="${game}"] .custom-stat[data-id="${id}"]`
	);
	statDiv.remove();
	deleteStatModal.hide();
	hideAllTooltips();
};

const selects = getElementArray(document, '#sort-data-item, #data-items');
const populateDataItems = (game) => {
	if (!game) return;
	gameName.value = game;
	const dataItems = gameList.find((g) => g.name === game)?.dataItems;
	if (!dataItems) return;
	selects.forEach((s) => {
		s.innerHTML = '';
		dataItems.forEach((d) => {
			const opt = createElement('option', { display: d.display });
			opt.innerHTML = d.display;
			opt.value = d.name;
			s.appendChild(opt);
		});
	});
};
const handleEditStat = (e) => {
	const tile = e.target.closest('.custom-stat');
	const id = tile?.getAttribute('data-id');
	const game = e.target.closest('.accordion-item')?.getAttribute('data-game');
	populateDataItems(game);
	if (!tile || !id || !game) return;
	const stats = statList.getState();
	const stat = stats
		.find((g) => g.game === game)
		?.stats.find((s) => s.id === id);
	if (!stat) {
		showMessage('error', 'Could not find stat');
		return tile.remove();
	}
	gameName.value = stat.game;
	activeStat.setState({
		...stat,
		filters: [
			...stat.filters.map((f) => {
				return { ...f };
			}),
		],
	});
	statModal.show();
};
const createStat = (stat) => {
	const customStat = createElement({
		selector: '.custom-stat',
		children: [
			{
				selector: 'button.move-down',
				eventListeners: {
					click: handleMoveStat,
				},
			},
			{
				selector: 'button.move-up',
				eventListeners: { click: handleMoveStat },
			},
			{
				selector: 'button.delete-button',
				eventListeners: { click: handleDeleteStat },
				attributes: {
					'bs-toggle': 'modal',
					'bs-target': '#delete-stat-modal',
				},
			},
			{
				selector: 'button.edit-button',
				eventListeners: { click: handleEditStat },
			},
			'.custom-stat-name',
		],
		attributes: {
			id: stat.id,
			'bs-toggle': 'tooltip',
			'bs-placement': 'top',
			'bs-title': stat.description,
		},
	});
	customStat.querySelector('.custom-stat-name').innerHTML = stat.name;
	new bootstrap.Tooltip(customStat);
	return customStat;
};
statList.addWatcher(null, (state) => {
	hideAllTooltips();
	state.forEach((el) => {
		const area = document.querySelector(
			`.accordion-item[data-game="${el.game}"] .custom-stats-container`
		);
		if (!area) return;
		el.stats.forEach((stat) => {
			let existingStat = area.querySelector(
				`.custom-stat[data-id="${stat.id}"]`
			);
			//create it if it's not already there
			if (!existingStat) existingStat = createStat(stat);
			// set the name if necessary
			else {
				const nameTag = existingStat.querySelector('.custom-stat-name');
				nameTag.innerHTML = stat.name;
				existingStat.setAttribute('data-bs-title', stat.description);
				new bootstrap.Tooltip(existingStat);
			}
			//make sure they're in the right order
			area.appendChild(existingStat);
		});
	});
	//disable the move up/move down buttons for the first/last elements
	const areas = getElementArray(
		document,
		'.accordion-item .custom-stats-container'
	);
	areas.forEach((a) => {
		const moveButtons = getElementArray(a, 'button.move-up, button.move-down');
		const first = a.querySelector('.custom-stat:first-child button.move-up');
		const last = a.querySelector('.custom-stat:last-child button.move-down');
		moveButtons.forEach((b) => (b.disabled = b === first || b === last));
	});
});

calculationSel.addEventListener('change', (e) => {
	if (!e.target.value) calculationConstant.classList.remove('d-none');
	else calculationConstant.classList.add('d-none');
});

const setActiveItem = (e) => {
	e.stopPropagation();
	const currentActive = document.querySelector('.active');
	if (currentActive) currentActive.classList.remove('active');
	const content = e.target.closest('.content');
	if (content) content.classList.add('active');
};

//ensure the correct equation is rendered in the calculation area
const fillDiv = (el, obj) => {
	if (
		!el.classList.contains('content') &&
		!el.classList.contains('calculation-container')
	)
		return;

	if (!obj?.operator) return;
	//expected (or need-to-be-appended) children in this element
	const expectedChildren = calculationItemChildren[obj.operator];
	if (!expectedChildren) return;
	//actual children in this element
	const children = el.children;
	//if there is a length mismatch, empty out this div and refill it
	if (children.length !== 0 && children.length !== expectedChildren.length) {
		el.innerHTML = '';
		return fillDiv(el, obj);
	}
	//if this div is empty, fill it with the this operator's div
	if (children.length === 0) {
		el.appendChild(
			createElement(
				{
					selector: `.${obj.operator}.operator`,
					children: expectedChildren.map((ch) => {
						return {
							selector: ch,
							children: ch === 'span' ? [] : ['.content'],
						};
					}),
				},
				{
					id: obj.id,
				}
			)
		);
		const contents = getElementArray(el, '.content');
		//if there are children we should fill in, do so
		contents.forEach((c, i) => {
			// if (i === 0) setActiveItem({ target: c, stopPropagation: () => {} });
			c.addEventListener('click', setActiveItem);
			if (obj.operator !== 'data' && obj.operator !== 'constant')
				fillDiv(c, obj.values[i]);
			else if ((typeof obj.values[i]).toLowerCase() === 'object') {
				if (isEmptyObject(obj)) {
					const toRemove = c.closest('.operator');
					toRemove.remove();
				} else if (obj.values[i].dataItem && obj.values[i].display) {
					c.innerHTML = obj.values[i].display;
				}
			} else if ((typeof obj.values[i]).toLowerCase() === 'number') {
				c.innerHTML = obj.values[i];
			}
		});
		return;
	}
	//if it is not empty, and the length of the expected children is the same as the length of the actual children, verify each child has the correct type
	if (
		!expectedChildren.every((ec, i) => {
			const child = children.item(i);
			if (ec === 'span' && child.tagName.toLowerCase() !== 'span') return false;
			else {
				const spl = ec.split('.');
				if (spl.length !== 2) return false;
				if (!child.classList.contains(spl[1])) return false;
			}
		})
	) {
		//if something is wrong, empty the div and refill it
		el.innerHTML = '';
		return fillDiv(el, obj);
	}
	//we have the correct order of things...dive into the .content div of each child, and fill it based on the children of this object
	else {
		let ind = 0;
		for (var i = 0; i < children.length; i++) {
			const child = children.item(i);
			if (child.tagName.toLowerCase() === 'span') continue;
			let content = child.querySelector('.content');
			if (!content) {
				child.innerHTML = '';
				content = createElement('.content');
				child.appendChild(content);
			}
			fillDiv(content, obj.values[ind]);
			ind++;
		}
	}
};
activeCalculation.addWatcher(null, (state) => {
	hideAllTooltips();
	if (!state || !state.values) {
		calculationPreview.innerHTML = '';
		calculationArea.innerHTML = '';
		calculationSel.selectedIndex = 0;
		calculationConstant.classList.remove('d-none');
		return;
	}

	fillDiv(calculationPreview, state);
});

const setActiveContent = (content) => {
	let state = activeCalculation.getState();
	const active = document.querySelector('.active');
	if (!active) return showMessage('error', 'Nothing is selected.');
	//active .content element's parent (which should be a .first, .second, .numerator, etc.)
	const parent = active.parentElement;
	//typically the operator, which holds the data-id for the operation
	const operator = active.closest('[data-id]');
	if (!operator || !parent) return;
	//figure out which child index this content div is under
	const divs = Array.from(operator.children, (x) => x).filter(
		(d) => d.tagName.toLowerCase() === 'div'
	);
	const index = divs.findIndex((d) => d === parent);
	//get a path to this element, so we can set the right part of the state
	const stack = [operator.getAttribute('data-id')];
	let curr = operator.parentElement;
	while (curr !== calculationPreview) {
		let next = curr.closest('[data-id]');
		stack.push(next.getAttribute('data-id'));
		curr = next.parentElement;
	}

	curr = state;
	let parentObj;
	let ind;
	stack.pop();
	while (stack.length > 0) {
		const idToFind = stack.pop();
		ind = curr.values.findIndex((v) => v.id === idToFind);
		if (ind < 0) return;
		parentObj = curr;
		curr = curr.values[ind];
	}
	//if we are setting active content to {} (empty object), set the parent object's appropriate child to {},
	// or set the whole calc to null if no parent (we are deleting the root operator)
	if (curr.operator === 'data' && isEmptyObject(content)) {
		if (parentObj) parentObj.values[ind] = {};
		else state = null;
	} else {
		//at the root node, and the top operator is a data operator, just reset the
		if (!parentObj && state.operator === 'data') state = content;
		//if it's a data operator, there is no content to replace, so replace it in its parent node as well
		else if (curr.operator === 'data') {
			parentObj.values[ind] = content;
		} else curr.values[index] = content;
	}
	activeCalculation.setState(state);
};

const handleAddOperation = (e) => {
	const button = e.target.closest('button');
	const id = button.getAttribute('id').split('-');
	if (id.length !== 2 || !calculationItemChildren[id[1]])
		return showMessage('error', 'Invalid item selected');
	let className = id[1];
	const children = calculationItemChildren[className];

	let state = activeCalculation.getState();
	const isEmpty = !state || isEmptyObject(state);

	let fill = {};
	if (className === 'data') {
		const ind = calculationSel.selectedIndex;
		const value = calculationSel.value;
		if (!value) {
			const val = Number(calculationConstant.value);
			className = 'constant';
			if (isNaN(val))
				return showMessage('error', 'You must specify a constant value.');
			fill = val;
			calculationConstant.value = '';
		} else {
			const selected = calculationSel.options[ind];
			const display = selected.getAttribute('data-display');
			const dataItem = selected.getAttribute('value');
			fill = {
				display,
				dataItem,
			};
		}
	}
	const newId = crypto.randomUUID();
	if (isEmpty)
		activeCalculation.setState({
			operator: className,
			id: newId,
			values: new Array(
				children.reduce((p, c) => p + (c === 'span' ? 0 : 1), 0)
			).fill(fill),
		});
	else {
		const children = calculationItemChildren[className];
		if (!children) return;
		setActiveContent({
			operator: className,
			id: newId,
			values: new Array(
				children.reduce((p, c) => p + (c === 'span' ? 0 : 1), 0)
			).fill(fill),
		});
	}
	const newOperator = document.querySelector(`[data-id="${newId}"] .content`);
	if (newOperator)
		setActiveItem({ target: newOperator, stopPropagation: () => {} });
};
[...operators, ...aggregators].forEach((b) => {
	b.addEventListener('click', handleAddOperation);
});
deleteItem.addEventListener('click', () => {
	setActiveContent({});
});

activeCalculation.addWatcher(clearAll, (e) => {
	e.target.disabled = e.detail === null;
});
clearAll.addEventListener('click', () =>
	modalTransition(calculationModal, clearAllModal)
);
cancelClearAll.addEventListener('click', () =>
	modalTransition(clearAllModal, calculationModal)
);
confirmClearAll.addEventListener('click', () => {
	activeCalculation.setState(null);
	modalTransition(clearAllModal, calculationModal);
});

addData.addEventListener('click', handleAddOperation);

//make sure nothing in the calculation is empty
const verifyCalculation = (calc) => {
	if (!calc) return { status: 1, message: 'Calculation is empty' };
	//make sure nothing is empty
	if ((typeof calc).toLowerCase() === 'number') return { status: 0 };
	else if (calc.dataItem) return { status: 0 };
	else if (isEmptyObject(calc))
		return {
			status: 1,
			message: 'There is an empty object in this calculation.',
		};
	else if (!calc.values || !Array.isArray(calc.values))
		return {
			status: 1,
			message:
				'Corrupt data found in calculation. Press "clear all" and try again. If the problem persists, please contact the developer.',
		};
	else {
		let msg;
		const ver = calc.values.every((v) => {
			const res = verifyCalculation(v);
			if (res.status === 0) return true;
			else {
				msg = res.message;
				return false;
			}
		});
		if (ver) return { status: 0 };
		return {
			status: 1,
			message: msg,
		};
	}
};

//make sure the calculation resolves to a number (and not an array)
const verifyNumber = (calc) => {
	const operators = [
		'add',
		'subtract',
		'multiply',
		'divide',
		'max',
		'min',
		'sqrt',
		'power',
		'abs',
	];
	const aggregators = ['sum', 'count', 'avg', 'constant'];
	if (calc.dataItem) return false;
	else if ((typeof calc).toLowerCase() === 'number') return true;
	else if (isEmptyObject(calc)) return false;
	else if (calc.operator === 'data') {
		if (!calc.values || !Array.isArray(calc.values)) return false;
		return verifyNumber(calc.values[0]);
	} else if (aggregators.includes(calc.operator)) return true;
	else if (operators.includes(calc.operator)) {
		if (!calc.values || !Array.isArray(calc.values)) return false;
		return calc.values.every((v) => verifyNumber(v));
	} else return false;
};

activeCalculation.addWatcher(saveCalculation, (e) => {
	e.target.disabled = true;
	if (!e.detail) return;
	const vc = verifyCalculation(e.detail);
	if (vc.status !== 0) return;
	const vn = verifyNumber(e.detail);
	if (!vn) return;
	e.target.disabled = false;
});
//save the calculation
saveCalculation.addEventListener('click', () => {
	const state = activeCalculation.getState();
	const verifyCalc = verifyCalculation(state);
	if (verifyCalc.status !== 0)
		return showMessage('error', verifyCalc.message, 2000);
	const verifyNum = verifyNumber(state);
	if (!verifyNum)
		return showMessage(
			'error',
			'This calculation has an unaggregated data item in it.',
			2000
		);
	//put the calculation in the main area
	const active = calculationPreview.querySelector('.active');
	if (active) active.classList.remove('active');
	calculationArea.innerHTML = calculationPreview.innerHTML;
	//save it to the active stat
	activeStat.setState((prev) => {
		return {
			...prev,
			calc: state,
		};
	});
	modalTransition(calculationModal, statModal);
});
closeCalculation.addEventListener('click', () => {
	activeCalculation.setState(null);
	activeStat.setState(initialStat);
	modalTransition(calculationModal, statModal);
});
editCalculation.addEventListener('click', () => {
	const state = activeStat.getState();
	activeCalculation.setState(state.calc);
	modalTransition(statModal, calculationModal);
});

activeStat.addWatcher(null, (state) => {
	hideAllTooltips();
	if (state.id) statId.value = state.id;
	else statId.value = '';
	statName.value = state.name;
	statHeader.value = state.heading;
	statDescription.value = state.description;
	allowFillIn.checked = state.allowFillIn;
	defaultSort.checked = state.defaultSort;
	decimalPlaces.value = Number(state.decimalPlaces) || 0;
	if (state.sortOrder === -1) sortOrder[1].checked = true;
	else sortOrder[0].checked = true;
	gameName.value = state.game;
	activeCalculation.setState(state.calc);
	calculationArea.innerHTML = calculationPreview.innerHTML;
});

const handleSetState = (attr) => {
	return (e) => {
		activeStat.setState((prev) => {
			const num = Number(e.target.value);
			prev[attr] = isNaN(num) ? e.target.value : num;
			return prev;
		});
	};
};
gameName.addEventListener('change', handleSetState('game'));
statName.addEventListener('change', handleSetState('name'));
statHeader.addEventListener('change', handleSetState('heading'));
statDescription.addEventListener('change', handleSetState('description'));
allowFillIn.addEventListener('change', () => {
	activeStat.setState((prev) => {
		return {
			...prev,
			allowFillIn: allowFillIn.checked,
		};
	});
});
defaultSort.addEventListener('change', () => {
	activeStat.setState((prev) => {
		return {
			...prev,
			defaultSort: defaultSort.checked,
		};
	});
});
sortOrder.forEach((s) =>
	s.addEventListener('change', handleSetState('sortOrder'))
);
resultFormat.forEach((r) =>
	r.addEventListener('change', handleSetState('format'))
);
decimalPlaces.addEventListener('change', () => {
	activeStat.setState((prev) => {
		return {
			...prev,
			decimalPlaces: Number(decimalPlaces.value) || 0,
		};
	});
});

closeStat.addEventListener('click', () => {
	activeStat.setState({ ...initialStat, filters: [] });
	const stats = statList.getState();
});

confirmDeleteStat.addEventListener('click', deleteStat);
cancelDeleteStat.addEventListener('click', () => {
	deleteGame.value = '';
	deleteId.value = '';
});

const findDataItemsHelper = (calc, items) => {
	if (calc.operator === 'data' && !items.includes(calc.values[0].dataItem))
		return [...items, calc.values[0].dataItem];
	let toReturn = [...items];
	if (calc.values && Array.isArray(calc.values))
		calc.values.forEach((v) => {
			toReturn = [...toReturn, ...findDataItemsHelper(v, [])];
		});
	return toReturn;
};

const findDataItems = (calc) => {
	return findDataItemsHelper(calc, []);
};

saveStat.addEventListener('click', () => {
	const state = activeStat.getState();
	if (!state.name) return showMessage('error', 'Stat name is required');
	else if (!state.heading)
		return showMessage('error', 'Stat heading is required');
	else if (!state.description)
		return showMessage('error', 'Stat description is required');

	if (!gameName.value)
		return showMessage(
			'error',
			'Something went wrong. Please refresh and try again. If the problem persists, contact the developer.'
		);

	const stats = statList.getState();
	if (
		stats.some((s) => {
			if (s.game !== gameName.value) return false;
			return s.stats.some((stat) => {
				return stat.name === state.name && stat.id !== state.id;
			});
		})
	)
		return showMessage('error', 'Duplicate name detected for stat');
	if (
		stats.some((s) => {
			if (s.game !== gameName.value) return false;
			return s.stats.some((stat) => {
				return stat.heading === state.heading && stat.id !== state.id;
			});
		})
	)
		return showMessage('error', 'Duplicate header detected for stat');

	// if the stat uses any data items, either all of them or none of them must be filtered using keep/drop data items
	// for example, a quordle stat that uses the "sum of 4" data item and the "score" data item can't just have a filter on the "score" item
	// because if any results are tied for being cut off, we can't decide which ones to cut, or if they should be treated equally based on the sum of 4.
	const calcDataItems = findDataItems(state.calc);
	const filterDataItems = state.filters.map((f) =>
		f.type === 'data' ? '' : f.dataItem
	);

	const dataCheck = calcDataItems.map((d) => filterDataItems.includes(d));
	if (dataCheck.length > 0) {
		if (dataCheck.some((dc) => dc !== dataCheck[0])) {
			const badDataItem = calcDataItems[dataCheck.findIndex((dc) => !dc)];
			return showMessage(
				'error',
				`Your calculation does not filter on ${badDataItem}. You must have a drop/keep filter on all data items in your calculation, or none of them.`,
				2000
			);
		}
	}
	//if there's no ID, or the id doesn't match anything, push it to the table
	if (
		!state.id ||
		!stats.some((g) => {
			if (g.game === gameName.value) {
				let toReturn = false;
				g.stats = g.stats.map((s) => {
					if (s.id !== state.id) return s;
					toReturn = true;
					return {
						...state,
						game: gameName.value,
					};
				});
				return toReturn;
			}
			return false;
		})
	) {
		stats.some((g) => {
			if (g.game === gameName.value) {
				const id = crypto.randomUUID();
				g.stats.push({
					...state,
					id,
					game: gameName.value,
				});
				state.id = id;
				return true;
			}
			return false;
		});
	}

	//if default sort was checked, set everything else for that game as not the default sort
	if (state.defaultSort) {
		stats.some((stat) => {
			if (stat.game === stat.game) {
				stat.stats.forEach((s) => {
					if (s.id !== state.id) s.defaultSort = false;
				});
				return true;
			}
			return false;
		});
	}
	//we matched something (in the if-statement above), or we pushed it (in the block). save the data either way.
	statList.setState(stats);

	//clear the active stat and calculation
	activeStat.setState({ ...initialStat, filters: [] });
	activeCalculation.setState(null);
	statModal.hide();
});

const handleSaveSettings = () => {
	const stats = statList.getState();
	const settings = getElementArray(document, '.setting-container').map((c) => {
		const name = c.getAttribute('data-name');
		const settings = getElementArray(c, 'input, select').map((i) => {
			return {
				name: i.getAttribute('name'),
				value: i.value,
			};
		});
		return { name, settings };
	});

	const handler = (res) => {
		console.log(res);
		if (res.status === 'success') {
			showMessage('info', 'Successfully saved data');
			return;
		}
		showMessage('error', res.message);
	};
	const arr = location.href.split('/');
	let token = arr.pop();
	while (token === '') token = arr.pop();
	handleRequest(
		`/api/v1/wordle/settings/${token}`,
		'PATCH',
		{
			settings,
			stats,
		},
		handler
	);
};

saveButtons.forEach((s) => {
	s.addEventListener('click', handleSaveSettings);
});
const setGameName = (e) => {
	const game = e.target.getAttribute('data-game');
	activeStat.setState((prev) => {
		return {
			...prev,
			game,
		};
	});
};
newStatButtons.forEach((b) => b.addEventListener('click', setGameName));

document.addEventListener('data-update', (evt) => {
	const data = evt.detail;
	data.dataItems.forEach((d) => {
		if (
			!data.serverData.customStats.some((cs) => {
				if (!Array.isArray(cs.stats)) cs.stats = [];
				return cs.game === d.game;
			})
		) {
			data.serverData.customStats.push({
				game: d.game,
				stats: [],
			});
		}
	});
	statList.setState(data.serverData.customStats);
});
