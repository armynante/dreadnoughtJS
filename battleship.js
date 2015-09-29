
process.stdin.resume();
process.stdin.setEncoding('utf8');
var Util = require('./util');

//COLOR STUFF////////////////////
var clc = require('cli-color');
var style = { "w": clc.blue("w"), "W": clc.yellowBright("W")};
var error = clc.red.bold;
var info = clc.cyanBright;

// Global game variables 
var over = false;
var won = null;
var round = 0;

function Salvo(player) {
    var _this = this;
    this.player = player;
    this.row = null;
    this.col = null;
    this.hit = false;

    this.fire = function(row,col) {
        _this.row = row;
        _this.col = col;
        _this.hit = game[_this.player].board.fire(row, col);
        _this.applyDamage();

    }

    this.fireBlind = function() {
        var validShips = game[_this.player].shipsLeft();
        var bestGuess = game[_this.player].board.calculateDensity(validShips);

        _this.row = bestGuess.row;
        _this.col = bestGuess.col;
        _this.hit = game[_this.player].board.fire(_this.row, _this.col);
        _this.applyDamage();
    }

    this.applyDamage = function() {
        if (_this.hit) {
            var shipClass = game[_this.player].board.state[_this.row][_this.col].shipClass;
            //check to see if the ship sunk;
            _this.sunk = game[_this.player].damage(shipClass);
        }
    }

}

function firingSolution(player) {
    var _this = this;
    this.player = player; // player is the target
    this.targetArea = [];
    this.lastHits = [];
    this.estimatedVector = null;
    this.lastShipSunk = null;

    //This function if for human consumption
    this.openFire = function(row,col) {
        round++;
        var salvo = new Salvo(_this.player);      
        salvo.fire(row,col);
    }


    //Only to be called by AI
    this.autoFire = function(r,c) {
        round++;
        var salvo = new Salvo(_this.player);

        //make sure there are ships left to hit 
        //i.e the game is not over
        if (!game[_this.player].shipStateInfo('sunk')) {
            if (_this.targetArea.length > 0) {
                var target = _this.targetArea.pop();
                salvo.fire(target.row,target.col);
            } else {
                salvo.fireBlind();
                if (salvo.hit) {
                   _this.targetArea = game[_this.player].board.surroundingTiles(salvo.row, salvo.col) 
                };
            }
        } else {
            // needed for ai vs ai battles
            won = _this.player;
            over = true;
        }
    }
}

