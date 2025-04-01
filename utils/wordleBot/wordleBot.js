const mongoose = require('mongoose');
const Servers = require('../../mvc/models/serverModel');
const Users = require('../../mvc/models/userModel');
const Results = require('../../mvc/models/resultModel');
const { v4: uuidV4 } = require('uuid');
const {
	Client,
	IntentsBitField,
	MessageFlags,
	Message,
} = require('discord.js');
const axios = require('axios');
const moment = require('moment-timezone');
const { parseResult } = require('../parseResult');
const timezone = process.env.DEFAULT_TIMEZONE;
const hostname =
	process.env.NODE_ENV === 'development'
		? 'localhost:3000'
		: 'www.wordlebot.gg';
const settingsTokenDuration = 5;
/**
 * servers:
 * bot test 1: 1326735227980353620
 * bot test 2: 1328900288324698254
 */

const games = require('../../utils/gameList');
const gameList = games.map((g) => g.name);
const authObj = {
	withCredentials: true,
	credentials: 'include',
	headers: {
		Authorization: `Bot ${process.env.WORDLE_BOT_TOKEN}`,
	},
};
const keyCaps = [
	'0️⃣',
	'1️⃣',
	'2️⃣',
	'3️⃣',
	'4️⃣',
	'5️⃣',
	'6️⃣',
	'7️⃣',
	'8️⃣',
	'9️⃣',
	'🔟',
];

const url = 'https://discord.com/api';

const client = new Client({
	intents: [
		IntentsBitField.Flags.Guilds,
		IntentsBitField.Flags.GuildMembers,
		IntentsBitField.Flags.GuildMessages,
		IntentsBitField.Flags.MessageContent,
	],
});

let me;

const updateData = async (doc, data) => {
	const dataProps = Object.getOwnPropertyNames(data);
	const props = Object.getOwnPropertyNames(doc._doc).filter((p) => {
		return (
			p !== '_id' &&
			p !== 'id' &&
			p !== '__v' &&
			dataProps.some((dp) => {
				return dp === p;
			})
		);
	});
	props.forEach((p) => {
		if (data[p] !== doc._doc[p]) {
			doc.markModified(p);
			doc._doc[p] = data[p];
		}
	});
	const toReturn = await doc.save();
	return toReturn;
};

const postQueue = [];
const coolDownTime = 400;
let lastPostTime = null;
let nextPost = null;

const handlePostQueue = async () => {
	//see if it's been long enough since the last post request - if not, try again later to avoid rate limiting
	if (lastPostTime && Date.now() - lastPostTime < coolDownTime) {
		const timeLeft = coolDownTime - (Date.now() - lastPostTime);
		if (nextPost) clearTimeout(nextPost);
		nextPost = setTimeout(handlePostQueue, timeLeft);
		return;
	}

	const { type, action } = postQueue[0];
	console.log(`Handling post queue item:\n--------------------`);
	console.log(postQueue[0]);
	if (type === 'reaction') {
		const { msg, emoji } = postQueue[0].data;
		const re = /^(\%[0-9A-F]{2})+$/;
		let encoded;
		if (emoji.match(re)) encoded = emoji;
		else encoded = encodeURIComponent(emoji);
		const channelId = msg.channelId ? msg.channelId : message.channel_id;
		if (channelId) {
			try {
				if (action === 'add')
					await axios.put(
						`${url}/channels/${channelId}/messages/${msg.id}/reactions/${encoded}/@me`,
						null,
						authObj
					);
				else if (action === 'remove')
					await axios.delete(
						`${url}/channels/${msg.channelId || msg.channel_id}/messages/${
							msg.id
						}/reactions/${encoded}/@me`,
						null,
						authObj
					);

				postQueue.shift();
			} catch (err) {
				postQueue[0].failures++;
				console.log(err.response.data);
			}
		}
	} else if (type === 'message') {
		const { data } = postQueue[0].data;
		const channelId = postQueue[0].data.channelId
			? postQueue[0].data.channelId
			: postQueue[0].channel_id;
		if (channelId) {
			try {
				await axios.post(
					`${url}/channels/${channelId}/messages`,
					data,
					authObj
				);
				postQueue.shift();
			} catch (err) {
				console.log(err.response.data);
				postQueue[0].failures++;
			}
		}
	}
	lastPostTime = Date.now();

	if (postQueue.length > 0) {
		if (postQueue[0].failures >= 3) postQueue.shift();
		if (postQueue.length > 0)
			nextPost = setTimeout(handlePostQueue, coolDownTime);
	} else if (nextPost) clearTimeout(nextPost);
};

