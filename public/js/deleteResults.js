import { StateHandler } from './utils/stateHandler.js';
import { getElementArray } from './utils/getElementArray.js';
import { handleRequest } from './utils/requestHandler.js';
import { createElement } from './utils/createElementFromSelector.js';
import { showMessage } from './utils/messages.js';
const deleteButton = document.querySelector('#delete-results');
const gid = document.querySelector('#guild-id');
const token = document.querySelector('#edit-token');
const resultModal = new bootstrap.Modal('#delete-result-modal');
const deleteSuccess = document.querySelector('#delete-successes');
const deleteFailures = document.querySelector('#delete-errors');
const closeModal = document.querySelector('#close-delete-result');

const sh = new StateHandler([]);

const toggleMarked = (e) => {
	const rc = e.target.closest('.result-cell');
	if (rc) rc.classList.toggle('marked');
	let state = sh.getState();
	const id = rc.getAttribute('data-id');
	if (rc.classList.contains('marked')) state.push(id);
	else state = state.filter((el) => el !== id);
	sh.setState(state);
};

sh.addWatcher(deleteButton, (e) => {
	if (!e.target) return;
	const len = e.detail.length;
	e.target.innerHTML = `Delete ${len} result${len === 1 ? '' : 's'}`;
	e.target.disabled = len === 0;
});

document.addEventListener('panes-updated', () => {
	const cells = getElementArray(document, 'td.result-cell[data-id]');
	const state = sh.getState();
	cells.forEach((c) => {
		if (state.some((id) => id === c.getAttribute('data-id')))
			c.classList.add('marked');
		c.addEventListener('click', toggleMarked);
	});
});

document.addEventListener('DOMContentLoaded', () => {
	const guildId = gid.getAttribute('value');
	const editToken = token.getAttribute('value');
	token.remove();

	deleteButton.addEventListener('click', () => {
		const state = sh.getState();
		deleteButton.disabled = true;
		const handler = (res) => {
			if (res.status !== 'success') return showMessage('error', res.message);
			else if (res.message) showMessage('info', res.message);

			if (res.successes > 0)
				deleteSuccess.innerHTML = `<h4>${res.successes} result${
					res.successes === 1 ? '' : 's'
				} deleted`;
			if (res.failures.length > 0) {
				deleteFailures.innerHTML = '';
				const h = createElement('h4');
				h.innerHTML = 'Errors:';
				deleteFailures.appendChild(h);

				res.failures.forEach((f) => {
					const newDiv = createElement('div.mt-1.ms-2');
					newDiv.innerHTML = f;
					deleteFailures.appendChild(newDiv);
				});
				if (resultModal) {
					if (closeModal)
						closeModal.addEventListener(
							'click',
							() => {
								location.href = `/server/${guildId}`;
							},
							{ once: true }
						);
					resultModal.show();
				}
			} else {
				showMessage('info', `${res.successes} results deleted`);
				setTimeout(() => {
					location.href = `/server/${guildId}`;
				}, 1000);
			}
		};
		handleRequest(
			`/api/v1/wordle/delete/${guildId}/${editToken}`,
			'DELETE',
			{ idList: state },
			handler
		);
	});
});
