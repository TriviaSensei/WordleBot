import { getElementArray } from './utils/getElementArray.js';

const xSpeed = [10, 15];
const ySpeed = [8, 10];

const icons = getElementArray(document, '.floating-icon');
const headerArea = document.querySelector('#header');
let rect;
let iconRect;

let maxX;
let maxY;
const handleWindowSize = () => {
	rect = headerArea.getBoundingClientRect();
	iconRect = icons[0].getBoundingClientRect();
	maxX = (100 * (rect.width - iconRect.width)) / rect.width;
	maxY = (100 * (rect.height - iconRect.height)) / rect.height;
};
handleWindowSize();
window.addEventListener('resize', handleWindowSize);

const positions = [];

icons.forEach((ic) => {
	const x =
		(100 * (Math.random() * (rect.width - iconRect.width))) / rect.width;
	const y =
		(100 * (Math.random() * (rect.height - iconRect.height))) / rect.height;
	ic.style.left = `${x.toFixed(3)}%`;
	ic.style.top = `${y.toFixed(3)}%`;
	positions.push({
		icon: ic,
		x,
		y,
		speed: [
			(Math.random() >= 0.5 ? 1 : -1) *
				(xSpeed[0] + Math.random() * (xSpeed[1] - xSpeed[0])),
			(Math.random() >= 0.5 ? 1 : -1) *
				(ySpeed[0] + Math.random() * (ySpeed[1] - ySpeed[0])),
		],
	});
});

let last;
const step = (ts) => {
	if (!last) last = ts;
	const elapsed = ts - last;
	last = ts;
	//speed is the number of seconds it should take to traverse the x or y axes entirely (e.g. 4 = object moves from the top to bottom in 4 seconds)
	//elapsed/1000 is the number of seconds that have elapsed.
	//elapsed/(1000*speed) is the percent of the dimension it should traverse
	positions.forEach((p) => {
		const dx = elapsed / (p.speed[0] * 10);
		const dy = elapsed / (p.speed[1] * 10);
		p.x = p.x + dx;
		p.y = p.y + dy;
		if (p.x >= maxX) {
			p.speed[0] = -p.speed[0];
			p.x = 2 * maxX - p.x;
		} else if (p.x <= 0) {
			p.speed[0] = -p.speed[0];
			p.x = Math.abs(p.x);
		}
		if (p.y >= maxY) {
			p.speed[1] = -p.speed[1];
			p.y = 2 * maxY - p.y;
		} else if (p.y <= 0) {
			p.speed[1] = -p.speed[1];
			p.y = Math.abs(p.y);
		}
		p.icon.style.left = `${p.x.toFixed(3)}%`;
		p.icon.style.top = `${p.y.toFixed(3)}%`;
	});
	requestAnimationFrame(step);
};
requestAnimationFrame(step);
