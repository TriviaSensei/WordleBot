const mongoose = require('mongoose');
const games = require('../../utils/gameList');
const gameList = games.map((g) => g.name);
const Filter = require('bad-words');
const filter = new Filter();
const noBadWords = (val) => !filter.isProfane(val);
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
	isPublic: { type: Boolean, default: false },
	inviteLink: {
		type: String,
		default: '',
		maxlength: [40, 'Your invite link is too long.'],
	},
	description: {
		type: String,
		default: '',
		maxlength: [300, 'The maximum length is 300 characters'],
		validate: {
			validator: noBadWords,
			message: 'Please watch your language in your server description.',
		},
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