function Board() {

    var _this = this;

    this.renderedBoard = [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        []
    ];
    this.state = [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        []
    ];

    this.availableTiles = {};

    this.buildBoard = function() {
        for (var r = 0; r < Util.belt.cols.split(" ").length; r++) {
            for (var c = 0; c < Util.belt.rows.split(" ").length; c++) {
                var tile = new Tile(r, c);
      
                _this.state[r][c] = tile;
                stringKey = r.toString() + c.toString()
                _this.availableTiles[stringKey] = tile;
            }
        }
        _this.state;
    };

    this.randomKey = function() {
        var result;
        var count = 0;
        for (var prop in _this.availableTiles) {
            if (Math.random() < 1 / ++count) {

                result = prop;
            }
        };
        return _this.availableTiles[result]
    }

    // visiblity allows diferent render states
    // 'VISIBLE' allows for board to shows ship class
    this.render = function(visibility) {

        for (var r = 0; r < _this.state.length; r++) {
            for (var c = 0; c < _this.state.length; c++) {
                var state = _this.state[r][c];
                _this.renderedBoard[r][c] = clc.blackBright("0")
                if (r % 2 === 0) {
                     _this.renderedBoard[r][c] = clc.blackBright("0") 
                }
                if (state.hit) {
                    _this.renderedBoard[r][c] = clc.redBright("!");
                }
                if (state.hit === false) {
                    _this.renderedBoard[r][c] = clc.magenta("X");
                }

                if (visibility === 'visible') {

                    state.vacant ? _this.renderedBoard[r][c] = clc.blackBright("0") : _this.renderedBoard[r][c] = clc.whiteBright(Util.ships[state.shipClass].callSign);
                    
                    if (state.hit) {
                        _this.renderedBoard[r][c] = clc.redBright("!");
                    }
                    if (state.hit === false) {
                        _this.renderedBoard[r][c] = clc.magenta("X");
                    }

                }


            }
        }
        _this.renderedBoard.splice(0, 0, Util.belt.cols.split(" "));

        for (var i = 0; i < _this.renderedBoard.length; i++) {
            _this.renderedBoard[i].splice(0, 0, Util.belt.spacers.split(" ")[i]);
        }

        for (var n = 0; n < _this.renderedBoard.length; n++) {
            var line = _this.renderedBoard[n].join("  ");
            if (n === 0) {
                console.log(clc.yellow(line));
            } else {
                var row = _this.renderedBoard[n].splice(0, 1);
                var rest = _this.renderedBoard[n].join("  ");

                console.log(clc.green(row[0]) + "  " + rest);
            }
        };
        _this.renderedBoard.splice(0, 1);
        console.log("\n");
    };

    // startRow and startCol are form input 
    // remember to add a 1;
    this.placeBoat = function(shipClass, orientation, startRow, startCol, live, densityTest) { //refactor 

        var validity = [];

        switch (orientation) {

            case "up":
                for (var i = 0; i < Util.ships[shipClass].width; i++) {

                    var row = startRow - i ;
                    var col = startCol;

                    if (densityTest) {
                      val = _this.densityTest(row, col, shipClass);
                    } else {
                      val = _this.runPlacements(row, col, live, shipClass);
                    }

                    validity.push(val);
                }
                break;
            case "down":
                for (var i = 0; i < Util.ships[shipClass].width; i++) {

                    var row = startRow + i;
                    var col = startCol;
                    
                    if (densityTest) {
                      val = _this.densityTest(row, col, shipClass);
                    } else {
                      val = _this.runPlacements(row, col, live, shipClass);
                    }

                    validity.push(val);
                }
                break;
            case "left":
                for (var i = 0; i < Util.ships[shipClass].width; i++) {
                    var row = startRow
                    var col = startCol - i;

            
                    if (densityTest) {
                      val = _this.densityTest(row, col, shipClass);
                    } else {
                      val = _this.runPlacements(row, col, live, shipClass);
                    }

                    validity.push(val);
                }
                break;
            case "right":
                for (var i = 0; i < Util.ships[shipClass].width; i++) {

                    var row = startRow;
                    var col = startCol + i;

                    if (densityTest) {
                      val = _this.densityTest(row, col, shipClass);
                    } else {
                      val = _this.runPlacements(row, col, live, shipClass);
                    }

                    validity.push(val);
                }
                break;

        }
        sum = validity.reduce(function(a, b) {
            return a + b;
        })
        return sum === 0;
    };

    // 1 is added to the index on row and col
    this.calculateDensity = function(shipsArray) {
        var orientations = ['up','down','left','right'];
        var highestDensity = 0;
        var bestGuess = null;
    
        for (var i = 0; i < _this.state.length; i++) {
          for (var c = 0; c < _this.state[i].length; c++) {
            _this.state[i][c].density = 0;
          };
        };

        for (var s = 0; s < shipsArray.length; s++) {
          for (var o = 0; o < orientations.length; o++) {
            for (var r = 0; r < _this.state.length; r++) {
              for (var c = 0; c < _this.state[r].length; c++) {
                valid = _this.placeBoat(shipsArray[s], orientations[o], r, c, false, true);

                if (valid) {
                  _this.state[r][c].density += 1;
                }
              };
            };
          };
        }
        //density is calculated by all ship locations that are open or hit
        for (var r = 0; r < _this.state.length; r++) {
            for (var c = 0; c < _this.state[r].length; c++) {
              if ( _this.state[r][c].density >= highestDensity && _this.state[r][c].hit === null) {
                highestDensity = _this.state[r][c].density;
                bestGuess = _this.state[r][c];
              };
            }
        }
        return bestGuess;
    }

    this.runPlacements = function(row, col, live, shipClass) {

        if (col >= 0 && row >= 0 && col <= 9 && row <= 9) {

            var position = _this.state[row][col];
            if (position.vacant) {
                if (live) {
                    _this.state[row][col].shipClass = shipClass;
                    _this.state[row][col].vacant = false;
                } else {
                    return 0;
                }
            } else {
                return 1;
            }
        } else {
            return 1;
        }
    };

    this.densityTest = function(row, col, shipClass) {

        if (col >= 0 && row >= 0 && col <= 9 && row <= 9) {

            var position = _this.state[row][col];
            if (position.hit === null || position.hit === true) {
              return 0
            } else {
                return 1;
            }
        } else {
            return 1;
        }
    };

    this.surroundingTiles = function(r, c) {
        var boxArray = [
            [0, 1],
            [0, -1],
            [1, 0],
            [-1, 0],
        ]
        var tiles = [];
        for (var i = 0; i < boxArray.length; i++) {
            var row = boxArray[i][0] + r;
            var col = boxArray[i][1] + c;

            if (col >= 0 && row >= 0 && col <= 9 && row <= 9 && _this.state[row][col].hit === null) {;
                tiles.push(_this.state[row][col]);
            };
        };
        return tiles;
    }

    this.fire = function(r, c) {
        tile = _this.state[r][c];
        if (!tile.vacant && tile.hit === null) {
            _this.state[r][c].hit = true;
            return true;
        }
        else {
            _this.state[r][c].hit = false;
            return false
        }
    }



    this.initialiaze = function() {
        _this.buildBoard();
    };
}

