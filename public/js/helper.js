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
		b.addEventListener('click', (e) => {
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
		});
	});

	const keys = getElementArray(document, '.Key');
	const letters = 'abcdefghijklmnopqrstuvwxyz';
	const handleKey = (e) => {
		let key = e.key?.toLowerCase() || e.target.getAttribute('data-key');

		if (key === 'backspace' || key === 'delete') key = 'del';
		if (key === 'return') key = 'enter';

		if (key.length === 1 && letters.indexOf(key) >= 0) {
			sh.setState((prev) => {
				const newState = { ...prev };
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
		} else return;
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
	const filterFunctions = [incorrectFilter, positionFilter, correctFilter];

	sh.addWatcher(solutions, (e) => {
		const state = e.detail;
		e.target.innerHTML = '';
		if (
			!state.guesses.some((g) => {
				return g.word.every((l) => l !== '');
			})
		)
			return;

		const filters = [[], [], []];
		let valid = true;
		state.guesses.forEach((g) => {
			if (!valid) return;
			if (g.word.some((l) => l === '')) return;
			g.word.forEach((l, i) => {
				if (!valid || !l) return;
				const res = g.result[i];
				switch (res) {
					case 0:
						if (
							filters[1].some((f) => f.letter === l) ||
							filters[2].some((f) => f.letter === l)
						) {
							valid = false;
						}
						break;
					case 1:
						if (
							filters[0].some((f) => f.letter === l) ||
							filters[2].some((f) => f.letter === l && f.position === i)
						) {
							valid = false;
						}
						break;
					case 2:
						if (
							filters[0].some((f) => f.letter === l) ||
							filters[1].some((f) => f.letter === l && f.position === i)
						) {
							valid = false;
						}
					default:
						break;
				}
				if (
					valid &&
					filters[res].every((f) => {
						return f.letter !== l || f.position !== i;
					})
				) {
					filters[res].push({
						letter: l,
						position: i,
					});
				}
			});
		});
		if (!valid) return;
		const allFilters = [
			...filters[0].map((f) => {
				return filterFunctions[0](f.letter);
			}),
			...filters[1].map((f) => {
				return filterFunctions[1](f.letter, f.position);
			}),
			...filters[2].map((f) => {
				return filterFunctions[2](f.letter, f.position);
			}),
		];
		let validSolutions = allFilters
			.reduce((p, c) => {
				return p.filter(c);
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
