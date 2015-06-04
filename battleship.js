
process.stdin.resume();
process.stdin.setEncoding('utf8');

// figure out stack overfow issue.
// probably because of board placements 

var csvWriter = require('csv-write-stream')
var writer = csvWriter()

var attemps = 0;
var round = 0;
var over = true;
var won = null;
var games = 0;
var fs = require('fs');


var util = require('util');
var clc = require('cli-color');

var error = clc.red.bold;
var info = clc.cyanBright;

// define the board
var Ships = {
    carrier: {
        width: 5,
        callSign: "C",
        possibleNames: ["carrier", "c", "Carrier", "C"]
    },
    battleship: {
        width: 4,
        callSign: "B",
        possibleNames: ["battle", "b", "battleship", "battle ship", "Battleship", "Battle", "B"]
    },
    destroyer: {
        width: 3,
        callSign: "D",
        possibleNames: ["d", "destroyer", "Destroyer", "D"]
    },
    submarine: {
        width: 3,
        callSign: "S",
        possibleNames: ["sub", "submarine", "s", "Sub", "Submarine"]
    },
    patrolBoat: {
        width: 2,
        callSign: "P",
        possibleNames: ["pb", "patrol", "patrol boat", "patrolboat", "Patrol Boat", "PB", "P", "p"]
    }
};

var Util = {
    cols: "A B C D E F G H I J",
    rows: "1 2 3 4 5 6 7 8 9 10",
    spacers: "# 1 2 3 4 5 6 7 8 9 X",
    directions: ["up", "down", "left", "right"],
    charMap: "A B C D E F G H I J".split(" ")
        .reduce(function(obj, key, i) {
            obj[key] = i + 1;
            return obj;
        }, {}),
    randNum: function(maxInt) {
        return Math.floor(Math.random() * maxInt) + 1
    }
}

function Shot(player) {
    var _this = this;
    this.player = player;
    this.row = null;
    this.col = null;
    this.hit = false;

    this.fireBlind = function() {
        var validShips = game[_this.player].shipsLeft();
        var bestGuess = game[_this.player].board.calculateDensity(validShips);

        _this.row = bestGuess.row;
        _this.col = bestGuess.col;
        _this.hit = game[_this.player].board.fire(_this.row, _this.col);
        console.log("HIT____: " + _this.hit);
    }

}

