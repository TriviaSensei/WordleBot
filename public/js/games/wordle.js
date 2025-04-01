const area = document.querySelector('#wordle-tab-pane');
import { updateTable } from '../updateTable.js';
import { handleRequest } from '../utils/requestHandler.js';
import { createElement } from '../utils/createElementFromSelector.js';
import { getElementArray } from '../utils/getElementArray.js';
import { getPage } from '../utils/page.js';

import { gamesPlayed, gamesWon, winPercent, average } from './_general.js';
const lsItem = 'wordle-solution-cache';

const table = area.querySelector('.standings-table');

let settings = [
	{
		name: 'fillIn',
		value: 'Loss',
	},
	{
		name: 'failureScore',
		value: 7,
	},
];
const bgColors = [
	'#dad2e9',
	'#badfcd',
	'#fffcdd',
	'white',
	'#efefed',
	'#f4cccc',
	'#000000',
];

const setSettings = (s) => {
	if (!Array.isArray(s)) return;
	s.forEach((setting) => {
		const currentSetting = settings.find((el) => el.name === setting.name);
		if (!currentSetting) return;
		currentSetting.value = setting.value;
	});
};

area.addEventListener('data-update', (e) => {
	if (!table) return;
	if (!e.detail) return;
	let newSettings = e.detail?.serverData?.settings?.find(
		(s) => s.name === 'Wordle'
	)?.settings;
	if (newSettings) setSettings(newSettings);

	// handleFillIns();
	const getCellValue = (c) => {
		const dataStr = c.getAttribute('data');
		if (dataStr) {
			const data = JSON.parse(dataStr);
			if (data.fillIn) return (c.innerHTML = `(${data.score})`);
			c.innerHTML = data.score <= 6 ? data.score : 'X';
			c.setAttribute(
				'style',
				`background-color: ${bgColors[data.score - 1]};color:${
					data.score === 7 ? 'white' : 'black'
				}`
			);
			c.classList.add('fw-bold');
		} else {
			c.innerHTML = '';
		}
	};
	const winFn = (c) => {
		return c && c.score >= 1 && c.score <= 6;
	};

	const maxes = [0, 0, 0];
	const createGraph = (rc) => {
		return (cell) => {
			const data = JSON.parse(cell.getAttribute('data-value'));
			if (!data) return;
			if (data.scores.every((s) => s < 1)) return;
			cell.classList.add('graph-cell');
			const gc = createElement('.graph-container');
			cell.appendChild(gc);
			let rcReal = cell.classList.contains('total-cell') ? 2 : rc;

			const max = data.scores.reduce((p, c) => Math.max(p, c));
			if (maxes[rcReal] === 0) maxes[rcReal] = max;
			else if (max > maxes[rcReal]) maxes[rcReal] = max;
			data.scores.forEach((s, i) => {
				const bar = createElement(`.bar.bar-${rcReal}`, {
					value: s,
					'bs-toggle': 'tooltip',
					'bs-placement': 'top',
					'bs-title': `${i === 6 ? 'X' : i + 1}/6: ${s}`,
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
			if (!c) return p;
			else if (c.score < 1 || c.score > 7 || c.fillIn) return p;
			const toReturn = { scores: [...p.scores] };
			toReturn.scores[c.score - 1]++;
			return toReturn;
		},
		startingValue: { scores: [0, 0, 0, 0, 0, 0, 0] },
		finalFunction: (value) => JSON.stringify(value),
		displayValue: () => '',
	};

	const page = getPage();

	const rowOperators = [
		gamesPlayed,
		gamesWon(winFn),
		winPercent(winFn),
		{
			...average((c) => {
				return c.score;
			}, 2),
			tooltip: 'Average of all games played (not counting skipped days)',
		},
		{
			...distribution,
			finally: createGraph(0),
		},
	];

	let solutions = JSON.parse(localStorage.getItem(lsItem));
	if (!solutions || !Array.isArray(solutions)) {
		solutions = [];
	}
	const getWord = {
		heading: 'Word',
		summaryFunction: (p, c) => {
			return p;
		},
		startingValue: 0,
		finally: (cell, index) => {
			cell.innerHTML = '';
			const headers = getElementArray(area, 'th.result-header');
			if (headers.length <= index) return;
			const dt = headers[index].getAttribute('data-date');
			let puzzleDate;
			if (dt)
				puzzleDate = new Date(moment.tz(`${dt} 00:00`, moment.tz.guess()));
			const currentDate = new Date();

			let puzzle = solutions.find((s) => {
				return dt === s.print_date;
			});
			let buttonTooltip, button;
			const revealSolution = (e) => {
				document.addEventListener('hidden.bs.tooltip', (evt) => {
					if (evt.target === button) {
						const td = e.target.closest('td');
						const sp = td?.querySelector('span.d-none');
						if (!sp) return;
						evt.target.remove();
						sp.classList.remove('d-none');
					}
				});
				buttonTooltip.hide();
			};
			const obj = {
				'bs-toggle': 'tooltip',
				'bs-placement': 'bottom',
				'bs-title': `Click to reveal`,
			};
			if (!puzzle) {
				if (puzzleDate && puzzleDate <= currentDate) {
					const url = `/api/v1/wordle/puzzles/${dt}`;
					const handler = (res) => {
						if (res.status === 'success') {
							solutions.push(res.data);
							localStorage.setItem(lsItem, JSON.stringify(solutions));
							puzzle = res.data;
							if (currentDate - puzzleDate < 86400000) {
								const span = createElement('span.d-none');
								span.innerHTML = puzzle.solution.toUpperCase();
								button = createElement(
									'button.btn.btn-sm.btn-warning.reveal-button',
									obj
								);
								button.innerHTML = '?';
								button.addEventListener('click', revealSolution);
								buttonTooltip = new bootstrap.Tooltip(button);
								cell.appendChild(span);
								cell.appendChild(button);
							} else {
								cell.innerHTML = res.data.solution.toUpperCase();
							}
						}
					};
					handleRequest(url, 'GET', null, handler);
				} else {
					cell.innerHTML = '-';
				}
			} else {
				if (currentDate - puzzleDate < 86400000) {
					const span = createElement('span.d-none');
					span.innerHTML = puzzle.solution.toUpperCase();
					button = createElement(
						'button.btn.btn-sm.btn-warning.reveal-button',
						obj
					);
					button.innerHTML = '?';
					button.addEventListener('click', revealSolution);
					buttonTooltip = new bootstrap.Tooltip(button);
					cell.appendChild(span);
					cell.appendChild(button);
				} else {
					cell.innerHTML = puzzle.solution.toUpperCase();
				}
			}
			cell.classList.add('wordle-answer');
		},
	};
	const columnOperators =
		page === 'server'
			? [
					getWord,
					gamesWon(winFn),
					gamesPlayed,
					winPercent(winFn),
					average((c) => c.score, 2),
					{
						...distribution,
						finally: createGraph(1),
					},
			  ]
			: [getWord];
	updateTable(
		table,
		getCellValue,
		rowOperators,
		columnOperators,
		e.detail.serverData?.customStats
	);
	maxes.forEach((m, i) => {
		const bars = getElementArray(table, `.bar.bar-${i}`);
		bars.forEach((bar) => {
			let value = Number(bar.getAttribute('data-value'));
			if (isNaN(value)) value = 0;
			bar.setAttribute('style', `height: ${2 + (88 * value) / m}%;`);
		});
	});
});
