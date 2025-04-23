const moment = require('moment-timezone');
const timezone = process.env.DEFAULT_TIMEZONE;
// pass in string like 2025-04-01
const getNextDate = (date) => {
	if (!date) return null;
	const dt = new Date(moment.tz(`${date} 00:00`, timezone).format());
	dt.setDate(dt.getDate() + 1);
	const dp = Date.parse(dt);
	const toReturn = moment.tz(dp, timezone).format().split('T')[0];
	return toReturn;
};

module.exports = getNextDate;
