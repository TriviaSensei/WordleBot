const Results = require('../mvc/models/resultModel');
const Users = require('../mvc/models/userModel');
const gameList = require('./gameList');
const moment = require('moment-timezone');
const { matchers } = require('./parseResult');
const getNextDate = require('./getNextDate');
const { connections } = require('mongoose');
const timezone = process.env.DEFAULT_TIMEZONE;
//just sets the progress to the last thing submitted - usually for single-action achievements
const returnData = (old, result) => result.data;
//for single-action achievements, always prints 0/1 if not completed
const singleActionProgress = (p) => '0/1';

const printProgress = (n, dataFn) => {
	return (data) => {
		try {
			const num = dataFn(data) || 0;
			return `${num}/${n}`;
		} catch (err) {
			return `0/${n}`;
		}
	};
};

const countPlays = (old, data) => {
	if (!data) return old;
	if (old) return old + 1;
	return 1;
};
const checkPlayCount = (n) => {
	return (data) => {
		return data >= n;
	};
};
const anyRes = (data) => true;
const getAnyRes = (game, filterFunction) => {
	return async (userId) => {
		const f = game
			? {
					user: userId,
					game,
			  }
			: {
					user: userId,
			  };
		const res = await Results.find(f).sort({ date: 1 }).lean();
		if (res.length > 0) {
			const r = filterFunction
				? res.find((r) => {
						return filterFunction(r.data);
				  })
				: res[0];

			if (r) return r.date;
		}
		return null;
	};
};

const findAndSetComplete = (id, date) => {
	return (a) => {
		if (a.id === id) {
			a.complete = true;
			a.progress = null;
			a.completedDate = date;
			return true;
		}
		return false;
	};
};
const getCountRetroFunction = (id, filter, n) => {
	return async (user) => {
		const res = await Results.find({ user, ...filter })
			.sort({ date: 1 })
			.lean();
		const u = await Users.findById(user);
		if (res.length >= n) return res[n - 1].date;
		return { progress: res.length };
	};
};

const getCurrentPuzzles = (game) => {
	const m = matchers.find((m) => m.data.name === game);
	if (!m) return;
	return m.data.getCurrentPuzzles();
};

//total plays among all games
const playAchievements = [
	{ count: 1, name: 'First-timer', color: '#6baa64' }, //atom
	{ count: 10, name: 'Newbie', color: '#32a852' }, //molecule
	{ count: 100, name: 'Rookie', color: '#f7b5b5' }, //baby
	{ count: 500, name: 'Junior', color: '#ad32ab' }, //earth
	{ count: 1000, name: 'Veteran', color: '#333333' }, //solar system
	{ count: 5000, name: 'Old Timer', color: '#ad3243' }, //galaxy
	{ count: 10000, name: 'Ageless Wonder', color: '#40ff00' }, //universe
].map((el) => {
	const id = `all-play-${el.count}`;
	return {
		id,
		name: el.name,
		dataItem: 'all-play',
		description:
			el.count === 1
				? `Post a single result`
				: `Post ${el.count} results between all games`,
		color: el.color,
		games: [],
		updateProgress: countPlays,
		getProgress: printProgress(el.count, (n) => n),
		isComplete: (data) => {
			const fn = checkPlayCount(el.count);
			return fn(data);
		},
		retro: getCountRetroFunction(id, {}, el.count),
	};
});

//play a specific game N times
const gamePlayAchievements = [];
const gamePlayColors = ['#a8d4ff', '#a8ffc1', '#ffdc82', '#ffa6a6'];
[10, 100, 500, 1000].forEach((n, i) => {
	gameList.forEach((g) => {
		const name = g.name.toLowerCase().split(' ').join('-');
		const id = `${name}-${n}`;
		gamePlayAchievements.push({
			id,
			filename: `play`,
			name: `${g.name} x ${n}`,
			dataItem: `plays-${name}`,
			count: n,
			description: `Post ${n} results for ${g.name}`,
			color: gamePlayColors[i],
			games: [g.name],
			updateProgress: countPlays,
			getProgress: printProgress(n, (n) => n),
			isComplete: checkPlayCount(n),
			retro: getCountRetroFunction(id, { game: g.name }, n),
		});
	});
});

