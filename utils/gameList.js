/**
 * Settings for all games:
 * - minimum plays/number of results (same for all games on a server-level; integer 10-28, inclusive)
 * -
 */

const verifyIntegerRange = (min, max) => {
	return {
		min,
		max,
		validation: (val) => Number.isInteger(val) && val >= min && val <= max,
		message: `Value must be between ${min} and ${max}, inclusive`,
	};
};

const defaultEnum = [
	{
		label: 'None',
		description: 'Unplayed days do not count towards the data',
	},
	{
		label: 'Loss',
		description: 'Unplayed days are counted as a loss',
	},
	{
		label: 'Server average',
		description:
			'Unplayed days are counted as the server average score rounded up',
	},
	{
		label: 'Server worst',
		description:
			'Unplayed days are counted as the same as the worst played score on the server that day',
	},
];
const defaultFillIn = {
	name: 'fillIn',
	label: 'Fill in scores',
	type: String,
	enum: defaultEnum,
	default: 'None',
	description:
		'What to do if a player does not post results for a day - only affects average scores, and will never count as a "played" game.',
};
const quordleSettings = [
	{
		...defaultFillIn,
		enum: [
			{
				label: 'None',
				description:
					'No action. Player is not eligible to win the month if they do not have enough plays (or too many missed days)',
			},
			{
				label: 'Loss',
				description:
					'Unplayed days are counted as a loss with the maximum score.',
			},
			{
				label: 'Server average',
				description:
					'Unplayed days are counted as the server average score, rounded up, and the highest possible resulting sum',
			},
			{
				label: 'Server worst',
				description:
					'Unplayed days are counted as the same as the worst played score on the server that day',
			},
		],
	},
	{
		name: 'failureScore',
		label: 'Failure penalty (per word)',
		type: Number,
		...verifyIntegerRange(1, 3),
		default: 1,
		description:
			'The penalty for each unguessed word. An unfinished game will have a score of 9 + [N] x (number of unguessed words)',
	},
];
const quordleDataItems = [
	{
		name: 'score',
		display: 'Score',
		getData: (data) => data.scores.reduce((p, c) => Math.max(p, c)),
		sortOrder: 1,
	},
	{
		name: 'sum',
		display: 'Sum of 4',
		getData: (data) => data.scores.reduce((p, c) => p + c),
		sortOrder: 1,
	},
];

const crosswordSettings = {
	settings: [
		{
			...defaultFillIn,
			enum: [
				{
					label: 'None',
					description: 'Unplayed days do not count towards the data',
				},
				{
					label: 'Server average',
					description:
						'Unplayed days are counted as the server average time, rounded up',
				},
				{
					label: 'Server worst',
					description:
						'Unplayed days are counted  as the worst time on the server that day, rounded up',
				},
				{
					label: 'Server worst+',
					description:
						'Unplayed days are counted as the worst time on the server that day +10% or 1:00, whichever is less.',
				},
			],
			default: 'Server worst+',
		},
	],
	dataItems: [
		{
			name: 'time',
			display: 'Time',
			getData: (data) => data.time,
			sortOrder: 1,
		},
	],
};

