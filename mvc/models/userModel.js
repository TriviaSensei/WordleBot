const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
	userId: {
		type: String,
		required: [true, 'User ID not found'],
	},
	username: {
		type: String,
		required: [true, 'Username not found'],
	},
	globalName: String,
	avatar: {
		type: String,
		required: [true, 'Username not found'],
	},
	banner: String,
	banner_color: String,
	servers: {
		type: [mongoose.Types.ObjectId],
		ref: 'Servers',
	},
	achievements: { type: [Object], default: [] },
});

const Users = mongoose.model('Users', userSchema, 'users');

module.exports = Users;