/*
old: {
    current: 12,
    lastPost: '2025-04-02',
    other: ['2025-04-04']
}

the returned function takes the entire game data (date, game, user, data, etc.) and returns the new progress object
*/
const streakUpdater = (game) => {
	return (old, data) => {
		const m = game ? matchers.find((m) => m.data.name === game) : matchers;
		if (!m) return old;
		//these dates are the latest dates available for posting somewhere in the world
		let dates = game
			? m.data.getCurrentPuzzles()
			: m
					.map((matcher) => matcher.data.getCurrentPuzzles())
					.reduce((p, c) => {
						return [...p, ...c];
					}, []);
		dates = dates.filter((d, i) => {
			return dates.every((d2, j) => {
				return d !== d2 || j >= i;
			});
		});
		//this is the date that we need data for in order to continue our streak
		const nextDate = getNextDate(old?.lastPost);
		//this is the date of the post we're handling right now
		const thisDate = moment.tz(data.date, timezone).format().split('T')[0];
		//if no data, check to make sure we should't break the streak
		if (!data) {
			if (!old) return null;
			//if the necessary date is no longer current, we lost the streak.
			if (!dates.includes(nextDate)) {
				let current = 0;
				let lastPost = null;
				//check other saved posts to see if we should start with a new streak of 0 or something else
				old.other.sort((a, b) => new Date(a) - new Date(b));
				old.other.forEach((d, i) => {
					//for the first one, start a streak of 1
					if (i === 0) {
						current = 1;
						lastPost = d;
					}
					//if we continue the streak, add on
					else if (d === getNextDate(lastPost)) {
						current++;
						lastPost = d;
					} else {
						current = 1;
						lastPost = d;
						newOther = [];
					}
				});
				return {
					current,
					lastPost,
					other: newOther,
				};
			}
			//if the necessary date is still in play, the streak is unaffected
			return old;
		}

		//if there was no old data, start a streak at 1
		if (!old) {
			if (dates.includes(thisDate))
				return {
					current: 1,
					lastPost: thisDate,
					other: [],
				};
			return {
				current: 0,
				lastPost: null,
				other: [],
			};
		}

		//if the date is before any of the current date(s), then our streak is unaffected for now.
		if (!dates.includes(thisDate)) return old;
		//it's a later date
		//streak-continuing date is past - we need to start a new streak
		else if (!dates.includes(nextDate)) {
			const temp = [...old.other, thisDate].sort(
				(a, b) => new Date(a) - new Date(b)
			);
			const streakData = {
				current: 0,
				lastPost: null,
				other: [],
			};
			temp.forEach((d, i) => {
				//we have a gap in the streak - add the date to "other"
				if (streakData.other.length !== 0) {
					streakData.other.push(d);
				} else if (streakData.current === 0 || d === getNextDate(temp[i - 1])) {
					streakData.current++;
					streakData.lastPost = d;
				}
				//if we skipped a date, but it's still in play...
				else if (dates.includes(getNextDate(temp[i - 1]))) {
					streakData.other.push(d);
				}
				//we skipped a date, and it's not in play anymore
				else {
					streakData.current = 1;
					streakData.lastPost = d;
					streakData.other = [];
				}
			});
			return streakData;
		}
		//if we have the correct date, continue the streak
		else if (thisDate === nextDate) {
			const newOther = [];
			let current = old.current + 1;
			let lastPost = thisDate;
			old.other.sort((a, b) => new Date(a) - new Date(b));
			//see if we're filling in a streak or something
			old.other.forEach((d, i) => {
				if (d === getNextDate(lastPost)) {
					current++;
					lastPost = d;
				} else newOther.push(d);
			});
			return {
				current,
				lastPost,
				other: newOther,
			};
		}
		//should not happen for game-specific streaks, but for the all-play streak, this is important.
		//if the date of the post is the same as the last post already, then the streak is not affected
		else if (thisDate === old.lastPost) return old;
		//streak-continuing date is still in play, so add the date of this submission to "other"
		else {
			return {
				...old,
				other: [...old.other, thisDate],
			};
		}
	};
};

