const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const Servers = require('../models/serverModel');
const Users = require('../models/userModel');
const Results = require('../models/resultModel');
const GameData = require('../models/gameDataModel');
const mongoose = require('mongoose');
const axios = require('axios');
const { matchers } = require('../../utils/parseResult');
const games = require('../../utils/gameList');
const gameList = games.map((g) => g.name);
const moment = require('moment-timezone');
const msInDay = 86400000;
const timezone = process.env.DEFAULT_TIMEZONE;
const Filter = require('bad-words');
const filter = new Filter();
const authObj = {
	withCredentials: true,
	credentials: 'include',
	headers: {
		Authorization: `Bot ${process.env.WORDLE_BOT_TOKEN}`,
	},
};
const getResults = async (year, month, users, gameFilter) => {
	const firstOfMonthStr = `${year}-${month >= 10 ? month : `0${month}`}-01`;
	const nextMonthStr = `${year + (month === 12 ? 1 : 0)}-${
		month === 12 ? '01' : month >= 9 ? month + 1 : `0${month + 1}`
	}-01`;

	const firstOfMonth = moment.tz(`${firstOfMonthStr} 00:00`, timezone).format();
	const nextMonth = moment.tz(`${nextMonthStr} 00:00`, timezone).format();

	const endDate = new Date(nextMonth);
	endDate.setDate(endDate.getDate() - 1);
	const endDateStr = moment.tz(endDate, timezone).format().split('T')[0];

	const monthResults = (
		await Results.find({
			user: users,
			game: gameFilter,
			date: { $gte: new Date(firstOfMonth), $lt: new Date(nextMonth) },
		})
			.sort({ game: 1, date: 1 })
			.lean()
	).filter((r) => !r.deletedFlag);

	const monthDays = Math.round(
		(new Date(nextMonth) - new Date(firstOfMonth)) / msInDay
	);
	const gameInfo = {
		year,
		month,
		startDate: firstOfMonthStr,
		endDate: endDateStr,
		days: monthDays,
		data: games.map((game) => {
			if (!gameFilter.includes(game.name))
				return {
					game: game.name,
					script: game.script,
					results: [],
				};
			const matcher = matchers.find((m) => m.data.name === game.name);
			if (!matcher) return null;
			const startNumber = matcher.data.getPuzzleNumberByDate(firstOfMonthStr);
			const endNumber = matcher.data.getPuzzleNumberByDate(nextMonthStr);
			let maxDate = new Date(nextMonth);
			const currentDT = moment.tz(new Date(), timezone).format();
			const currentMonth = Number(currentDT.split('-')[1]);
			let days;
			if (month !== currentMonth) days = monthDays;
			else if (matcher.data.getLivePuzzle) {
				const livePuzzle = matcher.data.getLivePuzzle(currentDT);
				const fom = matcher.data.getLivePuzzle(firstOfMonthStr);
				days = livePuzzle - fom + 1;
			} else if (matcher.data.getLivePuzzleDate) {
				const livePuzzleDate = matcher.data.getLivePuzzleDate(currentDT);
				days =
					Math.round(
						(new Date(livePuzzleDate) - new Date(firstOfMonthStr)) / msInDay
					) + 1;
			} else {
				while (!matcher.data.checkValidDate(maxDate)) {
					maxDate.setDate(maxDate.getDate() - 1);
				}
				days =
					Math.round((new Date(maxDate) - new Date(firstOfMonth)) / msInDay) +
					1;
			}

			const results = users.map((u) => {
				const data = new Array(days);
				return {
					...u,
					data,
				};
			});
			return {
				game: game.name,
				script: game.script,
				startNumber,
				endNumber,
				days,
				results,
			};
		}),
	};

	const errors = [];
	monthResults.forEach((r) => {
		const g = gameInfo.data.find((game) => game.game === r.game);
		if (!g)
			return errors.push({
				data: r,
				message: 'Game not found',
			});
		let ind;
		if (g.endNumber !== null && g.startNumber !== null)
			ind = r.data.number - g.startNumber;
		else
			ind = Math.round(
				(new Date(r.date) - new Date(gameInfo.startDate)) / msInDay
			);
		if (
			!g.results.some((res) => {
				if (res._id.toString() === r.user.toString()) {
					res.data[ind] = { _id: r._id.toString(), ...r.data };

					return true;
				}
				return false;
			})
		) {
			errors.push({
				data: r,
				message: 'User not found',
			});
		}
	});

	gameInfo.data.forEach((gd) => {
		gd.results = gd.results.filter((res) => {
			return res.data.some((d) => d !== null);
		});
	});

	return {
		gameData: gameInfo,
		errors,
	};
};

