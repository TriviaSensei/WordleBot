const moment = require('moment-timezone');
const maxTimeZoneOffset = 14;
const timezone = process.env.DEFAULT_TIMEZONE;
const msInDay = 86400000;
/*
Parses done:
Wordle
Quordle
Extreme Quordle
Sequence Quordle
Connections
Digits
Tightrope
Immaculate Grid
NYT Crossword
NYT Mini
*/

const getPuzzleDate = (number, baseNumber, baseDate) => {
	const dt = new Date(moment.tz(`${baseDate} 00:00`, timezone).format());
	const diff = number - baseNumber;
	const date = new Date(dt.setDate(dt.getDate() + diff));
	return date;
};

const getPuzzleNumber = (date, baseNumber, baseDate) => {
	const dt = new Date(moment.tz(`${baseDate} 00:00`, timezone).format());
	const diff = new Date(moment.tz(`${date} 00:00`, timezone).format()) - dt;
	const diffDays = Math.round(diff / msInDay);
	return baseNumber + diffDays;
};

const processKeyCaps = (line) => {
	if (line.length < 4 || line.length > 6) return null;
	const toReturn = [];

	for (var i = 0; i < line.length; i++) {
		const code = line.charCodeAt(i);
		if (code >= 49 && code <= 57) {
			i += 2;
			toReturn.push(code - 48);
		} else if (code === 55357) {
			i++;
			if (line.charCodeAt(i) === 57317) {
				toReturn.push(0);
			} else if (line.charCodeAt(i) === 56607) {
				toReturn.push(10);
			} else return null;
		} else return null;
	}
	return toReturn;
};

const processQuordle = (name, maxGuesses) => {
	return (str) => {
		const lines = str.split('\n');
		const tokens = lines[0].split(' ');

		if (lines.length < 3) return null;

		let failures = 0;
		const scores = [];

		if (
			[lines[1], lines[2]].every((l) => {
				const res = processKeyCaps(l);
				if (!res) return false;
				res.forEach((r) => {
					if (r !== 0) scores.push(r);
					else {
						failures++;
						scores.push(maxGuesses + failures);
					}
				});

				return res !== null;
			})
		) {
			if (
				scores.every((s1, i) => {
					return scores.every((s2, j) => {
						return s1 !== s2 || i === j;
					});
				})
			)
				return {
					status: 0,
					data: { scores, number: parseInt(tokens.slice(-1).pop()) },
				};
			else
				return {
					status: 1,
					message: `Duplicate scores found in ${name} ${lines[0]
						.split(' ')
						.slice(-1)
						.pop()}`,
				};
		} else {
			return {
				status: 1,
				message: `Unknown or invalid character found in pasted ${name} ${lines[0]
					.split(' ')
					.slice(-1)
					.pop()}`,
			};
		}
	};
};

const compareQuordle = (a, b) => {
	return a.scores.every((s, i) => {
		return s === b.scores[i];
	});
};

const getQuordleNumber = (str) => {
	return parseInt(str.split('\n')[0].split(' ').slice(-1).pop());
};

const quordleReaction = (maxGuesses) => {
	return (data) => {
		if (
			data.scores.some((s) => {
				return s > maxGuesses;
			})
		)
			return '😢';
		else if (
			data.scores.every((s) => {
				return s <= 5;
			})
		)
			return ['🎉', '✅'];
		else if (
			data.scores.every((s) => {
				return s <= 6;
			})
		)
			return ['🔥', '✅'];
		return '✅';
	};
};

const checkValidDateOnly = (date) => {
	const currentTimeGMT = new Date(moment.tz(new Date(), 'GMT'));
	//maxTime is the latest time anywhere on earth right now
	const maxTime = new Date(
		currentTimeGMT.setHours(currentTimeGMT.getHours() + maxTimeZoneOffset)
	);
	//if the submission date is less than maxTime, then this puzzle submit could be valid. Otherwise, it's definitely in the future.
	if (date.getFullYear() > maxTime.getFullYear()) return false;
	else if (date.getFullYear() === maxTime.getFullYear()) {
		if (date.getMonth() > maxTime.getMonth()) return false;
		else if (date.getMonth() === maxTime.getMonth()) {
			return date.getDate() <= maxTime.getDate();
		}
		return true;
	}
	return true;
};

