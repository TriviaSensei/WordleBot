/**
 * TODO:
 *
 * e-mail form send (copy from main page)
 * hook up links to their targets
 */
import { createElement } from './utils/createElementFromSelector.js';
import { getElementArray } from './utils/getElementArray.js';
import { showMessage } from './utils/messages.js';
import { handleRequest } from './utils/requestHandler.js';
const links = getElementArray(document, '[data-link]');
const copies = getElementArray(document, '.copy-link');
const subjects = ['Bug Report', 'Feature Request', 'Other Feedback'];
const sendEmail = document.querySelector('.send-button');

const inputs = [
	document.querySelector('#name'),
	document.querySelector('#email'),
	document.querySelector('#subject'),
	document.querySelector('#message'),
];
const contactDiv = document.getElementById('form-container');
const contactForm = document.querySelector('#contact-form');

function handleSubmit(e) {
	e.preventDefault();

	const [name, email, subject, message] = inputs.map((el) => el.value);
	if (!subject) return showMessage('error', 'Select a subject');
	const body = {
		name,
		email,
		subject: `Wordle Bot - ${subject}`,
		message,
	};

	const handler = (res) => {
		if (res.status === 'success') {
			const rect = contactForm.getBoundingClientRect();
			contactDiv.setAttribute('style', `height:${rect.height}px;`);
			contactForm.remove();
			contactDiv.innerHTML =
				'Thanks for your message! I will reply as soon as possible!';
			showMessage('info', 'Message sent!');
		} else {
			showMessage('error', res.message, 2000);
		}
	};
	const requestStr = '/api/v1/contact';
	handleRequest(requestStr, 'POST', body, handler);
}

document.addEventListener('DOMContentLoaded', () => {
	subjects.forEach((s) => {
		const o = createElement('option');
		o.innerHTML = s;
		o.setAttribute('value', s);
		subject.appendChild(o);
	});

	links.forEach((l) => {
		l.addEventListener('click', (e) => {
			e.preventDefault();
			const name = l.getAttribute('data-link');
			const tgt = document.querySelector(`[name="${name}"]`);
			if (tgt) tgt.scrollIntoView();
			return false;
		});
	});
	const handleClick = (e) => {
		const sp = e.target.parentElement
			?.querySelector('span > a')
			?.getAttribute('href');
		if (!sp) return;
		navigator.clipboard.writeText(sp);
		showMessage('info', 'Copied');
	};
	copies.forEach((c) => {
		c.addEventListener('click', handleClick);
	});

	sendEmail.addEventListener('click', handleSubmit);
});