const addReaction = (msg, emoji) => {
	if (Array.isArray(emoji)) {
		return emoji.forEach((e, i) => {
			addReaction(msg, e);
		});
	}
	postQueue.push({
		type: 'reaction',
		action: 'add',
		data: {
			msg: { channelId: msg.channelId || msg.channel_id, id: msg.id },
			emoji,
		},
		failures: 0,
	});
	if (postQueue.length === 1) handlePostQueue();
};

const removeReaction = (msg, emoji) => {
	if (Array.isArray(emoji)) {
		return emoji.forEach((e, i) => {
			removeReaction(msg, e);
		});
	}
	postQueue.push({
		type: 'reaction',
		action: 'remove',
		data: { msg: { channelId: msg.channelId, id: msg.id }, emoji },
		failures: 0,
	});
	if (postQueue.length === 1) handlePostQueue();
};

const addMessage = (data) => {
	postQueue.push({ type: 'message', action: 'send', data, failures: 0 });
	if (postQueue.length === 1) handlePostQueue();
};

const getCharCodes = (str) => {
	for (var i = 0; i < str.length; i++) {
		console.log(str.charAt(i), str.charCodeAt(i).toString(16));
	}
};

const checkCorrectServer = (guildId) => {
	const devGuilds = process.env.WORDLE_DEV_GUILD.split(',');
	if (process.env.NODE_ENV === 'development') {
		if (!devGuilds.includes(guildId)) return false;
	} else if (devGuilds.includes(guildId)) return false;
	return true;
};

const testRegex = (str) => {
	//		/Wordle (\d{1,3},)?(\d{3})+ [\dX]\/6(\*)?(\n)*(\n(\u2B1B|(\uD83D\uDFE9)|(\uD83D\uDFE8)){5}(.*)){1,6}/g;
	const regex = /Immaculate Grid (\d)+ (\d)\/9:(\n.*)+Rarity: (\d)+/g;
	const match = str.match(regex);
	if (!match) return getCharCodes(str);
};

const processResults = async (usr, gameInfo) => {
	let failures = [];
	let successes = [];
	let achievements = [];

	const results = await Promise.all(
		gameInfo.map(async (info) => {
			return await Promise.all(
				info.match.map(async (match, i) => {
					const data = {
						user: usr._id,
						game: info.name,
						date: info.getDate(match),
					};
					console.log(`Data parsed:\n--------------`);
					console.log(data);
					if (!data.date) {
						failures.push({
							message: `No game date or number could be found in result for ${data.game}`,
							reaction: '📆',
						});
						return null;
					} else if (info.checkValidDate && !info.checkValidDate(data.date)) {
						failures.push({
							message: `${info.name} for ${moment
								.tz(data.date, timezone)
								.format('YYYY-MM-DD')} is not available for results yet.`,
							reaction: `🕒`,
						});
						return null;
					}
					let gameResult;
					try {
						gameResult = info.getData(match);
					} catch (err) {
						failures.push({
							message: `Unexpected error attempting to record result for ${data.game} on ${data.date}`,
							reaction: '❓',
						});
					}
					if (gameResult.status !== 0) {
						failures.push({ message: gameResult.message, reaction: '⚠️' });
						return null;
					}
					let existingResult = await Results.findOne(data);

					if (!existingResult)
						if (
							info.match.some((match2, j) => {
								let dateDiff;
								if (i > j)
									dateDiff =
										new Date(info.getDate(match2)) - new Date(data.date);
								else return false;
								return dateDiff === 0;
							})
						) {
							failures.push({
								message: `${data.game} ${
									gameResult.data.number
										? gameResult.data.number
										: data.date.getMonth() +
										  1 +
										  '/' +
										  data.date.getDate() +
										  '/' +
										  data.date.getFullYear()
								} result was recorded, but was duplicated in your paste. Ensure you didn't mean to submit a different day's result.`,
								reaction: '👯',
							});
							return null;
						} else {
							successes.push({
								name: data.game,
								match,
							});
							console.log('Creating result');
							console.log({
								...data,
								data: gameResult.data,
							});
							const toReturn = await Results.create({
								...data,
								data: gameResult.data,
							});
							// await Promise.all(usr.servers.map(async (s)=> {
							//     if (s.guildId)
							// }));
							return {
								data: toReturn,
								reaction: info.getReaction(gameResult.data),
							};
						}
					else {
						failures.push({
							message: `${data.game} ${
								gameResult.data.number
									? gameResult.data.number
									: data.date.getMonth() +
									  1 +
									  '/' +
									  data.date.getDate() +
									  '/' +
									  data.date.getFullYear()
							} result was already found in the database. No duplicate entry added.`,
							reaction: '⚠️',
						});
						return null;
					}
				})
			);
		})
	);

	// if (process.env.NODE_ENV === 'development') await Results.deleteMany({});

	return {
		results,
		failures,
		successes,
		achievements,
	};
};

