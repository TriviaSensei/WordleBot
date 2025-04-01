import { getElementArray } from './utils/getElementArray.js';

/*every fillIn will have a name, and a getData function that takes in ...args, expected to be the table and, optionally, the fillIn policy:
{
    fillIn: 'failureScore',
    value: 7
}
*/
const none = {
	name: 'None',
	handleFillIn: () => {},
};

const getHeadersAndCells = (table) => {
	return {
		headers: getElementArray(table, '.result-header'),
		cells: getElementArray(table, '.standings-row').map((r) =>
			getElementArray(r, '.result-cell')
		),
	};
};

const calculateStats = (
	table,
	columnAggregation,
	startValue,
	finalFn,
	dataFn
) => {
	const { headers, cells } = getHeadersAndCells(table);
	//in each column
	headers.forEach((h, i) => {
		//get the data in each cell
		const emptyCells = [];
		const columnData = cells
			.map((r) => {
				const cellData = r[i].getAttribute('data');
				if (!cellData) {
					emptyCells.push(r[i]);
					return null;
				}
				return JSON.parse(cellData);
			})
			.filter((c) => c !== null);
		//if there are no empty cells, nothing to fill in
		if (emptyCells.length === 0) return;
		//aggregate the existing cells
		let result = columnData.reduce(columnAggregation, startValue);
		if (finalFn) result = finalFn(result);
		//fill in the empty cells with the fill-in data
		emptyCells.forEach((ec) => {
			if (columnData.length !== 0)
				if (result)
					ec.setAttribute(
						'data',
						JSON.stringify({ ...dataFn(result), fillIn: true })
					);
			ec.classList.add('blank');
		});
	});
};

const handleLoss = (lossData) => {
	return (table) => {
		const { headers, cells } = getHeadersAndCells(table);
		cells.forEach((row) => {
			row.forEach((c, i) => {
				if (!c.getAttribute('data')) {
					const headerData = Object.assign({}, headers[i].dataset);
					const toStringify = {
						...headerData,
						...lossData,
						fillIn: true,
					};
					c.setAttribute('data', JSON.stringify(toStringify));
					c.classList.add('blank');
				}
			});
		});
	};
};

const quordleHandlers = (maxGuesses) => {
	return [
		{
			name: 'Loss',
			handleFillIn: (table, settings) => {
				if (!settings?.value) settings = { value: 1 };
				const lossData = {
					scores: [
						maxGuesses + settings.value,
						maxGuesses + settings.value * 2,
						maxGuesses + settings.value * 3,
						maxGuesses + settings.value * 4,
					],
				};
				const fn = handleLoss(lossData);
				fn(table);
			},
		},
		{
			name: 'Server average',
			handleFillIn: (table) => {
				calculateStats(
					table,
					(p, c) => {
						if (!c) return p;
						return {
							count: p.count + 1,
							sum:
								p.sum + c.scores.reduce((prev, curr) => Math.max(prev, curr)),
						};
					},
					{ sum: 0, count: 0 },
					(d) => {
						if (d.count === 0) return null;
						const average = d.sum / d.count;
						return Number.isInteger(average)
							? average
							: Math.floor(average) + 1;
					},
					(d) => {
						return {
							scores: [d, d - 1, d - 2, d - 3],
						};
					}
				);
			},
		},
		{
			name: 'Server worst',
			handleFillIn: (table) => {
				calculateStats(
					table,
					(p, c) => {
						if (!c) return p;
						return Math.max(
							p,
							c.scores.reduce((prev, curr) => Math.max(prev, curr))
						);
					},
					0,
					(d) => {
						if (d === 0) return null;
						return d;
					},
					(d) => {
						return {
							scores: [d, d - 1, d - 2, d - 3],
						};
					}
				);
			},
		},
	];
};

const crosswordHandlers = [
	none,
	{
		name: 'Server average',
		handleFillIn: (table) => {
			calculateStats(
				table,
				(p, c) => {
					if (!c) return p;
					return { count: p.count + 1, sum: p.sum + c.time };
				},
				{ sum: 0, count: 0 },
				(d) => {
					if (d.count === 0) return null;
					const average = d.sum / d.count;
					return Number.isInteger(average) ? average : Math.floor(average) + 1;
				},
				(d) => {
					return {
						time: d,
					};
				}
			);
		},
	},
	{
		name: 'Server worst',
		handleFillIn: (table) => {
			calculateStats(
				table,
				(p, c) => {
					if (!c) return p;
					return Math.max(p, c.time);
				},
				0,
				(d) => {
					if (d === 0) return null;
					return d;
				},
				(d) => {
					return {
						time: d,
					};
				}
			);
		},
	},
	{
		name: 'Server worst+',
		handleFillIn: (table) => {
			calculateStats(
				table,
				(p, c) => {
					if (!c) return p;
					return Math.max(p, c.time);
				},
				0,
				(d) => {
					if (d === 0) return null;
					return Math.min(d + 60, d * 1.1);
				},
				(d) => {
					return {
						time: d,
					};
				}
			);
		},
	},
];

