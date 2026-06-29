const areas = [document.querySelector('#maptap-tab-pane')];

import { updateTable } from '../updateTable.js';
import { createElement } from '../utils/createElementFromSelector.js';
import { getPage } from '../utils/page.js';
import { gamesPlayed, average } from './_general.js';
import { getElementArray } from '../utils/getElementArray.js';

const bgColors = [
	{
		score: 1000,
		background: '#ff0000',
		color: '#fff',
	},
	{
		score: 975,
		background: '#ff7a0d',
		color: '#fff',
	},
	{
		score: 925,
		background: '#ff0',
		color: '#000',
	},
	{
		score: 850,
		background: '#008f00',
		color: '#fff',
	},
	{
		score: 750,
		background: '#009fad',
		color: '#fff',
	},
	{
		score: 625,
		background: '#00f',
		color: '#fff',
	},
	{
		score: 500,
		background: '#000738',
		color: '#fff',
	},
	{
		score: 0,
		background: '#000',
		color: '#fff',
	},
];

const updateData = (e) => {
	const table = e.target.querySelector('.standings-table');
	const page = getPage();
	const getCellValue = (c) => {
		const dataStr = c.getAttribute('data');

		if (dataStr) {
			const data = JSON.parse(dataStr);
			if (!data) return;
			c.classList.add('fw-semibold');
			c.innerHTML = data.score;
			let obj = bgColors.find((el) => el.score <= data.score);
			if (!obj) obj = bgColors.slice(-1).pop();

			c.setAttribute(
				'style',
				`background-color: ${obj.background};color:${obj.color}`,
			);
		} else {
			c.innerHTML = '';
		}
	};
	const rn = ['I', 'II', 'III', 'IV', 'V'];
	const createGraph = (rc) => {
		return (cell) => {
			const data = JSON.parse(cell.getAttribute('data-value'));
			if (!data) return;
			if (data.scores.every((s) => s === 0)) return;
			cell.classList.add('graph-cell');
			const gc = createElement('.graph-container');
			cell.appendChild(gc);
			let rcReal = cell.classList.contains('total-cell') ? 2 : rc;

			data.scores.forEach((s, i) => {
				const bar = createElement(`.bar`, {
					value: s,
					'bs-toggle': 'tooltip',
					'bs-placement': 'top',
					'bs-title': `${rn[i]}: ${s.toFixed(2)}`,
				});
				gc.appendChild(bar);
				new bootstrap.Tooltip(bar);
			});
		};
	};
	const distribution = {
		heading: 'Dist',
		tooltip: 'Score Distribution',
		sortable: false,
		includeTotal: true,
		summaryFunction: (p, c) => {
			if (!c || c.fillIn) return p;
			const toReturn = {
				parts: p.parts.map((pt, i) => {
					return pt + c.parts[i];
				}),
				plays: p.plays + 1,
			};

			return toReturn;
		},
		startingValue: { parts: [0, 0, 0, 0, 0], plays: 0 },
		finalFunction: (value) => {
			if (value.plays === 0) return JSON.stringify({ scores: [0, 0, 0, 0, 0] });
			return JSON.stringify({
				scores: value.parts.map((pt) => pt / value.plays),
			});
		},
		displayValue: () => '',
	};

	const operators = [
		gamesPlayed,
		{
			...average((c) => c.score, 2),
			initialSort: true,
			defaultSort: -1,
		},
		{
			...distribution,
			finally: createGraph(0),
		},
	];
	const sortOrder = e.detail.serverData?.settings
		?.find((s) => s.name === e.target.getAttribute('data-game'))
		?.settings?.find((s) => s.name === 'sort')?.value;

	updateTable(
		table,
		getCellValue,
		operators,
		operators,
		e.detail.serverData?.customStats,
		sortOrder,
	);

	const bars = getElementArray(table, `.bar`);
	bars.forEach((bar) => {
		let value = Number(bar.getAttribute('data-value'));
		if (isNaN(value)) value = 0;
		bar.setAttribute('style', `height: ${2 + (88 * value) / 100}%;`);
	});
};

areas.forEach((a) => a.addEventListener('data-update', updateData));

import { generateCSVFile } from '../utils/generateCSVFile.js';
const csvButton = document.querySelector('#csv-button');

csvButton.addEventListener('click', () => {
	const game = document
		.querySelector(`.tab-pane.fade.active.show[data-game]`)
		?.getAttribute('data-game');
	if (['MapTap'].includes(game)) generateCSVFile(game, columnData);
});
