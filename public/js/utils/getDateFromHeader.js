import { getElementArray } from './getElementArray.js';

export const getDateFromHeader = (cell) => {
	const row = cell.closest('tr');
	const cells = getElementArray(row, 'td');
	const ind = cells.findIndex((c) => c === cell);
	const header = getElementArray(
		row.closest('table').querySelector('thead tr'),
		'th'
	)[ind];
	return header.getAttribute('data-date');
};
