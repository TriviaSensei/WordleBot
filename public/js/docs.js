import { showMessage } from './utils/messages.js';

const bsOffcanvas = new bootstrap.Offcanvas('#contents');
const copyButtons = document.querySelectorAll('.copy-link');
const targets = document.querySelectorAll('#contents [data-target]');

const closeMenu = () => {
	bsOffcanvas.hide();
};
targets.forEach((t) => t.addEventListener('click', closeMenu));

const copyLink = (e) => {
	const link = document.querySelector(
		e.target.getAttribute('data-copy-target')
	);
	if (link) {
		navigator.clipboard.writeText(link.getAttribute('href'));
		showMessage('info', 'Copied!');
	}
};
copyButtons.forEach((cb) => cb.addEventListener('click', copyLink));
