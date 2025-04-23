const svg = document.querySelector('#my-svg');
const defs = svg.querySelector('defs');

const roundTo = (n, places) => {
	return Math.round(Math.pow(10, places) * n) / Math.pow(10, places);
};
const ns = 'http://www.w3.org/2000/svg';
const createElement = (el) => {
	return document.createElementNS(ns, el);
};

const setAttributes = (el, obj) => {
	const attrs = Object.getOwnPropertyNames(obj);
	attrs.forEach((attr) => el.setAttribute(attr, obj[attr]));
};

document.addEventListener('DOMContentLoaded', () => {
	const dim = 900;
	const mainGridSize = 5;
	const stripeWidth = 10;
	const stripeRepeat = 20;

	const colors = [
		{
			color: '#ffa000',
			name: 'orange',
		},
		{
			color: '#fff',
			name: 'white',
		},
		{
			color: '#92000a',
			name: 'darkred',
		},
		{
			color: '#f00',
			name: 'red',
		},
		{
			color: '#000',
			name: 'black',
		},
		{
			color: '#ff0',
			name: 'yellow',
		},
	];
	//patterns
	colors.forEach((c) => {
		const p = createElement('pattern');
		setAttributes(p, {
			id: `${c.name}-stripes`,
			x: 0,
			y: 0,
			width: 2 * stripeWidth,
			height: 2 * stripeWidth,
			patternUnits: 'userSpaceOnUse',
		});
		[
			`M ${stripeWidth} 0 l ${stripeWidth} 0 l ${-2 * stripeWidth} ${
				2 * stripeWidth
			} l 0 ${-stripeWidth} z`,
			`M ${
				2 * stripeWidth
			} ${stripeWidth} l 0 ${stripeWidth} l ${-stripeWidth} 0 z`,
		].forEach((d) => {
			const pt = createElement('path');
			setAttributes(pt, {
				fill: c.color,
				d,
			});
			p.appendChild(pt);
		});
		defs.appendChild(p);

		const p2 = createElement('pattern');
		setAttributes(p2, {
			id: `${c.name}-stripes-reverse`,
			x: 0,
			y: 0,
			width: 2 * stripeWidth,
			height: 2 * stripeWidth,
			patternUnits: 'userSpaceOnUse',
		});
		[
			`M 0 0 l ${stripeWidth} 0 l ${-stripeWidth} ${stripeWidth} z`,
			`M ${2 * stripeWidth} 0 l ${-2 * stripeWidth} ${
				2 * stripeWidth
			} l ${stripeWidth} 0 l ${stripeWidth} ${-stripeWidth} z`,
		].forEach((d) => {
			const pt = createElement('path');
			setAttributes(pt, {
				fill: c.color,
				d,
			});
			p2.appendChild(pt);
		});
		defs.appendChild(p2);
	});

	const horizontalStripes = [
		{
			color: '',
			end: 12,
		},
		{
			color: 'darkred',
			end: 41,
		},
		{
			color: 'orange',
			end: 58,
		},
		{
			color: 'white',
			end: 77,
		},
		{
			color: 'darkred',
			end: 135,
		},
		{
			color: 'red',
			end: 143,
		},
		{
			color: '',
			end: 200,
		},
		{
			color: 'darkred',
			end: 219,
		},
		{
			color: 'red',
			end: 238,
		},
		{
			color: 'orange',
			end: 268,
		},
	];
	const verticalStripes = [
		{
			color: 'white',
			end: 17,
		},
		{
			color: 'orange',
			end: 30,
		},
		{
			color: '',
			end: 46,
		},
		{
			color: 'red',
			end: 60,
		},
		{
			color: '',
			end: 110,
		},
		{
			color: 'darkred',
			end: 118,
		},
		{
			color: '',
			end: 168,
		},
		{
			color: 'orange',
			end: 178,
		},
		{
			color: 'darkred',
			end: 194,
		},
		{
			color: 'yellow',
			end: 220,
		},
	];
	//scale it for the size of this SVG
	[horizontalStripes, verticalStripes].forEach((s) => {
		s.forEach((str) => {
			str.end = roundTo((str.end / s.slice(-1).pop().end) * dim, 4);
		});
	});

	const s1 = createElement('g');
	horizontalStripes.forEach((hs, i) => {
		const r = createElement('rect');
		setAttributes(r, {
			x: 0,
			y: i === 0 ? 0 : horizontalStripes[i - 1].end,
			height: roundTo(hs.end - (i === 0 ? 0 : horizontalStripes[i - 1].end), 4),
			width: dim,
			fill: hs.color ? `url(#${hs.color}-stripes)` : 'none',
		});
		s1.appendChild(r);
	});
	svg.appendChild(s1);
	const s2 = createElement('g');
	verticalStripes.forEach((vs, i) => {
		const r = createElement('rect');
		setAttributes(r, {
			y: 0,
			x: i === 0 ? 0 : verticalStripes[i - 1].end,
			width: roundTo(vs.end - (i === 0 ? 0 : verticalStripes[i - 1].end), 4),
			height: dim,
			fill: vs.color ? `url(#${vs.color}-stripes-reverse)` : 'none',
		});
		s2.appendChild(r);
	});
	svg.appendChild(s2);

	const rects = createElement('g');
	verticalStripes.forEach((vs, i) => {
		if (!vs.color) return;
		horizontalStripes.forEach((hs, j) => {
			if (vs.color === hs.color) {
				const x = i === 0 ? 0 : verticalStripes[i - 1].end;
				const y = j === 0 ? 0 : horizontalStripes[j - 1].end;
				const r = createElement('rect');
				setAttributes(r, {
					x,
					y,
					width: roundTo(vs.end - x, 4),
					height: roundTo(hs.end - y, 4),
					fill: vs.color,
				});
				rects.appendChild(r);
			}
		});
	});
	svg.appendChild(rects);
});
