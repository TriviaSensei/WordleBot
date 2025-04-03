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

const updateStreak = (old, data) => {
	old.sort((a, b) => a.start - b.start);
	//if the submitted data joins at the end of an existing streak, join it there
	if (
		old.some((oldData) => {
			if (data.data.number === oldData.start + oldData.length) {
				oldData.length++;
				return true;
			}
		})
	) {
		//and then consolidate the streaks
		const toReturn = [];
		let currentStreak;
		old.forEach((oldData, i) => {
			//start current streak at the first substreak
			if (i === 0) currentStreak = oldData;
			//if the current element joins with the current streak, join it
			else if (oldData.start === currentStreak.start + currentStreak.length) {
				currentStreak.length = currentStreak.length + oldData.length;
			}
			//otherwise, end the current streak and start a new one
			else {
				toReturn.push(currentStreak);
				currentStreak = oldData;
			}
			//if we're at the end, push the current streak
			if (i === oldData.length - 1) toReturn.push(currentStreak);
		});
		return toReturn;
	} else {
		old.push({ start: data.data.number, length: 1 });
		old.sort((a, b) => a.start - b.start);
		return old;
	}
};

const fitsAtEnd = (date, oldData) => {
	const oldDate = new Date(moment.tz(oldData.start, timezone).format());
	const desiredDate = new Date(
		oldDate.setDate(oldDate.getDate() + oldData.length)
	);
	const desiredDateStr = moment.tz(desiredDate, timezone).format();
	const testDateStr = moment.tz(date, timezone).format();
	return desiredDateStr.split('T')[0] === testDateStr.split('T')[0];
};

const updateStreakDate = (old, data) => {
	old.sort((a, b) => a.date - b.date);
	//if the submitted data joins at the end of an existing streak, join it there
	if (
		old.some((oldData) => {
			if (fitsAtEnd(data.data.date, oldData)) {
				oldData.length++;
				return true;
			}
		})
	) {
		//and then consolidate the streaks
		const toReturn = [];
		let currentStreak;
		old.forEach((oldData, i) => {
			//start current streak at the first substreak
			if (i === 0) currentStreak = oldData;
			//if the current element joins with the current streak, join it
			else if (fitsAtEnd(oldData.start, currentStreak)) {
				currentStreak.length = currentStreak.length + oldData.length;
			}
			//otherwise, end the current streak and start a new one
			else {
				toReturn.push(currentStreak);
				currentStreak = oldData;
			}
			//if we're at the end, push the current streak
			if (i === oldData.length - 1) toReturn.push(currentStreak);
		});
		return toReturn;
	} else {
		old.push({ start: data.data.number, length: 1 });
		old.sort((a, b) => a.start - b.start);
		return old;
	}
};