function Tile(r, c) {
    this.vacant = true;
    this.shipClass = null;
    this.hit = null;
    this.row = r;
    this.col = c;
    this.density = 0;
}

function Player(name) {
    this.name = name;
    this.placeState = [null];
    var _this = this;


    //       occupied = 0 
    //       empty = 1             
    // this is for a reduce function 
    // to see if all ships placed   

    this.shipState = [{
        type: "submarine",
        placed: 1,
        sunk: 1,
        hitCount: 0
    }, {
        type: "carrier",
        placed: 1,
        sunk: 1,
        hitCount: 0
    }, {
        type: "destroyer",
        placed: 1,
        sunk: 1,
        hitCount: 0
    }, {
        type: "battleship",
        placed: 1,
        sunk: 1,
        hitCount: 0
    }, {
        type: "patrolBoat",
        placed: 1,
        sunk: 1,
        hitCount: 0
    }];

    this.damage = function(shipClass) {
        for (var i = 0; i < _this.shipState.length; i++) {
            if (_this.shipState[i].type === shipClass) {
                _this.shipState[i].hitCount++;
                if (_this.shipState[i].hitCount === Util.ships[shipClass].width) {
                    _this.shipState[i].sunk = 0;
                    console.log("You sunk the " + shipClass + " !");
                    // //Check to see is the game has been won.
                    if ( _this.shipStateInfo('sunk')) {
                        _this.player
                        won = _this.name;
                        over = true;
                    };;
                    return true;
                };
            }
        }
        return false;
    }

    this.shipsLeft = function() {
      var ships = [];
      for (var i = 0; i < _this.shipState.length; i++) {
        if (_this.shipState[i].sunk === 1) {
          ships.push(_this.shipState[i].type);
        };
      };
      return ships;
    }

    this.shipStateInfo = function(key) {
        var reducedObj;
        switch (key) {
            case 'sunk':
                reducedObj = _this.shipState.reduce(function(a, b) {
                    return {
                        sunk: a[key] + b[key]
                    }; // sums the value of a + b (values next to each other) 
                });
                break;
            default:
                reducedObj = _this.shipState.reduce(function(a, b) {
                    return {
                        placed: a[key] + b[key]
                    }; // sums the value of a + b (values next to each other) 
                });
                break;
        }
        if (key === 'sunk') {
            console.log(key + ": " + reducedObj[key]);
        };
        return reducedObj[key] === 0;
    };

    this.board = new Board();
    this.patrolBoatLocation = []; // array of tile locations 
    this.carrierLocation = [];
    this.subLocation = [];
    this.destroyerLocation = [];
    this.battleshipLocation = [];

}


