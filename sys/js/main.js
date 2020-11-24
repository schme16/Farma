let m 
angular.module('farma', [])

/*The master controller*/
.controller('master', ($scope, $sce, $compile) => {
	m = $scope
	
	//Mark the game as still loading
	m.$root.loading = true

	//Load the database
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
		m.game = m.game || {
			config: {
				type: Phaser.AUTO,
				mode: Phaser.Scale.NONE,
				backgroundColor: 0x613b03,
				parent: $('<div>')[0],
				tileSize: 32,
				sizeInTiles: 17,
				autoCenter: Phaser.Scale.CENTER_BOTH,
				scene: {
					preload: function () {m.enginePreload(this)}, //Needs to be in the in `function () {}` notation, something about contexts... 
					create:  function () {m.engineCreate(this)}, //Needs to be in the in `function () {}` notation, something about contexts...
					update:  function () {m.engineUpdate(this)} //Needs to be in the in `function () {}` notation, something about contexts...
				}
			},
			clearList:[],
			layers: {},
			state: {
				gardenSize: 9,
				plants: {}
			}
		}
		
		//Set the width and height
		m.game.config.width = m.game.config.sizeInTiles * m.game.config.tileSize
		m.game.config.height = m.game.config.sizeInTiles * m.game.config.tileSize
		
	}
	
	//Creates a new game
	m.newGame = (callback) => {
		if (!m.$root.transitioning) {
			m.newGameState()

			m.setPage('game', null, () => {
				requestAnimationFrame(() => {
					m.initializeEngine()
					if (callback) callback()
				})

			})
		}
	}
	
	//Save game state into a file
	m.saveGame = (filename, rawState, rev) => {

		//Sanitize the state
		let state = rawState
		for (let i in state.plants) {
			delete state.plants[i].tile
		}
		
		//Truncate the filename at 32
		filename = filename.substr(0,32)
		
		//Save it to the database
		m.database.put({
			_id: filename,
			_rev: rev || null,
			state: state,
			timestamp: new Date().getTime()
		}, {force: true}).then(function (response) {
			// handle response
		}).catch(function (err) {
			
			//Was there an overwrite conflict?
			if (err.status === 409 && !rev) {
				
				//Load the _rev, and try again
				m.loadGame(filename, (doc) => {
					m.saveGame(filename, state, doc._rev)
				}, true)
			}
		})
	}
	
	//Load a file into the game state
	m.loadGame = (filename, callback, handbackOnly) => {
			
		//Truncate the filename at 32
		filename = filename.substr(0,32)

		//Fetch teh record
		m.database.get(filename).then(function (response) {
			
			//Are we actually loading the game?
			if (!handbackOnly) {
				//Clear the current game, if any
				m.clearGame()
								
				//Load the saved state
				m.game.state = response.state
				
				//Re-initialize the garden
				m.setUpGarden(m.game._t)
				
				//Add the plant sprite for each plant
				for (let i in m.game.state.plants) {
					let plant = m.game.state.plants[i],
						pos = m.fromPosStr(i)
					m.sowPlant(plant.plantType, pos.x, pos.y, true, true)
				}
				
			}
			
			//Just hand the entry back
			else {
				callback(response)
			}
			
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
			
				
		for (let y = 0; y < m.game.state.gardenSize; y++) {
			for (let x = 0; x < m.game.state.gardenSize; x++) {

				m.game.layers.grid.putTileAt(9, x, y)

				//Handle the corners
			
				//Top left corner
				if (y == 0 && x == 0) {
		            m.game.layers.borders.putTileAt(0, x, y)
				}
				
				//Top right corner
				else if (y == 0 && x == m.game.state.gardenSize - 1) {
		            m.game.layers.borders.putTileAt(2, x, y)
				}
				
				//Bottom left corner
				else if (y == m.game.state.gardenSize - 1 && x == 0) {
		            m.game.layers.borders.putTileAt(6, x, y)
				}
				
				//Bottom right corner
				else if (y == m.game.state.gardenSize - 1 && x == m.game.state.gardenSize - 1) {
		            m.game.layers.borders.putTileAt(8, x, y)
				}
				
				//Normal grid cells 
				else {
					
					//TODO: make middle bottom grid
					
					if (x == m.game.state.gardenSize - 1 ) {
						m.game.layers.grid.putTileAt(11, x, y)
					}
					else if (y == m.game.state.gardenSize - 1) {
						m.game.layers.grid.putTileAt(10, x, y)
					}
				
				}
			}
			
		}
	}
	
	//Hands back an array of x-y notations of valid cells
	m.returnValidFarmCells = (X, Y, maxX, maxY) => {
		let validCells = []
		for (let y = 0; y < m.game.state.gardenSize; y++) {
			for (let x = 0; x < m.game.state.gardenSize; x++) {
				validCells.push(m.toPosStr(x, y))
			}
		}
		
		m.game.validCells = validCells
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
	m.sowPlant = (plantType, x, y, force, spriteOnly) => {
		//Get the position string, and the cell
		let posStr = m.toPosStr(x, y),
			cell = m.game.state.plants[posStr]
		
		//Check if the cell is valid (aka empty)
		if ((!cell || (!!cell && cell.isSoil)) || force) {
			let tile = m.game.layers.crops.putTileAt(plantType, x, y)
			
			//Make a state entry too?
			if (!spriteOnly) {
				//Set the cell to the new plant in the state
				m.game.state.plants[posStr] = {
					plantType: plantType,
					soilType: (cell && cell.isSoil ? cell.soilType : 'normal'),
					fertilizerType: (cell && cell.isSoil ? cell.fertilizerType : 'normal'),
					tile: tile, 
					timestamp: new Date().getTime()
				}
			}
			else {
				return tile
			}
		}
	}
	
	//Creates the layers, destroying old ones if need be
	m.createLayers = () => {
		if (m.game.layers.soils) m.game.layers.soils.destroy()
		m.game.layers.soils = m.game.map.createBlankDynamicLayer('soils', m.game.tiles.soils)
		
		if (m.game.layers.crops) m.game.layers.crops.destroy()
		m.game.layers.crops = m.game.map.createBlankDynamicLayer('crops', m.game.tiles.crops)
		
		m.createBorders()
	}

	//Creates layers, and sets camera position
	m.setUpGarden = (t) => {
		
		//Register the layers
		m.createLayers()
		
		//Create the valid cells, and garden bed
		m.returnValidFarmCells()
		
		//Calculate the center position of the garden for the camera
		m.game.cameraPos = {
	    	x: (m.game.config.width/2) - ((m.game.state.gardenSize/2) * m.game.config.tileSize),
			y: (m.game.config.height/2) - ((m.game.state.gardenSize/2 * m.game.config.tileSize))
		}
		
		//Set the camera position
		t.cameras.main.setPosition(m.game.cameraPos.x, m.game.cameraPos.y)
	}
	
	//This is where things like determining growth and so forth are.
	m.updatePlants = () => {
		for (let i in m.game.state.plants) {
			let plant = m.game.state.plants[i]
			
		}
	}
	
	//Creates the game engine (Phaser currently)
	m.initializeEngine = () => {
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
	    m.game.map = t.make.tilemap({
			x: 0,
			y: 0,
			width: 32,
			height: 32,
			tileWidth: m.game.config.tileSize,
			tileHeight: m.game.config.tileSize
	    })
		

		//Register the tilesets
		m.game.tiles = {
			borders: m.game.map.addTilesetImage('borders', 'borders', 32, 32),
			soils: m.game.map.addTilesetImage('soils', 'soils', 32, 32),
			crops: m.game.map.addTilesetImage('crops', 'crops', 32, 32)
		}
		
		m.game.canvas.on('mousemove', (e) => {
			let offset = m.game.canvas.offset(),
				x = (e.clientX - offset.left) - m.game.cameraPos.x,
				y = (e.clientY - offset.top) - m.game.cameraPos.y,
				
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
		
		m.setUpGarden(t)
		
	}
		
	//The main game loop, should probably just use this to call other loop funcs... dunno
	m.engineUpdate = (t) => {
		m.game._t = t
		
		//Does the map exist?
		if (m.game.map) {
			
			
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
			
			//The plants stuff
				m.updatePlants()
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