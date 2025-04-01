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

const crosswordDataItems = [
	{
		name: 'time',
		display: 'Time',
		getData: (data) => data.time,
		sortOrder: 1,
	},
];

export const gameList = [
	{
		name: 'Wordle',
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
		dataItems: quordleDataItems,
	},
	{
		name: 'Sequence Quordle',

		dataItems: quordleDataItems,
	},
	{
		name: 'Quordle Extreme',
		dataItems: quordleDataItems,
	},
	{
		name: 'Tightrope',
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
		dataItems: crosswordDataItems,
	},
	{
		name: 'NYT Mini',
		dataItems: crosswordDataItems,
	},
	{
		name: 'NYT Connections',
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
export const achievements = [
	{
		id: 'first-timer',
		name: 'First Timer',
		img: 'first-timer',
		description: 'Post a Wordle result',
		color: '#6baa64',
		games: ['Wordle'],
		updateProgress: (old, data) => {
			return true;
		},
		isComplete: (data) => {
			return true;
		},
	},
];