const checkValidDateTime = (resetHour, timeZone) => {
	return (date) => {
		const todayReset = new Date(moment.tz(new Date(), timeZone).startOf('day'));
		const trueResetHour = resetHour < 0 ? 24 + resetHour : resetHour;
		todayReset.setHours(todayReset.getHours() + trueResetHour);
		const nextReset = new Date(todayReset);
		if (new Date() > nextReset) nextReset.setDate(nextReset.getDate() + 1);
		const newDate = new Date(date);
		newDate.setHours(date.getHours() + resetHour);
		return newDate < nextReset;
	};
};

const processCrossword = (name, dateIndex) => {
	return (str) => {
		const timeInfo = str
			.split(' ')
			.slice(-1)
			.pop()
			.split(':')
			.map((n) => parseInt(n));

		const data = {
			time:
				timeInfo.length > 3
					? null
					: timeInfo.length === 3
					? 3600 * timeInfo[0] + 60 * timeInfo[1] + timeInfo[2]
					: timeInfo.length === 2
					? 60 * timeInfo[0] + timeInfo[1]
					: null,
		};
		if (data.time !== null && !isNaN(data.time)) return { status: 0, data };
		return {
			status: 1,
			message: `Invalid data in ${name} for ${str.split(' ')[dateIndex]}`,
		};
	};
};

const compareCrossword = (a, b) => {
	return a.time === b.time;
};

const processCrosswordDate = (dateIndex) => {
	return (str) => {
		const dateInfo = str
			.split(' ')
			[dateIndex].split('/')
			.map((n) => parseInt(n));
		const [mo, dt, yr] = dateInfo;
		if (dateInfo.every((n) => !isNaN(n))) {
			return new Date(
				moment
					.tz(
						`${yr}-${mo >= 10 ? mo : `0${mo}`}-${
							dt >= 10 ? dt : `0${dt}`
						} 00:00`,
						timezone
					)
					.format()
			);
		}
		return null;
	};
};

const getDateExtremes = () => {
	const now = Date.now();
	const countries = moment.tz.countries().reduce((p, c) => {
		const toReturn = [...p];
		const zones = moment.tz.zonesForCountry(c, true);
		zones.forEach((z) => toReturn.push(z));
		return toReturn;
	}, []);
	const extremes = countries.reduce(
		(p, c) => {
			const toReturn = {
				...p,
			};
			if (!p.maxOffset || c.offset > p.maxOffset.offset) toReturn.maxOffset = c;
			if (!p.minOffset || c.offset < p.minOffset.offset) toReturn.minOffset = c;
			return toReturn;
		},
		{
			maxOffset: null,
			minOffset: null,
		}
	);
	return [
		moment.tz(now, extremes.maxOffset.name).format(),
		moment.tz(now, extremes.minOffset.name).format(),
	];
};
const getAvailableDates = () => {
	const extremes = getDateExtremes();
	const dates = [];
	const dtStr = moment
		.tz(`${extremes[0].split('T')[0]} 00:00`, timezone)
		.format();
	const lastDateStr = moment
		.tz(`${extremes[1].split('T')[0]} 00:00`, timezone)
		.format();
	const lastDate = Date.parse(new Date(lastDateStr));
	let dt = Date.parse(new Date(dtStr));
	let i = dt;
	while (i <= lastDate) {
		const toPush = moment.tz(i, timezone).format().split('T')[0];
		dates.push(toPush);
		const newDt = new Date(i);
		newDt.setDate(newDt.getDate() + 1);
		i = Date.parse(newDt);
	}
	return dates;
};
exports.getAvailableDates = getAvailableDates;

