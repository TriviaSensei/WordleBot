const mongoose = require('mongoose');
const games = require('../../utils/gameList');
const gameList = games.map((g) => g.name);
const resultSchema = new mongoose.Schema({
	user: { type: mongoose.Types.ObjectId, ref: 'Users' },
	/**
	 * Reset times (for date purposes):
	 * Wordle, Quordles - midnight local time
	 * Digits: Midnight ET
	 * Immaculate Grid: 6 AM ET
	 * NYT connections - midnight local time
	 *
	 * Dates included in copypasta:
	 * NYT Crossword (6 PM previous day for Monday, 10 PM previous day for others)
	 * NYT Mini (same as NYTXW)
	 * Tightrope (assumed to be midnight local time)
	 */
	game: {
		type: String,
		required: [true, 'Game name is required'],
		enum: gameList,
	},
	date: Date,
	data: {
		type: Object,
		required: [true, 'Result data is required'],
	},
});

const Results = mongoose.model('Results', resultSchema, 'results');

module.exports = Results;
