const mongoose = require('mongoose');
const moment = require('moment-timezone');

const Servers = require('../models/serverModel');
const Results = require('../models/resultModel');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const games = require('../../utils/gameList');
const achievements = require('../../utils/achievements');
const getNextDate = require('../../utils/getNextDate');
const { matchers } = require('../../utils/parseResult');
const { promises } = require('fs');
const path = require('path');

const timezone = process.env.DEFAULT_TIMEZONE;

let resultCount = null;
const getResultCount = async () => {
	if (resultCount === null) {
		let res = await Results.find({}).lean();
		resultCount = res.length;
	}
	return resultCount;
};
getResultCount();

const {
	getServerStats,
	getPlayerStats,
} = require('../controllers/wordleController');

exports.httpsRedirect = (req, res, next) => {
	if (
		process.env.NODE_ENV === 'production' &&
		req.headers.host !== `localhost:${process.env.PORT}`
	) {
		if (req.header('x-forwarded-proto') !== 'https') {
			return res.redirect(`https://${req.header('host')}${req.url}`);
			// next();
		}
	}
	next();
};

exports.getWordle = catchAsync(async (req, res, next) => {
	res.status(200).render('faq', {
		games,
		donate: process.env.DONATE_LINK,
		invite: process.env.DISCORD_LINK,
		install: process.env.DISCORD_INSTALL_LINK,
	});
});

exports.getWordleStats = catchAsync(async (req, res, next) => {
	let year, month, currentYear, currentMonth;
	const currentDateET = moment.tz(new Date(), timezone).format();
	const t = currentDateET.split('-');
	currentYear = parseInt(t[0]);
	currentMonth = parseInt(t[1]);
	if (req.params.year && req.params.month) {
		const y = Number(req.params.year);
		const m = Number(req.params.month);
		if (
			y >= 2025 &&
			Number.isInteger(y) &&
			Number.isInteger(m) &&
			m >= 1 &&
			m <= 12
		) {
			year = y;
			month = m;
		}
	}
	if (!year || !month) {
		year = currentYear;
		month = currentMonth;
	}

	const loc = req.url
		.split('/')
		.filter((x) => x.length !== 0)
		.find((str) => ['server', 'player'].includes(str.toLowerCase()));
	let result;
	if (loc.toLowerCase() === 'server')
		result = await getServerStats(req.params.id, year, month);
	else {
		result = await getPlayerStats(req.params.id, year, month);
	}
	if (result.status !== 'success') {
		return res.status(200).render(`404`, { data: result });
	}
	const dataItems = games.map((g) => {
		return {
			game: g.name,
			script: g.script,
			items: g.dataItems.map((d) => {
				return {
					name: d.name,
					display: d.display,
				};
			}),
		};
	});
	res.status(200).render(`${loc.toLowerCase()}`, {
		status: 'success',
		data: {
			...result.data,
			dataItems,
			achievements:
				loc.toLowerCase() === 'player'
					? await Promise.all(
							achievements.map(async (a, i) => {
								const completedAchievement =
									result?.data?.playerData?.achievements?.completed?.find(
										(ca) => ca.id === a.id
									);
								let progress;
								if (!completedAchievement) {
									const di =
										result?.data?.playerData?.achievements?.progress?.find(
											(p) => p.name === a.dataItem
										);
									if (di) {
										//it's not a streak achievement, so just get the progress
										if (!a.streak) progress = a.getProgress(di.progress);
										//for streak achievements, we need to see if the streak is continuable (otherwise we need to show progress is 0)
										else {
											//here's the list of dates for which some puzzle is currently live
											let currentPuzzleDates = matchers
												.map((matcher) => matcher.data.getCurrentPuzzles())
												.reduce((p, c) => {
													return [...p, ...c];
												}, []);
											currentPuzzleDates = currentPuzzleDates.filter((d, i) => {
												return currentPuzzleDates.every((d2, j) => {
													return d !== d2 || j >= i;
												});
											});
											//is the streak-continuing date in the list?
											const lastPostDate = di.progress?.lastPost;
											if (a.name === 'A start') console.log(lastPostDate);

											if (!lastPostDate) progress = a.getProgress(0);
											else {
												const nextDate = getNextDate(lastPostDate);
												if (a.name === 'A start')
													console.log(nextDate, currentPuzzleDates);

												if (currentPuzzleDates.includes(nextDate))
													progress = a.getProgress(
														Math.max(
															di.progress.current,
															di.progress.other?.length || 0
														)
													);
												else
													progress = a.getProgress({
														current: 0,
													});
											}
										}
									} else progress = a.getProgress(null);
								}
								return (async ({
									id,
									name,
									description,
									games,
									color,
									alt,
								}) => {
									const subfolder =
										games.length !== 1
											? 'all'
											: games[0].toLowerCase().split(' ').join('-');
									const folder = path.join(
										__dirname,
										`../../public/img/achievements/${subfolder}`
									);
									let file = path.join(folder, `/${id}.svg`);
									let fname = '';
									let ext = '';
									try {
										const f = await promises.open(file, 'r');
										fname = `${id}`;
										ext = 'svg';
										f.close();
									} catch (err) {
										try {
											file = path.join(folder, `/${id}.png`);
											const f = await promises.open(file, 'r');
											fname = `${id}`;
											ext = 'png';
											f.close();
										} catch (err2) {}
									}
									return {
										id,
										name,
										fname,
										alt: alt || false,
										ext,
										description,
										progress,
										games,
										color,
									};
								})(a);
							})
					  )
					: null,
			timezone: process.env.DEFAULT_TIMEZONE,
		},
		title: `${
			result.data.serverData
				? 'Server Standings - ' + result.data.serverData.name
				: 'Player Data - ' + result.data.playerData.globalName
		}`,
	});
});
// exports.getTest = (req, res, next) => {
// 	res.status(200).render('test');
// };
exports.getSettingsPage = catchAsync(async (req, res, next) => {
	if (!Servers)
		return res.status(200).render(`404`, {
			data: { code: 500, message: 'Could not connect to database' },
		});

	const serverFilter =
		process.env.NODE_ENV === 'production'
			? {
					settingsToken: req.params.token,
					settingsTokenUsed: false,
					settingsTokenExpires: { $gte: Date.now() },
			  }
			: { settingsToken: req.params.token };
	const serverData = await Servers.findOne(serverFilter).select(
		'-settingsToken -settingsTokenExpires'
	);
	if (!serverData) {
		return res.status(200).render(`404`, {
			data: { code: 404, message: 'Server not found, or token not valid' },
		});
	}
	const ua = req.rawHeaders.findIndex((h) => h.toLowerCase() === 'user-agent');
	let isDiscord = true;
	if (ua >= 0 && ua < req.rawHeaders.length) {
		if (req.rawHeaders[ua + 1].toLowerCase().indexOf('discordapp') < 0) {
			isDiscord = false;
		}
	}
	//discord seems to visit the link before posting it, so it will trigger this if we don't check if it's discord
	if (!isDiscord) {
		serverData.settingsTokenUsed = true;
		await serverData.save();
	}

	const defaultSettings = games
		.filter((g) => serverData.games.includes(g.name))
		.map((g) => {
			return {
				name: g.name,
				settings: g.settings.map((s) => {
					return {
						...s,
						type: s.type === Number ? 'number' : 'string',
					};
				}),
			};
		});
	// defaultSettings.forEach((ds) => {
	// 	console.log(ds.name);
	// 	ds.settings.forEach((item) => console.log(item));
	// });
	serverData.settings.forEach((s) => {
		//default settings and names from the server
		const settingData = defaultSettings.find((ds) => ds.name === s.name);
		//set to the default if it exists
		if (!settingData) return;
		s.settings = settingData.settings.map((sd) => {
			const currentSetting = s.settings.find(
				(s) => s.name.toLowerCase() === sd.name.toLowerCase()
			);
			if (
				!currentSetting ||
				(sd.enum &&
					!sd.enum.some(
						(e) => e.label.toLowerCase() === currentSetting.value.toLowerCase()
					))
			)
				return {
					...sd,
					value: sd.default,
				};

			return {
				...sd,
				value: currentSetting.value,
			};
		});
	});

	const dataItems = games.map((g) => {
		return {
			game: g.name,
			script: g.script,
			items: g.dataItems.map((d) => {
				return {
					name: d.name,
					display: d.display,
				};
			}),
		};
	});

	res.status(200).render('settings', {
		data: {
			serverData,
			dataItems,
		},
	});
});

