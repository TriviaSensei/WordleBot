const area = document.querySelector('#digits-tab-pane');

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
			if (!data || data.scores) return;
			const inner = createElement('div');
			inner.innerHTML = data.score;
			c.appendChild(inner);
		} else {
			c.innerHTML = '';
		}
	};

	const operators = [
		gamesPlayed,
		{
			...average((data) => data.score),
			id: 'avg',
			defaultSort: -1,
			initialSort: true,
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
