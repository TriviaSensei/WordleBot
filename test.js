const moment = require('moment-timezone');

const current = moment.tz(new Date(), 'America/New_York').format();

console.log(current);