const currentCrosswords = () => {
	//current time, date in NY
	const currentDT = moment.tz(new Date(), timezone).format();
	const currentDate = currentDT.split('T')[0];
	//day of week in NY
	const currentDOW = new Date(
		moment.tz(`${currentDate} 00:00`, 'GMT').format()
	).getDay();
	//current hour in NY
	const currentHr = Number(currentDT.split('T')[1].split(':')[0]);
	//saturday or sunday after 6 PM ? two days available
	let twoDays = false;
	if (currentDOW === 0 || currentDOW === 6) {
		if (currentHr >= 18) twoDays = true;
	}
	//any other day after 10 PM ? two days available
	else if (currentHr >= 22) twoDays = true;

	if (twoDays) {
		const dt = new Date(moment.tz(`${currentDate} 00:00`, timezone).format());
		dt.setDate(dt.getDate() + 1);
		const dp = Date.parse(dt);
		return [currentDate, moment.tz(dp, timezone).format().split('T')[0]];
	} else return [currentDate];
};

/**
 * Regex - regex to match the result string
 * Data {
 *  name: name of the game
 *  getData (str): parse the data to send to the database out of the result string, return null if not found
 *  getDate (str): get the puzzle date (either from the string or the puzzle number)
 *  getReaction (data): from the result of getData, the reaction that should be used to acknowledge
 * }
 *
 */
