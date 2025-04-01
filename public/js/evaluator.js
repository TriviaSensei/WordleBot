class Evaluator {
	evaluate(data) {
		if (!data) return null;
		if (this.logStuff) console.log(data);
		//if we already have just a number, return it
		if ((typeof data).toLowerCase() === 'number') return data;
		//pass the data to the helper function and start with the JSON object that we constructed with
		else if (Array.isArray(data)) return this.evaluateHelper(data, this.calc);
		else return null;
	}

	/**
	 *
	 * @param {the data being summarized, as an array} data
	 * @param {the JSON object describing how to summarize the data} obj
	 */
	evaluateHelper(data, obj) {
		if (this.logStuff) console.log(data, obj);
		//if the step is just a number, return that number
		if ((typeof obj).toLowerCase() === 'number') return obj;
		//if there is no operator or way to extract the data columns, return nothing
		if (!obj?.operator && !obj?.getData) return null;
		//get the correct operator
		if (obj.operator === 'data') {
			if (!obj.values[0]?.getData) return null;
			if ((typeof obj.values[0].getData).toLowerCase() !== 'function')
				return null;
			const toReturn = data.map((d) => {
				if (this.logStuff) console.log(d);
				return obj.values[0].getData(d);
			});
			if (this.logStuff) console.log(toReturn);
			return toReturn;
		}
		const operator = this.OPERATORS[obj.operator.toUpperCase()];
		// console.log(operator);
		//if the operator is not valid, return nothing
		if (!operator) return null;
		//validate the values being passed to the operator
		let values = obj.values
			? obj.values
			: obj.getData
			? data.map((d) => obj.getData(d))
			: null;
		if (!operator.validate(values)) return null;
		// console.log(operator);
		return operator.fn(data, values);
	}

	handleArrayInputs(fn, data, values) {
		const arrays = values.map((v) => Array.isArray(v));
		if (arrays[0] && arrays[1]) {
			if (arrays[0].length !== arrays[1].length) return null;
			return values[0].map((v, i) => {
				return fn(
					this.evaluateHelper(data, v),
					this.evaluateHelper(data, values[1][i])
				);
			});
		} else if (arrays[0]) {
			return values[0].map((v) => {
				return fn(
					this.evaluateHelper(data, v),
					this.evaluateHelper(data, values[1])
				);
			});
		} else if (arrays[1]) {
			return values[1].map((v) => {
				return fn(
					this.evaluateHelper(data, values[0]),
					this.evaluateHelper(data, v)
				);
			});
		} else
			return fn(
				this.evaluateHelper(data, values[0]),
				this.evaluateHelper(data, values[1])
			);
	}

	log(toLog) {
		if (this.logStuff) {
			console.log(toLog);
			console.trace();
		}
	}

	constructor(calc, logStuff) {
		this.logStuff = logStuff;
		this.calc = calc;
		this.OPERATORS = {
			/*
			 * {
			 * 		operator: 'constant',
			 * 		values: 1
			 * }
			 */
			DATA: {
				type: 1,
				validate: (val) =>
					val.dataItem &&
					val.getData &&
					(typeof val.getData).toLowerCase() === 'function',
				fn: (data, val) => {
					if (this.logStuff) console.log(data);
					return data.map((d) => val.getData(d));
				},
			},
			CONSTANT: {
				type: 1,
				validate: (val) => {
					if (this.logStuff) console.log(val);
					return (
						(typeof val).toLowerCase() === 'number' ||
						(Array.isArray(val) &&
							val.every((v) => (typeof v).toLowerCase() === 'number'))
					);
				},
				fn: (data, val) => {
					if (this.logStuff) console.log(data, val);
					return Array.isArray(val) ? val[0] : val;
				},
			},
			/*
			{
				operator: 'sqrt',
				values: [
					{
						operator: xxxx,
						values: [...etc..]
					}
				]
			}
			*/
			SQRT: {
				type: 1,
				validate: (vals) => Array.isArray(vals) && vals.length === 1,
				fn: (data, vals) => {
					const res = this.evaluateHelper(data, vals[0]);
					if (
						Array.isArray(res) &&
						res.every((r) => (typeof r).toLowerCase() === 'number')
					) {
						return res.map((r) => Math.sqrt(r));
					} else if ((typeof res).toLowerCase() === 'number')
						return Math.sqrt(res);
					else return null;
				},
			},
			POWER: {
				type: 1,
				validate: (vals) => vals.length === 2,
				fn: (data, vals) => {
					const values = vals.map((v) => this.evaluateHelper(data, v));
					return this.handleArrayInputs((a, b) => Math.pow(a, b), data, values);
				},
			},
			MAX: {
				type: 1,
				validate: (vals) => Array.isArray(vals) && vals.length === 2,
				fn: (data, vals) => {
					const values = vals.map((v) => this.evaluateHelper(data, v));
					return this.handleArrayInputs((a, b) => Math.max(a, b), data, values);
				},
			},
			MIN: {
				type: 1,
				validate: (vals) => Array.isArray(vals) && vals.length === 2,
				fn: (data, vals) => {
					const values = vals.map((v) => this.evaluateHelper(data, v));
					return this.handleArrayInputs((a, b) => Math.min(a, b), data, values);
				},
			},
			ADD: {
				type: 1,
				validate: (vals) => Array.isArray(vals),
				fn: (data, vals) =>
					vals.reduce(
						(p, c) =>
							this.handleArrayInputs((a, b) => a + b, data, [
								p,
								this.evaluateHelper(data, c),
							]),
						0
					),
			},
			SUBTRACT: {
				type: 1,
				validate: (vals) => vals.length === 2,
				fn: (data, vals) => {
					if (this.logStuff) console.log(data, vals);
					const values = vals.map((v) => this.evaluateHelper(data, v));
					if (this.logStuff) console.log(values);
					return this.handleArrayInputs((a, b) => a - b, data, values);
				},
			},
			MULTIPLY: {
				type: 1,
				validate: (vals) => vals.length === 2,
				fn: (data, vals) => {
					const values = vals.map((v) => this.evaluateHelper(data, v));
					return this.handleArrayInputs((a, b) => a * b, data, values);
				},
			},
			DIVIDE: {
				type: 1,
				validate: (vals) => vals.length === 2,
				fn: (data, vals) => {
					const values = vals.map((v) => this.evaluateHelper(data, v));
					return this.handleArrayInputs(
						(a, b) => (b === 0 ? NaN : a / b),
						data,
						values
					);
				},
			},
			ABS: {
				type: 1,
				validate: (vals) => vals.length === 1,
				fn: (data, vals) => {
					const value = this.evaluateHelper(data, vals[0]);
					if (Array.isArray(value)) return value.map((v) => Math.abs(v));
					else return Math.abs(value);
				},
			},
			SUM: {
				type: 2,
				validate: (vals) => Array.isArray(vals) && vals.length === 1,
				fn: (data, vals) => {
					//data is the unmodified data
					//vals - operator that will generate an array to sum
					const val = vals[0];
					if (this.logStuff) console.log(val);
					if (val.getData) {
						//if it has a getdata function, that means we should use it on the data and sum the result
						const toSum = data.map((d) => val.getData(d));
						if (this.logStuff) console.log(toSum);
						return toSum.reduce(
							(p, c) => p + ((typeof c).toLowerCase() === 'number' ? c : 0),
							0
						);
					}
					//we are summing the result array (or just the singular result) of an operator
					else if (val.operator) {
						//recursively evaluate the operator
						const toSum = this.evaluateHelper(data, val);
						//if it's an array, sum it
						if (Array.isArray(toSum))
							return toSum.reduce(
								(p, c) => p + ((typeof c).toLowerCase() === 'number' ? c : 0),
								0
							);
						//if it's a number, return it
						else if (Number(toSum)) return Number(toSum);
						else return null;
					}
					//if we're summing an array of numbers([[1,2,3,4]]) wrapped in an array element, sum it and return
					else if (
						Array.isArray(val) &&
						val.every((v) => (typeof v).toLowerCase() === 'number')
					) {
						return val.reduce((p, c) => p + c, 0);
					}
					//probably shouldn't be here, but in case...if we have an array of numbers not wrapped in an array, ([1,2,3,4]), sum it and return
					else if (
						Array.isArray(vals) &&
						vals.every((v) => (typeof v).toLowerCase() === 'number')
					) {
						return vals.reduce((p, c) => p + c, 0);
					} else return null;
				},
			},
			COUNT: {
				type: 2,
				validate: (vals) => Array.isArray(vals),
				fn: (data, vals) => {
					const val =
						Array.isArray(vals) && vals.every((v) => !isNaN(Number(v)))
							? vals
							: vals.length === 1
							? this.evaluateHelper(data, vals[0])
							: null;
					if (!val) return null;
					return val.reduce((p, c) => p + (c !== null && !isNaN(c) ? 1 : 0), 0);
				},
			},
			AVG: {
				type: 2,
				validate: (vals) => Array.isArray(vals),
				fn: (data, vals) => {
					if (this.logStuff) console.log(data, vals);
					const s = this.OPERATORS.SUM.fn(data, vals);
					if (this.logStuff) console.log(s);
					const c = this.OPERATORS.COUNT.fn(data, vals);
					if (this.logStuff) console.log(c);
					if (c === 0) return null;
					return s / c;
				},
			},
		};
	}
}