//achieve a play streak in a specific game
const streakAchievements = [];
const streakColors = [
	'#b8ffff',
	'#b8ffd2',
	'#fffab8',
	'#fabe93',
	'#fa93ad',
	'#fa93ee',
];
gameList.forEach((el, i) => {
	[10, 25, 50, 100, 365, 1000].forEach((n) => {
		const name = el.name.toLowerCase().split(' ').join('-');
		const id = `${name}-streak-${n}`;
		streakAchievements.push({
			id,
			name: `${el.name} streak - ${n}`,
			dataItem: `streak-${name}`,
			description: `Play ${el.name} for ${n} consecutive days`,
			color: streakColors[i],
			games: [el.name],
			streak: true,
			updateProgress: streakUpdater(el.name),
			getProgress: printProgress(n, (data) => data),
			isComplete: (data) => {
				if (!data) return false;
				const fn = checkPlayCount(n);
				return fn(data.current);
			},
			retro: null,
		});
	});
});

//achieve a win streak in a specific game
gameList.forEach((el, i) => {
	if (el.name === 'NYT Crossword' || el.name === 'NYT Mini') return;
	const desc =
		el.name === 'Immaculate Grid'
			? 'Completely fill an Immaculate Grid'
			: el.name === 'Digits'
			? 'Get 20 stars on Digits'
			: `Win at ${el.name}`;
	[10, 25, 50, 100, 365].forEach((n) => {
		const name = el.name.toLowerCase().split(' ').join('-');
		const id = `${name}-win-streak-${n}`;
		streakAchievements.push({
			id,
			name: `${el.name} win streak - ${n}`,
			dataItem: `win-streak-${name}`,
			description: `${desc} for ${n} consecutive days`,
			color: streakColors[i],
			games: [el.name],
			streak: true,
			updateProgress: (old, data) => {
				const matcher = matchers.find((m) => m.data.name === el.name);
				if (!matcher) return old;
				else if (!matcher.data.checkWin(data.data)) return old;
				const fn = streakUpdater(el.name);
				return fn(old, data);
			},
			getProgress: printProgress(n, (data) => data),
			isComplete: (data) => {
				if (!data) return false;
				const fn = checkPlayCount(n);
				return fn(data.current);
			},
			retro: null,
		});
	});
});

//play at least one game for N straight days
const allPlayStreaks = [
	{ count: 10, name: 'A start', color: '#32a852' },
	{ count: 30, name: 'A rhythm', color: '#3232ad' },
	{ count: 100, name: 'A habit', color: '#ad32ab' },
	{ count: 365, name: 'A year', color: '#ffb300' },
	{ count: 730, name: 'An addiction', color: '#ad3243' },
	{ count: 1000, name: 'An obsession', color: '#40ff00' },
].map((el) => {
	const id = `all-streak-${el.count}`;
	return {
		id,
		name: el.name,
		dataItem: 'all-streak',
		description: `Post at least one result on the correct date on ${el.count} straight game dates`,
		color: el.color,
		games: [],
		streak: true,
		//TODO: test this one
		updateProgress: (old, data) => {
			const game = data.game;
			const fn = streakUpdater(game);
			if (!fn) return old;
			const newData = fn(old, data);
			//if we increased our streak with this data, no need to do anything else
			if (!old || newData.current > old.current) return newData;
			//otherwise, we need to check if there is any game that could still increase the streak
			// e.g. it's too late to submit a Wordle to continue the streak, but the last date's Digits is still live)
			else {
				const nextDate = getNextDate(old.lastPost);
				//here's the list of dates for which some puzzle is currently live
				let currentPuzzleDates = matchers
					.map((matcher) => matcher.data.getCurrentPuzzles())
					.reduce((p, c) => {
						return [...p, ...c];
					}, []);
				currentPuzzleDates = currentPuzzleDates
					.filter((d, i) => {
						return currentPuzzleDates.every((d2, j) => {
							return d !== d2 || j >= i;
						});
					})
					.sort((a, b) => a.localeCompare(b));
				const stillLive = currentPuzzleDates.includes(nextDate);
				//if there is no game that would continue the streak, start a new one
				if (!stillLive) {
					const lastPost = moment.tz(data.date, 'GMT').format().split('T')[0];
					if (nextDate === currentPuzzleDates[0])
						return {
							current: 1,
							lastPost,
							other: [],
						};
					else
						return {
							current: 1,
							lastPost,
							other: [lastPost],
						};
				} else return newData;
			}
		},
		getProgress: printProgress(el.count, (n) => n),
		isComplete: (data) => {
			if (!data) return false;
			const fn = checkPlayCount(el.count);
			return fn(data.current);
		},
		retro: null,
	};
});

