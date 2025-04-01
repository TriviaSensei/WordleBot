const express = require('express');
const wordleController = require('../controllers/wordleController');
const router = express.Router();

router.get('/puzzles/:date', wordleController.getWordlePuzzle);

router.get(
	'/servers/:id/:year/:mo',
	wordleController.checkServerSettings,
	wordleController.getServerData
);
router.get('/players/:id/:year/:mo', wordleController.getPlayerData);
router.patch(
	'/settings/:token',
	wordleController.checkServerSettings,
	wordleController.editServerSettings
);
module.exports = router;
