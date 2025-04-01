export const gamesPlayed = {
	heading: 'Played',
	sortable: true,
	defaultSort: -1,
	initialSort: false,
	includeTotal: true,
	summaryFunction: (p, c) => {
		if (c && !c.fillIn) return p + 1;
		return p;
	},
	startingValue: 0,
};

export const gamesWon = (fn) => {
	return {
		heading: 'Won',
		sortable: true,
		defaultSort: -1,
		initialSort: false,
		includeTotal: true,
		summaryFunction: (p, c) => {
			if (c && !c.fillIn && fn(c)) return p + 1;
			return p;
		},
		startingValue: 0,
	};
};

export const winPercent = (fn) => {
	return {
		heading: 'Pct',
		sortable: true,
		defaultSort: -1,
		initialSort: false,
		includeTotal: true,
		summaryFunction: (p, c) => {
			const toReturn = {
				...p,
			};
			if (c) {
				if (c.fillIn) return toReturn;

				toReturn.plays++;
				if (fn(c)) toReturn.wins++;
			}
			return toReturn;
		},
		startingValue: {
			plays: 0,
			wins: 0,
		},
		finalFunction: (data) => {
			const pct = Math.round((data.wins * 100) / data.plays);
			return pct;
		},
		displayValue: (data) => {
			if (data.plays === 0) return '-';
			return `${Math.round((data.wins * 100) / data.plays)}%`;
		},
	};
};

export const average = (fn, ...digits) => {
	return {
		heading: 'Avg',
		sortable: true,
		defaultSort: 1,
		initialSort: false,
		includeTotal: true,
		summaryFunction: (p, c) => {
			const toReturn = {
				...p,
			};
			if (c) {
				if (c.fillIn) return toReturn;

				toReturn.plays++;
				toReturn.total = p.total + fn(c);
			}
			return toReturn;
		},
		startingValue: {
			plays: 0,
			total: 0,
		},
		finalFunction: (data) => {
			if (data.plays === 0) return null;
			return (data.total / data.plays).toFixed(
				digits.length === 0 ? 2 : digits[0]
			);
		},
		displayValue: (data) => {
			if (!data || data.plays === 0) return '-';
			const avg = data.total / data.plays;
			return avg.toFixed(digits.length === 0 ? 2 : digits[0]);
		},
	};
};