const getServerStats = async (guildId, year, month) => {
	if (!Servers)
		return {
			status: 'fail',
			code: 500,
			message: 'Could not connect to database',
		};
	const serverData = await Servers.findOne({ guildId })
		.select(['-__v'])
		.populate({
			path: 'users',
			select: ['-servers', '-__v'],
		})
		.lean();
	if (!serverData)
		return { status: 'fail', code: 404, message: 'Server ID not found' };

	const data = await getResults(
		year,
		month,
		serverData.users,
		serverData.games
	);

	delete serverData.users;

	if (data.errors.length === 0) delete data.errors;

	return {
		status: 'success',
		data: {
			...data,
			serverData: {
				...serverData,
				games: serverData.games.sort((a, b) => {
					return a.localeCompare(b);
				}),
			},
		},
	};
};
exports.getServerStats = getServerStats;

const getPlayerStats = async (userId, year, month) => {
	if (!Users)
		return {
			status: 'fail',
			code: 500,
			message: 'Could not connect to database',
		};
	const playerData = await Users.findOne({ userId }).select(['-__v']).lean();

	const allResults = await Results.aggregate([
		{
			$match: {
				user: new mongoose.Types.ObjectId(playerData._id),
			},
		},
		{
			$sort: {
				date: 1,
			},
		},
		{
			$limit: 1,
		},
	]);

	if (!playerData)
		return { status: 'fail', code: 404, message: 'Server ID not found' };

	const data = await getResults(year, month, [playerData], gameList);

	if (data.errors.length === 0) delete data.errors;

	return {
		status: 'success',
		data: {
			...data,
			playerData,
			firstDate: allResults.length > 0 ? allResults[0].date : null,
		},
	};
};
exports.getPlayerStats = getPlayerStats;

exports.getServerData = catchAsync(async (req, res, next) => {
	const year = parseInt(req.params.year);
	const mo = parseInt(req.params.mo);
	if (!year || !mo) return next(new AppError('Invalid date specified', 400));
	const data = await getServerStats(req.params.id, year, mo);
	if (data.status !== 'success') return res.status(data.code).json(data);

	res.status(200).json(data);
});
exports.getPlayerData = catchAsync(async (req, res, next) => {
	const year = parseInt(req.params.year);
	const mo = parseInt(req.params.mo);
	if (!year || !mo) return next(new AppError('Invalid date specified', 400));
	const data = await getPlayerStats(req.params.id, year, mo);
	if (data.status !== 'success') return res.status(data.code).json(data);
	res.status(200).json({
		status: 'success',
		data: data.data,
	});
});

exports.getWordlePuzzle = catchAsync(async (req, res, next) => {
	const dt = new Date(req.params.date);
	if (!dt) return next(new AppError('Invalid date', 400));

	const date = new Date(moment.tz(`${req.params.date} 00:00`, timezone));
	const existing = await GameData.findOne({
		game: 'Wordle',
		date,
	});

	if (!existing) {
		const url = `https://www.nytimes.com/svc/wordle/v2/${req.params.date}.json`;
		const result = await axios.get(url);
		if (!result.errors) {
			await GameData.create({
				game: 'Wordle',
				date,
				data: {
					number: result.data.days_since_launch,
					solution: result.data.solution,
				},
			});
			return res.status(200).json({
				status: 'success',
				data: result.data,
			});
		}
		res.status(500).json({
			status: 'fail',
			errors: result.errors,
		});
	} else {
		res.status(200).json({
			status: 'success',
			data: existing.data,
		});
	}
});