const wordleAchievements = [
	...[
		{
			score: 3,
			name: 'Birdie',
			description: 'Get a 3 on a Wordle',
			color: `#4287f5`,
		},
		{
			score: 2,
			name: 'Eagle',
			description: 'Get a 2 on a Wordle',
			color: `#f5c242`,
		},
		{
			score: 1,
			name: 'Ace',
			description: 'Get a 1 on a Wordle',
			color: `#da07fa`,
		},
	].map((el) => {
		const id = `wordle-score-${el.score}`;
		return {
			id,
			name: el.name,
			description: el.description,
			color: el.color,
			games: ['Wordle'],
			updateProgress: returnData,
			getProgress: printProgress(1, () => 0),
			isComplete: (data) => (data ? data.score === el.score : false),
			retro: getAnyRes('Wordle', (data) => data.score === el.score),
		};
	}),
	{
		id: 'wordle-hard-way',
		name: 'Do it the hard way',
		description: 'Complete a Wordle on hard mode',
		color: '#6baa64',
		games: ['Wordle'],
		updateProgress: returnData,
		getProgress: printProgress(1, () => 0),
		isComplete: (data) => (data ? data.hardMode : false),
		retro: getAnyRes('Wordle', (data) => data.hardMode),
	},
	...[2, 3].map((n) => {
		const desc = n === 2 ? 'hot' : 'warm';
		const color = n === 2 ? '#ff0000' : '#a3d7ff';
		const id = `wordle-${desc}-streak`;
		return {
			id,
			name: `Wordle ${desc} streak`,
			dataItem: id,
			description: `Get a ${n} or better in Wordle for 3 straight days`,
			color,
			games: ['Wordle'],
			updateProgress: (old, data) => {
				const game = data.game;
				const fn = streakUpdater(game);
				if (!fn) return old;
				if (data.data.score <= n) return fn(old, data);
				return old;
			},
			getProgress: printProgress(3, (data) => data.current),
			isComplete: (data) => {
				if (!data) return false;
				const fn = checkPlayCount(3);
				return fn(data.current);
			},
			retro: null,
		};
	}),
];