const checkCorrectChannel = async (srvr, msg, ...suppressWarnings) => {
	if (suppressWarnings.length === 0) suppressWarnings = false;
	else suppressWarnings = suppressWarnings[0];
	if (srvr.channelId && srvr.channelId !== msg.channelId) {
		const correctChannel = await axios.get(
			`${url}/channels/${srvr.channelId}`,
			authObj
		);
		if (correctChannel) {
			if (!suppressWarnings)
				addMessage({
					channelId: msg.channelId,
					data: {
						content: `<@${msg.author.id}> This channel is not being monitored for game results. Please post them in <#${correctChannel.data.id}>, or have an administrator run "/sethome" here.`,
						message_reference: {
							type: 0,
							message_id: msg.id,
						},
					},
					flags: MessageFlags.Ephemeral,
				});
			return false;
		} else {
			srvr.channelId = msg.channelId;
			srvr.markModified('channelId');
			await srvr.save();
		}
	} else if (!srvr.channelId) {
		srvr.channelId = msg.channelId;
		srvr.markModified('channelId');
		await srvr.save();
	}
	return true;
};

const updateServerData = async (guildId) => {
	//this should not happen - if the server's guild ID was not found for some reason, just return an error
	const serverData = (await axios.get(`${url}/guilds/${guildId}`, authObj))
		?.data;
	if (!serverData)
		return { status: 1, message: 'An unexpected error occurred' };

	//see if the server exists in our data. If not, create it
	let srvr = await Servers.findOne({ guildId });
	if (!srvr) {
		const newServer = {
			guildId,
			channelId: '',
			name: serverData.name || null,
			icon: serverData.icon || null,
			banner: serverData.banner || null,
			users: [],
			games: gameList,
			created: Date.now(),
		};
		srvr = await Servers.create(newServer);
		return srvr;
	}
	//if it exists, check it against the server's data and update the server's profile on the server if necessary
	else {
		const toReturn = await updateData(srvr, serverData);
		return toReturn;
	}
};

const updateUserData = async (userId) => {
	//this should not happen - if the server's guild ID was not found for some reason, just return an error
	const userData = (await axios.get(`${url}/users/${userId}`, authObj))?.data;
	if (!userData) return { status: 1, message: 'An unexpected error occurred' };

	//see if the user exists in our data. If not, create them
	let usr = await Users.findOne({ userId });
	if (!usr) {
		const newUser = {
			userId,
			username: userData.username,
			globalName: userData.global_name || null,
			avatar: userData.avatar || null,
			banner: userData.banner || null,
			banner_color: userData.banner_color || null,
			servers: [],
		};
		usr = await Users.create(newUser);
		return usr;
	}
	//if it exists, check it against the user's data and update the user's profile on the server if necessary
	else {
		const toReturn = await updateData(usr, userData);
		return toReturn;
	}
};

