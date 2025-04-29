const targets = document.querySelectorAll('[data-target]');
const scrollToTarget = (e) => {
	e.stopPropagation();
	const tgt = document.querySelector(
		`#${e.target.getAttribute('data-target')}`
	);
	if (tgt) tgt.scrollIntoView();
};
targets.forEach((t) => t.addEventListener('click', scrollToTarget));
