const area = document.querySelector('#nyt-connections-tab-pane');

import { updateTable } from '../updateTable.js';
import { createElement } from '../utils/createElementFromSelector.js';
import { getPage } from '../utils/page.js';
import { gamesPlayed, gamesWon, winPercent, average } from './_general.js';
const colors = ['#f9df6e', '#a0c45a', '#b1c4ef', '#ba81c4'];
area.addEventListener('data-update', (e) => {
	const table = area.querySelector('.standings-table');
	const page = getPage();
	const penalty = (p, c) => p + 1 - c;
	const getCellValue = (c) => {
		const dataStr = c.getAttribute('data');
		if (dataStr) {
			const data = JSON.parse(dataStr);
			if (!data.scores) return;

			const arr = ['u-l', 'u-r', 'l-l', 'l-r'];
			const d1 = createElement('div');
			let win = data.mistakes <= 3;
			data.scores.forEach((s, i) => {
				const d = createElement(`.${arr[i]}${s > 0 ? '' : '.fail'}`);
				d1.appendChild(d);
			});
			const inner = createElement('.quordle-result');
			c.appendChild(inner);
			inner.appendChild(d1);
			const d2 = createElement('.fw-bold');
			if (!data.fillIn) {
				const total =
					data.mistakes > 3
						? 7 + data.scores.reduce(penalty, 0)
						: data.scores.reduce((prev, curr) => {
								return prev + (curr > 0 ? 1 : 0);
						  }, 0) + data.mistakes;
				d2.innerHTML = total;
			} else d2.innerHTML = data.score;
			if (win) d2.classList.add('win');
			else d2.classList.add('fail');
			if (data.mistakes === 0) d2.classList.add('perfect');

			inner.appendChild(d2);
		} else {
			c.innerHTML = '';
		}
	};
	const winFn = (data) => {
		if (!data) return false;
		return data.scores.every((s) => s > 0) && data.mistakes < 4;
	};
	const colors = ['🟨', '🟩', '🟦', '🟪'];
	const individuals = {
		heading: 'Ind',
		tooltip: 'Individual color breakdowns',
		sortable: false,
		includeTotal: true,
		summaryFunction: (p, c) => {
			if (!c || c.fillIn) return p;
			return {
				scores: p.scores.map((el, i) => {
					return el + (c.scores[i] > 0 ? 1 : 0);
				}),
				plays: p.plays + 1,
			};
		},
		startingValue: {
			plays: 0,
			scores: [0, 0, 0, 0],
		},
		finalFunction: (value) => JSON.stringify(value),
		displayValue: () => '',
		finally: (cell) => {
			const data = JSON.parse(cell.getAttribute('data-value'));
			if (!data) return;
			cell.classList.add('graph-cell');
			const gc = createElement('.graph-container');
			cell.appendChild(gc);
			data.scores.forEach((s, i) => {
				const ht = (s * 100) / data.plays;
				const bar = createElement('.bar', {
					'bs-toggle': 'tooltip',
					'bs-placement': 'top',
					'bs-title': `${colors[i]}: ${Math.round(ht)}%`,
				});
				bar.setAttribute('style', `height: ${2 + 0.88 * ht}%`);
				new bootstrap.Tooltip(bar);
				gc.appendChild(bar);
			});
		},
	};
	const avgFn = (data) => {
		if (data.scores.every((s) => s > 0) && data.mistakes < 4)
			return 4 + data.mistakes;
		return 7 + data.scores.reduce(penalty, 0);
	};
	const rowOperators = [
		gamesPlayed,
		gamesWon(winFn),
		winPercent(winFn),
		{
			...average(avgFn),
			id: 'avg-score',
			defaultSort: 1,
			initialSort: true,
		},
		individuals,
	];

	const columnOperators = [
		gamesWon(winFn),
		gamesPlayed,
		winPercent(winFn),
		average(avgFn),
		individuals,
	];
	const sortOrder = e.detail.serverData?.settings
		?.find((s) => s.name === area.getAttribute('data-game'))
		?.settings?.find((s) => s.name === 'sort')?.value;
	updateTable(
		table,
		getCellValue,
		rowOperators,
		page === 'server' ? columnOperators : [],
		e.detail.serverData?.customStats,
		sortOrder
	);
});