const gameList = [
	{
		name: 'Wordle',
		script: true,
		url: 'https://www.nytimes.com/games/wordle/index.html',
		settings: [
			{
				...defaultFillIn,
				enum: [
					...defaultFillIn.enum,
					{
						label: 'Server worst+',
						description:
							'Unplayed days are counted as the same as the worst played score on the server that day, plus 1 (no worse than the score for a loss)',
					},
				],
			},
			{
				name: 'failureScore',
				label: 'Loss score',
				type: Number,
				...verifyIntegerRange(7, 10),
				default: 7,
				description:
					'The score given to a player if they lose a game of Wordle',
			},
		],
		dataItems: [
			{
				name: 'score',
				display: 'Score',
				getData: (data) => data.score,
				sortOrder: 1,
			},
		],
	},
	{
		name: 'Quordle',
		script: true,
		url: 'https://www.merriam-webster.com/games/quordle/',
		settings: quordleSettings,
		dataItems: quordleDataItems,
	},
	{
		name: 'Sequence Quordle',
		script: false,
		url: 'https://www.merriam-webster.com/games/quordle/#/sequence',
		settings: quordleSettings,
		dataItems: quordleDataItems,
	},
	{
		name: 'Quordle Extreme',
		script: false,
		url: 'https://www.merriam-webster.com/games/quordle/#/extreme',
		settings: quordleSettings,
		dataItems: quordleDataItems,
	},
	{
		name: 'Tightrope',
		script: true,
		url: 'https://www.britannica.com/quiz/tightrope',
		settings: [
			{
				name: 'fillIn',
				label: 'Fill in scores',
				type: String,
				enum: [
					{
						label: 'None',
						description: 'Unplayed days do not count towards the data',
					},
					{ label: '0', description: 'Unplayed days are given a score of 0' },
					{
						label: 'Server average',
						description:
							'Unplayed days are counted as the server average score, rounded down',
					},
					{
						label: 'Server worst',
						description:
							'Unplayed days are counted as the same as the worst played score on the server that day',
					},
					{
						label: 'Server worst-',
						description:
							'Unplayed days are counted as 90% of the worst played score on the server that day',
					},
				],
				default: '0',
				description: 'What to do if a player does not post results for a day.',
			},
		],
		dataItems: [
			{
				name: 'score',
				display: 'Score',
				getData: (data) => data.score,
				sortOrder: -1,
			},
			{
				name: 'correctAnswers',
				display: 'Correct answers',
				getData: (data) => data.correctAnswers,
				sortOrder: -1,
			},
			{
				name: 'misses',
				display: 'Misses',
				getData: (data) => data.misses,
				sortOrder: 1,
			},
			{
				name: 'time',
				display: 'Time',
				getData: (data) => data.time,
				sortOrder: 1,
			},
		],
	},
	{
		name: 'NYT Crossword',
		script: true,
		url: 'https://www.nytimes.com/crosswords/game/daily/',
		...crosswordSettings,
	},
	{
		name: 'NYT Mini',
		script: false,
		url: 'https://www.nytimes.com/crosswords/game/mini',
		...crosswordSettings,
	},
	{
		name: 'NYT Connections',
		script: true,
		url: 'https://www.nytimes.com/games/connections',
		settings: [
			{
				...defaultFillIn,
				enum: [
					{
						label: 'None',
						description: 'Unplayed days do not count towards the data',
					},
					{
						label: 'Loss',
						description: 'Assigned a score of 11',
					},
					{
						label: 'Server average',
						description: 'Server average score that day',
					},
					{
						label: 'Server worst',
						description: 'Server worst score that day',
					},
					{
						label: 'Server worst+',
						description:
							'Worst score on the server that day +1, or the max score, whichever is lower',
					},
				],
				default: 'Server worst +1',
			},
		],
		dataItems: [
			{
				name: 'groups',
				display: 'Groups solved',
				getData: (data) => data.scores.reduce((p, c) => p + c),
				sortOrder: -1,
			},
			{
				name: 'mistakes',
				display: 'Mistakes',
				getData: (data) => data.mistakes,
				sortOrder: 1,
			},
		],
	},
	{
		name: 'Digits',
		script: true,
		url: 'https://www.cyu.dev/digits',
		settings: [
			{
				...defaultFillIn,
				enum: [
					{
						label: 'None',
						description: 'Unplayed days do not count towards the data',
					},
					{
						label: '0',
						description: 'Unplayed games are given a score of 0',
					},
					{
						label: 'Server average',
						description: 'Server average score that day',
					},
					{
						label: 'Server worst',
						description: 'Server worst score that day',
					},
					{
						label: 'Server worst-',
						description:
							'One less than the worst score on the server that day, or 0, whichever is higher',
					},
				],
				default: '0',
			},
		],
		dataItems: [
			{
				name: 'score',
				display: 'Score',
				getData: (data) => data.score,
				sortOrder: -1,
			},
		],
	},
	{
		name: 'Immaculate Grid',
		script: true,
		url: 'https://www.immaculategrid.com',
		settings: [
			{
				...defaultFillIn,
				enum: [
					{
						label: 'None',
						description: 'Unplayed days do not count towards the data',
					},
					{
						label: '900',
						description: 'Unplayed games are given a score of 900',
					},
					{
						label: 'Server average',
						description: 'Server average score that day',
					},
					{
						label: 'Server worst',
						description: 'Server worst score that day',
					},
					{
						label: 'Server worst+',
						description:
							'10% higher than the worst score on the server that day, or 900, whichever is lower',
					},
				],
				default: '900',
			},
		],
		dataItems: [
			{
				name: 'correct',
				display: 'Correct answers',
				getData: (data) => data.correct,
				sortOrder: -1,
			},
			{
				name: 'rarity',
				display: 'Rarity',
				getData: (data) => data.rarity,
				sortOrder: 1,
			},
		],
	},
];
module.exports = gameList;

// const getFilter = (getScore, n, comparator) => {
// 	if (!['lt', 'lte', 'eq', 'gte', 'gt'].includes(comparator.toLowerCase()))
// 		return null;
// 	switch (comparator.toLowerCase()) {
// 		case 'lt':
// 			return (data) => getScore(data) < n;
// 		case 'gt':
// 			return (data) => getScore(data) > n;
// 		case 'eq':
// 			return (data) => getScore(data) === n;
// 		case 'lte':
// 			return (data) => getScore(data) <= n;
// 		case 'gte':
// 			return (data) => getScore(data) >= n;
// 		default:
// 			return null;
// 	}
// };
// const [scoreLT, scoreLTE, scoreEQ, scoreGTE, scoreGT] = [
// 	(scoreFn) => {
// 		return {
// 			name: 'scoreLT',
// 			display: 'Keep only scores less than <N>',
// 			filter: (n) => getFilter((data) => scoreFn(data), n, 'lt'),
// 		};
// 	},
// 	(scoreFn) => {
// 		return {
// 			name: 'scoreLTE',
// 			display: 'Keep only scores less than or equal to <N>',
// 			filter: (n) => getFilter((data) => scoreFn(data), n, 'lte'),
// 		};
// 	},
// 	(scoreFn) => {
// 		return {
// 			name: 'scoreEQ',
// 			display: 'Keep only scores equal to <N>',
// 			filter: (n) => getFilter((data) => scoreFn(data), n, 'eq'),
// 		};
// 	},
// 	(scoreFn) => {
// 		return {
// 			name: 'scoreGTE',
// 			display: 'Keep only scores greater than or equal to <N>',
// 			filter: (n) => getFilter((data) => scoreFn(data), n, 'gte'),
// 		};
// 	},
// 	(scoreFn) => {
// 		return {
// 			name: 'scoreGT',
// 			display: 'Keep only scores greater than <N>',
// 			filter: (n) => getFilter((data) => scoreFn(data), n, 'gt'),
// 		};
// 	},
// ];
// const basicComparators = (scoreFn) => {
// 	return [scoreLT, scoreLTE, scoreEQ, scoreGTE, scoreGT].map((s) => s(scoreFn));
// };
// const winComparators = (winFn) => {
// 	return [
// 		{
// 			name: 'wins',
// 			display: 'Keep only wins',
// 			filter: (data) => winFn(data),
// 		},
// 		{
// 			name: 'losses',
// 			display: 'Keep only losses',
// 			filter: (data) => !winFn(data),
// 		},
// 	];
// };