const updateLists = async (usr, srvr) => {
	//add the user to the server's user list if necessary
	if (
		!srvr.users.some((u) => {
			return u.toString() === usr._id.toString();
		})
	) {
		srvr.users.push(usr._id);
		srvr.markModified('users');
		await srvr.save();
	}
	//add the server to the user's list, if necessary
	if (
		!usr.servers.some((s) => {
			return s.toString() === srvr._id.toString();
		})
	) {
		usr.servers.push(srvr._id);
		usr.markModified('servers');
		await usr.save();
	}
};

let monthlyUpdateTimeout = null;
const formatLeadingZeroes = (n, digits) => {
	if (!Number.isInteger(n)) return n;
	let str = `${Math.abs(n)}`;
	for (var i = str.length; i < digits - (n < 0 ? 1 : 0); i++) {
		str = `0${str}`;
	}
	if (n < 0) str = `-${str}`;
	return str;
};

const getTimeStr = (ms) => {
	let s = Math.floor(ms / 1000);
	let m = Math.floor(s / 60);
	s = s % 60;
	let h = Math.floor(m / 60);
	m = m % 60;
	let d = Math.floor(h / 24);
	h = h % 24;
	return `${d}d ${h}h ${m}m ${s}s`;
};

const sendMonthlyUpdate = async () => {
	const currentDate = new Date();

	const currentDT = moment.tz(currentDate, timezone).format();

	if (!monthlyUpdateTimeout) {
		const nextMonth = formatLeadingZeroes(
			((currentDate.getMonth() + 1) % 12) + 1,
			2
		);
		const year = currentDate.getFullYear() + (nextMonth === 0 ? 1 : 0);

		const nextUpdateDT = moment
			.tz(`${year}-${nextMonth}-01 00:00`, timezone)
			.format();

		const timeUntilNextUpdate =
			new Date(nextUpdateDT) - new Date(currentDT) + 1000;
		console.log(
			`Next monthly wordle update going out in ${getTimeStr(
				timeUntilNextUpdate
			)}`
		);
		//can't set a timeout for a time greater than what a 32-bit signed integer can hold - don't save the timeout, but set it for 2 weeks from now (about 1/2 month) if the amount of time is too big
		if (timeUntilNextUpdate >= Math.pow(2, 31) - 1) {
			setTimeout(sendMonthlyUpdate, 14 * 8640000);
			return;
		}
		//if the timeout is small enough, set it and save it, so when this runs again, it will actually send a message
		monthlyUpdateTimeout = setTimeout(sendMonthlyUpdate, timeUntilNextUpdate);
		return;
	}
	//clear the monthly update timeout
	monthlyUpdateTimeout = null;
	const serverData = await Servers.find();
	const sp = currentDT.split('-');
	let currentMonth = parseInt(sp[1]) - 1;
	let currentYear = parseInt(sp[0]);
	if (currentMonth === 0) {
		currentYear--;
		currentMonth = 12;
	}
	serverData.forEach((s) => {
		if (!checkCorrectServer(s.guildId))
			return console.log(
				`Not sending update to ${s.guildId} (env=${process.env.NODE_ENV})`
			);
		addMessage({
			channelId: s.channelId,
			data: {
				content: `@everyone Your monthly server update is here: https://${hostname}/wordle/server/${s.guildId}/${currentYear}/${currentMonth}`,
			},
		});
	});
	//reset the timeout for a monthly update until next month
	sendMonthlyUpdate();
};

