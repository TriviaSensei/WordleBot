const areas = [
	document.querySelector('#nyt-crossword-tab-pane'),
	document.querySelector('#nyt-mini-tab-pane'),
];

import { updateTable } from '../updateTable.js';
import { getPage } from '../utils/page.js';

import { gamesWon, average } from './_general.js';

const getTimeStr = (time) => {
	time = Math.round(time);
	const [secs, mins, hrs] = [
		time % 60,
		Math.floor(time / 60) % 60,
		Math.floor(time / 3600),
	];
	if (hrs === 0) return `${mins}:${secs >= 10 ? secs : `0${secs}`}`;
	else
		return `${hrs}:${mins >= 10 ? mins : `0${mins}`}:${
			secs >= 10 ? secs : `0${secs}`
		}`;
};

const handleDataUpdate = (e) => {
	const area = e.target;
	const page = getPage();
	const table = area.querySelector('.standings-table');
	const getCellValue = (c) => {
		const dataStr = c.getAttribute('data');
		if (dataStr) {
			const data = JSON.parse(dataStr);
			if (!data.time) return;
			c.innerHTML = getTimeStr(data.time);
		} else {
			c.innerHTML = '';
		}
	};

	const winFn = (data) => {
		if (!data) return false;
		return true;
	};

	const operators = [
		{
			...gamesWon(winFn),
			heading: 'Completed',
		},
		{
			...average((d) => d.time, 0),
			id: 'avg-time',
			displayValue: (data) => {
				if (data.plays === 0) return '-';
				const avg = Math.round(data.total / data.plays);
				return getTimeStr(avg);
			},
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
};

areas.forEach((a) => a.addEventListener('data-update', handleDataUpdate));

import { generateCSVFile } from '../utils/generateCSVFile.js';
import { getDateFromHeader } from '../utils/getDateFromHeader.js';

const csvButton = document.querySelector('#csv-button');
const columnData = [
	{
		name: 'Date',
		header: true,
		calc: getDateFromHeader,
	},
	{
		name: 'Time',
		calc: (d) => d.time,
	},
];
csvButton.addEventListener('click', () => {
	const game = document
		.querySelector(`.tab-pane.fade.active.show[data-game]`)
		?.getAttribute('data-game');
	if (['NYT Crossword', 'NYT Mini'].includes(game))
		generateCSVFile(game, columnData);
});
