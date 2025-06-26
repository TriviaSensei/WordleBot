import { createElement } from './utils/createElementFromSelector.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { StateHandler } from './utils/stateHandler.js';

document.addEventListener('DOMContentLoaded', () => {
	const dataArea = document.querySelector('#data-area');
	if (!dataArea) return;
	const data = JSON.parse(dataArea.getAttribute('data'));
	dataArea.remove();
	const myTimeZone = moment.tz.guess();
	const date = moment.tz(new Date(), myTimeZone).startOf('day').format();

	data.history = data.history.filter((d) => {
		return Date.parse(new Date(d.date)) !== Date.parse(new Date(date));
	});

	console.log(data);

	const sh = new StateHandler({
		guesses: [
			{
				word: ['', '', '', '', ''],
				result: [0, 0, 0, 0, 0],
			},
			{
				word: ['', '', '', '', ''],
				result: [0, 0, 0, 0, 0],
			},
			{
				word: ['', '', '', '', ''],
				result: [0, 0, 0, 0, 0],
			},
			{
				word: ['', '', '', '', ''],
				result: [0, 0, 0, 0, 0],
			},
			{
				word: ['', '', '', '', ''],
				result: [0, 0, 0, 0, 0],
			},
		],
		activeRow: 0,
		activeBox: 0,
	});

	const rows = getElementArray(document, '.guess-row');
	const boxes = getElementArray(document, '.guess-row .box');
	sh.addWatcher(null, (state) => {
		rows.forEach((r) => {
			const rn = Number(r.getAttribute('data-row'));
			if (rn === state.activeRow) r.classList.add('selected');
			else r.classList.remove('selected');

			const word = state.guesses[rn].word.join('');
			if (
				word.length === 5 &&
				!data.dictionary.includes(word) &&
				!data.answers.includes(word)
			)
				r.classList.add('invalid');
			else r.classList.remove('invalid');
		});
		boxes.forEach((b) => {
			const rn = Number(b.parentElement.getAttribute('data-row'));
			if (state.activeRow !== rn) return b.classList.remove('selected');

			const bn = Number(b.getAttribute('data-box'));
			if (state.activeBox !== bn) return b.classList.remove('selected');
			b.classList.add('selected');
		});
	});
	const changeLetterResult = (e) => {
		const parent = e.target.closest('.guess-row');
		const box = e.target.closest('.box');
		if (!parent || !box) return;
		const row = Number(parent.getAttribute('data-row'));
		const col = Number(box.getAttribute('data-box'));
		const state = sh.getState();
		if (
			state.guesses[row].word[col] !== '' &&
			state.activeRow === row &&
			state.activeBox === col
		) {
			return sh.setState((prev) => {
				const newState = {
					...prev,
				};
				newState.guesses[row].result[col] =
					(newState.guesses[row].result[col] + 1) % 3;
				return newState;
			});
		}
		sh.setState((prev) => {
			return {
				...prev,
				activeRow: row,
				activeBox: col,
			};
		});
	};
	boxes.forEach((b) => {
		sh.addWatcher(b, (e) => {
			const inner = e.target.querySelector('div');
			if (!inner) return;
			const row = Number(e.target.parentElement.getAttribute('data-row'));
			const col = Number(e.target.getAttribute('data-box'));
			const letter = e.detail.guesses[row].word[col].toUpperCase();
			inner.innerHTML = letter;
			e.target.classList.remove('gray', 'yellow', 'green');
			if (!letter) return;
			const res = e.detail.guesses[row].result[col];
			e.target.classList.add(
				res === 0 ? 'gray' : res === 1 ? 'yellow' : 'green'
			);
		});
		b.addEventListener('click', changeLetterResult);
	});

	const keys = getElementArray(document, '.Key');
	const letters = 'abcdefghijklmnopqrstuvwxyz';
	const handleKey = (e) => {
		if (e.stopPropagation) e.stopPropagation();
		let key = e.key?.toLowerCase() || e.target?.getAttribute('data-key');
		if (!key) return false;

		if (key === 'backspace' || key === 'delete') key = 'del';
		if (key === 'return') key = 'enter';
		if (e.key === ' ') key = 'space';

		if (key === 'tab' || (key.length === 1 && letters.indexOf(key) >= 0)) {
			sh.setState((prev) => {
				const newState = { ...prev };
				if (key !== 'tab')
					newState.guesses[prev.activeRow].word[prev.activeBox] = key;
				if (prev.activeRow !== 4 || prev.activeBox !== 4) {
					newState.activeBox = (newState.activeBox + 1) % 5;
					if (newState.activeBox === 0) newState.activeRow++;
				}
				return newState;
			});
		} else if (key === 'del') {
			sh.setState((prev) => {
				const newState = { ...prev };
				newState.guesses[prev.activeRow].word[prev.activeBox] = '';
				newState.guesses[prev.activeRow].result[prev.activeBox] = 0;
				if (newState.activeBox === 0 && newState.activeRow !== 0) {
					newState.activeBox = 4;
					newState.activeRow = Math.max(0, newState.activeRow - 1);
				} else newState.activeBox = Math.max(0, newState.activeBox - 1);
				return newState;
			});
		} else if (key.indexOf('arrow') >= 0) {
			const state = sh.getState();
			switch (key) {
				case 'arrowleft': {
					state.activeBox = Math.max(0, state.activeBox - 1);
					break;
				}
				case 'arrowright': {
					state.activeBox = Math.min(4, state.activeBox + 1);
					break;
				}
				case 'arrowup': {
					state.activeRow = Math.max(0, state.activeRow - 1);
					break;
				}
				case 'arrowdown': {
					state.activeRow = Math.min(4, state.activeRow + 1);
					break;
				}
				default: {
					break;
				}
			}
			sh.setState(state);
		} else if (key === 'space') {
			const activeBox = document.querySelector('.box.selected');
			if (activeBox) changeLetterResult({ target: activeBox });
		}
		if (e?.target?.blur) e.target.blur();
		return false;
	};
	//highlight keys when pressed
	const handleKeyPress = (e) => {
		let key = e.key?.toLowerCase();
		if (!key) return;

		if (key === 'backspace' || key === 'delete') key = 'del';
		if (key === 'return') key = 'enter';

		const b = document.querySelector(`button.Key[data-key="${key}"]`);

		if (b) {
			if (e.type === 'keydown') b.classList.add('Pressed');
			else if (e.type === 'keyup') b.classList.remove('Pressed');
		}
	};
	document.addEventListener('keydown', handleKeyPress);
	document.addEventListener('keydown', handleKey);
	document.addEventListener('keyup', handleKeyPress);
	keys.forEach((k) => {
		k.addEventListener('click', handleKey);
	});
	const solutions = document.querySelector(
		'.solution-container .solution-list'
	);
	//green letter
	const correctFilter = (letter, position) => {
		return (word) => word.charAt(position) === letter;
	};
	//yellow letter
	const positionFilter = (letter, position) => {
		return (word) =>
			word.charAt(position) !== letter && word.indexOf(letter) >= 0;
	};
	//gray letter
	const incorrectFilter = (letter, position) => {
		return (word) => word.indexOf(letter) < 0;
	};
	//count filter - the word has less than [count] instances of the letter
	const countFilterLT = (letter, count) => {
		return (word) =>
			word.split('').reduce((p, c) => {
				return p + (c === letter ? 1 : 0);
			}, 0) < count;
	};
	//other count filter - the word has at least [count] instances of the letter
	const countFilterGTE = (letter, count) => {
		return (word) =>
			word.split('').reduce((p, c) => {
				return p + (c === letter ? 1 : 0);
			}, 0) >= count;
	};
	const filterFunctions = [
		incorrectFilter,
		positionFilter,
		correctFilter,
		countFilterLT,
		countFilterGTE,
	];

	sh.addWatcher(solutions, (e) => {
		const state = e.detail;
		e.target.innerHTML = '';
		if (
			!state.guesses.some((g) => {
				return g.word.every((l) => l !== '');
			})
		)
			return;

		const filters = [];
		let valid = true;
		//first find all correctly placed letters
		state.guesses.forEach((g) => {
			if (!valid) return;
			if (g.word.some((l) => l === '')) return;
			g.result.forEach((r, i) => {
				if (!valid) return;
				//if this was indicated as a correctly placed letter...
				if (r === 2) {
					//see if something else was shown to be correct here
					let push = true;
					filters.some((f) => {
						//correct filter in this same position
						if (f.type === 2 && f.position === i) {
							//different letter indicated correct here, so this is invalid
							if (f.letter !== g.word[i]) valid = false;
							//same letter, so don't push it again
							else push = false;
							return true;
						}
						return false;
					});
					if (valid && push)
						filters.push({
							type: 2,
							letter: g.word[i],
							position: i,
						});
					//count which instance this is
					const n = g.word.reduce(
						(p, c, j) =>
							p + (c === g.word[i] && j <= i && g.result[j] !== 0 ? 1 : 0),
						0
					);
					//there are at least [n] instances of this letter
					filters.push({
						type: 4,
						letter: g.word[i],
						position: n,
					});
				}
			});
		});
		if (!valid) return;

		//now find all yellow letters
		state.guesses.forEach((g) => {
			if (!valid) return;
			if (g.word.some((l) => l === '')) return;
			g.result.forEach((r, i) => {
				if (!valid) return;
				if (r === 1) {
					//see if it was elsewhere indicated as correct here
					if (
						filters.some(
							(f) => f.letter === g.word[i] && f.position === i && f.type === 2
						)
					) {
						valid = false;
						return;
					}

					//the letter is definitely present, but not in this spot
					filters.push({
						type: 1,
						letter: g.word[i],
						position: i,
					});

					//count which instance this is
					const n = g.word.reduce(
						(p, c, j) => p + (c === g.word[i] && j <= i ? 1 : 0),
						0
					);
					//there are at least [n] instances of this letter
					filters.push({
						type: 4,
						letter: g.word[i],
						position: n,
					});
				}
			});
		});
		if (!valid) return;

		//now deal with all gray letters
		state.guesses.forEach((g) => {
			if (!valid) return;
			if (g.word.some((l) => l === '')) return;
			g.result.forEach((r, i) => {
				if (!valid) return;
				if (r === 0) {
					//make sure we didn't previously indicate it to be a correct letter in this position
					if (
						filters.some(
							(f) => f.type === 2 && f.letter === g.word[i] && f.position === i
						)
					) {
						valid = false;
						return;
					}
					//count how many correct instances of this letter we have - there are exactly this many instances of this letter
					const n = g.word.reduce(
						(p, c, j) => p + (c === g.word[i] && g.result[j] !== 0 ? 1 : 0),
						0
					);
					//there are less than [n+1] instances of this letter
					filters.push({
						type: 3,
						letter: g.word[i],
						position: n + 1,
					});
				}
			});
		});

		const allFilters = filters.map((f) =>
			filterFunctions[f.type](f.letter, f.position)
		);

		const keyword = '';
		if (keyword) console.log(filters);
		let validSolutions = allFilters
			.reduce((p, c, i) => {
				const next = p.filter(c);
				if (keyword && !next.includes(keyword))
					console.log(`${keyword} was filtered out on filter ${i}`);
				return next;
			}, data.answers)
			.sort((a, b) => a.localeCompare(b));
		validSolutions.forEach((s) => {
			const sol = createElement('.solution');
			if (data.history.some((h) => h.data.solution.toLowerCase() === s))
				sol.classList.add('used');
			sol.innerHTML = s;
			e.target.appendChild(sol);
		});
	});
});
