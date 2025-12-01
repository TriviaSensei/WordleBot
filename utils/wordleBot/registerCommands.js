const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');
const dotenv = require('dotenv');
const gameList = require('../../utils/gameList');
dotenv.config({ path: '../../config.env' });

const commands = [
	{
		name: 'sethome',
		description: 'Sets the home channel for WordleBot. Admins only.',
	},
	{
		name: 'setgames',
		description: 'Set the list of games played by this server. Admins only.',
	},
	{
		name: 'settings',
		description:
			'Change game settings for scoring on this server. Admins only.',
	},
	{
		name: 'i',
		description: 'Get a link to my personal stats page',
	},
	{
		name: 'we',
		description: "Get a link to this server's stats page",
	},
	{
		name: 'addme',
		description: 'Tell WordleBot that I am part of this server.',
	},
	{
		name: 'myservers',
		description:
			'Get a list of the servers that WordleBot knows that I am a part of',
	},
	{
		name: 'docs',
		description: 'Get a link to WordleBot documentation',
	},
	{
		name: 'faq',
		description: "Get a link to this bot's FAQ page",
	},
	{
		name: 'xpost',
		description:
			'Set whether to crosspost to your results to other servers when you paste results',
	},
	{
		name: 'delete',
		description: 'Delete one or more posted results. Admins only.',
	},
];

const rest = new REST({ version: '10' }).setToken(process.env.WORDLE_BOT_TOKEN);

(async () => {
	try {
		const result = await rest.put(
			Routes.applicationCommands(process.env.WORDLE_BOT_ID),
			{
				body: commands,
			}
		);
		console.log('Slash commands were registered');
	} catch (err) {
		console.log(`Error: ${err}`);
	}
})();
