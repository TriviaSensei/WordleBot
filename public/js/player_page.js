const monthSelect = document.querySelector('#month-select');
import { createElement } from './utils/createElementFromSelector.js';
import { getElementArray } from './utils/getElementArray.js';
import { handleRequest } from './utils/requestHandler.js';
import { showMessage } from './utils/messages.js';

const handleImageError = (e) => {
	e.target.setAttribute('src', '/img/avatar_default.svg');
	e.onerror = null;
};

const dateRanges = getElementArray(document, '.date-range');
let timezone;
document.addEventListener('DOMContentLoaded', () => {
	const dataArea = document.querySelector('#data-area');
	let data = JSON.parse(dataArea.getAttribute('data'));
	console.log(data);
	const tt = getElementArray(document, '[data-bs-toggle="tooltip"]');
	tt.forEach((t) => new bootstrap.Tooltip(t));
	timezone = data.timezone || 'America/New_York';
	dataArea.remove();
	// populate the month selector
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
	const createdDate = data.firstDate
		? moment
				.tz(new Date(data.firstDate), timezone)
				.format()
				.split('-')
				.slice(0, 2)
				.map((x) => parseInt(x))
		: [...currentDateET];

	// const opt = createElement('option');
	// opt.setAttribute('value', `all`);
	// opt.innerHTML = `All-time`;

	// monthSelect.appendChild(opt);
	let iter = 0;
	do {
		iter++;
		const opt = createElement('option');
		opt.setAttribute('value', `${currentDateET[0]}-${currentDateET[1]}`);
		opt.innerHTML = `${months[currentDateET[1] - 1]} ${currentDateET[0]}${
			monthSelect.options.length === 0 ? ' (current)' : ''
		}`;

		monthSelect.appendChild(opt);
		currentDateET[1] = currentDateET[1] === 1 ? 12 : currentDateET[1] - 1;
		if (currentDateET[1] === 12) currentDateET[0]--;
	} while (
		iter < 100 &&
		(currentDateET[0] > createdDate[0] ||
			(currentDateET[0] === createdDate[0] &&
				currentDateET[1] >= createdDate[1]))
	);
	const selectedValue = `${data.gameData.year}-${data.gameData.month}`;
	monthSelect.selectedIndex = getElementArray(monthSelect, 'option').findIndex(
		(o) => o.value === selectedValue
	);

	const panes = getElementArray(document, '.tab-pane');
	panes.forEach((p) => {
		const evt = new CustomEvent(`data-update`, { detail: data });
		p.dispatchEvent(evt);
	});

	const getData = (e) => {
		if (!e.target.value) return;
		const handler = (res) => {
			if (!res.data) return;
			if (res.status !== 'success') return showMessage('error', res.message);
			let noneShown = true;
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
				getElementArray(headerRow, '.summary-header, .result-header').forEach(
					(h) => h.remove()
				);
				getElementArray(table, '.summary-cell').forEach((c) => c.remove());
				//add the new ones
				let n = d.startNumber === null ? 1 : d.startNumber;
				const startDt = new Date(
					moment.tz(`${res.data.gameData.startDate} 00:00`, timezone)
				);
				const maxN = d.startNumber ? d.startNumber + d.days : d.days + 1;
				for (var i = n; i < maxN; i++) {
					const dt = new Date(startDt);
					dt.setDate(dt.getDate() + i - n);
					const dateStr = moment.tz(dt, timezone).format('YYYY-MM-DD');
					const cc = createElement('.cell-container');
					const lc = createElement('.label-container', {
						'bs-toggle': 'tooltip',
						'bs-placement': 'top',
						'bs-title': dateStr,
					});
					const newHeader = createElement('th.rotate.result-header', {
						date: dateStr,
					});
					lc.innerHTML = i;
					cc.appendChild(lc);
					newHeader.appendChild(cc);

					if (d.startNumber !== null) newHeader.setAttribute('data-number', i);
					new bootstrap.Tooltip(lc);

					headerRow.append(newHeader);
				}

				//remove result rows
				getElementArray(table, '.standings-row').forEach((r) => r.remove());
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
						const newCell = d
							? createElement('td.result-cell')
							: createElement('td.result-cell.blank');
						if (d) {
							newCell.setAttribute('data', JSON.stringify(d));
						}
						newRow.appendChild(newCell);
					});

					table.appendChild(newRow);
				});

				//remove summary rows
				getElementArray(table, '.summary-row').forEach((r) => r.remove());
			});
			if (res?.data?.gameData?.startDate && res?.data?.gameData?.endDate)
				dateRanges.forEach(
					(dr) =>
						(dr.innerHTML = `${res.data.gameData.startDate} to ${res.data.gameData.endDate}`)
				);
			const evt = new CustomEvent('data-update', { detail: res.data });
			panes.forEach((p) => p.dispatchEvent(evt));
		};
		if (data) {
			handler({ status: 'success', data });
			data = null;
			return;
		}
		const playerId = document.querySelector('#user-id')?.value;
		if (!playerId) return;
		const [year, month] = e.target.value.split('-');
		if (!year || !month) return;
		const url = `/api/v1/wordle/players/${playerId}/${year}/${month}`;
		handleRequest(url, 'GET', null, handler);
	};
	monthSelect.addEventListener('change', getData);
	getData({ target: monthSelect });
});
