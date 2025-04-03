const Results = require('../mvc/models/resultModel');
const Users = require('../mvc/models/userModel');
const gameList = require('./gameList');
const moment = require('moment-timezone');
const { matchers, getAvailableDates } = require('./parseResult');
const timezone = process.env.DEFAULT_TIMEZONE;
//just sets the progress to the last thing submitted - usually for single-action achievements
const returnData = (old, result) => result.data;
//for single-action achievements, always prints 0/1 if not completed
const singleActionProgress = (p) => '0/1';

const printProgress = (n, dataFn) => {
	return (data) => {
		return `${dataFn(data)}/${n}`;
	};
};

const countPlays = (old, data) => {
	if (!data) return old;
	if (old) return old + 1;
	return 1;
};
const checkPlayCount = (n) => {
	return (data) => data >= n;
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
		if (!u.achievements) u.achievements = [];
		if (res.length >= n) {
			if (!u.achievements.some(findAndSetComplete(id, res[n - 1].date))) {
				u.achievements.push({
					id,
					complete: true,
					completedDate: res[n - 1].date,
					progress: null,
				});
			}
		} else {
			if (
				!u.achievements.some((a) => {
					if (a.id === id) a.progress = res.length;
				})
			) {
				u.achievements.push({
					id,
					complete: false,
					completedDate: null,
					progress: res.length,
				});
			}
		}
		u.markModified('achievements');
		await u.save();
	};
};

const getCurrentPuzzles = (game) => {
	const m = matchers.find((m) => m.data.name === game);
	if (!m) return;
	return m.data.getCurrentPuzzles();
};
// pass in string like 2025-04-01
const getNextDate = (date) => {
	if (!date) return null;
	const dt = new Date(moment.tz(`${date} 00:00`, timezone).format());
	dt.setDate(dt.getDate() + 1);
	const dp = Date.parse(dt);
	const toReturn = moment.tz(dp, timezone).format().split('T')[0];
	return toReturn;
};

//total plays among all games
const playAchievements = [
	{ count: 1, name: 'First-timer', color: '#6baa64' },
	{ count: 10, name: 'Rookie', color: '#32a852' },
	{ count: 100, name: 'Junior', color: '#3232ad' },
	{ count: 500, name: 'Senior', color: '#ad32ab' },
	{ count: 1000, name: 'Veteran', color: '#ffb300' },
	{ count: 5000, name: 'Old Timer', color: '#ad3243' },
	{ count: 10000, name: 'Ageless Wonder', color: '#40ff00' },
].map((el) => {
	const id = `play-${el.count}`;
	return {
		id,
		name: el.name,
		img: el.name.toLowerCase(),
		description: `Post ${el.count} ${
			el === 1 ? 'result' : 'results between all games'
		}`,
		color: el.color,
		games: [],
		updateProgress: countPlays,
		getProgress: printProgress(el.count, (n) => n),
		isComplete: checkPlayCount(el.count),
		retro: getCountRetroFunction(id, {}, el.count),
	};
});

//play a specific game N times
const gamePlayAchievements = [];
const gamePlayColors = ['#0000ff', '#00873b', '#fbff2b', '#ff5781'];
[10, 100, 500, 1000].forEach((n, i) => {
	gameList.forEach((g) => {
		const id = `${g.name}-${n}`;
		gamePlayAchievements.push({
			id,
			name: `${g.name} x ${n}`,
			img: id,
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
*/
const streakUpdater = (game) => {
	return (old, data) => {
		const m = matchers.find((m) => m.data.name === game);
		if (!m) return old;
		//these dates are the latest dates available for posting somewhere in the world
		const dates = m.data.getCurrentPuzzles();
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
		//streak-continuing date is still in play, so add the date of this submission to "other"
		else {
			return {
				...old,
				other: [...old.other, thisDate],
			};
		}
	};
};

//achieve a streak in a specific game
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
		const id = `${el.name}-streak-${n}`;
		streakAchievements.push({
			id,
			name: `${el.name} streak - ${n}`,
			img: id,
			description: `Play ${el.name} for ${n} consecutive days`,
			color: streakColors[i],
			games: [el.name],
			updateProgress: streakUpdater(el.name),
			getProgress: printProgress(n, (data) => data.current),
			isComplete: checkPlayCount(n),
			retro: null,
		});
	});
});

const achievements = [
	...playAchievements,
	...gamePlayAchievements,
	...streakAchievements,
	// {
	// 	id: 'wordle-hard-way',
	// 	name: 'Do it the hard way',
	// 	img: 'wordle-hard-way',
	// 	description: 'Complete a Wordle on hard mode',
	// 	color: '#6baa64',
	// 	games: ['Wordle'],
	// 	updateProgress: returnData,
	// 	getProgress: sap,
	// 	isComplete: (data) => data.hardMode,
	// 	retro: getAnyRes('Wordle', (data) => data.hardMode),
	// },
];

module.exports = achievements;