const quordleColors = ['#00cf85', '#fdcc04', '#ff0000'];
const quordleAchievements = (game) => {
	const gameName = game.toLowerCase().split(' ').join('-');
	const maxGuesses =
		game === 'Quordle' ? 9 : game === 'Sequence Quordle' ? 10 : 8;
	const descs =
		game === 'Quordle'
			? ['Quordelicious', 'Quordelightful', 'Quordetastic']
			: game === 'Sequence Quordle'
			? ['Sequentelligent', 'Sequensational', 'Sequenlightened']
			: game === 'Quordle Extreme'
			? ['Extremarkable', 'Extravishing', 'Extrexcellent']
			: [];
	return [
		...[7, 6, 5].map((n, i) => {
			const id = `${gameName}-win-${n}`;
			return {
				id,
				name: `${game} in ${n}`,
				description: `Complete ${game} in ${n} guesses`,
				color: quordleColors[i],
				games: [game],
				updateProgress: returnData,
				getProgress: printProgress(1, () => 0),
				isComplete: (data) =>
					data ? data.scores.reduce((p, c) => Math.max(p, c)) === n : false,
				retro: getAnyRes(
					game,
					(data) => data.scores.reduce((p, c) => Math.max(p, c)) === n
				),
			};
		}),
		...[21, 18, 16].map((n, i) => {
			const id = `${game.toLowerCase().split(' ').join('-')}-sum-${n}`;
			return {
				id,
				name: descs[i],
				description: `Solve ${game} with a sum score of ${n} or better`,
				color: quordleColors[i],
				games: [game],
				updateProgress: returnData,
				getProgress: printProgress(1, () => 0),
				isComplete: (data) =>
					data ? data.scores.reduce((p, c) => p + c, 0) <= n : false,
				retro: getAnyRes(
					game,
					(data) =>
						data.scores.reduce((p, c) => Math.max(p, c)) <= maxGuesses &&
						data.scores.reduce((p, c) => p + c) === n
				),
			};
		}),
	];
};

const dows = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday',
];
const nytXWordAchievements = [
	...[
		{ time: 5, color: `#ff7366`, desc: `Expert` },
		{ time: 10, color: '#fff266', desc: 'Amateur' },
		{ time: 15, color: '#b5ff66', desc: 'Budding' },
	].map((el) => {
		const id = `nyt-crossword-${el.time}-min`;
		return {
			id,
			name: `${el.desc} Cruciverbalist`,
			description: `Solve the New York Times Crossword in ${el.time} minutes or better`,
			color: el.color,
			games: ['NYT Crossword'],
			updateProgress: returnData,
			getProgress: printProgress(1, () => 0),
			isComplete: (data) => (data ? data.time <= el.time * 60 : false),
			retro: getAnyRes('NYT Crossword', (data) => data.time <= el.time * 60),
		};
	}),
	...new Array(7)
		.fill(0)
		.map((el, i) => i)
		.map((dow, i) => {
			const id = `nyt-crossword-day-${dow}`;
			const d = dows[dow];
			return {
				id,
				name: `${d} NYT Crossword`,
				description: `Complete a ${d} New York Times Crossword`,
				color: `#ffffff`,
				games: ['NYT Crossword'],
				updateProgress: (old, data) => {
					return data.date;
				},
				getProgress: printProgress(1, () => 0),
				isComplete: (data) => data.getDay() === i,
				retro: async (user) => {
					const res = await Results.find({ user, game: 'NYT Crossword' })
						.sort({ date: 1 })
						.lean();
					const dRes = res.find((r) => r.date.getDay() === dow);
					if (dRes) return dRes.date;
					return null;
				},
			};
		}),
];
const nytMiniAchievements = [
	...[
		{ time: 120, color: '#66fff2', desc: 'Budding' },
		{ time: 60, color: '#b5ff66', desc: 'Amateur' },
		{ time: 30, color: '#fff266', desc: 'Expert' },
		{ time: 10, color: `#ff7366`, desc: `Blazing` },
	].map((el) => {
		const id = `nyt-mini-speed-${el.time}`;
		return {
			id,
			name: `${el.desc} Mini Cruciverbalist`,
			description: `Solve the New York Times Crossword in ${
				el.time >= 60 ? el.time / 60 : el.time
			} ${
				el.time === 60 ? 'minute' : el.time >= 60 ? 'minutes' : 'seconds'
			} or better`,
			color: el.color,
			games: ['NYT Mini'],
			updateProgress: returnData,
			getProgress: printProgress(1, () => 0),
			isComplete: (data) => data.time <= el.time,
			retro: getAnyRes('NYT Mini', (data) => data.time <= el.time),
		};
	}),
	...new Array(7)
		.fill(0)
		.map((el, i) => i)
		.map((dow, i) => {
			const id = `nyt-mini-day-${dow}`;
			const d = dows[dow];
			return {
				id,
				name: `${d} NYT Mini`,
				description: `Complete a ${d} New York Times Mini`,
				color: `#ffffff`,
				games: ['NYT Mini'],
				updateProgress: (old, data) => {
					return data.date;
				},
				getProgress: printProgress(1, () => 0),
				isComplete: (data) => data.getDay() === i,
				retro: async (user) => {
					const res = await Results.find({ user, game: 'NYT Mini' })
						.sort({ date: 1 })
						.lean();
					const dRes = res.find((r) => r.date.getDay() === dow);
					if (dRes) return dRes.date;
					return null;
				},
			};
		}),
];