client.on('interactionCreate', async (data) => {
	if (!checkCorrectServer(data.guildId)) return;
	if (!data.isChatInputCommand() && !data.isStringSelectMenu()) return;

	const { commandName } = data;

	let content;
	if (commandName === 'i')
		content = `Here is your personal stats page: https://${hostname}/wordle/player/${data.user.id}`;
	else if (commandName === 'we')
		content = `Here is your server stats page: https://${hostname}/wordle/server/${data.guildId}`;
	else if (commandName === 'faq')
		content = `Here is the FAQ page: https://${hostname}/wordle/`;
	else {
		//these commands all require admin to run them
		const srvr = await Servers.findOne({ guildId: data.guildId });
		if (!srvr) {
			return data.reply({
				type: 4,
				content: 'Server was not found in the data',
				flags: MessageFlags.Ephemeral,
			});
		}
		const serverData = (
			await axios.get(`${url}/guilds/${data.guildId}`, authObj)
		).data;

		const user = await axios.get(
			`${url}/guilds/${serverData.id}/members/${data.user.id}`,
			authObj
		);
		if (!serverData || !user)
			return data.reply({
				type: 4,
				content: 'Something went wrong.',
				flags: MessageFlags.Ephemeral,
			});
		const roles = await Promise.all(
			user.data.roles.map(async (r) => {
				const role = await axios.get(
					`${url}/guilds/${serverData.id}/roles/${r}`,
					authObj
				);
				return role.data;
			})
		);

		const isOwner = data.user.id === serverData.owner_id;
		const isAdmin = roles.some((r) => {
			return (r.permissions & 8) === 8;
		});

		if (!isOwner && !isAdmin) {
			return data.reply({
				type: 4,
				content: '⛔ You must be an owner or admin to perform this command ⛔',
				flags: MessageFlags.Ephemeral,
			});
		}
		if (data.isChatInputCommand()) {
			if (data.commandName.toLowerCase() === 'setgames') {
				return data.reply({
					type: 4,
					content: `<@${data.user.id}> Select the games to track on this server.`,
					components: [
						{
							type: 1,
							components: [
								{
									type: 3,
									custom_id: 'game_select',
									options: gameList.map((g) => {
										return {
											label: g,
											value: g,
											default: srvr.games.includes(g),
										};
									}),
									placeholder: 'Choose games',
									min_values: 0,
									max_values: gameList.length,
								},
							],
						},
					],
					flags: MessageFlags.Ephemeral,
				});
			} else if (data.commandName.toLowerCase() === 'settings') {
				const id = uuidV4();
				srvr.settingsToken = id;
				srvr.settingsTokenExpires =
					Date.now() + settingsTokenDuration * 60 * 1000;
				srvr.settingsTokenUsed = false;
				srvr.markModified('settingsToken');
				srvr.markModified('settingsTokenExpires');
				srvr.markModified('settingsTokenUsed');
				await srvr.save();
				content = `Do not share this link - it is good for only ${settingsTokenDuration} minutes, or one click. After you save your settings, you will need to run this command again to generate a new link. Edit your server settings here at the link here: https://${hostname}/settings/${id}`;
			} else if (data.commandName.toLowerCase() === 'sethome') {
				srvr.channelId = data.channelId;
				srvr.markModified('channelId');
				await srvr.save();
				content = 'Home channel set';
			}
		} else if (data.isStringSelectMenu()) {
			if (data.customId === 'game_select') {
				const userId = data.message.content
					.split(' ')[0]
					.split('@')[1]
					.split('>')[0];

				if (data.message.interactionMetadata.user.id === userId) {
					srvr.games = data.values;
					srvr.markModified('games');
					await srvr.save();

					content =
						`You have set your server game list to:\n${data.values.join(
							', '
						)}` +
						(data.values.length === gameList.length
							? `\nOther game results may be posted and recorded, but will not show up on standings reports unless you enable them here.`
							: '');
				} else content = `This message was not intended for you.`;
			}
		}
	}
	return data.reply({
		type: 4,
		content,
		flags: MessageFlags.Ephemeral,
	});
});

