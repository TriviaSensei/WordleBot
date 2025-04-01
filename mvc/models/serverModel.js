const mongoose = require('mongoose');
const games = require('../../utils/gameList');
const gameList = games.map((g) => g.name);
const serverSchema = new mongoose.Schema({
	guildId: {
		type: String,
		required: [true, 'Guild ID not found'],
	},
	channelId: {
		type: String,
	},
	name: String,
	icon: String,
	banner: String,
	users: {
		type: [mongoose.Schema.ObjectId],
		ref: 'Users',
	},
	games: {
		type: [String],
		enum: gameList,
	},
	settings: [Object],
	customStats: [Object],
	settingsToken: String,
	settingsTokenExpires: Date,
	settingsTokenUsed: Boolean,
	created: Date,
});

const Servers = mongoose.model('Servers', serverSchema, 'servers');

module.exports = Servers;
