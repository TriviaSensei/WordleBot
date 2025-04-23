import { getElementArray } from './utils/getElementArray.js';
import { createElement } from './utils/createElementFromSelector.js';

/**
 *
 * @param {Element} table
 *  The table element to perform this whole thing on
 * @param {Function(cell)} formatCell
 *  Function to extract the value out of a cell, set its contents and style, etc.
 * @param {[Object]} rowOperators
 *  array of objects, each with these attributes:
 *      {
 *          heading (string) - the column header's contents
 *          sortable (boolean) - whether we can sort by this column
 *          defaultSort (integer) - direction to sort by default (1 for asc, -1 for desc)
 *          summaryFunction (function(cell)) - how to summarize the data
 *          startingValue - starting value of the summary function (e.g. 0)
 *          finalFunction - a way to turn the result of the summary function into a number for sorting purposes
 *          displayValue - a way to turn the result of the summary function into a display (e.g. with a plus sign or something). If omitted, will just display the final vlaue
 *      }
 * @param {[Object]} columnOperators
 * array of objects, each with these attributes:
 *      {
 *          heading (string) - the row title
 *          summaryFunction (function(cell)) - how to summarize the data
 *          startingValue - starting value of the summary function (e.g. 0)
 *          finalFunction - a way to turn the result of the summary function into a number for sorting purposes
 *          displayValue - a way to turn the final value into a display (e.g. with a plus sign or something). If omitted, will just display the final vlaue
 *      }
 */

