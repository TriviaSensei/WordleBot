const area = document.querySelector('#immaculate-grid-tab-pane');

import { updateTable } from '../updateTable.js';
import { createElement } from '../utils/createElementFromSelector.js';
import { getPage } from '../utils/page.js';
import { gamesPlayed, average } from './_general.js';
area.addEventListener('data-update', (e) => {
	const table = area.querySelector('.standings-table');
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
				if (w >= 3) ca.classList.add('c-3');
				else if (w >= 0) ca.classList.add(`c-${w}`);
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
		?.find((s) => s.name === area.getAttribute('data-game'))
		?.settings?.find((s) => s.name === 'sort')?.value;
	updateTable(
		table,
		getCellValue,
		operators,
		page === 'server' ? operators : [],
		e.detail.serverData?.customStats,
		sortOrder
	);
});
