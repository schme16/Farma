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
				
				requestAnimationFrame(() => {
					
					if (mid) mid()
					
					pageEl.velocity('transition.flipXIn', {duration: duration, complete: () => {
						m.$root.transitioning = false
						m.$applyAsync()
						if (post) post()
					}})
				})
			}})
		}
	}
	
	//Creates a blank game state, used for new games, and while loading game states
	m.newGameState = () => {
		m.game = {
			state: {
				gardenSize: 3,
				plants: {}
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
		
		//Truncate the filename at 32
		filename = filename.substr(0,32)
		m.database.put({
			_id: filename,
			state: state,
			timestamp: new Date().getTime()
		}).then(function (response) {
			// handle response
		}).catch(function (err) {
			console.log(err);
		})
	}
	
	//Load a file into the game state
	m.loadGame = (filename) => {
			
		//Truncate the filename at 32
		filename = filename.substr(0,32)
		console.log(filename)
		m.database.get(filename).then(function (response) {
			m.newGameState()
			m.game.state = response.state
		}).catch(function (err) {
			console.log(err);
		})
		
	}
	
	//Used to force the game state to match the given data - used for loading games
	m.setGameState = (state) => {
		//TODO: Use this to set all permanent serializable items - usually for loading		
	}
	
	//Returns the current game state - used for saving games
	m.getGameState = () => {
		//TODO: Use this to get all permanent serializable items - usually for saving
	}
	
	//Creates the grids and borders for the planting patch
	m.createBorders = () => {
		
		//Destroy the layers (if they exist), then remake them 
		if (m.game.layers.grid) m.game.layers.grid.destroy()
		m.game.layers.grid = m.game.map.createBlankDynamicLayer('grid', m.game.tiles.borders)
		
		if (m.game.layers.borders) m.game.layers.borders.destroy()
		m.game.layers.borders = m.game.map.createBlankDynamicLayer('borders', m.game.tiles.borders)
		
		//Set the top left of the garden bed, and save that to the game object
		m.game.state.gardenPos = m.game.map.worldToTileXY((m.game.config.width / 2) - (m.game.state.gardenSize / 2), (m.game.config.height / 2) - (m.game.state.gardenSize / 2))
		m.game.state.gardenPos.x = m.game.state.gardenPos.x - 1
		m.game.state.gardenPos.y = m.game.state.gardenPos.y - 1
		let maxPosX = m.game.state.gardenPos.x + m.game.state.gardenSize,
			maxPosY = m.game.state.gardenPos.y + m.game.state.gardenSize
		
		
		
		
		
		m.game.validCells = m.returnValidFarmCells(m.game.state.gardenPos.x, m.game.state.gardenPos.y, maxPosX, maxPosY)
		
		for (let y = m.game.state.gardenPos.y; y < maxPosY; y++) {
			for (let x = m.game.state.gardenPos.x; x < maxPosX; x++) {
				

				
				
				//Add the top left corner grid tile
				m.game.layers.grid.putTileAt(9, x, y)

				//Handle the corners
				
				//Top left corner
				if (y == m.game.state.gardenPos.y && x == m.game.state.gardenPos.x) {
		            m.game.layers.borders.putTileAt(0, x, y)
				}
				
				//Top right corner
				else if (y == m.game.state.gardenPos.y && x == maxPosX-1) {
		            m.game.layers.borders.putTileAt(2, x, y)
				}
				
				//Bottom left corner
				else if (y == maxPosY - 1 && x == m.game.state.gardenPos.x) {
		            m.game.layers.borders.putTileAt(6, x, y)
				}
				
				//Bottom right corner
				else if (y == maxPosY - 1 && x == maxPosX-1) {
		            m.game.layers.borders.putTileAt(8, x, y)
					m.game.layers.grid.putTileAt(4, x, y)
				}
				
				//Normal grid cells 
				else {
					
					//Add the remaining grid bits
					if (x == maxPosX - 1 || y == maxPosY - 1) {
						m.game.layers.grid.putTileAt(10, x, y)
					}
				}
			}
			
		}
	}
	
	//Hands back an array of x-y notations of valid cells
	m.returnValidFarmCells = (X, Y, maxX, maxY) => {
		let validCells = []
		for (let y = Y; y < maxY; y++) {
			for (let x = X; x < maxX; x++) {
				validCells.push(m.toPosStr(x, y))
			}
		}
		
		return validCells
	}
	
	//return the name string for a position
	m.toPosStr = (x, y) => {
		return `(${x}-${y})`
	}
	
	//Return the x and y for a name string position
	m.fromPosStr = (str) => {
		let raw = str.substr(1, str.length - 2).split('-'),
			pos = {
				x: parseInt(raw[0]),
				y: parseInt(raw[1]),
			}
		
		return pos
	}
	
	//Plants a plant in a cell, if the cell is free / forced
	m.sowPlant = (plantType, x, y, force) => {
		
		//Get the position string, and the cell
		let posStr = m.toPosStr(x, y),
			cell = m.game.state.plants[posStr]
		
		//Check if the cell is valid (aka empty)
		if ((!cell || cell.isSoil) || force) {
			//Set the cell to the new plant in the state
			m.game.state.plants[posStr] = {
				plantType: plantType,
				soilType: (cell.isSoil ? cell.soilType || 'normal')
				tile: m.game.layers.crops.putTileAt(plantType, x, y),
				timestamp: new Date().getTime()
			}
			
			
		}
	}
	
	//Creates the game engine (Phaser currently)
	m.initializeEngine = () => {
		m.game.config = {
			type: Phaser.AUTO,
			mode: Phaser.Scale.NONE,
			backgroundColor: 0x613b03,
			parent: $('<div>')[0],
			tileSize: 32,
			autoCenter: Phaser.Scale.CENTER_BOTH,
			scene: {
				preload: function () {m.enginePreload(this)}, //Needs to be in the in `function () {}` notation, something about contexts... 
				create:  function () {m.engineCreate(this)}, //Needs to be in the in `function () {}` notation, something about contexts...
				update:  function () {m.engineUpdate(this)} //Needs to be in the in `function () {}` notation, something about contexts...
			}
		}
		
		//Set the width and height
		m.game.config.width = ((16 + 1) * m.game.config.tileSize)
		m.game.config.height = ((10 + 1) * m.game.config.tileSize)
		
		//Create the engine
		m.game.engine = new Phaser.Game(m.game.config)
		
		//Assign it to the game variable
		m.game.canvas = $(m.game.engine.canvas)
		
		//Append it to the DOM 
		m.game.canvas.appendTo('.game')

		

	}
	
	//Handles preloading assets
	m.enginePreload = (t) => {
		t.load.image('grid', 'sys/img/grid-cell.png');
		//t.load.image('soils', 'sys/img/soils.png');
		t.load.image('crops', 'sys/img/crops.png');
		t.load.image('borders', 'sys/img/border-tiles.png');
	}
	
	//Handle creating some objects, after they've loaded
	m.engineCreate = (t) => {
		//Make the map
	    m.game.map = t.make.tilemap({ width: m.game.config.width, height: m.game.config.height, tileWidth: m.game.config.tileSize, tileHeight: m.game.config.tileSize })
		

		//Register the tilesets
		m.game.tiles = {
			borders: m.game.map.addTilesetImage('borders', 'borders', 32, 32),
			soils: m.game.map.addTilesetImage('soils', 'soils', 32, 32),
			crops: m.game.map.addTilesetImage('crops', 'crops', 32, 32)
		}
		
		m.game.canvas.on('mousemove', (e) => {
			let offset = m.game.canvas.offset(),
				x = e.clientX - offset.left,
				y = e.clientY - offset.top,
				
				// Rounds down to nearest tile
				pointerTileX = m.game.map.worldToTileX(x),
				pointerTileY = m.game.map.worldToTileY(y)
			
			m.game.mouse = {
				x: x,
				y: y,
				tileX: pointerTileX,
				tileY: pointerTileY,
			}
		})
		
		$(m.game.engine.canvas).on('click', (e) => {
			m.game.mouse.clicked = true
		})
		
		//Register the layers
		m.game.layers = {}
		
		//Create the borders
		m.createBorders()
		
		
		m.game.layers.soils = m.game.map.createBlankDynamicLayer('soils', m.game.tiles.soils),
		m.game.layers.crops = m.game.map.createBlankDynamicLayer('crops', m.game.tiles.crops)
		
	}
		
	//The main game loop, should probably just use this to call other loop funcs... dunno
	m.engineUpdate = (t) => {
		
		//All the mouse stuff
		if (m.game.mouse) {
			
			//Cell checks
			let posStr = m.toPosStr(m.game.mouse.tileX, m.game.mouse.tileY),
				validCell = m.game.validCells.indexOf(posStr) > -1
			
			//Was the mouse clicked?
			if (m.game.mouse.clicked) {
				
				//Is this a valid location?
				if (validCell) {				
					m.sowPlant(32, m.game.mouse.tileX, m.game.mouse.tileY)
				}
				
				//Clear the clicked state
				m.game.mouse.clicked = false
			}
			
			if (validCell) {
				m.game.engine.scene.scenes[0].input.setDefaultCursor('pointer');
			}
			else {
				m.game.engine.scene.scenes[0].input.setDefaultCursor('default');
			}
		
		}

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