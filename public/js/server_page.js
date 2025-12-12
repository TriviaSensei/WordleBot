const monthSelect = document.querySelector('#month-select');
import { createElement } from './utils/createElementFromSelector.js';
import { getElementArray } from './utils/getElementArray.js';
import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';
import { fillIns } from './fillIns.js';
import { gameList } from './gameList.js';

const dateRanges = getElementArray(document, '.date-range');
const csvButton = document.querySelector('#csv-button');
let timezone;

const handleImageError = (e) => {
	e.target.setAttribute('src', '/img/avatar_default.svg');
	e.onerror = null;
};

const getComparatorFunction = (getData, comparator, val) => {
	if (isNaN(Number(val))) return null;
	const comparatorFunctions = {
		lte: (a) => getData(a) <= val,
		lt: (a) => getData(a) < val,
		eq: (a) => getData(a) === val,
		gt: (a) => getData(a) > val,
		gte: (a) => getData(a) >= val,
	};

	if (!comparatorFunctions[comparator]) return (data) => data;
	const comp = comparatorFunctions[comparator];
	return (data) => {
		return data.filter(comp);
	};
};

const setDataItems = (calc, game) => {
	if (calc.operator === 'data') {
		const dataItem = gameList
			.find((g) => g.name === game)
			?.dataItems?.find((d) => d.name === calc.values[0].dataItem);
		if (!dataItem) return calc;
		calc.values[0].getData = dataItem.getData;
		return calc;
	} else if (calc.values) {
		calc.values = calc.values.map((c) => setDataItems(c, game));
		return calc;
	} else return calc;
};

/**
 *
 * @param {string representing the name of the game} game
 * @param {the filter object} filter
 * @returns an object
 * {
 * 		filter: the original filter object
 * 		sortFunction: the function that sorts the data in the correct order before subsetting it
 * 		filterFunction: a function that takes the entire data array, and returns the filtered data
 * }
 */
const getFilterFunction = (game, filter) => {
	const dataItem = gameList
		.find((g) => g.name === game)
		?.dataItems?.find((d) => d.name === filter.dataItem);
	//if we are missing either the filter or the data item, return an object that will just do nothing to the data
	if (!filter || !dataItem)
		return () => {
			return {
				filter,
				filterFunction: (data) => data,
			};
		};
	//for data filters, generate the comparator function, and there is no sort needed
	if (filter.type === 'data') {
		const cf = getComparatorFunction(
			dataItem.getData,
			filter.comparator,
			filter.dataValue
		);
		return {
			filter,
			sortFunction: null,
			filterFunction: cf ? cf : (data) => data,
		};
	} else {
		//dataItem.getData gets the relevant data from the document
		//dataItem.sortOrder = 1 tells us that the default sort order for this item is ascending (lower values are better)

		//if we are dropping the worst or keeping the best, sort in the normal sort order, otherwise, reverse the sort order
		const fact =
			(filter.type === 'drop' && filter.keepValue < 0) ||
			(filter.type === 'keep' && filter.keepValue > 0)
				? 1
				: -1;
		return {
			filter,
			sortFunction: (a, b) => {
				const diff = dataItem.getData(a) - dataItem.getData(b);
				return fact * diff * dataItem.sortOrder;
			},
			filterFunction: (data, isLast) => {
				//this is a drop or keep filter. The data should have already been sorted
				let dataCopy = [...data];
				//number of data points to keep (even if it's a drop filter...I want to know how many pieces of data to keep for each player)
				let dataToKeep = 0;
				if (filter.type === 'drop') {
					//the sign of the keepvalue is just an indication of whether to keep/drop the best (positive) or worst (negative) values.
					dataToKeep = Math.max(0, data.length - Math.abs(filter.keepValue));
				} else if (filter.type === 'keep') {
					dataToKeep = Math.min(data.length, Math.abs(filter.keepValue));
				}
				if (dataToKeep === 0) return [];

				//cutoff value for data to keep, in case we have ties
				const valueToKeep = dataItem.getData(dataCopy[dataToKeep - 1]);

				// console.log(dataCopy);
				// console.log(
				// 	`Keeping ${dataToKeep} rows, or ${dataItem.display} of ${valueToKeep}`
				// );
				//take the first [N] pieces of data, plus any ties with the last value
				return dataCopy.filter((d, i) => {
					if (!isLast)
						return i < dataToKeep || dataItem.getData(d) === valueToKeep;
					else return i < dataToKeep;
					// console.log(`${JSON.stringify(d)} - ${toKeep ? 'Keep' : 'Drop'}`);
				});
			},
		};
	}
};

