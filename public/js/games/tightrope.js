const area = document.querySelector('#tightrope-tab-pane');
import { updateTable } from '../updateTable.js';
import { createElement } from '../utils/createElementFromSelector.js';
import { getPage } from '../utils/page.js';
import { gamesPlayed, gamesWon, winPercent, average } from './_general.js';

area.addEventListener('data-update', (e) => {
	const table = area.querySelector('.standings-table');
	const page = getPage();
	const winFn = (c) => {
		return c && c.misses < 3;
	};
	const getCellValue = (c) => {
		const dataStr = c.getAttribute('data');

		if (dataStr) {
			const data = JSON.parse(dataStr);
			if (!data) return;
			c.classList.add('fw-semibold');
			const inner = createElement('.cell-inner.w-100.h-100.d-flex.flex-column');
			for (var i = 0; i < 3; i++) {
				const ca = createElement('.ca');
				inner.appendChild(ca);
				const w = data.correctAnswers - i * 3;
				if (w >= 3) ca.classList.add('c-3');
				else ca.classList.add(`c-${Math.max(w, 0)}`);
			}
			const scoreDiv = createElement('.score-container');
			scoreDiv.innerHTML = data.score;
			c.appendChild(inner);
			c.appendChild(scoreDiv);
			// c.innerHTML = data.score;
			c.classList.add(data.correctAnswers >= 7 ? 'win' : 'loss');
		} else {
			c.innerHTML = '';
		}
	};

	const avgTime = {
		...average((c) => {
			if (c.misses >= 3) return null;
			return c.time;
		}, 2),
		id: 'avg-time',
		heading: 'Avg Time',
		tooltip: 'Average time (wins only)',
	};

	const rowOperators = [
		gamesPlayed,
		gamesWon(winFn),
		winPercent(winFn),
		{
			...average((c) => {
				return c.score;
			}, 0),
			heading: 'Avg',
			id: 'avg-score',
			tooltip: 'Average score',
			initialSort: true,
			defaultSort: -1,
		},
		{
			...average((c) => {
				return c.correctAnswers;
			}, 2),
			id: 'avg-correct',
			heading: 'AvgC',
			tooltip: 'Average correct',
		},
		avgTime,
	];

	const columnOperators = [
		gamesWon(winFn),
		gamesPlayed,
		winPercent(winFn),
		{
			...average((c) => c.score, 0),
			heading: 'Avg',
			tooltip: 'Average score',
		},
		{
			...average((c) => {
				return c.correctAnswers;
			}, 2),
			heading: 'AvgC',
			tooltip: 'Average correct',
		},
		avgTime,
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

import { getDateFromHeader } from '../utils/getDateFromHeader.js';
const columnData = [
	{
		name: 'Date',
		calc: getDateFromHeader,
		header: true,
	},
	{
		name: 'Correct',
		calc: (d) => d.correctAnswers,
	},
	{
		name: 'Incorrect',
		calc: (d) => d.misses,
	},
	{
		name: 'Score',
		calc: (d) => d.score,
	},
	{
		name: 'Time',
		calc: (d) => d.time,
	},
];

import { generateCSVFile } from '../utils/generateCSVFile.js';
const csvButton = document.querySelector('#csv-button');
csvButton.addEventListener('click', () => {
	generateCSVFile('Tightrope', columnData);
});
