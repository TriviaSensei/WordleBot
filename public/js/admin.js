import { showMessage } from './utils/messages.js';

const statusPollInterval = 3000;
let pollTimer = null;

//POST/GET JSON; always resolves to { ok, status, body } even if the response isn't JSON
const sendRequest = async (url, method, body) => {
	try {
		const res = await fetch(url, {
			method,
			credentials: 'same-origin',
			headers: body ? { 'Content-Type': 'application/json' } : {},
			body: body ? JSON.stringify(body) : undefined,
		});
		let json = {};
		try {
			json = await res.json();
		} catch (err) {}
		return { ok: res.ok, status: res.status, body: json };
	} catch (err) {
		return {
			ok: false,
			status: 0,
			body: { message: 'Could not reach the server.' },
		};
	}
};

const initLogin = () => {
	const form = document.querySelector('#admin-login-form');
	if (!form) return;
	const input = document.querySelector('#admin-password');
	const submit = document.querySelector('#admin-login-submit');

	form.addEventListener('submit', async (e) => {
		e.preventDefault();
		submit.disabled = true;
		const res = await sendRequest('/admin/login', 'POST', {
			password: input.value,
		});
		if (res.ok) return location.reload();
		submit.disabled = false;
		input.value = '';
		input.focus();
		showMessage('error', res.body.message || 'Login failed.', 2000);
	});
};

const initLogout = () => {
	const btn = document.querySelector('#admin-logout');
	if (!btn) return;
	btn.addEventListener('click', async () => {
		await sendRequest('/admin/logout', 'POST');
		location.reload();
	});
};

const renderStatus = (state) => {
	const container = document.querySelector('#broadcast-status');
	const text = document.querySelector('#broadcast-status-text');
	const bar = document.querySelector('#broadcast-progress');
	const errorList = document.querySelector('#broadcast-errors');
	const submit = document.querySelector('#broadcast-submit');
	if (!state || !state.startedAt) return;

	const done = state.sent + state.failed;
	const pct = state.total > 0 ? Math.round((done / state.total) * 100) : 0;
	container.classList.remove('d-none');
	bar.style.width = `${pct}%`;
	text.textContent = state.running
		? `Sending... ${done} / ${state.total} (${state.sent} sent, ${state.failed} failed)`
		: `Finished: ${state.sent} sent, ${state.failed} failed (of ${state.total})`;

	errorList.replaceChildren(
		...state.errors.map((err) => {
			const li = document.createElement('li');
			li.textContent = `Guild ${err.guildId} / channel ${err.channelId}: ${
				err.status ? `${err.status} - ` : ''
			}${err.message}`;
			return li;
		}),
	);
	if (state.failed > state.errors.length) {
		const li = document.createElement('li');
		li.textContent = `...and ${state.failed - state.errors.length} more`;
		errorList.appendChild(li);
	}

	submit.disabled = state.running;
};

const stopPolling = () => {
	if (pollTimer) clearInterval(pollTimer);
	pollTimer = null;
};

const startPolling = () => {
	stopPolling();
	pollTimer = setInterval(async () => {
		const res = await sendRequest('/admin/broadcast', 'GET');
		if (res.status === 401) {
			stopPolling();
			return showMessage('error', 'Your session has expired.', 2000);
		}
		if (!res.ok) return;
		renderStatus(res.body.data);
		if (!res.body.data.running) stopPolling();
	}, statusPollInterval);
};

const initBroadcast = () => {
	const form = document.querySelector('#broadcast-form');
	if (!form) return;
	const textarea = document.querySelector('#broadcast-message');
	const charCount = document.querySelector('#char-count');
	const submit = document.querySelector('#broadcast-submit');
	const modalEl = document.querySelector('#broadcast-confirm-modal');
	const modal = new bootstrap.Modal(modalEl);
	const confirmBtn = document.querySelector('#broadcast-confirm');
	const guildCount = document.querySelector('#guild-count')?.textContent;
	const maxLength = Number(textarea.getAttribute('maxlength'));

	const updateCount = () => {
		charCount.textContent = `${textarea.value.length} / ${maxLength}`;
	};
	textarea.addEventListener('input', updateCount);
	updateCount();

	form.addEventListener('submit', (e) => {
		e.preventDefault();
		const message = textarea.value.trim();
		if (!message) return showMessage('error', 'The message is empty.', 2000);
		document.querySelector('#broadcast-confirm-text').textContent =
			`This message will be posted to ${
				guildCount ? `${guildCount} servers` : 'every server'
			}. This cannot be undone.`;
		document.querySelector('#broadcast-preview').textContent = message;
		modal.show();
	});

	confirmBtn.addEventListener('click', async () => {
		confirmBtn.disabled = true;
		const res = await sendRequest('/admin/broadcast', 'POST', {
			message: textarea.value,
		});
		confirmBtn.disabled = false;
		modal.hide();
		if (!res.ok)
			return showMessage(
				'error',
				res.body.message || 'Sending failed.',
				3000,
			);
		textarea.value = '';
		updateCount();
		showMessage('info', 'Sending started.', 1500);
		renderStatus(res.body.data);
		startPolling();
	});

	//show progress of a send that's already underway (e.g. after a page reload)
	const statusEl = document.querySelector('#broadcast-status');
	let initialState = null;
	try {
		initialState = JSON.parse(statusEl.getAttribute('data-status'));
	} catch (err) {}
	statusEl.removeAttribute('data-status');
	renderStatus(initialState);
	if (initialState?.running) startPolling();
};

document.addEventListener('DOMContentLoaded', () => {
	initLogin();
	initLogout();
	initBroadcast();
});