function Game() {
    var _this = this;
    this.player1 = new Player('AI');
    this.player2 = new Player('HUMAN');

    this.renderShipState = function() {
        //space to make text block even length
        var spaceLength = 12;
        console.log( clc.blackBright('__________STATUS_REPORT__________\n'));
        // both player have the same ships so we can loop though just one
        console.log( clc.blackBright('           Your Ships  Their Ships\n'))
        for (var i = 0; i < _this.player1.shipState.length; i++) {
            player1ship = _this.player1.shipState[i];
            AIship = _this.player2.shipState[i];
            state = player1ship.sunk === 0 ? clc.blueBright("SUNK     ") : clc.greenBright("IN ACTION");
            AIstate = AIship.sunk === 0 ? clc.blueBright("SUNK     ") : clc.yellowBright("UNKNOWN");
            var addedSpace = spaceLength - player1ship.type.length;
            shipName = player1ship.type;
            for (var b = 0; b < addedSpace; b++) {
                shipName = shipName + " ";
            }
            console.log(shipName + clc.blueBright(state) + clc.blackBright('  |  ') + AIstate);
        };
        console.log('\n');
    }

    this.setup = function() {
        _this.player1.board.initialiaze();
        _this.player2.board.initialiaze();
    };

    this.placeShipState = function(shipClass, row, col, orientation, player) {

        row = parseInt(row);
        col = parseInt(col);

        if (Util.ships[shipClass]) {

            valid = _this[player].board.placeBoat(shipClass, orientation, row, col, false, false);

            if (valid) {
                _this[player].board.placeBoat(shipClass, orientation, row , col, true, false);
                return true;

            } else {

            }

        } else {

        }
    };

}


var Render = {
    battleShip: "                                          # #  ( )\n" +
        "                                       ___#_#___|__\n" +
        "                                   _  |____________|  _\n" +
        "                            _=====| | |            | | |==== _\n" +
        "                      ===||.---------------------------. | |====\n" +
        "        <--------------------'   .  .  .  .  .  .  .  .   '--------------/\n" +
        "          \\                                                             /\n" +
        "           \\_______________________________________USS_BAD_ASS_________/\n" +
        "       wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww\n" +
        "     wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww\n" +
        "        wwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwww\n",
    introText: "  ___   _ _____ _____ _    ___ ___ _  _ ___ ___ \n" +
        " | _ ) /_\\_   _|_   _| |  | __/ __| || |_ _| _ \\ \n" +
        " | _ \\/ _ \\| |   | | | |__| _|\\__ \\ __ || ||  _/\n" +
        " |___/_/ \\_\\_|   |_| |____|___|___/_||_|___|_|  \n"


};



process.stdout.write(clc.art(Render.battleShip, style));
console.log(clc.red(Render.introText));


game = new Game();
game.setup();
autoPlaceBoard('player1')
autoPlaceBoard('player2')
enemyFs = new firingSolution('player1'); //solution is for the target not player
playerFs = new firingSolution('player2'); //solution is for the target not player
startGame();
// playGame();

autoPlay();

function autoPlay() {
    if (!over) {

        console.log('\033[2J'); // clear screen;

        console.log('______YOUR  BOARD______')
        game.player1.board.render('visible');

        console.log('______ENEMY BOARD______')
        game.player2.board.render('hidden');
        game.renderShipState();

        
        enemyFs.autoFire();
        playerFs.autoFire();
        autoPlay();
    } 
    else {
        console.log('<<<<<<< GAME OVER >>>>>>>');
        console.log('WINNER: ' + won );
        console.log('ROUNDS: ' + round / 2);
        console.log('game over');
    }

}


function playGame() {
    if (!over) {

        console.log('\033[2J'); // clear screen;

        console.log('______YOUR  BOARD______')
        game.player1.board.render('visible');

        console.log('______ENEMY BOARD______')
        game.player2.board.render('hidden');
        game.renderShipState();

        console.log('Take a shot\n');
        var inputRow;
        var inputCol;

        ///SOMTHING IS GOING ON WITH THE RUN LOOP
        // Look at previous hit. it registers 
        // but the hoit before that is erased.
        process.stdin.once('data', function (input) {
        if (input === 'quit\n') {
            process.exit();
        } else {
            input = input.trim().split(",");
            inputRow = parseInt(input[0] - 1);

            regex = /^[a-zA-Z]$/;

            if(regex.test(input[1]) && inputRow >= 0 && inputRow <= 9){
                inputCol = Util.belt.charMap[input[1].toUpperCase()] - 1;
                playerFs.openFire(inputRow,inputCol);
                enemyFs.autoFire();
                playGame();
            } else {
                setTimeout(function() {
                    playGame();       
                }, 2000);
                console.log(clc.red('|---------  Incorect Format  ---------| '))
                console.log('Target information should be entered as:')
                console.log(clc.green('row,column'))
            }

          }
        });
    } else {
        console.log('<<<<<<< GAME OVER >>>>>>>');
        console.log('WINNER: ' + won );
        console.log('ROUNDS: ' + round / 2);
    }
}