const tightropeAchievements = [
	{
		id: 'tightrope-fall',
		name: 'Wile E. Coyote',
		description: `Fell off the Tightrope`,
		color: `#7dc2ff`,
		games: ['Tightrope'],
		updateProgress: returnData,
		getProgress: printProgress(1, () => 0),
		isComplete: (data) => data.misses >= 3,
		retro: getAnyRes('Tightrope', (data) => data.misses >= 3),
	},
	{
		id: 'tightrope-8-right',
		name: `Using Your Noodle`,
		description: `Get at least 8 right answers on a Tightrope`,
		color: '#c78800',
		games: ['Tightrope'],
		updateProgress: returnData,
		getProgress: printProgress(1, () => 0),
		isComplete: (data) => data.correctAnswers >= 8,
		retro: getAnyRes('Tightrope', (data) => data.correctAnswers >= 8),
	},
	{
		id: 'tightrope-9-right',
		name: `Smart Cookie`,
		description: `Get all 9 right answers on a Tightrope`,
		color: '#fffc54',
		games: ['Tightrope'],
		updateProgress: returnData,
		getProgress: printProgress(1, () => 0),
		isComplete: (data) => data.correctAnswers === 9,
		retro: getAnyRes('Tightrope', (data) => data.correctAnswers === 9),
	},
	...[
		{ time: 20, desc: 'Light' },
		{ time: 10, desc: 'Ridiculous' },
		{ time: 0, desc: 'Ludicrous' },
	].map((el) => {
		return {
			id: `tightrope-${el.desc.toLowerCase()}`,
			name: `${el.desc} Speed`,
			description: `Get all 9 right answers on a Tightrope in ${
				el.time
			} seconds${el.time > 0 ? ' or less' : ''}`,
			color: '#000000',
			games: ['Tightrope'],
			updateProgress: returnData,
			getProgress: printProgress(1, () => 0),
			isComplete: (data) => data.correctAnswers === 9 && data.time <= el.time,
			retro: getAnyRes(
				'Tightrope',
				(data) =>
					data.time !== null && !isNaN(data.time) && data.time <= el.time
			),
		};
	}),
];

const digitsAchievements = [
	{ stars: 16, name: 'Digitally literate', color: `#fffb00` },
	{ stars: 20, name: 'Mathlete', color: `#5f9c49` },
].map((el) => {
	return {
		id: `digits-${el.stars}-stars`,
		name: el.name,
		description: `Get ${el.stars} on a Digits puzzle`,
		color: el.color,
		games: ['Digits'],
		updateProgress: returnData,
		getProgress: printProgress(1, () => 0),
		isComplete: (data) => data.score >= el.stars,
		retro: getAnyRes('Digits', (data) => data.score >= el.stars),
	};
});

const connectionsAchievements = [
	{
		id: 'nyt-connections-reverse',
		name: 'Cart before the horse',
		description:
			'Complete an NYT Connections in reverse order of difficulty - purple, blue, green, yellow',
		color: '#ff6ea3',
		games: ['NYT Connections'],
		updateProgress: returnData,
		getProgress: printProgress(1, () => 0),
		isComplete: (data) => data.scores.every((s, i) => s === 4 - i),
		retro: null,
	},
	{
		id: 'nyt-connections-forward',
		name: 'Low-hanging fruit',
		description:
			'Complete an NYT Connections in order of difficulty - yellow, green, blue, purple',
		color: '#078700',
		games: ['NYT Connections'],
		updateProgress: returnData,
		getProgress: printProgress(1, () => 0),
		isComplete: (data) => data.scores.every((s, i) => s === i + 1),
		retro: null,
	},
];

