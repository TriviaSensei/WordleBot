const mongoose = require('mongoose');
const games = require('../../utils/gameList');
const gameList = games.map((g) => g.name);
const gameDataSchema = new mongoose.Schema({
	game: {
		type: String,
		required: [true, 'Game name is required'],
		enum: gameList,
	},
	date: {
		type: Date,
		required: [true, 'Date is required'],
	},
	data: {
		type: Object,
		required: [true, 'Result data is required'],
	},
});

const GameData = mongoose.model('GameData', gameDataSchema, 'gameData');

module.exports = GameData;
