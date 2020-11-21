let m 
angular.module('farma', [])

/*The master controller*/
.controller('master', ($scope, $sce, $compile) => {
	m = $scope
	
	//Mark the game as still loading
	m.$root.loading = true

	m.database = new PouchDB('saves')
	
	//Get the hash query as of page load.
	m.query = Qs.parse(location.hash.replace('#!#', '').replace('#', ''))
	
	//Set the page as per the query, or failing that, just load the menu
	m.$root.page = m.query.page || 'loading'

	//Initialize the app
	m.init = () => {
		m.$root.loading = false
		m.setPage('main-menu')
	}
	
	//Handles all the guff related to transitioning the old page into the new one
	m.setPage = (page, pre, mid, post) => {
		if (!m.$root.transitioning) {
			let pageEl = $('.page'),
				duration = m.$root.page == page ? 0 : 600
			
			m.$root.transitioning = true
			m.$applyAsync()
			if (pre) pre()
			
			pageEl.velocity('transition.flipXOut', {duration: duration, complete: () => {
				m.$root.page = page
				m.$applyAsync()
				if (mid) mid()
				
				pageEl.velocity('transition.flipXIn', {duration: duration, complete: () => {
					m.$root.transitioning = false
					m.$applyAsync()
					if (post) post()
				}})
			}})
		}
	}
	
	//Creates a blank game state, used for new games, and while loading game states
	m.newGameState = () => {
		m.game = {
			state: {
			
			}
		}
		
	}
	
	//Creates a new game
	m.newGame = () => {
		m.newGameState()
		m.setPage('game', null, ()=> {
			requestAnimationFrame(() => {
				m.initializeEngine()
			})
			
		})
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
		m.game.config = {
			type: Phaser.AUTO,
			parent: $('<div>')[0],
			autoCenter: Phaser.Scale.CENTER_BOTH,
			width: 800,
			height: 600,
			scene: {
				preload: m.enginePreload,
				create: m.engineCreate,
				update: m.engineUpdate
			}
		}
		
		m.game.engine = new Phaser.Game(m.game.config)
		$(m.game.engine.renderer.canvas).appendTo('.game')

		

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
	
/*Directives*/
	
/*Turns off the ng-scope, et al. debug classes*/
.config(['$compileProvider', function ($compileProvider) {
	$compileProvider.debugInfoEnabled(false);
}])

/*.directive('test', function () {
	return {
		restrict: 'E',
		scope: true,
		//templateUrl: '',
		//transclude: true,
		link: function (scope, element, attrs) {
		}
	}
})*/