const immaculateGridAchievements = [
	{
		id: `immaculate-grid-complete`,
		name: `Immaculate!`,
		description: `Completely fill an Immaculate Grid`,
		color: `#ffffff`,
		games: ['Immaculate Grid'],
		updateProgress: returnData,
		getProgress: printProgress(1, () => 0),
		isComplete: (data) => data.correct === 9,
		retro: getAnyRes('Immaculate Grid', (data) => data.correct === 9),
	},
	...[
		{
			rarity: 200,
			color: `#1900ff`,
			name: `Wild card`,
		},
		{
			rarity: 100,
			color: `#40ff96`,
			name: `Division Title`,
		},
		{
			rarity: 50,
			color: `#e9ff40`,
			name: `Championship Series`,
		},
		{
			rarity: 20,
			color: `#ffac40`,
			name: `Pennant`,
		},
		{
			rarity: 10,
			color: `#ff5340`,
			name: `World Series`,
		},
	].map((el) => {
		return {
			id: `immaculate-grid-rarity-${el.rarity}`,
			name: el.name,
			description: `Completely fill an Immaculate Grid with a rarity of ${el.rarity} or better`,
			color: el.color,
			games: ['Immaculate Grid'],
			updateProgress: returnData,
			getProgress: printProgress(1, () => 0),
			isComplete: (data) => data.correct === 9 && data.rarity <= el.rarity,
			retro: getAnyRes(
				'Immaculate Grid',
				(data) => data.correct === 9 && data.rarity <= el.rarity
			),
		};
	}),
];