document.addEventListener('DOMContentLoaded', () => {
	const dataArea = document.querySelector('#data-area');
	let data = JSON.parse(dataArea.getAttribute('data'));
	timezone = data.timezone || 'America/New_York';
	dataArea.remove();
	//populate the month selector
	const months = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December',
	];
	const currentDateET = moment
		.tz(new Date(), timezone)
		.format()
		.split('-')
		.slice(0, 2)
		.map((x) => parseInt(x));
	const createdDate = data?.serverData?.created
		? moment
				.tz(new Date(data.serverData.created), timezone)
				.format()
				.split('-')
				.slice(0, 2)
				.map((x) => parseInt(x))
		: [...currentDateET];

	do {
		const opt = createElement('option');
		opt.setAttribute('value', `${currentDateET[0]}-${currentDateET[1]}`);
		opt.innerHTML = `${months[currentDateET[1] - 1]} ${currentDateET[0]}${
			monthSelect.options.length === 0 ? ' (current)' : ''
		}`;

		monthSelect.appendChild(opt);
		currentDateET[1] = currentDateET[1] === 1 ? 12 : currentDateET[1] - 1;
		if (currentDateET[1] === 12) currentDateET[0]--;
	} while (
		currentDateET[0] > createdDate[0] ||
		(currentDateET[0] === createdDate[0] && currentDateET[1] >= createdDate[1])
	);
	const selectedValue = `${data.gameData.year}-${data.gameData.month}`;
	monthSelect.selectedIndex = getElementArray(monthSelect, 'option').findIndex(
		(o) => o.value === selectedValue
	);
	const panes = getElementArray(document, '.tab-pane');

	const getData = (e) => {
		if (!e.target.value) return;
		const handler = (res) => {
			if (res.status !== 'success') return showMessage('error', res.message);
			let noneShown = true;
			if (res?.data?.gameData?.startDate && res?.data?.gameData?.endDate)
				dateRanges.forEach(
					(dr) =>
						(dr.innerHTML = `${res.data.gameData.startDate} to ${res.data.gameData.endDate}`)
				);

			res.data.gameData.data.forEach((d) => {
				const gameId = d.game.toLowerCase().split(' ').join('-');
				//show the tab/pane if there are results
				const [tab, button, pane] = [
					document.querySelector(`li.nav-item[data-game="${gameId}"]`),
					document.querySelector(`li.nav-item[data-game="${gameId}"] > button`),
					document.querySelector(`#${gameId}-tab-pane`),
				];

				if (d.results.length > 0) {
					[tab, button, pane].forEach((el) => el.classList.remove('d-none'));
					if (noneShown) {
						[tab, button, pane].forEach((el) => el.classList.add('active'));
						pane.classList.add('show');
						noneShown = false;
					} else {
						[tab, button, pane].forEach((el) => el.classList.remove('active'));
						pane.classList.remove('show');
					}
				} else {
					[tab, button, pane].forEach((el) => el.classList.add('d-none'));
				}
				const table = pane.querySelector('.standings-table');
				if (!table) return;
				//set top row headings
				const headerRow = table.querySelector('tr.header-row');
				if (!headerRow) return;
				//remove the existing headers
				getElementArray(
					headerRow,
					'.summary-header, .result-header, .blank-cell'
				).forEach((h) => h.remove());
				getElementArray(table, '.summary-cell').forEach((c) => c.remove());
				//add the new ones
				let n =
					d.startNumber === null || d.startNumber === undefined
						? 1
						: d.startNumber;
				const startDt = new Date(
					moment.tz(`${res.data.gameData.startDate} 00:00`, timezone)
				);
				const maxN = n + d.days;

				for (var i = n; i < maxN; i++) {
					const dt = new Date(startDt);
					dt.setDate(dt.getDate() + i - n);
					const dateStr = moment.tz(dt, timezone).format('YYYY-MM-DD');
					const newHeader = createElement('th.rotate.result-header', {
						date: dateStr,
					});
					const cc = createElement('.cell-container');
					const lc = createElement('.label-container', {
						'bs-toggle': 'tooltip',
						'bs-placement': 'top',
						'bs-title': dateStr,
					});
					lc.innerHTML = i;
					cc.appendChild(lc);
					newHeader.appendChild(cc);
					if (d.startNumber !== null) newHeader.setAttribute('data-number', i);
					new bootstrap.Tooltip(lc);
					headerRow.append(newHeader);
				}

				//remove result rows
				getElementArray(table, '.standings-row').forEach((r) => {
					r.remove();
				});
				//create new result rows
				d.results.forEach((player, i) => {
					const newRow = createElement(
						'tr.standings-row.py-1.position-relative',
						{ id: player.userId }
					);
					const c1 = createElement('td');
					c1.setAttribute('colspan', '2');
					const c1Inner = createElement('.w-100.h-100.d-flex.flex-row');
					c1.appendChild(c1Inner);
					const rc = createElement('.rank-cell');
					rc.innerHTML = i + 1;
					const pc = createElement('.picture-cell');
					const pcInner = createElement('.w-100.h-100.d-flex');
					const picLink = createElement('a.m-auto');
					const href = `/player/${player.userId}`;
					picLink.setAttribute('href', href);
					picLink.setAttribute('target', '_blank');
					const pic = createElement('img.m-auto', {
						'bs-toggle': 'tooltip',
						'bs-placement': 'right',
						'bs-title': player.globalName,
					});
					pic.addEventListener('error', handleImageError);

					pic.setAttribute(
						'src',
						player.avatar
							? `https://cdn.discordapp.com/avatars/${player.userId}/${player.avatar}.png`
							: `/img/avatar_default.svg`
					);

					picLink.appendChild(pic);
					pcInner.appendChild(picLink);
					pc.appendChild(pcInner);
					new bootstrap.Tooltip(pic);
					c1Inner.appendChild(rc);
					c1Inner.appendChild(pc);
					newRow.appendChild(c1);

					const c2 = createElement('td.name-cell.pe-2.fw-semibold');
					const nameLink = createElement('a');
					nameLink.setAttribute('href', href);
					nameLink.setAttribute('target', '_blank');
					nameLink.innerHTML = player.globalName;
					c2.appendChild(nameLink);
					newRow.appendChild(c2);

					player.data.forEach((d) => {
						const newCell = createElement('td.result-cell');
						if (d) {
							newCell.setAttribute('data-id', d._id);
							delete d._id;
							newCell.setAttribute('data', JSON.stringify(d));
						}
						newRow.appendChild(newCell);
					});

					table.appendChild(newRow);
				});

				const settings = res.data.serverData.settings.find(
					(s) => s.name === d.game
				)?.settings;
				const fillIn = settings
					? fillIns
							.find((f) => f.name === d.game)
							?.fillIns.find(
								(f) =>
									f.name === settings.find((s) => s.name === 'fillIn')?.value
							)
					: null;

				if (fillIn && fillIn.handleFillIn && settings)
					fillIn.handleFillIn(
						table,
						settings.find((s) => s.name === 'failureScore')
					);
				//remove summary rows
				getElementArray(table, '.summary-row').forEach((r) => r.remove());
			});
			panes.forEach((p) => {
				const game = p.getAttribute('data-game');
				const customStats = res.data.serverData.customStats.find(
					(s) => s.game === game
				);

				const evt = new CustomEvent('data-update', {
					detail: {
						...res.data,
						serverData: {
							...res.data.serverData,
							customStats: Array.isArray(customStats?.stats)
								? customStats.stats.map((s, i) => {
										const newCalc = setDataItems(s.calc, s.game);
										return {
											...s,
											filters: s.filters.map((f) => getFilterFunction(game, f)),
											evaluator: new Evaluator(newCalc, false),
										};
								  })
								: [],
						},
					},
				});

				p.dispatchEvent(evt);
				if (location.href.toLowerCase().indexOf('/server/delete') >= 0) {
					const evt2 = new CustomEvent('panes-updated');
					document.dispatchEvent(evt2);
				}
			});
		};
		if (data) {
			handler({ status: 'success', data });
			data = null;
			return;
		}
		const guildId = document.querySelector('#guild-id')?.value;
		if (!guildId) return;
		const [year, month] = e.target.value.split('-');
		if (!year || !month) return;
		const url = `/api/v1/wordle/servers/${guildId}/${year}/${month}`;

		handleRequest(url, 'GET', null, handler);
	};

	monthSelect.addEventListener('change', getData);

	const handleCSVButton = (e) => {
		const button =
			e?.target || document.querySelector('button.nav-link.active');
		if (!button) return (csvButton.disabled = true);

		const pane = document.querySelector(
			`${button.getAttribute('data-bs-target')}`
		);

		const cell = pane.querySelector('.result-cell');
		if (!cell) csvButton.disabled = true;
		else csvButton.disabled = false;
	};
	document.addEventListener('shown.bs.tab', handleCSVButton);
	handleCSVButton();
	getData({ target: monthSelect });
});