function firingSolution(player) {
    var _this = this;
    this.player = player;
    this.targetArea = [];

    this.fire = function() {
        //caulate best shot
        round++;
        //make sure there are ships left to hit 
        //i.e the game is not over
        if (!game[_this.player].shipStateInfo('sunk')) {

            // if (_this.targetArea.length > 0) {
            //     console.log('fire at target path')
            //     // a previous shot was a hit
            //     var node = _this.targetArea.pop(); //returns array [r,c]
            //     var volly = new Shot(_this.player);
            //     game[_this.player].board.fire(node.row, node.col);

            //     if (volly.hit) { // the player has hit a target 
            //         var shipClass = game[_this.player].board.state[volly.row][volly.col].shipClass;
            //         var shipState = game[_this.player].damage(shipClass);
            //     }

            // } else {
                var volly = new Shot(_this.player);
                volly.fireBlind();
                console.log('fire blind')
                if (volly.hit) {
                    _this.targetArea = game[_this.player].board.surroundingTiles(volly.row, volly.col);
                    var shipClass = game[_this.player].board.state[volly.row][volly.col].shipClass;
                    game[_this.player].damage(shipClass);
                // }

                }
        } else {
            console.log('!!!! ' + _this.player + ' WON !!!!');
            won = _this.player;
            over = true;
            games++;
        }
        // console.log('rounds___:' + round / 2)
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
        for (var r = 0; r < Util.cols.split(" ").length; r++) {
            for (var c = 0; c < Util.rows.split(" ").length; c++) {
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


    this.render = function(visibility) {

        for (var r = 0; r < _this.state.length; r++) {
            for (var c = 0; c < _this.state[r].length; c++) {
                var state = _this.state[r][c];

                _this.renderedBoard[r][c] = _this.state[r][c].density;

                if (state.hit) {
                    _this.renderedBoard[r][c] = clc.redBright("!");
                }
                if (state.hit === false) {
                    _this.renderedBoard[r][c] = clc.magenta("X");
                }

                if (visibility === 'visible') {
                    state.vacant ? _this.renderedBoard[r][c] = clc.blackBright("0") : _this.renderedBoard[r][c] = clc.whiteBright(Ships[state.shipClass].callSign);
                    if (state.hit) {
                        _this.renderedBoard[r][c] = clc.redBright("!");
                    }
                    if (state.hit === false) {
                        _this.renderedBoard[r][c] = clc.magenta("X");
                    }

                }


            }
        }
        _this.renderedBoard.splice(0, 0, Util.cols.split(" "));

        for (var i = 0; i < _this.renderedBoard.length; i++) {
            _this.renderedBoard[i].splice(0, 0, Util.spacers.split(" ")[i]);
        }

        for (var n = 0; n < _this.renderedBoard.length; n++) {
            var line = _this.renderedBoard[n].join("  ");
            if (n === 0) {
                console.log(clc.yellow(line));
            } else {
                var row = _this.renderedBoard[n].splice(0, 1);
                var rest = _this.renderedBoard[n].join("  ");

                console.log(clc.blue(row[0]) + "  " + rest);
            }
        };
        _this.renderedBoard.splice(0, 1);
        // console.log(_this.state);
        console.log("\n");
    };

    // startRow and startCol are form input 
    // remember to add a 1;
    this.placeBoat = function(shipClass, orientation, startRow, startCol, live, densityTest) { //refactor 

        var validity = [];

        switch (orientation) {

            case "up":
                for (var i = 0; i < Ships[shipClass].width; i++) {

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
                for (var i = 0; i < Ships[shipClass].width; i++) {

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
                for (var i = 0; i < Ships[shipClass].width; i++) {
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
                for (var i = 0; i < Ships[shipClass].width; i++) {

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

            if (col >= 0 && row >= 0 && col <= 9 && row <= 9 && _this.state[row][col].hit === null && _this.state[row][col].vacant) {;
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
        if (tile.hit === false) {
            console.log('alreadyHit');
            return 'alreadyHit';
        } else {
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

function Player() {
    this.name = "";
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
                if (_this.shipState[i].hitCount === Ships[shipClass].width) {
                    _this.shipState[i].sunk = 0;
                    console.log("You sunk the " + shipClass + " !");
                    //Check to see is the game has been won.
                    var winSum = _this.shipStateInfo('sunk');

                };
            }
        };
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
    this.player1 = new Player();
    this.player2 = new Player();

    this.setup = function() {
        _this.player1.board.initialiaze();
        _this.player2.board.initialiaze();
    };

    this.placeShipState = function(shipClass, row, col, orientation, player) {

        row = parseInt(row) + 1;
        col = parseInt(col) + 1;

        if (Ships[shipClass]) {

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


var style = {
    "w": clc.blue("w"),
    "W": clc.yellowBright("W")
};

process.stdout.write(clc.art(Render.battleShip, style));
console.log(clc.red(Render.introText));


// game = new Game();
// game.setup();

// buildEnemyBoard()
// autoPlaceBoard()
//     // placeShips();

// enemyFs = new firingSolution('player1');
// myFs = new firingSolution('player2');

writer.pipe(fs.createWriteStream('out.csv'))



function playGame() {
    if (over === false) {
    // setTimeout(function() {

      // console.log('\033[2J');
      // console.log('______YOUR  BOARD______')
      // game.player1.board.render('visible');
      // console.log('______ENEMY BOARD______')
      // game.player2.board.render('hidden');
      // console.log(game.player2.board.densityMap)
      myFs.fire();
      enemyFs.fire();
      playGame();
  // }, 1000);

    }else{

      writer.write({winner: won, rounds: round / 2})


      attemps = 0;
      round = 0;
      won = null;
      over = false;
      


      game = new Game();
      game.setup();

      buildEnemyBoard()
      autoPlaceBoard()
      // placeShips();

      enemyFs = new firingSolution('player1');
      myFs = new firingSolution('player2');
      //  console.log('\033[2J');
      // console.log('______YOUR  BOARD______')
      // game.player1.board.render('visible');
      // console.log('______ENEMY BOARD______')
      // game.player2.board.render('hidden');
      if (games === 300) {
        writer.end()
      } else {
        playGame();
      }
    }
}

playGame();

// function playGame() {
//   console.log('\033[2J');
//   console.log('______YOUR  BOARD______')
//   game.player1.board.render('visible');
//   console.log('______ENEMY BOARD______')
//   game.player2.board.render('hidden');
//   console.log('Take a shot');
//     process.stdin.once('data', function (input) {
//       if (input === 'quit\n') {
//         process.exit();
//       } else {
//         input = input.trim().split("");
//         row = parseInt(input[0] - 1);
//         col = Util.charMap[input[1].toUpperCase()] - 1;
//         console.log("row___: " + row);
//         console.log("col___: " + col);
//         volly = game.player2.board.fire(row,col);
//         if (volly) {
//           console.log("HIT");
//         } else {
//           console.log("MISS");
//         }
//       }
//       enemyFs.fire();
//       playGame();
//   });
// }




function render() {
    game.player1.board.render();
}

function buildEnemyBoard() {

    if (game.player2.shipStateInfo('placed') === false) {

        for (var i = 0; i < game.player2.shipState.length; i++) {
            if (game.player2.shipState[i].placed === 1) {
                game.player2.placeState = [game.player2.shipState[i].type, Util.randNum(4), Util.randNum(4), Util.directions[Util.randNum(4) - 1], "player2"];

                valid = game.placeShipState.apply(this, game.player2.placeState);

                if (valid) {
                    game.player2.shipState[i].placed = 0;
                } else {
                    buildEnemyBoard();
                }
            };
        }
    }
}

function autoPlaceBoard() {
    //loop though the ships
    // pick a random spot on the board
    // pick a random index out of up down left right
    // try and place ship
    if (game.player1.shipStateInfo('placed') === false) {

        for (var i = 0; i < game.player1.shipState.length; i++) {
            if (game.player1.shipState[i].placed === 1) {
                game.player1.placeState = [game.player1.shipState[i].type, Util.randNum(4), Util.randNum(4), Util.directions[Util.randNum(4) - 1], "player1"];

                valid = game.placeShipState.apply(this, game.player1.placeState);

                if (valid) {
                    game.player1.shipState[i].placed = 0;
                } else {
                    autoPlaceBoard();
                }
            };
        }
    }
}



function placeShips(callback) {
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
                    var input = input.trim()
                        .toLowerCase();
                    var valid = false;
                    for (var prop in Ships) {
                        for (var i = 0; i < Ships[prop].possibleNames.length; i++) {
                            if (Ships[prop].possibleNames[i] === input) {
                                game.player1.placeState.splice(0, 0, prop);
                                valid = true;
                                render();
                                placeShips();
                            }
                        }
                    }
                    if (!valid) {
                        render();
                        console.log(error('Thats not a ship man'));
                        placeShips();
                    }
                }
            });
        } else if (game.player1.placeState[1] === null) {
            console.log('What row do you want to place the ' + game.player1.placeState[0]);
            process.stdin.once('data', function(input) {
                if (input === 'quit\n') {
                    process.exit();
                } else {
                    input = parseInt(input.trim());
                    if (input > 0 && input < 11) {
                        game.player1.placeState.splice(1, 0, input);
                        render();
                        placeShips();
                    } else {
                        render();
                        console.log(error("Thats out of bounds!"));
                        placeShips();
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
                    mapedInput = parseInt(Util.charMap[input.toUpperCase()]);

                    if (mapedInput > 0 && mapedInput < 11) {
                        game.player1.placeState.splice(2, 0, mapedInput);
                        render();
                        placeShips();
                    } else {
                        console.log(error("Thats out of bounds!"));
                        render();
                        placeShips();
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
                        placeShips();
                    } else {

                        game.player1.placeState[3] = null;
                        game.player1.placeState.pop(); // remove player context to keep array uniformity [NEEDS REFACTOR!]

                        console.log(error("Thats not a direction dude....\n") + info("[up,down,left,right]"));
                        render();
                        placeShips();
                    }
                }
            });
        }
    }
}