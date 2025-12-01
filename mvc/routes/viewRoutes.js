const express = require('express');
const viewController = require('../controllers/viewController');
const wordleController = require('../controllers/wordleController');
const router = express.Router();

router.use(viewController.httpsRedirect);
router.get('/', viewController.getHome);
router.get('/docs/:scrollTo?', viewController.getDocs);
router.get('/faq', viewController.getWordle);
router.get('/servers', viewController.getServers);
router.get('/helper', viewController.getHelper);
router.get(
	'/settings/:token',
	wordleController.checkServerSettings,
	viewController.getSettingsPage
);
router.get(
	'/server/delete/:id/:editToken',
	wordleController.checkServerSettings,
	viewController.getWordleStats
);
router.get(
	'/server/:id/:year?/:month?',
	wordleController.checkServerSettings,
	viewController.getWordleStats
);

router.get('/player/:id/:year?/:month?', viewController.getWordleStats);
// router.get('/test', viewController.getTest);
module.exports = router;