const achievements = [
	...playAchievements,
	...gamePlayAchievements,
	...streakAchievements,
	...allPlayStreaks,
	...wordleAchievements,
	...quordleAchievements('Quordle'),
	...quordleAchievements('Quordle Extreme'),
	...quordleAchievements('Sequence Quordle'),
	...nytXWordAchievements,
	...nytMiniAchievements,
	...connectionsAchievements,
	...tightropeAchievements,
	...digitsAchievements,
	...immaculateGridAchievements,
	{
		id: `quordle-ace`,
		name: `Master of Four-Play`,
		description: `Solve a word on your first guess in Quordle, Quordle Extreme, or Sequence Quordle`,
		color: `#da07fa`,
		games: ['Quordle', 'Quordle Extreme', 'Sequence Quordle'],
		updateProgress: returnData,
		getProgress: printProgress(1, () => 0),
		isComplete: (data) => data.scores.some((s) => s === 1),
		retro: (user) => {
			const res = ['Quordle', 'Quordle Extreme', 'Sequence Quordle']
				.map((g) => {
					return getAnyRes(g, (data) => data.scores.some((s) => s === 1));
				})
				.map((fn) => fn(user))
				.find((r) => r !== null);
			if (!res) return null;
			return res;
		},
	},
	...[
		{
			n: 7,
			name: 'Lucky Day',
			description:
				'Solve Quordle, Quordle Extreme, and Quordle Sequence in exactly 7 guesses on the same day.',
			color: '#a8a500',
		},
		{
			n: 6,
			name: 'The Number of the Beast',
			description:
				'Solve Quordle, Quordle Extreme, and Quordle Sequence in exactly 6 guesses on the same day.',
			color: '#ff0000',
		},
	].map((el) => {
		return {
			id: `quordle-${el.n * 111}`,
			name: el.name,
			description: el.description,
			color: el.color,
			games: ['Quordle', 'Quordle Extreme', 'Sequence Quordle'],
			updateProgress: async (old, data) => {
				const res = await Results.find({
					user: data.user,
					date: data.date,
					game: { $in: ['Quordle', 'Sequence Quordle', 'Quordle Extreme'] },
				}).lean();
				return res.map((r) => {
					return {
						game: r.game,
						score: r.data.scores.reduce((p, c) => Math.max(p, c)),
					};
				});
			},
			getProgress: printProgress(1, () => 0),
			isComplete: async (data) =>
				data.length === 3 && data.every((r) => r.score === el.n),
			retro: async (user) => {
				const res = await Results.find({
					user,
					game: { $in: ['Quordle', 'Sequence Quordle', 'Quordle Extreme'] },
				})
					.sort({ date: 1 })
					.lean();
				let count = 0;
				let toReturn = null;
				res.some((r, i) => {
					if (i === 0 || r.date !== res[i - 1].date) count = 0;
					if (r.data.scores.reduce((p, c) => Math.max(p, c) === el.n)) count++;
					if (count === 3) {
						toReturn = r.date;
						return true;
					}
					return false;
				});
				if (count === 3) return toReturn;
				return null;
			},
		};
	}),
	{
		id: 'jack',
		name: `Jack of All Trades`,
		description: `Submit current results for at least 10 available games in a single day`,
		color: `#fd80ff`,
		games: [],
		updateProgress: async (old, data) => {
			const res = await Results.find({
				user: data.user,
				date: data.date,
			}).lean();
			return res.length;
		},
		getProgress: printProgress(1, () => 0),
		isComplete: (data) => data >= 10,
		retro: async (user) => {
			const res = await Results.find({
				user: user,
			})
				.sort({ date: 1 })
				.lean();
			let count = 0;
			let toReturn = null;
			res.some((r, i) => {
				let thisDate, lastDate;
				if (i !== 0) {
					thisDate = moment.tz(r.date, timezone).format().split('T')[0];
					lastDate = moment
						.tz(res[i - 1].date, timezone)
						.format()
						.split('T')[0];
				}
				if (i === 0 || thisDate !== lastDate) count = 1;
				else count++;
				if (count >= 10) {
					toReturn = r.date;
					return true;
				}
				return false;
			});
			return toReturn;
		},
	},
];

// const achievements = streakAchievements.filter(
// 	(a) => a.games.includes('Wordle') && a.description.indexOf('25') >= 0
// );
console.log(`${achievements.length} achievements found`);

// const handleRetroAchievements = async () => {
// 	const allUsers = await Users.find();
// 	allUsers.forEach((u) => {
// 		if (!u.achievements)
// 			u.achievements = {
// 				progress: [],
// 				completed: [],
// 			};
// 	});

// 	await Promise.all(
// 		allUsers.map(async (u) => {
// 			await Promise.all(
// 				achievements.map(async (a) => {
// 					//if they already have progress saved or have completed this achievement, don't bother
// 					if (u.achievements.completed.some((ua) => ua.id === a.id)) return;
// 					if (
// 						a.dataItem &&
// 						u.achievements.progress.some((up) => up.name === a.dataItem)
// 					)
// 						return;
// 					if (a.retro) {
// 						const res = await a.retro(u._id);
// 						if (res) {
// 							if (res.progress && a.dataItem) {
// 								if (
// 									!u.achievements.progress.some((p) => {
// 										if (p.name === a.dataItem) {
// 											p.progress = res.progress;
// 											return true;
// 										}
// 									})
// 								) {
// 									u.achievements.progress.push({
// 										name: a.dataItem,
// 										progress: res.progress,
// 									});
// 								}
// 							} else if (res.progress !== 0) {
// 								if (!u.achievements.completed.some((p) => p.id === a.id)) {
// 									u.achievements.completed.push({
// 										id: a.id,
// 										name: a.name,
// 										date: res,
// 									});
// 								}
// 							}
// 							u.markModified('achievements');
// 						}
// 					}
// 				})
// 			);
// 			await u.save();
// 		})
// 	);
// 	console.log('Achievements scanned');
// };
// handleRetroAchievements();

module.exports = achievements;