export const fillIns = [
	{
		name: 'Wordle',
		fillIns: [
			none,
			{
				name: 'Loss',
				handleFillIn: (table, settings) => {
					if (!settings?.value) settings = { value: 1 };
					const lossData = { score: settings.value };
					const fn = handleLoss(lossData);
					fn(table);
				},
			},
			{
				name: 'Server average',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							return { count: p.count + 1, sum: p.sum + c.score };
						},
						{ sum: 0, count: 0 },
						(d) => {
							if (d.count === 0) return null;
							const average = d.sum / d.count;
							return Number.isInteger(average)
								? average
								: Math.floor(average) + 1;
						},
						(d) => {
							return { score: d };
						}
					);
				},
			},
			{
				name: 'Server worst',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							return Math.max(p, c.score);
						},
						0,
						(d) => {
							if (d === 0) return null;
							return d;
						},
						(d) => {
							return { score: d };
						}
					);
				},
			},
			{
				name: 'Server worst+',
				handleFillIn: (table, settings) => {
					const worsts = calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							return Math.max(p, c.score);
						},
						0,
						(d) => {
							if (d === 0) return null;
							return d;
						},
						(d) => {
							if (!settings?.value) settings = { value: 7 };
							return {
								score: Math.min(d, settings.value),
							};
						}
					);
					const { headers, cells } = getHeadersAndCells(table);
					cells.forEach((row) => {
						row.forEach((c, i) => {
							if (!c.getAttribute('data')) {
								if (worsts[i] !== null)
									c.setAttribute(
										'data',
										JSON.stringify({
											number:
												Number(headers[i].getAttribute('data-number')) || null,
											score: Math.min(worsts[i] + 1, settings.value),
											fillIn: true,
										})
									);
								c.classList.add('blank');
							}
						});
					});
				},
			},
		],
	},
	{
		name: 'Quordle',
		fillIns: [none, ...quordleHandlers(9)],
	},
	{
		name: 'Sequence Quordle',
		fillIns: [none, ...quordleHandlers(10)],
	},
	{
		name: 'Quordle Extreme',
		fillIns: [none, ...quordleHandlers(8)],
	},
	{
		name: 'Tightrope',
		fillIns: [
			none,
			{
				name: '0',
				handleFillIn: (table) => {
					const { headers, cells } = getHeadersAndCells(table);
					cells.forEach((row) => {
						row.forEach((c, i) => {
							if (!c.getAttribute('data')) {
								c.setAttribute(
									'data',
									JSON.stringify({
										date: Number(headers[i].getAttribute('data-date')) || null,
										score: 0,
										correct: 0,
										misses: 0,
										time: 0,
										fillIn: true,
									})
								);
								c.classList.add('blank');
							}
						});
					});
				},
			},
			{
				name: 'Server average',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							return { count: p.count + 1, sum: p.sum + c.score };
						},
						{ sum: 0, count: 0 },
						(d) => {
							if (d.count === 0) return null;
							const average = d.sum / d.count;
							return Math.floor(average);
						},
						(d) => {
							return {
								score: d,
								correctAnswers: 0,
								misses: 0,
								time: null,
							};
						}
					);
				},
			},
			{
				name: 'Server worst',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							return Math.min(c.score, p);
						},
						99999,
						(d) => {
							if (d === 99999) return null;
							return d;
						},
						(d) => {
							return {
								score: d,
								correctAnswers: 0,
								misses: 0,
								time: null,
							};
						}
					);
				},
			},
			{
				name: 'Server worst-',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							return Math.min(c.score, p);
						},
						99999,
						(d) => {
							if (d === 99999) return null;
							return 0.9 * d;
						},
						(d) => {
							return {
								score: d,
								correctAnswers: 0,
								misses: 0,
								time: null,
							};
						}
					);
				},
			},
		],
	},
	{
		name: 'NYT Crossword',
		fillIns: crosswordHandlers,
	},
	{
		name: 'NYT Mini',
		fillIns: crosswordHandlers,
	},
	{
		name: 'NYT Connections',
		fillIns: [
			none,
			{
				name: 'Loss',
				handleFillIn: (table) => {
					const lossData = { scores: [0, 0, 0, 0], mistakes: 4, score: 11 };
					const fn = handleLoss(lossData);
					fn(table);
				},
			},
			{
				name: 'Server average',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							const penalty = (p, c) => p + 1 - c;
							const score =
								c.mistakes > 3
									? 7 + c.scores.reduce(penalty, 0)
									: c.scores.reduce((prev, curr) => {
											return prev + curr;
									  }, 0) + c.mistakes;
							return { count: p.count + 1, sum: p.sum + score };
						},
						{ sum: 0, count: 0 },
						(d) => {
							if (d.count === 0) return null;
							const average = d.sum / d.count;
							return Number.isInteger(average)
								? average
								: Math.floor(average) + 1;
						},
						(d) => {
							return { scores: [0, 0, 0, 0], mistakes: 4, score: d };
						}
					);
				},
			},
			{
				name: 'Server worst',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							const penalty = (p, c) => p + 1 - c;
							const score =
								c.mistakes > 3
									? 7 + c.scores.reduce(penalty, 0)
									: c.scores.reduce((prev, curr) => {
											return prev + curr;
									  }, 0) + c.mistakes;
							return Math.max(score, p);
						},
						0,
						(d) => {
							if (d === 0) return null;
							return d;
						},
						(d) => {
							return {
								scores: [0, 0, 0, 0],
								mistakes: 4,
								score: d,
							};
						}
					);
				},
			},
			{
				name: 'Server worst+',
				handleFillIn: (table, settings) => {
					const maxScore = 11;
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							const penalty = (p, c) => p + 1 - c;
							const score =
								c.mistakes > 3
									? 7 + c.scores.reduce(penalty, 0)
									: c.scores.reduce((prev, curr) => {
											return prev + curr;
									  }, 0) + c.mistakes;
							return Math.max(score, p);
						},
						0,
						(d) => {
							if (d === 0) return null;
							return Math.min(d + 1, maxScore);
						},
						(d) => {
							return {
								scores: [0, 0, 0, 0],
								mistakes: 4,
								score: d,
							};
						}
					);
				},
			},
		],
	},
	{
		name: 'Digits',
		fillIns: [
			none,
			{
				name: '0',
				handleFillIn: (table) => {
					const { headers, cells } = getHeadersAndCells(table);
					cells.forEach((row) => {
						row.forEach((c, i) => {
							if (!c.getAttribute('data')) {
								c.setAttribute(
									'data',
									JSON.stringify({
										score: 0,
										fillIn: true,
									})
								);
								c.classList.add('blank');
							}
						});
					});
				},
			},
			{
				name: 'Server average',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							return { count: p.count + 1, sum: p.sum + c.score };
						},
						{ sum: 0, count: 0 },
						(d) => {
							if (d.count === 0) return null;
							const average = d.sum / d.count;
							return Math.floor(average);
						},
						(d) => {
							return {
								score: d,
							};
						}
					);
				},
			},
			{
				name: 'Server worst',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							return Math.min(c.score, p);
						},
						99999,
						(d) => {
							if (d === 99999) return null;
							return d;
						},
						(d) => {
							return {
								score: d,
							};
						}
					);
				},
			},
			{
				name: 'Server worst-',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							return Math.min(c.score, p);
						},
						99999,
						(d) => {
							if (d === 99999) return null;
							return d - 1;
						},
						(d) => {
							return {
								score: Math.max(0, d),
							};
						}
					);
				},
			},
		],
	},
	{
		name: 'Immaculate Grid',
		fillIns: [
			none,
			{
				name: '900',
				handleFillIn: (table) => {
					const { cells } = getHeadersAndCells(table);
					cells.forEach((row) => {
						row.forEach((c, i) => {
							if (!c.getAttribute('data')) {
								c.setAttribute(
									'data',
									JSON.stringify({
										correct: 0,
										rarity: 900,
										fillIn: true,
									})
								);
								c.classList.add('blank');
							}
						});
					});
				},
			},
			{
				name: 'Server average',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							return { count: p.count + 1, sum: p.sum + c.rarity };
						},
						{ sum: 0, count: 0 },
						(d) => {
							if (d.count === 0) return null;
							const average = d.sum / d.count;
							return Number.isInteger(average)
								? average
								: Math.min(Math.floor(average) + 1, 900);
						},
						(d) => {
							return {
								correct: 0,
								rarity: d,
							};
						}
					);
				},
			},
			{
				name: 'Server worst',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							return Math.max(c.rarity, p);
						},
						0,
						(d) => {
							if (d === 0) return null;
							return d;
						},
						(d) => {
							return {
								correct: 0,
								rarity: d,
							};
						}
					);
				},
			},
			{
				name: 'Server worst+',
				handleFillIn: (table) => {
					calculateStats(
						table,
						(p, c) => {
							if (!c) return p;
							return Math.max(c.rarity, p);
						},
						0,
						(d) => {
							if (d === 0) return null;
							let rarity = d * 1.1;
							if (Number.isInteger(rarity)) return rarity;
							return Math.floor(rarity) + 1;
						},
						(d) => {
							return {
								correct: 0,
								rarity: d,
							};
						}
					);
				},
			},
		],
	},
];