exports.getHome = catchAsync(async (req, res, next) => {
	res.status(200).render('home', {
		resultCount,
		donate: process.env.DONATE_LINK,
		invite: process.env.DISCORD_LINK,
		install: process.env.DISCORD_INSTALL_LINK,
		games: games.map((g) => {
			return { name: g.name, url: g.url };
		}),
		title: 'WordleBot - Home',
	});
});

exports.getDocs = catchAsync(async (req, res, next) => {
	res.status(200).render('docs', {
		resultCount,
		donate: process.env.DONATE_LINK,
		invite: process.env.DISCORD_LINK,
		install: process.env.DISCORD_INSTALL_LINK,
		games: games.map((g) => {
			return { name: g.name, url: g.url };
		}),
		title: 'WordleBot - Documentation',
		scrollTo: req.params.scrollTo || null,
	});
});

exports.getServers = catchAsync(async (req, res, next) => {
	const servers = await Servers.find({ isPublic: true })
		.select([
			'name',
			'guildId',
			'icon',
			'banner',
			'games',
			'serverDescription',
			'inviteLink',
		])
		.lean();
	servers.sort((a, b) => {
		if (a.guildId === process.env.DISCORD_PUBLIC_SERVER) return -1;
		else if (b.guildId === process.env.DISCORD_PUBLIC_SERVER) return 1;
		else return 0;
	});
	res.status(200).render('servers', {
		servers,
	});
});

exports.redirectToIndex = (req, res, next) => {
	if (req.originalUrl !== '/favicon.ico') return res.redirect(`/`);
	else
		res.status(404).json({
			status: 'fail',
		});
};
