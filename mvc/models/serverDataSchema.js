const mongoose = require('mongoose');

const serverDataSchema = new mongoose.Schema({
	lastRestart: Date,
});

module.exports = serverDataSchema;
