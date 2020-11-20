angular.module('farma', [])

/*The master controller*/
.controller('master', ($scope, $sce, $compile) => {
	let m = $scope
	m.query = Qs.parse(location.search.substr(1))
	
	m.$root.page = m.query.page || 'menu'
	
	//Creates a blank game state, used for new games, and while loading game states
	m.newGameState = () => {
		//TODO: Create the game state structure
	}
	
	//Creates a new game
	m.newGame = () => {
		
	}
	
	//Save game state into a file
	m.saveGame = (filename, state) => {
		//TODO: Decide how to and where to save this. PouchDB looks good
	}
	
	//Load a file into the game state
	m.loadGame = (filename) => {
		//TODO: See save and match
	}
	
	//Used to force the game state to match the given data - used for loading games
	m.setGameState = (state) => {
		//TODO: Use this to set all permanent serializable items - usually for loading		
	}
	
	//Returns the current game state - used for saving games
	m.getGameState = () => {
		//TODO: Use this to get all permanent serializable items - usually for saving
	}
	
	//Creates the game engine (Phaser currently)
	m.initializeEngine = () => {
		m.game = {}
		m.game.config = {
			type: Phaser.AUTO,
			width: 800,
			height: 600,
			scene: {
				preload: m.enginePreload,
				create: m.engineCreate,
				update: m.engineUpdate
			}
		}
		
		m.game.engine = new Phaser.Game(config)

	}
	
	//Handles preloading assets
	m.enginePreload = () => {
	
	}
		
	//Handle creating some objects, after they've loaded
	m.engineCreate = () => {
	
	}
		
	//The main game look, should probably just use this to call other loop funcs... dunno
	m.engineUpdate = () => {
	
	}
	
})