exports.checkServerSettings = catchAsync(async (req, res, next) => {
	if (!Servers) return next(new AppError('Could not connect to database', 500));
	const server = await Servers.findOne(
		req.params.token
			? { settingsToken: req.params.token }
			: req.params.editToken
			? {
					editToken: req.params.editToken,
					// editTokenExpires: { $gte: Date.now() },
					// editTokenUsed: false,
			  }
			: { guildId: req.params.id }
	);
	if (!server)
		return res.status(200).render(`404`, {
			data: { code: 404, message: 'Server not found' },
		});
	const defaultSettings = games
		.filter((g) => server.games.includes(g.name))
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
	if (!server.settings || !Array.isArray(server.settings)) {
		server.settings = defaultSettings.map((g) => {
			return {
				name: g.name,
				settings: g.settings.map((s) => {
					return {
						name: s.name,
						value: s.default,
					};
				}),
			};
		});
		server.markModified('settings');
		await server.save();
	} else {
		defaultSettings.forEach((ds) => {
			const setting = server.settings.find((s) => s.name === ds.name);
			if (!setting) {
				server.settings.push({
					name: ds.name,
					settings: ds.settings.map((setting) => {
						return {
							name: setting.name,
							value: setting.default,
						};
					}),
				});
			} else {
				ds.settings.forEach((s) => {
					const existingSetting = setting.settings.find(
						(s2) => s2.name === s.name
					);
					if (!existingSetting) {
						setting.settings.push({
							name: s.name,
							value: s.default,
						});
					}
				});
			}
		});
		server.settings.sort((a, b) => {
			const inds = [a, b].map((s) =>
				defaultSettings.findIndex((ds) => ds.name === s.name)
			);
			return inds[0] - inds[1];
		});
		server.markModified('settings');
		await server.save();
	}
	next();
});