export const updateTable = (
	table,
	formatCell,
	rowOperators,
	columnOperators,
	customStats
) => {
	//run each row operator, adding a summary column for each one
	const header = table.querySelector('tr.header-row');

	const sortTable = (e) => {
		//figure out which column to sort on
		const clickedHeader = e.target.closest('th');
		if (!clickedHeader) return;

		const rows = getElementArray(table, 'tr.standings-row');
		const summaryRows = getElementArray(table, 'tr.summary-row');

		//if it's already the active sort, reverse the sort
		let sortDirection;
		//default sort direction is 1 (ascending) but we this can be changed with an attribute
		let defaultSort = Number(clickedHeader.getAttribute('data-default-sort'));
		if (isNaN(defaultSort) || defaultSort === null) defaultSort = 1;

		if (clickedHeader.classList.contains('active-sort')) {
			const currentDirection = Number(
				clickedHeader.getAttribute('data-sort-direction')
			);
			if (isNaN(currentDirection) || Math.abs(currentDirection) !== 1)
				sortDirection = defaultSort;
			else sortDirection = -currentDirection;
		} else {
			const oldSort = header.querySelector('.active-sort');
			if (oldSort) oldSort.classList.remove('active-sort');
			clickedHeader.classList.add('active-sort');
			sortDirection = defaultSort;
		}
		clickedHeader.setAttribute('data-sort-direction', sortDirection);

		const sortIndex = clickedHeader.getAttribute('data-sort-index');

		const fn = (a, b) => {
			const [cellA, cellB] = [a, b].map((c) => {
				const cell = c.querySelector(`td[data-sort-index="${sortIndex}"]`);
				return {
					cell,
					value: cell ? Number(cell.getAttribute('data-value')) : null,
					eligible: cell
						? cell.getAttribute('data-sort-eligible') === 'true'
						: false,
				};
			});

			if (cellA.eligible && !cellB.eligible) return -1;
			else if (cellB.eligible && !cellA.eligible) return 1;
			//rows are either both eligible or both ineligible
			if (cellA.value === null && cellB.value === null) return 0;
			else if (cellA.value === null) return 1;
			else if (cellB.value === null) return -1;
			//neither row has a null value
			if (isNaN(cellA.value) && isNaN(cellB.value)) return 0;
			else if (isNaN(cellA.value)) return 1;
			else if (isNaN(cellB.value)) return -1;
			const order = sortDirection * (cellA.value - cellB.value);
			return order;
		};
		rows.sort(fn);
		rows.forEach((r, i) => {
			table.appendChild(r);
			const rankCell = rows[i].querySelector('.rank-cell');
			if (rankCell) rankCell.innerHTML = i + 1;
		});
		summaryRows.forEach((sr) => {
			table.appendChild(sr);
		});
		const totalCell = table.querySelector('.total-header');
		if (totalCell) {
			totalCell.classList.remove('total-header');
			totalCell.classList.add('blank-cell');
			const allRows = getElementArray(table, 'tr');
			const firstTotalRow = allRows.findIndex((r) =>
				r.classList.contains('include-total')
			);
			if (firstTotalRow >= 1) {
				const r = allRows[firstTotalRow - 1];
				const bc = r.querySelector('.blank-cell');
				bc.classList.remove('blank-cell');
				bc.classList.add('total-header');
			}
		}
	};

	//remove all existing summary columns
	getElementArray(header, 'th.summary-header').forEach((el) => el.remove());

	//set the values in each cell
	let rows = getElementArray(table, 'tr.standings-row');
	rows.forEach((r) => {
		const cells = getElementArray(r, '.result-cell');
		cells.forEach((c) => {
			formatCell(c);
		});
	});

	const firstHeader = header.querySelector('.result-header');
	const reduceFunction = (op) => {
		return (p, c) => {
			if (!c) return p;
			const dataStr = c.getAttribute('data');
			if (dataStr) {
				const data = JSON.parse(dataStr);
				return op.summaryFunction(p, data);
			}
			return op.summaryFunction(p, null);
		};
	};

	const resultCells = getElementArray(table, 'tr.standings-row').map((r) => {
		return getElementArray(r, 'td.result-cell');
	});
	if (resultCells.length > 0) {
		//for each row operator, make a total cell
		// if (rowOperators?.length > 0) {
		// 	const newRow = createElement('tr.summary-row');
		// 	const firstCell = createElement('td.summary-title');
		// 	firstCell.setAttribute('colspan', 2);
		// 	firstCell.innerHTML = 'Totals';
		// 	newRow.appendChild(firstCell);
		// 	newRow.appendChild(createElement('td.blank-header'));
		// 	table.appendChild(newRow);
		// }
		columnOperators.forEach((op) => {
			const allCells = [];
			if (!op) return;
			const obj = {};
			if (op.tooltip) {
				obj['bs-toggle'] = 'tooltip';
				obj['bs-html'] = 'true';
				obj['bs-placement'] = 'top';
				obj['bs-title'] = op.tooltip;
			}
			const newRow = createElement(
				`tr.summary-row${op.includeTotal ? '.include-total' : ''}`
			);
			const firstCell = createElement('td.summary-title', obj);
			firstCell.setAttribute('colspan', 2);
			firstCell.innerHTML = op.heading;
			if (op.tooltip) new bootstrap.Tooltip(firstCell);

			newRow.appendChild(firstCell);
			const secondCell = createElement('td.blank-header');
			secondCell.setAttribute(
				'colspan',
				rowOperators.length + (customStats ? customStats.length : 0) + 1
			);
			newRow.appendChild(secondCell);
			for (var j = 0; j < resultCells[0].length; j++) {
				const cells = resultCells.map((r) => {
					if (r.length > j) return r[j];
					return null;
				});
				cells.forEach((c) => allCells.push(c));
				const value = cells.reduce(reduceFunction(op), op.startingValue || 0);
				const finalValue = op.finalFunction ? op.finalFunction(value) : value;
				const summaryCell = createElement('td.summary-cell');
				if (finalValue !== null)
					summaryCell.setAttribute('data-value', finalValue);
				summaryCell.innerHTML = op.displayValue
					? op.displayValue(value)
					: finalValue === null
					? 'N/A'
					: finalValue;
				if (op.finally) {
					if (op.finally.length === 1) op.finally(summaryCell);
					else if (op.finally.length === 2) op.finally(summaryCell, j);
				}
				newRow.appendChild(summaryCell);
			}
			if (op.includeTotal) {
				const value = allCells.reduce(
					reduceFunction(op),
					op.startingValue || 0
				);
				const finalValue = op.finalFunction ? op.finalFunction(value) : value;
				const totalCell = createElement('td.total-cell');
				if (finalValue !== null)
					totalCell.setAttribute('data-value', finalValue);
				totalCell.innerHTML = op.displayValue
					? op.displayValue(value)
					: finalValue === null
					? 'N/A'
					: finalValue;
				if (op.finally && op.finally.length === 1) op.finally(totalCell);
				newRow.appendChild(totalCell);
			}
			table.appendChild(newRow);
		});
		//create the totals column
		const rows = getElementArray(table, 'tr');
		const firstTotalRow = rows.findIndex((r) =>
			r.classList.contains('include-total')
		);
		//put the total header above where the first total is
		if (firstTotalRow >= 1) {
			rows.forEach((r, i) => {
				let newCell;
				if (i === 0) console.log(r);
				if (i !== firstTotalRow - 1) {
					if (!r.classList.contains('include-total'))
						newCell = createElement('td.blank-cell');
				} else newCell = createElement('td.total-header.fw-semibold');
				if (newCell) r.appendChild(newCell);
			});
		}
	}
	let sortIndex = 0;
	rowOperators.forEach((op, i) => {
		if (!op) return;
		//add a header column at the beginning if it's a summarizing function
		if (op.heading) {
			const obj = {};
			if (op.sortable) {
				obj['sort-index'] = i;
				obj['default-sort'] = op.defaultSort === -1 ? -1 : 1;
			}
			if (op.tooltip) {
				obj['bs-toggle'] = 'tooltip';
				obj['bs-html'] = 'true';
				obj['bs-placement'] = 'top';
				obj['bs-title'] = op.tooltip;
			}
			const newHeader = createElement('th.rotate.summary-header', obj);
			const cc = createElement('.cell-container');
			cc.innerHTML = op.heading;
			newHeader.appendChild(cc);

			if (op.sortable) newHeader.addEventListener('click', sortTable);
			if (op.tooltip) new bootstrap.Tooltip(newHeader);

			header.insertBefore(newHeader, firstHeader);

			rows.forEach((r) => {
				const firstCell = r.querySelector('.result-cell');
				const cells = getElementArray(r, '.result-cell');
				const value = cells.reduce(reduceFunction(op), op.startingValue || 0);
				//final value - the value for sorting purposes (Will be parsed as a number)
				const finalValue = op.finalFunction ? op.finalFunction(value) : value;
				const summaryCell = createElement('td.summary-cell');
				if (finalValue !== null)
					summaryCell.setAttribute('data-value', finalValue);
				// displayValue - a function to display the final value as a string
				// (e.g. if we want a + sign, or some other way of displaying it)
				//if omitted
				summaryCell.innerHTML = op.displayValue
					? op.displayValue(value)
					: finalValue === null
					? 'N/A'
					: finalValue;
				if (op.sortable) summaryCell.setAttribute('data-sort-index', i);

				if (op.sortEligible)
					summaryCell.setAttribute(
						'data-sort-eligible',
						op.sortEligible(value)
					);
				else summaryCell.setAttribute('data-sort-eligible', 'true');
				if (op.finally) {
					if (op.finally.length === 1) op.finally(summaryCell);
					else if (op.finally.length === 2) op.finally(summaryCell, j);
				}
				r.insertBefore(summaryCell, firstCell);
			});
			if (op.sortable) sortIndex++;

			if (op.initialSort && customStats?.every((cs) => !cs.defaultSort))
				sortTable({ target: newHeader });
		}
	});

	if (customStats) {
		const firstHeader = header.querySelector('.result-header');
		customStats.forEach((cs, ind) => {
			// console.log(cs);
			const newHeader = createElement({
				selector: `th.rotate.summary-header`,
				attributes: {
					'sort-index': sortIndex,
					'default-sort': cs.sortOrder,
					'bs-toggle': 'tooltip',
					'bs-html': true,
					'bs-placement': 'top',
					'bs-title': cs.description.replace('\n', '<br>'),
				},
				children: [{ selector: '.cell-container', innerHTML: cs.heading }],
			});

			header.insertBefore(newHeader, firstHeader);
			newHeader.addEventListener('click', sortTable);
			new bootstrap.Tooltip(newHeader);
			rows.forEach((r) => {
				const firstCell = r.querySelector('.result-cell');
				const cells = getElementArray(r, '.result-cell');
				const data = cells
					.map((c) => {
						const dataStr = c.getAttribute('data');
						if (!dataStr) return null;
						return JSON.parse(dataStr);
					})
					.filter((d) => d !== null);
				// console.log(data);
				let filteredData = [...data];
				if (!cs.allowFillIn)
					filteredData = filteredData.filter((d) => !d.fillIn);
				const initialLength = filteredData.length;
				let requiredLength = 0;
				if (cs.filters && Array.isArray(cs.filters)) {
					for (var i = cs.filters.length - 1; i >= 0; i--) {
						// console.log(cs.filters[i]);
						const filter = cs.filters[i];
						if (filter.sortFunction) filteredData.sort(filter.sortFunction);
						if (filter.filter.type === 'keep')
							requiredLength = Math.max(
								requiredLength,
								Math.abs(filter.filter.keepValue)
							);
					}
					cs.filters.forEach((f, i) => {
						// console.log(f);
						filteredData = f.filterFunction(
							filteredData,
							i === cs.filters.length - 1
						);
					});
				}
				let result = cs.evaluator.evaluate(filteredData);

				// console.log(r);
				// console.log(filteredData);
				// console.log(result);
				if (result !== null) {
					//if we format as a percent, multiply by 100 now
					if (cs.format === 'percent') result = result * 100;
					//round to the correct number of decimal places
					if (cs.decimalPlaces) {
						result = result.toFixed(cs.decimalPlaces);
					} else result = Math.round(result);
				}
				//put a percent sign at the end if formatting as percent
				const cell = createElement({
					selector: 'td.summary-cell',
					attributes: {
						value: result,
						'sort-index': sortIndex,
						'sort-eligible': initialLength >= requiredLength,
					},
				});
				cell.innerHTML =
					result === null
						? 'N/A'
						: `${result}${cs.format === 'percent' ? '%' : ''}${
								initialLength >= requiredLength ? '' : '*'
						  }`;
				r.insertBefore(cell, firstCell);
			});
			sortIndex++;
			if (cs.defaultSort) sortTable({ target: newHeader });
		});
	}
};
