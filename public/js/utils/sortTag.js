import { createElement } from './createElementFromSelector.js';

export const createSortTag = (game, sortObj) => {
	const tag = createElement({
		selector: '.sort-tag',
		children: [
			`input#${game}-${sortObj.id}`,
			{
				selector: 'label',
				innerHTML: sortObj.label,
			},
		],
	});
	const inp = tag.querySelector('input');
	inp.setAttribute('type', 'radio');
	inp.setAttribute('name', `${game}-sort-item`);
	inp.setAttribute('value', sortObj.id);
	const lbl = tag.querySelector('label');
	lbl.setAttribute('for', `${game}-${sortObj.id}`);
	tag.setAttribute('data-id', sortObj.id);
	return tag;
};
