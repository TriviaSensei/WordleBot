const express = require('express');
const rateLimit = require('express-rate-limit');
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

//admin page - only failed login attempts count toward the limit
const adminLoginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 10,
	skipSuccessfulRequests: true,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		status: 'fail',
		message: 'Too many login attempts. Try again in 15 minutes.',
	},
});
router.get('/admin', viewController.getAdmin);
router.post('/admin/login', adminLoginLimiter, viewController.adminLogin);
router.post('/admin/logout', viewController.adminLogout);
router
	.route('/admin/broadcast')
	.get(viewController.protectAdmin, viewController.getBroadcastStatus)
	.post(viewController.protectAdmin, viewController.sendBroadcast);
// router.get('/test', viewController.getTest);
module.exports = router;
