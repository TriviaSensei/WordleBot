export const getPage = () => {
	const url = location.href.split('/').filter((t) => t !== '');
	if (url.length < 2) return;

	const page = url.find((str, i) => {
		return str.toLowerCase() === 'server' || str.toLowerCase() === 'player';
	});
	return page;
};