const isEmptyObject = (obj) => {
	if ((typeof obj).toLowerCase() !== 'object') return false;
	return Object.getOwnPropertyNames(obj).length === 0;
};
const verifyCalculation = (calc) => {
	if (!calc) return { status: 1, message: 'Calculation is empty' };
	//make sure nothing is empty
	if ((typeof calc).toLowerCase() === 'number') return { status: 0 };
	else if (calc.dataItem) return { status: 0 };
	else if (isEmptyObject(calc))
		return {
			status: 1,
			message: 'There is an empty object in this calculation.',
		};
	else if (!calc.values || !Array.isArray(calc.values))
		return {
			status: 1,
			message:
				'Corrupt data found in calculation. Clear the calculation and try again. If the problem persists, please contact the developer.',
		};
	else {
		let msg;
		const ver = calc.values.every((v) => {
			const res = verifyCalculation(v);
			if (res.status === 0) return true;
			else {
				msg = res.message;
				return false;
			}
		});
		if (ver) return { status: 0 };
		return {
			status: 1,
			message: msg,
		};
	}
};
const verifyNumber = (calc) => {
	const operators = ['add', 'subtract', 'multiply', 'divide', 'sqrt', 'power'];
	const aggregators = ['sum', 'count', 'avg'];

	if (calc.dataItem) return false;
	else if ((typeof calc).toLowerCase() === 'number') return true;
	else if (isEmptyObject(calc)) return false;
	else if (calc.operator === 'data') {
		if (!calc.values || !Array.isArray(calc.values)) return false;
		return verifyNumber(calc.values[0]);
	} else if (aggregators.includes(calc.operator)) return true;
	else if (operators.includes(calc.operator)) {
		if (!calc.values || !Array.isArray(calc.values)) return false;
		return calc.values.every((v) => verifyNumber(v));
	} else return false;
};
exports.editServerSettings = catchAsync(async (req, res, next) => {
	const server = await Servers.findOne({
		settingsToken: req.params.token,
		settingsTokenUsed: true,
	}).select('-editToken -settingsToken');

	if (!server)
		return res.status(200).json({
			status: 'fail',
			message:
				'Something went wrong. Please generate a new token and try again.',
		});

	const [successes, warnings, failures] = new Array(3).fill([]);
	if (req.body.serverSettings) {
		const ss = req.body.serverSettings;

		//public server
		if (ss.isPublic) {
			//...must have a description
			if (!ss.description)
				return res.status(400).json({
					status: 'fail',
					message: 'You must specify a description for a public server.',
				});
			else if (filter.isProfane(server.name)) {
				//check server name in discord - see if it's been changed
				console.log('Checking server name in Discord');
				const sd = await axios.get(
					`${process.env.DISCORD_API_URL}/guilds/${server.guildId}`,
					authObj
				)?.data;
				if (!sd)
					return res.status(404).json({
						status: 'fail',
						message: 'Server not found',
					});
				if (sd.name !== server.name) server.name = sd.name;
				server.markModified('name');
				await server.save();
				if (filter.isProfane(server.name))
					return res.status(400).json({
						message:
							'No vulgar language is allowed in public server names. Please change your server name through Discord before making it public here.',
						status: 'fail',
					});
			}

			if (filter.isProfane(ss.description))
				return res.status(400).json({
					message:
						'No vulgar language is allowed in public server descriptions',
					status: 'fail',
				});
			else if (!ss.inviteLink)
				return res.status(400).json({
					message: 'Missing invite link',
					status: 'fail',
				});
			else if (ss.inviteLink.toLowerCase().indexOf('discord') < 0)
				return res.status(400).json({
					message: 'Invalid invite link',
					status: 'fail',
				});

			//try the invite link and see if it's valid
			const linkTest = await axios.get(ss.inviteLink);
			const arr = ss.inviteLink.split('/').reverse();
			const inviteCode = arr.find((a) => a !== '');
			if (
				linkTest.status !== 200 ||
				!linkTest.data
					.split('\n')
					.some(
						(d) =>
							d.toLowerCase().indexOf('discord.com') >= 0 &&
							d.indexOf(inviteCode) >= 0
					)
			)
				return res.status(400).json({
					message: 'Invalid invite link',
					status: 'fail',
				});
		}

		server.isPublic = ss.isPublic || false;
		server.serverDescription = ss.description || '';
		server.inviteLink = ss.inviteLink || '';
		server.markModified('isPublic');
		server.markModified('serverDescription');
		server.markModified('inviteLink');
	}
	if (req.body.settings) {
		if (!Array.isArray(req.body.settings))
			return next(new AppError('Invalid settings submitted', 400));

		// console.log(req.body.settings);
		req.body.settings.forEach((gameSetting) => {
			/**
			 * data: {
			 *  name: 'Wordle',
			 *  settings: [
			 *      {
			 *          name: 'failureScore',
			 *          value: 7
			 *      },
			 *      {
			 *          name: 'fillIn',
			 *          value: 'None'
			 *      }
			 * ]
			 * }
			 */
			const data = games.find((g) => g.name === gameSetting.name);
			if (!data) return failures.push(`Game ${gameSetting.name} not found`);
			//for each setting for this game submitted...
			gameSetting.settings.forEach((gs) => {
				//verify the setting is one of the named ones on the server
				const serverSetting = data.settings.find((d) => d.name === gs.name);
				if (!serverSetting)
					return failures.push(
						`Setting ${gs.name} not found for game ${data.name}`
					);
				//convert to number if necessary
				if (serverSetting.type === Number) {
					gs.value = Number(gs.value);
					if (isNaN(gs.value))
						return failures.push(
							`Invalid value (${gs.value}) submitted for ${data.name}:${serverSetting.name} (number required)`
						);
				}
				//if there's an enum for this setting, make sure it's a valid value
				if (serverSetting.enum) {
					if (!serverSetting.enum.some((el) => el.label === gs.value))
						return failures.push(
							`Invalid value ${gs.value} submitted for ${data.name}:${
								serverSetting.name
							} (Allowed values: ${serverSetting.enum.join(', ')})`
						);
				}
				//if there's a validation for this setting, make sure the validation passes
				if (serverSetting.validation && !serverSetting.validation(gs.value))
					return failures.push(
						`Validation failed for ${data.name}:${serverSetting.name} (${
							serverSetting.message || `Submitted value: ${gs.value}`
						})`
					);

				//edit the actual server setting
				const item = server.settings
					.find((s) => s.name === data.name)
					?.settings.find((s) => s.name === gs.name);
				if (item && item.value !== gs.value) {
					item.value = gs.value;
					successes.push(`${data.name}:${gs.name} changed to ${gs.value}`);
				}
			});
		});
		server.markModified('settings');
	}
	if (req.body.stats) {
		const newStats = [];
		req.body.stats.forEach((game) => {
			if (!gameList.includes(game.game))
				return failures.push(`Game ${game.game} not found.`);
			game.stats.forEach((stat) => {
				//fill in data items if they're not there
				if (!stat.allowFillIn) stat.allowFillIn = false;
				else stat.allowFillIn = true;
				//validate the filters - if there are no filters, or it's not an array, set it to an empty array
				if (!stat.filters || !Array.isArray(stat.filters)) {
					stat.filters = [];
					warnings.push(
						`Invalid value submitted for ${game.game}:${stat.name} filters. Defaulting to no filter for this stat.`
					);
				}
				//for each filter
				else
					stat.filters = stat.filters.filter((f, i) => {
						//needs a name
						if (!f.name) {
							failures.push(
								`Filter #${i + 1} for ${stat.name} was not given a name`
							);
							return false;
						}
						//needs to have a type of drop, keep, or data
						if (!['keep', 'drop', 'data'].includes(f.type)) {
							failures.push(
								`Invalid value for filter type (${f.type || 'blank'}) on ${
									stat.name
								} filter #${i + 1}`
							);
							return false;
						}
						if (f.type === 'data') {
							//if it's a data filter, make sure it's a valid data item
							const valid = games
								.find((g) => g.name === stat.game)
								?.dataItems.find((d) => d.name === f.dataItem);
							if (!valid) {
								failures.push(
									`Data item ${f.dataItem} not found for game ${stat.game}`
								);
								return false;
							}
							//...and a valid comparator
							if (!['lte', 'lt', 'eq', 'gt', 'gte'].includes(f.comparator)) {
								failures.push(
									`Invalid comparator for ${f.name} (${f.comparator})`
								);
								return false;
							}
							//and a valid number to compare to
							if (isNaN(Number(f.dataValue))) {
								failures.push(
									`Invalid data value for ${f.name} (${f.dataValue})`
								);
								return false;
							}
						} else {
							//must be an integer number of records to keep/drop

							if (!Number.isInteger(f.keepValue)) {
								failures.push(
									`Invalid value for number of days to drop/keep on ${f.name} (integer required; 1-28 for keep, 1-10 for drop)`
								);
								return false;
							}
							const kv = Math.abs(f.keepValue);
							//if a keep filter, must keep at least 10 and no more than 28
							if (f.type === 'keep') {
								if (!(kv >= 10 && kv <= 28)) {
									failures.push(
										`Invalid value for number of days to keep on ${f.name} (integer 1-28 required)`
									);
									return false;
								}
							}
							//if drop filter, must drop from 1 to 10 values
							else if (!(kv >= 1 && kv <= 10)) {
								failures.push(
									`Invalid value for number of days to drop on ${f.name} (integer 1-10 required)`
								);
								return false;
							}
							return true;
						}
						return true;
					});

				//verify that the calculation is properly populated
				const vc = verifyCalculation(stat.calc);
				if (vc.status !== 0) {
					failures.push(
						`Error saving custom stat ${stat.game}:${stat.name}: ${vc.message}`
					);
				}
				//verify that the calculation will result in a number (is properly aggregated)
				else if (!verifyNumber(stat.calc)) {
					failures.push(
						`Custom stat ${stat.game}:${stat.name} has an unaggregated data item`
					);
				}
			});
		});
		server.customStats = req.body.stats;
		server.markModified('customStats');
	}
	await server.save();

	res.status(200).json({
		status: 'success',
		data: {
			serverId: server.guildId,
			successes,
			warnings,
			failures,
		},
	});
});

