const mongoose = require('mongoose');
const moment = require('moment-timezone');

const Servers = require('../models/serverModel');
const Results = require('../models/resultModel');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const games = require('../../utils/gameList');

const timezone = process.env.DEFAULT_TIMEZONE;

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

	const loc = req.url.split('/').filter((x) => x.length !== 0)[0];
	console.log(req.url);
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
		data: { ...result.data, dataItems, timezone: process.env.DEFAULT_TIMEZONE },
		title: `${
			result.data.serverData
				? 'Server Standings - ' + result.data.serverData.name
				: 'Player Data - ' + result.data.playerData.globalName
		}`,
	});
});

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

exports.redirectToIndex = (req, res, next) => {
	if (req.originalUrl !== '/favicon.ico') return res.redirect(`/`);
	else
		res.status(404).json({
			status: 'fail',
		});
};
