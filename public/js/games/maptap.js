const areas = [document.querySelector('#maptap-tab-pane')];

import { updateTable } from '../updateTable.js';
import { createElement } from '../utils/createElementFromSelector.js';
import { getPage } from '../utils/page.js';
import { gamesPlayed, average } from './_general.js';
import { getElementArray } from '../utils/getElementArray.js';

const bgColors = [
	{
		score: 1000,
		background: '#fc6a60',
	},
	{
		score: 975,
		background: '#fcae60',
	},
	{
		score: 925,
		background: '#fcae60',
	},
	{
		score: 850,
		background: '#b1fc60',
	},
	{
		score: 750,
		background: '#60fc63',
	},
	{
		score: 625,
		background: '#60fc63',
	},
	{
		score: 500,
		background: '#60c3fc',
	},
	{
		score: 0,
		background: '#adadad',
	},
].sort((a, b) => b.score - a.score);

const colorScales = bgColors.map((c, i) => {
	if (i === bgColors.length - 1) return null;
	const min = bgColors[i + 1].score;
	const max = c.score;
	return {
		min,
		max,
		fn: d3
			.scaleLinear()
			.domain([min, max])
			.range([bgColors[i + 1].background, c.background]),
	};
});
colorScales.pop();

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
			let obj = colorScales.find(
				(el) => data.score <= el.max && data.score >= el.min,
			);
			if (!obj) obj = colorScales[colorScales.length - 1];

			c.setAttribute('style', `background-color: ${obj.fn(data.score)}`);
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
			finally: (cell) => {
				const data = Number(cell.getAttribute('data-value'));
				if (isNaN(data)) return;
				let obj = colorScales.find((el) => data <= el.max && data >= el.min);
				if (!obj) obj = colorScales[colorScales.length - 1];
				cell.setAttribute('style', `background-color: ${obj.fn(data)}`);
			},
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
