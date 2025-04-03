const express = require('express');
const app = express();
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const morgan = require('morgan');

dotenv.config({ path: './config.env' });
const port = process.env.PORT || 3000;

const databaseStr =
	process.env.NODE_ENV === 'development'
		? process.env.DATABASE_DEV
		: process.env.DATABASE;
const DB = databaseStr.replace('<PASSWORD>', process.env.DB_PASSWORD);

mongoose.connect(DB).then(async () => {
	console.log('DB connection successful');
});

const server = app.listen(port, () => {
	console.log(`App running on port ${port}`);
});

const viewRouter = require('./mvc/routes/viewRoutes');
const wordleRouter = require('./mvc/routes/wordleRoutes');
const wordleBot = require('./utils/wordleBot/wordleBot');

const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(morgan('dev'));
app.set('view engine', 'pug');
//directory for views is /views
app.set('views', path.join(__dirname, 'mvc/views'));

app.use('/api/v1/wordle', wordleRouter);
app.use('/api/v1/contact', async (req, res) => {
	const sgMail = require('@sendgrid/mail');
	sgMail.setApiKey(process.env.SG_API_KEY);

	const msg = {
		from: process.env.serveremail,
		to: process.env.email,
		reply_to: req.body.email,
		subject: `wordlebot.gg message from ${req.body.name}: ${req.body.subject}`,
		text: req.body.message,
	};
	try {
		await sgMail.send(msg);
	} catch (e) {
		console.log(e);
		console.log(e.response.body.errors[0]);
		return res
			.status(e.code)
			.json({ status: 'fail', message: e.response.body.errors[0].message });
	}
	res.status(200).json({
		status: 'success',
		message: 'message sent.',
	});
});
app.use('/', viewRouter);