client.on('messageCreate', async (msg) => {
	if (!checkCorrectServer(msg.guildId)) return;

	if (msg.author.id === me.id) return;

	// check the current discord server data against what we have in the DB,
	// if it exists, and update the data accordingly
	const srvr = await updateServerData(msg.guildId);
	// check the current discord user data against what we have in the DB,
	// if it exists, and update the data accordingly
	const usr = await updateUserData(msg.author.id);
	//see if it's a game result being posted, and if not, ignore the message.
	const gameInfo = parseResult(msg.content);
	if (!gameInfo || gameInfo.length === 0) {
		// if (process.env.NODE_ENV === 'development') testRegex(msg.content);
		return;
	}
	//if so, see if there is a valid home channel set, set it if not, and ignore the result if not in the home channel
	const correctChannel = await checkCorrectChannel(srvr, msg);
	if (!correctChannel) return;

	//update the list of users on the server, and the list of servers on the user, if necessary
	await updateLists(usr, srvr);

	//process the actual result string(s)
	const { results, failures, successes, achievements } = await processResults(
		usr,
		gameInfo
	);

	//message or reaction with results of post
	if (failures.length !== 0) {
		addReaction(msg, '⚠️');
		addMessage({
			channelId: msg.channelId,
			data: {
				content: `<@${msg.author.id}> ${
					successes.length > 0
						? successes.length +
						  (successes.length > 1 ? ' results were' : ' result was') +
						  ' successfully posted. '
						: ''
				}One or more failures occurred while posting results:\n${failures
					.map((f) => `⚠️ ${f.message}`)
					.join('\n')}`,
				message_reference: {
					type: 0,
					message_id: msg.id,
				},
				flags: MessageFlags.Ephemeral,
			},
		});
	} else {
		if (results.length > 1 || results[0].length > 1) {
			if (successes.length <= 10) {
				try {
					addReaction(msg, [keyCaps[successes.length], '✅']);
				} catch (err) {
					console.log(keyCaps[successes.length]);
				}
			} else {
				addReaction(msg, '✅');
				addMessage({
					channelId: msg.channelId,
					data: {
						content: `<@${msg.author.id}> ${successes.length} ${
							successes.length === 1 ? 'result' : 'results'
						} successfully parsed`,
					},
					flags: MessageFlags.Ephemeral,
				});
			}
		} else addReaction(msg, results[0][0].reaction);
	}
	//handle achievements
	if (achievements.length > 0) {
		console.log(achievements);
	}

	const serversToRemove = [];
	const devGuilds = process.env.WORDLE_DEV_GUILD.split(',');
	if (!devGuilds.includes(srvr.guildId)) {
		usr.servers.forEach(async (s) => {
			if (s._id.toString() !== srvr._id.toString()) {
				const otherServer = await Servers.findById(s._id);
				if (devGuilds.includes(otherServer.guildId)) return;
				if (otherServer && otherServer.channelId) {
					//make sure the member is still a part of that server (in discord's record)
					const members = await axios.get(
						`${url}/guilds/${otherServer.guildId}/members`,
						authObj
					);
					if (members && !members.some((m) => m.user.id === msg.author.id)) {
						serversToRemove.push(s._id);
						return;
					}
					const toSend = successes.filter((su) => {
						return otherServer.games.includes(su.name);
					});

					if (toSend.length > 0)
						return addMessage({
							channelId: otherServer.channelId,
							data: {
								content: `On behalf of <@${msg.author.id}>:\n${toSend
									.map((su) => su.match)
									.join('\n\n')}`,
							},
						});
				}
			}
			return null;
		});
		//for every server where the user is no longer a member
		if (serversToRemove.length > 0) {
			const user = await Users.findById(usr._id);
			await Promise.all(
				serversToRemove.map(async (s) => {
					//remove the user from the server's list
					const server = await Servers.findById(s);
					server.users = server.users.filter(
						(u) => u.toString() !== user._id.toString()
					);
					await server.save();
					//remove the server from the user's list
					user.servers = user.servers.filter(
						(srv) => srv.toString() !== s.toString()
					);
				})
			);
			s.markModified('users');
			await s.save();
		}
	}
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
	if (!checkCorrectServer(newMessage.guildId)) return;

	if (newMessage.author.id === me.id) return;

	// check the current discord server data against what we have in the DB,
	// if it exists, and update the data accordingly
	const srvr = await updateServerData(newMessage.guildId);

	//see if it's a game result being posted, and if not, ignore the message.
	const oldGameInfo = parseResult(oldMessage.content);
	const newGameInfo = parseResult(newMessage.content);

	if (!newGameInfo || newGameInfo.length === 0) {
		if (process.env.NODE_ENV === 'development') testRegex(newMessage.content);
		return;
	}

	//if not, see if there is a valid home channel set, and ignore the result if not in the home channel
	const correctChannel = await checkCorrectChannel(srvr, newMessage);
	if (!correctChannel) return;

	// check the current discord user data against what we have in the DB,
	// if it exists, and update the data accordingly
	const usr = await updateUserData(newMessage.author.id);

	//update the list of users on the server, and the list of servers on the user, if necessary
	await updateLists(usr, srvr);

	//3 categories of things can happen: adding, removing, or editing entries
	// we could just delete the original info from the DB and re-add whatever is in the edited message,
	// but that would take longer and we would not have the necessary information to acknowledge the request
	const oldGameList = [];
	oldGameInfo.forEach((info) => {
		info.match.forEach((match) => {
			oldGameList.push({
				...info,
				match: [match],
			});
		});
	});
	const newGameList = [];
	newGameInfo.forEach((info) => {
		info.match.forEach((match) => {
			newGameList.push({
				...info,
				match: [match],
			});
		});
	});

	const added = newGameList.filter((info) => {
		return oldGameList.every((oldInfo) => {
			if (oldInfo.name !== info.name) return true;
			return (
				info.getDate(info.match[0]) - oldInfo.getDate(oldInfo.match[0]) !== 0
			);
		});
	});

	if (added.length > 0) {
		const { failures, successes } = await processResults(usr, added);

		if (failures.length !== 0) {
			addReaction(newMessage, '⚠️');
			addMessage({
				channelId: newMessage.channelId,
				data: {
					content: `<@${newMessage.author.id}> On edit, ${
						successes.length > 0
							? successes.length +
							  (successes.length > 1 ? ' results were' : ' result was') +
							  ' successfully added. '
							: ''
					}One or more failures occurred while posting edited results:\n${failures
						.map((f) => `⚠️ ${f}`)
						.join('\n')}`,
					message_reference: {
						type: 0,
						message_id: newMessage.id,
					},
					flags: MessageFlags.Ephemeral,
				},
			});
		} else {
			try {
				addReaction(newMessage, ['✏️']);
				addMessage({
					channelId: newMessage.channelId,
					data: {
						content: `<@${newMessage.author.id}> On edit, ${
							successes.length > 0
								? successes.length +
								  (successes.length > 1 ? ' results were' : ' result was') +
								  ' successfully added. '
								: ''
						}`,
						message_reference: {
							type: 0,
							message_id: newMessage.id,
						},
						flags: MessageFlags.Ephemeral,
					},
				});
			} catch (err) {
				console.log(err.data);
			}
		}

		if (successes.length > 0) {
			const serversToRemove = [];
			usr.servers.forEach(async (s) => {
				if (s._id.toString() !== srvr._id.toString()) {
					const otherServer = await Servers.findById(s._id);
					//make sure the member is still a part of that server (in discord's record)
					const members = await axios.get(
						`${url}/guilds/${otherServer.guildId}/members`,
						authObj
					);
					if (members && !members.some((m) => m.user.id === msg.author.id)) {
						serversToRemove.push(s._id);
						return;
					}
					if (otherServer && otherServer.channelId) {
						return addMessage({
							channelId: otherServer.channelId,
							data: {
								content: `On behalf of <@${newMessage.author.id}>:\n${successes
									.map((su) => su.match)
									.join('\n\n')}`,
							},
						});
					}
				}
				return null;
			});

			//for every server where the user is no longer a member
			if (serversToRemove.length > 0) {
				const user = await Users.findById(usr._id);
				await Promise.all(
					serversToRemove.map(async (s) => {
						//remove the user from the server's list
						const server = await Servers.findById(s);
						server.users = server.users.filter(
							(u) => u.toString() !== user._id.toString()
						);
						await server.save();
						//remove the server from the user's list
						user.servers = user.servers.filter(
							(srv) => srv.toString() !== s.toString()
						);
					})
				);
				s.markModified('users');
				await s.save();
			}
		}
	}
});

client.on('ready', async (c) => {
	console.log('Wordle Bot ready!');
	const res = await axios.get(`${url}/users/@me`, authObj);
	me = res.data;
	await sendMonthlyUpdate();
});

// const sandbox = require('../../sandbox');
client.login(process.env.WORDLE_BOT_TOKEN);
module.exports = client;
