const areas = [
	document.querySelector('#immaculate-grid-tab-pane'),
	document.querySelector('#immaculate-grid-football-tab-pane'),
];

import { updateTable } from '../updateTable.js';
import { createElement } from '../utils/createElementFromSelector.js';
import { getPage } from '../utils/page.js';
import { gamesPlayed, average } from './_general.js';

const updateData = (e) => {
	const table = e.target.querySelector('.standings-table');
	const page = getPage();
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
				const w = data.correct - i * 3;
				if (!data.fillIn) {
					if (w >= 3) ca.classList.add('c-3');
					else if (w > 0) ca.classList.add(`c-${w}`);
					else ca.classList.add('c-0');
				}
			}
			const scoreDiv = createElement('.score-container');
			scoreDiv.innerHTML = data.rarity;
			c.appendChild(inner);
			c.appendChild(scoreDiv);
			// c.innerHTML = data.score;
			c.classList.add(data.correct >= 7 ? 'win' : 'loss');
		} else {
			c.innerHTML = '';
		}
	};
	const operators = [
		gamesPlayed,
		{
			...average((data) => data.rarity),
			id: 'avg-rarity',
			heading: 'AvgR',
			defaultSort: -1,
			initialSort: true,
		},
		{
			...average((data) => data.correct),
			id: 'avg-correct',
			heading: 'AvgC',
			defaultSort: 1,
			initialSort: false,
		},
	];
	const sortOrder = e.detail.serverData?.settings
		?.find((s) => s.name === e.target.getAttribute('data-game'))
		?.settings?.find((s) => s.name === 'sort')?.value;
	updateTable(
		table,
		getCellValue,
		operators,
		page === 'server' ? operators : [],
		e.detail.serverData?.customStats,
		sortOrder,
	);
};
areas.forEach((a) => a.addEventListener('data-update', updateData));

import { getDateFromHeader } from '../utils/getDateFromHeader.js';
const columnData = [
	{
		name: 'Number',
		calc: (d) => d.number,
	},
	{
		name: 'Date',
		header: true,
		calc: getDateFromHeader,
	},
	{
		name: 'Correct',
		calc: (d) => d.correct,
	},
	{
		name: 'Rarity',
		calc: (d) => d.rarity,
	},
];

import { generateCSVFile } from '../utils/generateCSVFile.js';
const csvButton = document.querySelector('#csv-button');
csvButton.addEventListener('click', () => {
	const game = document
		.querySelector(`.tab-pane.fade.active.show[data-game]`)
		?.getAttribute('data-game');
	if (['Immaculate Grid', 'Immaculate Grid Football'].includes(game))
		generateCSVFile(game, columnData);
});
