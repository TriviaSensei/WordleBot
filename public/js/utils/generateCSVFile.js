import { getElementArray } from './getElementArray.js';
const monthSelect = document.querySelector('#month-select');
const gid = (
	document.querySelector('#guild-id') || document.querySelector('#user-id')
)?.value;

export const generateCSVFile = (game, columnData) => {
	const pane = document.querySelector(
		`.tab-pane.fade.active.show[data-game="${game}"]`
	);
	if (!pane) return;

	const rows = getElementArray(pane, '.standings-row');

	let csvContent = 'data:text;charset=utf-8,\uFEFF';
	csvContent += 'Name,ID,' + columnData.map((cd) => cd.name).join(',') + '\n';

	rows.forEach((r) => {
		const nc = r.querySelector('.name-cell > a');
		const name = nc?.innerHTML || '[Unknown name]';
		const pid = r.getAttribute('data-id') || '';

		const cells = getElementArray(r, '.result-cell[data]');
		cells.forEach((c) => {
			let toAdd = `${name},${pid},`;
			const data = JSON.parse(c.getAttribute('data'));
			if (!data) return;
			columnData.forEach((cd, i) => {
				if (cd.header) {
					const dt = cd.calc(c);
					toAdd += `${dt}${i === columnData.length - 1 ? '' : ','}`;
				} else
					toAdd += `${cd.calc(data)}${i === columnData.length - 1 ? '' : ','}`;
			});
			csvContent += `${toAdd}\n`;
		});
	});

	const encoded = encodeURI(csvContent);
	const dlAnchorElem = document.createElement('a');
	dlAnchorElem.setAttribute('href', encoded);
	const arr = monthSelect.value.split('-');
	if (arr.length > 1 && arr[1].trim().length === 1)
		arr[1] = `0${arr[1].trim()}`;
	dlAnchorElem.setAttribute('download', `${gid}_${arr.join('-')}_${game}.csv`);
	dlAnchorElem.click();
	dlAnchorElem.remove();
};