exports.deleteResults = catchAsync(async (req, res, next) => {
	if (!req.params.guildId || !req.params.token)
		return next(new AppError('Missing server ID or edit token', 400));

	//make sure the server and token are a valid pair
	const server = await Servers.findOne({
		guildId: req.params.guildId,
		editToken: req.params.token,
		editTokenUsed: false,
	});
	if (!server)
		return next(new AppError('Server not found or invalid edit token', 404));

	//ensure the results belong to the server
	const results = await Results.find({ _id: req.body.idList });

	let successes = 0;
	const failures = [];

	await Promise.all(
		results.map(async (r) => {
			//see if the user associated with the result belongs to this server
			const uid = r.user.toString();
			let userOnServer = server.users.includes(uid);
			if (userOnServer) {
				const deleted = await Results.findByIdAndDelete(r._id);
				if (deleted) successes++;
				else {
					failures.push(
						`Failed to delete result ${r._id} (${r.game} ${
							r.data?.number ||
							moment
								.tz(r.date, process.env.DEFAULT_TIMEZONE)
								.format()
								.split('T')[0]
						})`
					);
				}
			} else
				failures.push(
					`Failed to delete result ${r._id} - user does not belong to this server`
				);
		})
	);

	server.editToken = '';
	server.editTokenUsed = true;
	server.editTokenExpires = null;
	await server.save();

	res.status(200).json({
		status: 'success',
		successes,
		failures,
	});
});
