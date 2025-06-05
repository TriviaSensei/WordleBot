const areas = [
	document.querySelector('#quordle-tab-pane'),
	document.querySelector('#sequence-quordle-tab-pane'),
	document.querySelector('#quordle-extreme-tab-pane'),
];

import { updateTable } from '../updateTable.js';
import { createElement } from '../utils/createElementFromSelector.js';
import { getPage } from '../utils/page.js';

import { gamesPlayed, gamesWon, winPercent, average } from './_general.js';

const guessLimit = [9, 10, 8];

const handleDataUpdate = (maxGuesses) => {
	return (e) => {
		const page = getPage();
		const area = e.target;
		const table = area.querySelector('.standings-table');
		const getCellValue = (c) => {
			const dataStr = c.getAttribute('data');
			if (dataStr) {
				const data = JSON.parse(dataStr);
				if (!data.scores) return;
				const total = data.scores.reduce((prev, curr) => {
					return prev + curr;
				}, 0);
				const arr = ['u-l', 'u-r', 'l-l', 'l-r'];
				const d1 = createElement('div');
				let win = true;
				const score = data.scores.reduce((p, c) => Math.max(p, c));
				data.scores.forEach((s, i) => {
					const d = createElement(
						`.${arr[i]}${s === score && score <= maxGuesses ? '.score' : ''}`
					);
					d.innerHTML = s <= maxGuesses ? s : '';
					if (s > maxGuesses) {
						d.classList.add('fail');
						win = false;
					}
					d1.appendChild(d);
				});
				const inner = createElement('.quordle-result');
				c.appendChild(inner);
				inner.appendChild(d1);
				const d2 = createElement('.fw-semi-bold');
				d2.innerHTML = total;
				if (win) d2.classList.add('win');
				else d2.classList.add('fail');
				inner.appendChild(d2);
			} else {
				c.innerHTML = '';
			}
		};

		const winFn = (data) => {
			if (!data) return false;
			return data.scores.every((d) => d <= maxGuesses);
		};

		const operators = [
			winPercent(winFn),
			{
				...average((data) => {
					return data.scores.reduce((p, c) => Math.max(p, c), 0);
				}, 2),
				id: 'avg-score',
				heading: 'Avg',
				initialSort: true,
				tooltip: `Average guesses to complete the puzzle (failures count as ${maxGuesses} + the number of failed quadrants)`,
			},
			{
				...average((data) => {
					return data.scores.reduce((p, c) => p + c);
				}, 2),
				id: 'avg-sum',
				heading: 'Avg Σ',
				tooltip: `Average total of all 4 quadrants. Failed quadrants count as ${
					maxGuesses + 1
				}, ${maxGuesses + 2}, etc.`,
			},
		];
		const sortOrder = e.detail.serverData?.settings
			?.find((s) => s.name === area.getAttribute('data-game'))
			?.settings?.find((s) => s.name === 'sort')?.value;
		updateTable(
			table,
			getCellValue,
			[gamesPlayed, gamesWon(winFn), ...operators],
			page === 'server' ? [gamesWon(winFn), gamesPlayed, ...operators] : [],
			e.detail.serverData?.customStats,
			sortOrder
		);
	};
};

areas.forEach((a, i) =>
	a.addEventListener('data-update', handleDataUpdate(guessLimit[i]))
);
