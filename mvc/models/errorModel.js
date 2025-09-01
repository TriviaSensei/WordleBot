const mongoose = require('mongoose');
const errorSchema = new mongoose.Schema(
	{
		description: {
			type: String,
			required: [true, 'Description is required'],
		},
		message: {
			type: String,
			required: [true, 'Message is required'],
		},
		data: Object,
		stack: String,
	},
	{ timestamps: true }
);

const Errors = mongoose.model('Errors', errorSchema, 'errors');

module.exports = Errors;