const matchers = [
	//Wordle
	{
		regex:
			/Wordle (\d{1,3},)?(\d{1,3})+ [\dX]\/6(\*)?((\n)?(\n(\u2B1B|\u2B1C|(\uD83D\uDFE9)|(\uD83D\uDFE8)){5}(.*)){1,6})?/g,
		data: {
			name: 'Wordle',
			getCurrentPuzzles: getAvailableDates,
			getData: (str) => {
				try {
					const firstLine = str.split('\n')[0];
					const tokens = firstLine.split(' ');
					const data = {
						number: parseInt(tokens[1].split(',').join('')),
						score:
							tokens[2].charAt(0) === 'X' ? 7 : parseInt(tokens[2].charAt(0)),
						hardMode:
							tokens[2].trim().length === 4 &&
							tokens[2].trim().charAt(3) === '*',
					};
					if (data.number && data.score > 0 && data.score <= 7)
						return { status: 0, data };
					else if (!data.number) {
						return {
							status: 1,
							message: `Wordle puzzle number (${tokens[1].split(
								','
							)}) is not valid`,
						};
					} else {
						return {
							status: 1,
							message: `Wordle result (${tokens[2]}) is not valid`,
						};
					}
				} catch (err) {
					return {
						status: 1,
						message: `Unknown error on Wordle result (${tokens[2]})`,
					};
				}
			},
			compareData: (a, b) => {
				return a.score === b.score && a.hardMode === b.hardMode;
			},
			getLivePuzzle: (date) => {
				return getPuzzleNumber(date.split('T')[0], 1300, '2025-01-09');
			},
			getDate: (str) => {
				const number = parseInt(
					str.split('\n')[0].split(' ')[1].split(',').join('')
				);
				return getPuzzleDate(number, 1300, '2025-01-09');
			},
			getPuzzleNumberByDate: (date) => {
				return getPuzzleNumber(date, 1300, '2025-01-09');
			},
			checkWin: (data) => data.score <= 6,
			checkValidDate: checkValidDateOnly,
			getReaction: (data) => {
				const emojis = ['🎉', '🔥', null, null, null, '😅'];
				if (data.score === 7) return ['😢'];
				else if (emojis[data.score - 1]) return [emojis[data.score - 1], '✅'];
				else return ['✅'];
			},
		},
	},
	//Quordle, Extreme, Sequence
	{
		regex: /(\uD83D\uDE42(\s)*)?Daily Quordle (\d)+(\n(.*)){2}/g,
		data: {
			name: 'Quordle',
			getData: processQuordle('Quordle', 9),
			compareData: compareQuordle,
			checkValidDate: checkValidDateOnly,
			getCurrentPuzzles: getAvailableDates,
			getLivePuzzle: (date) => {
				return getPuzzleNumber(date.split('T')[0], 1082, '2025-01-10');
			},
			getDate: (str) => {
				const number = parseInt(str.split('\n')[0].split(' ').slice(-1).pop());
				return getPuzzleDate(number, 1082, '2025-01-10');
			},
			getPuzzleNumberByDate: (date) => {
				return getPuzzleNumber(date, 1082, '2025-01-10');
			},
			checkWin: (data) => data.scores.reduce((p, c) => Math.max(p, c)) <= 9,
			getReaction: quordleReaction(9),
		},
	},
	{
		regex:
			/Daily Sequence Quordle (\d)+(\n(([\u31\u32\u33\u34\u35\u36\u37\u38\u39]\uFE0F\u20E3)|(\uD83D\uDD1F)|(\uD83D\uDFE5)){2}){2}/g,
		data: {
			name: 'Sequence Quordle',
			checkValidDate: checkValidDateOnly,
			getCurrentPuzzles: getAvailableDates,
			getData: processQuordle('Sequence Quordle', 10),
			compareData: compareQuordle,
			getLivePuzzle: (date) => {
				return getPuzzleNumber(date.split('T')[0], 1082, '2025-01-10');
			},
			getDate: (str) => {
				const number = parseInt(str.split('\n')[0].split(' ').slice(-1).pop());
				return getPuzzleDate(number, 1082, '2025-01-10');
			},
			getPuzzleNumberByDate: (date) => {
				return getPuzzleNumber(date, 1082, '2025-01-10');
			},
			checkWin: (data) => data.scores.reduce((p, c) => Math.max(p, c)) <= 10,
			getReaction: quordleReaction(10),
		},
	},
	{
		regex:
			/(\uD83E\uDD75(\s)*)?Daily Extreme (\d)+(\n(([\u31\u32\u33\u34\u35\u36\u37\u38\u39]\uFE0F\u20E3)|(\uD83D\uDFE5)){2}){2}/g,
		data: {
			name: 'Quordle Extreme',
			checkValidDate: checkValidDateOnly,
			getCurrentPuzzles: getAvailableDates,
			getData: processQuordle('Quordle Extreme', 8),
			compareData: compareQuordle,
			getLivePuzzle: (date) => {
				return getPuzzleNumber(date.split('T')[0], 165, '2025-01-10');
			},
			getDate: (str) => {
				const number = parseInt(str.split('\n')[0].split(' ').slice(-1).pop());
				return getPuzzleDate(number, 165, '2025-01-10');
			},
			getPuzzleNumberByDate: (date) => {
				return getPuzzleNumber(date, 165, '2025-01-10');
			},
			checkWin: (data) => data.scores.reduce((p, c) => Math.max(p, c)) <= 8,
			getReaction: quordleReaction(8),
		},
	},
	//NYT Connections
	{
		regex:
			/Connections(\n|\s)Puzzle #(\d{1,3},)?(\d{3})+(\n(\uD83D[\uDFE8\uDFE9\uDFE6\uDFEA]){4})+/g,
		data: {
			name: 'NYT Connections',
			checkValidDate: checkValidDateOnly,
			getCurrentPuzzles: getAvailableDates,
			getLivePuzzle: (date) => {
				return getPuzzleNumber(date.split('T')[0], 581, '2025-01-12');
			},
			getDate: (str) => {
				const lines = str.split('\n');
				let number;

				lines.some((l) => {
					const spl = l.split('#');
					if (spl.length > 1) {
						number = parseInt(spl[1].split(',').join(''));
						return true;
					}
				});
				return getPuzzleDate(number, 581, '2025-01-12');
			},
			getPuzzleNumberByDate: (date) => {
				return getPuzzleNumber(date, 581, '2025-01-12');
			},
			getData: (str) => {
				const colors = ['yellow', 'green', 'blue', 'purple'];
				const lines = str.split('\n');
				let number;
				lines.some((l) => {
					const spl = l.split('#');
					if (spl.length > 1) {
						number = parseInt(spl[1].split(',').join(''));
						return true;
					}
				});

				if (!number)
					return {
						status: 1,
						message: `Connections ${lines[1]} is not a valid puzzle number.`,
					};
				const data = {
					number,
					scores: [0, 0, 0, 0],
					mistakes: 0,
				};
				//Y, G, B, P in that order
				const regexes = [
					/(\uD83D\uDFE8){4}/,
					/(\uD83D\uDFE9){4}/,
					/(\uD83D\uDFE6){4}/,
					/(\uD83D\uDFEA){4}/,
				];
				let found = 0;
				lines.forEach((l, i) => {
					if (l.length !== 8) {
						return;
					}
					const ind = regexes.findIndex((r) => {
						return l.match(r);
					});
					if (ind >= 0) {
						found++;
						if (data.scores[ind] > 0) {
							return {
								status: 1,
								message: `Connections #${number} has a duplicated completed group (${colors[ind]})`,
							};
						}
						data.scores[ind] = found;
					} else if (l.match(/(\uD83D[\uDFE8\uDFE9\uDFE6\uDFEA]){4}/))
						data.mistakes++;
				});
				if (data.mistakes > 4)
					return {
						status: 1,
						message: `Connections #${number} has too many mistakes`,
					};
				else if (data.mistakes < 4 && data.scores.some((s) => s === 0)) {
					return {
						status: 1,
						message: `Connections #${number} has incomplete data`,
					};
				} else
					return {
						status: 0,
						data,
					};
			},
			compareData: (a, b) => {
				return (
					a.scores.every((s, i) => {
						return s === b.scores[i];
					}) && a.mistakes === b.mistakes
				);
			},
			checkWin: (data) => data.scores.every((s) => s >= 1) && data.mistakes < 4,
			getReaction: (data) => {
				const emojis = ['🔥', '✅', '✅', '😅', '😢'];
				return emojis[data.mistakes];
			},
		},
	},
	//Digits
	{
		/**
		 * multiply: 10006, 65039
		 * divide: 10135
		 * add: 10133
		 * subtract: 10134
		 * /Digits #(\d)+ \((\d)+\/20\u2B50\)\n([\d]{2,3} \((\d){2,3}\) [(\u2716\uFE0F)\u2797\u105B\u105C]{1,5}\n){5}https:\/\/www\.cyu\.dev\/digits/g
		 */

		regex:
			/Digits #(\d)+ \((\d)+\/20\u2B50\)(\n(([\d]{2,3} \((\d){2,3}\) ((\u2716\uFE0F)|[\u2797\u2795\u2796]){1,5}(.*)\n)){5}https:\/\/www\.cyu\.dev\/digits)?/g,
		data: {
			name: 'Digits',
			getLivePuzzle: (date) => {
				return getPuzzleNumber(date.split('T')[0], 645, '2025-01-13');
			},
			getCurrentPuzzles: () => {
				const currentDT = moment.tz(Date.now(), timezone).format();
				return [currentDT.split('T')[0]];
			},
			getData: (str) => {
				const lines = str.split('\n');
				const number = parseInt(
					lines[0].split(' ')[1].split('#').slice(-1).pop()
				);
				const score = parseInt(
					lines[0].split(' ')[2].split('/')[0].split('(').slice(-1).pop()
				);
				if (number && score >= 0)
					return {
						status: 0,
						data: {
							number,
							score,
						},
					};
				return {
					status: 1,
					message: `Digits ${lines[0].split(' ')[1]} has invalid data`,
				};
			},
			compareData: (a, b) => {
				return a.score === b.score;
			},
			checkValidDate: checkValidDateTime(0, timezone),
			getDate: (str) => {
				const number = parseInt(
					str.split('\n')[0].split(' ')[1].split('#').slice(-1).pop()
				);
				return getPuzzleDate(number, 645, '2025-01-13');
			},
			getPuzzleNumberByDate: (date) => {
				return getPuzzleNumber(date, 645, '2025-01-13');
			},
			checkWin: (data) => data.score === 20,
			getReaction: (data) => {
				return ['✅'];
			},
		},
	},
	//Tightrope
	{
		regex:
			/(Tightrope(.*)(\n){2})?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\. (\d){1,2}, (\d){4}(\s)+T(\s)+I(\s)+G(\s)+H(\s)+T(\s)+R(\s)+O(\s)+P(\s)+E(\s)+((\u2705|(\uD83D\uDC94)|(\u23B5 )) ){9}((\uD83E\uDD15)|(\uD83C\uDF89))(\s)+My Score: (\d)+/g,
		data: {
			name: 'Tightrope',
			getLivePuzzleDate: (date) => {
				return date.split('T')[0];
			},
			getDate: (str) => {
				const lines = str.split('\n');
				const mos = [
					'Jan',
					'Feb',
					'Mar',
					'Apr',
					'May',
					'Jun',
					'Jul',
					'Aug',
					'Sep',
					'Oct',
					'Nov',
					'Dec',
				];
				let mo, dt, yr;
				lines.some((l) => {
					if (
						l.match(
							/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\. (\d){1,2}, (\d){4}/
						)
					) {
						const tokens = l.split(' ');
						mo = mos.findIndex((m) => m === tokens[0].split('.')[0]) + 1;
						dt = parseInt(tokens[1]);
						yr = parseInt(tokens[2]);
						return true;
					}
				});
				if (!mo || !dt || !yr) return null;
				const toReturn = new Date(
					moment
						.tz(
							`${yr}-${mo >= 10 ? mo : `0${mo}`}-${
								dt >= 10 ? dt : `0${dt}`
							} 00:00`,
							timezone
						)
						.format()
				);
				return toReturn;
			},
			checkValidDate: checkValidDateOnly,
			getCurrentPuzzles: getAvailableDates,
			getData: (str) => {
				const lines = str.split('\n');
				const data = {
					correctAnswers: 0,
					misses: 0,
					score: parseInt(lines.slice(-1).pop().split(' ').slice(-1).pop()),
				};
				if (
					lines.some((l) => {
						if (l.match(/((\u2705|(\uD83D\uDC94)|(\u23B5 )) ){9}/)) {
							const results = l.split(' ');
							results.forEach((r) => {
								if (r === '✅') data.correctAnswers++;
							});
							data.misses = 9 - data.correctAnswers;
							return true;
						}
					})
				) {
					const mos = [
						'Jan',
						'Feb',
						'Mar',
						'Apr',
						'May',
						'Jun',
						'Jul',
						'Aug',
						'Sep',
						'Oct',
						'Nov',
						'Dec',
					];
					let mo, dt, yr;
					lines.some((l) => {
						if (
							l.match(
								/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\. (\d){1,2}, (\d){4}/
							)
						) {
							const tokens = l.split(' ');
							mo = mos.findIndex((m) => m === tokens[0].split('.')[0]) + 1;
							dt = parseInt(tokens[1]);
							yr = parseInt(tokens[2]);
							return true;
						}
					});
					if (!mo || !dt || !yr) return null;
					const gameDate = new Date(
						moment
							.tz(
								`${yr}-${mo >= 10 ? mo : `0${mo}`}-${
									dt >= 10 ? dt : `0${dt}`
								} 00:00`,
								timezone
							)
							.format()
					);
					const dow = gameDate.getDay();
					const difficulty = dow === 0 ? 320 : 180 + 20 * dow;
					data.time =
						(data.correctAnswers * 250 + difficulty - data.score) / 10;
					return {
						status: 0,
						data,
					};
				} else
					return {
						status: 1,
						message: `No results were parsed for Tightrope on ${lines[2]}`,
					};
			},
			compareData: (a, b) => {
				return (
					a.score === b.score &&
					a.correctAnswers === b.correctAnswers &&
					a.misses === b.misses
				);
			},
			getPuzzleNumberByDate: () => {
				return null;
			},
			checkWin: (data) => data.misses < 3,
			getReaction: (data) => {
				if (data.correctAnswers === 9) return ['🔥', '🎉'];
				else if (data.correctAnswers >= 7) return ['🎉'];
				else return ['🤕'];
			},
		},
	},
	//Immaculate Grid
	{
		regex: /Immaculate Grid (\d)+ (\d)\/9:(\n.*)+Rarity: (\d)+/g,
		data: {
			name: 'Immaculate Grid',
			getData: (str) => {
				const lines = str.split('\n');
				const data = {
					number: parseInt(lines[0].split(' ')[2]),
					correct: parseInt(lines[0].split(' ')[3].split('/')[0]),
					rarity: parseInt(
						lines
							.find((l) => l.match(/Rarity/g))
							?.split(' ')
							.slice(-1)
							.pop()
					),
				};
				if (isNaN(data.rarity))
					return {
						status: 1,
						message: 'Invalid or no value detected for rarity',
					};
				return { status: 0, data };
			},
			compareData: (a, b) => {
				return a.correct === b.correct && a.rarity === b.rarity;
			},
			checkValidDate: checkValidDateTime(6, timezone),
			getCurrentPuzzles: () => {
				const currentDT = moment.tz(new Date(), timezone).format();
				const currentHr = Number(currentDT.split('T')[1].split(':')[0]);
				if (currentHr < 6) {
					const dt = new Date();
					dt.setDate(dt.getDate() - 1);
					console.log(dt);
					return [moment.tz(Date.parse(dt), timezone).split('T')[0]];
				}
				return [currentDT.split('T')[0]];
			},
			getDate: (str) => {
				const number = parseInt(str.split('\n')[0].split(' ')[2]);
				return getPuzzleDate(number, 652, '2025-01-13');
			},
			getPuzzleNumberByDate: (date) => {
				return getPuzzleNumber(date, 652, '2025-01-13');
			},
			checkWin: (data) => data.correct === 9,
			getReaction: (data) => {
				if (data.correct === 9) {
					if (data.rarity < 100) return ['🔥'];
					else if (data.rarity < 200) return ['⚾️'];
					else return ['✅'];
				} else return ['✅'];
			},
		},
	},
	//NYT Mini
	{
		regex:
			/I solved the (\d)+\/(\d)+\/(\d)+ New York Times Mini Crossword in (\d)+(:(\d){2})+/g,
		data: {
			name: 'NYT Mini',
			getData: processCrossword('NYT Mini', 3),
			getLivePuzzleDate: (date) => {
				return date.split('T')[0];
			},
			compareData: compareCrossword,
			getDate: processCrosswordDate(3),
			getPuzzleNumberByDate: () => {
				return null;
			},
			checkValidDate: (date) => {
				let func;
				if (date.getDay() <= 1) func = checkValidDateTime(-6, timezone);
				else func = checkValidDateTime(-2, timezone);
				return func(date);
			},
			getCurrentPuzzles: currentCrosswords,
			checkWin: (data) => true,
			getReaction: () => {
				return ['✅'];
			},
		},
	},
	//NYT Crossword
	{
		regex:
			/I solved the ((Monday)|(Tuesday)|(Wednesday)|(Thursday)|(Friday)|(Saturday)|(Sunday)) (\d)+\/(\d)+\/(\d)+ New York Times Daily Crossword in (\d)+(:(\d){2})+/g,
		data: {
			name: 'NYT Crossword',
			getLivePuzzleDate: (date) => {
				return date.split('T')[0];
			},
			getData: processCrossword('NYT Crossword', 4),
			compareData: compareCrossword,
			getDate: processCrosswordDate(4),
			getPuzzleNumberByDate: () => {
				return null;
			},
			checkValidDate: (date) => {
				let func;
				if (date.getDay() <= 1) func = checkValidDateTime(-6, timezone);
				else func = checkValidDateTime(-2, timezone);
				return func(date);
			},
			getCurrentPuzzles: currentCrosswords,
			checkWin: (data) => true,
			getReaction: () => {
				return ['✅'];
			},
		},
	},
];

exports.parseResult = (str) => {
	const gameInfo = matchers
		.filter((m, i) => {
			return str.match(m.regex);
		})
		.map((m, i) => {
			return {
				...m.data,
				match: str.match(m.regex),
			};
		});
	return gameInfo;
};

exports.matchers = matchers;