function render() {
    game.player1.board.render('visible');
}


function autoPlaceBoard(player) {
    //loop though the ships
    // pick a random spot on the board
    // pick a random index out of up down left right
    // try and place ship
    if (game[player].shipStateInfo('placed') === false) {
        for (var i = 0; i < game[player].shipState.length; i++) {
            if (game[player].shipState[i].placed === 1) {
                game[player].placeState = [game[player].shipState[i].type, Util.belt.randNum(9), Util.belt.randNum(9), Util.belt.directions[Util.belt.randNum(4) - 1], player];

                valid = game.placeShipState.apply(this, game[player].placeState);

                if (valid) {
                    game[player].shipState[i].placed = 0;
                } else {
                    autoPlaceBoard(player);
                }
            };
        }
    }
}



function startGame() {
    if (game.player1.shipStateInfo('placed') === false) {

        if (game.player1.placeState[0] === null) {
            console.log('What ship are you going to place?');
            console.log('Ships left to place:');
            var shipArray = [];
            for (var i = 0; i < game.player1.shipState.length; i++) {

                // loops thought to see if any ships are still left
                // 1 = unplaced.

                if (game.player1.shipState[i].placed === 1) {
                    shipArray.push(game.player1.shipState[i].type);
                }

            }
            console.log(shipArray.join("\n") + "\n");

            process.stdin.once('data', function(input) {
                if (input === 'quit\n') {
                    process.exit();
                } else {
                    var input = input.trim().toLowerCase();
                    var valid = false;
                    for (var prop in Util.ships) {
                        for (var i = 0; i < Util.ships[prop].possibleNames.length; i++) {
                            if (Util.ships[prop].possibleNames[i] === input) {
                                game.player1.placeState.splice(0, 0, prop);
                                valid = true;
                                render();
                                startGame();
                            }
                        }
                    }
                    if (!valid) {
                        render();
                        console.log(error('Thats not a ship man'));
                        startGame();
                    }
                }
            });
        } else if (game.player1.placeState[1] === null) {
            console.log('What row do you want to place the ' + game.player1.placeState[0]);
            process.stdin.once('data', function(input) {
                if (input === 'quit\n') {
                    process.exit();
                } else {
                    input = parseInt(input.trim()) - 1;
                    if (input >= 0 && input <= 10) {
                        game.player1.placeState.splice(1, 0, input );
                        render();
                        startGame();
                    } else {
                        render();
                        console.log(error("Thats out of bounds!"));
                        startGame();
                    }
                }
            });
        } else if (game.player1.placeState[2] === null) {
            console.log('What column do you want to place the ' + game.player1.placeState[0]);
            process.stdin.once('data', function(input) {
                if (input === 'quit\n') {
                    process.exit();
                } else {
                    input = input.trim();
                    mappedInput = parseInt(Util.belt.charMap[input.toUpperCase()]) - 1;
                    if (mappedInput >= 0 && mappedInput <= 10) {
                        game.player1.placeState.splice(2, 0, mappedInput);
                        render();
                        startGame();
                    } else {
                        console.log(error("Thats out of bounds!"));
                        render();
                        startGame();
                    }
                }
            });
        } else if (game.player1.placeState[3] === null) {
            console.log('What direction do you want to place the ' + game.player1.placeState[0]);
            process.stdin.once('data', function(input) {

                if (input === 'quit\n') {
                    process.exit();
                } else {
                    input = input.trim();
                    game.player1.placeState[3] = input;

                    game.player1.placeState.push('player1'); //set player 

                    validPlacement = game.placeShipState.apply(this, game.player1.placeState);

                    if (validPlacement) {
                        for (var i = 0; i < game.player1.shipState.length; i++) {
                            if (game.player1.shipState[i].type === game.player1.placeState[0]) {
                                game.player1.shipState[i].placed = 0;
                            }
                        }
                        game.player1.placeState.length = 0;
                        game.player1.placeState.push(null);
                        render();
                        startGame();
                    } else {

                        game.player1.placeState[3] = null;
                        game.player1.placeState.pop(); // remove player context to keep array uniformity [NEEDS REFACTOR!]

                        console.log(error("Thats not a direction dude....\n") + info("[up,down,left,right]"));
                        render();
                        startGame();
                    }
                }
            });
        }
    }else {
        playGame();
    }
}