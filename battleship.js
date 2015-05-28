process.stdin.resume();
process.stdin.setEncoding('utf8');

var attemps = 0;

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
  directions: ["up","down","left","right"],
  charMap: "A B C D E F G H I J".split(" ")
    .reduce(function (obj, key, i) {
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
      _this.row = Util.randNum(9);
      _this.col = Util.randNum(9);
     _this.hit =  game[_this.player].board.fire(_this.row,_this.col);
     if (_this.hit === 'alreadyHit') {
      _this.fireBlind();
     }
  }
  this.fire = function(r,c) {
      _this.row = r;
      _this.col = c;
      _this.hit = game[_this.player].board.fire(r,c);
  }
}

function firingSolution(player) {
  var _this = this;
  this.player = player;
  this.solutionPath = [];
  this.targetArea = [];

  this.fire = function() {
    if (_this.targetArea.length > 0) {
      // a previous shot was a hit
     var lastShot = _this.solutionPath[_this.solutionPath.length - 1];

     var node = _this.targetArea.pop(); //returns array [r,c]
     var volly = new Shot(_this.player);
     volly.fire(node.row,node.col);

     if (volly.hit === 'alreadyHit') {
        console.log('alreadyHit');
        _this.fire();
     }
     if (volly.hit) {
       _this.solutionPath.push(volly);
     } else {
      _this.solutionPath.push
     }

    } else {
      var volly = new Shot(_this.player);
      volly.fireBlind();
      
      if (volly.hit) {
        _this.solutionPath.push(volly);
        _this.targetArea = game[_this.player].board.surroundingTiles(volly.row,volly.col);
      } else {
        console.log("!!!!!!!MISS!!!!!!")
      }

    }
    game.player2.board.render();
  }
}

// pick spot on the board.
// if its a hit pick a tile that is in a square around it
// //see if the square is a valid space and not guessed already
// is it a 


function Board() {

  var _this = this;

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

  this.buildBoard = function () {
    for (var r = 0; r < Util.cols.split(" ").length; r++) {
      for (var c = 0; c < Util.rows.split(" ").length; c++) {
        var tile = new Tile(r, c);
        _this.state[r][c] = tile;
      }
    }
  };


  this.render = function () {
    // console.log('\033[2J');
    for (var r = 0; r < _this.state.length; r++) {
      for (var c = 0; c < _this.state[r].length; c++) {
        var state = _this.state[r][c];
        state.vacant ? _this.renderedBoard[r][c] =  clc.blackBright("0") : _this.renderedBoard[r][c] = clc.whiteBright(Ships[state.shipClass].callSign);

        if (state.hit) {
           _this.renderedBoard[r][c] = clc.redBright("!");
        }
        if (state.hit === false) {
           _this.renderedBoard[r][c] = clc.magenta("X");
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


  this.placeBoat = function (shipClass, orientation, startRow, startCol, live) {
    var validity = [];
    switch (orientation) {

    case "up":
      for (var i = 0; i < Ships[shipClass].width; i++) {
        var row = startRow - i - 1;
        var col = startCol - 1;

        val = _this.runPlacements(row, col, live, shipClass);
        validity.push(val);
      }
      break;
    case "down":
      for (var i = 0; i < Ships[shipClass].width; i++) {
        var row = startRow + i - 1;
        var col = startCol - 1;

        val = _this.runPlacements(row, col, live, shipClass);
        validity.push(val);
      }
      break;
    case "left":
      for (var i = 0; i < Ships[shipClass].width; i++) {
        var row = startRow - 1;
        var col = startCol - i - 1;

        val = _this.runPlacements(row, col, live, shipClass);
        validity.push(val);
      }
      break;
    case "right":
      for (var i = 0; i < Ships[shipClass].width; i++) {

        var row = startRow - 1;
        var col = startCol + i - 1;

        val = _this.runPlacements(row, col, live, shipClass);
        validity.push(val);
      }
      break;

    }
    sum = validity.reduce(function(a,b) {
      return a + b;
    })
    return sum === 0;
  };



  this.runPlacements = function (row, col, live, shipClass) {    
    
    if (col >= 0 && row >= 0 && col <= 9 && row <= 9) {

      var position = _this.state[row][col];
      if (position.vacant) {
        if (live) {
          _this.state[row][col].shipClass = shipClass;
          _this.state[row][col].vacant = false;
        }
        else {
          return 0;
        }
      } else {
         return 1;
      }
    } else {
      return 1;
    }
  };

  this.surroundingTiles = function(r,c) {
    var boxArray = [[0,1],[0,-1],[1,-1],[1,0],[1,1],[-1,-1],[-1,0],[-1,1]]
    var tiles = [];
    for (var i = 0; i < boxArray.length; i++) {
      var row = boxArray[i][0] + r;
      var col = boxArray[i][1] + c;
      if (row >= 0 && col >= 0 && _this.state[row][col] !== undefined) {
        tiles.push(_this.state[row][col]);
      };
    };
    return tiles;
  }

  this.fire = function(r,c) {
    tile = _this.state[r][c];

    if (!tile.vacant && tile.hit === null ) {
      _this.state[r][c].hit = true;
      return true;
    } 
    if (tile.hit === false){
      console.log('alreadyHit');
      return 'alreadyHit';
    } else {
      _this.state[r][c].hit = false;
      return false
    }
  }



  this.initialiaze = function () {
    _this.buildBoard();
  };
}

function Tile(r, c) {
  this.vacant = true;
  this.shipClass = null;
  this.hit = null;
  this.row = r;
  this.col = c;
}

function Player() {
  this.name = "";
  this.placeState = [null];
  var _this = this;

  //       occupied = 0 
  //       empty = 1             
  // this is for a reduce function 
  // to see if all ships placed    

  this.shipsToPlace = [{
    type: "submarine",
    placed: 1
  }
  , {
    type: "carrier",
    placed: 1
  }, {
    type: "destroyer",
    placed: 1
  }, {
    type: "battleship",
    placed: 1
  }, {
    type: "patrolBoat",
    placed: 1
  }
  ];

  this.shipsArePlaced = function () {
    var reducedObj = _this.shipsToPlace.reduce(function (a, b) {
      return {
        placed: a.placed + b.placed
      }; // sums the value of a + b (values next to each other) 
    });

    return reducedObj.placed === 0;
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
  
  this.setup = function () {
    _this.player1.board.initialiaze();
    _this.player2.board.initialiaze();
  };

  this.placeShipState = function (shipClass, row, col, orientation, player) {

    row = parseInt(row);
    col = parseInt(col);

    if (Ships[shipClass]) {

      valid = _this[player].board.placeBoat(shipClass, orientation, row, col, false);

      if (valid) {
        _this[player].board.placeBoat(shipClass, orientation, row, col, true);
        return true;

      } else {
        console.log('Not a valid placement!');

      }

    } else {
      console.log("Thats not a valid ship!");

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


  game = new Game();
  game.setup();

  // placeShips();
  buildEnemyBoard()
  autoPlaceBoard()
  console.log('Player1.....................')
  game.player1.board.render();
  console.log('Player2.....................')
  game.player2.board.render();
  fs = new firingSolution('player2');
  fs.fire();
  fs.fire();
  fs.fire();
  fs.fire();
  debugger;



function render() {
  game.player1.board.render();
}

function buildEnemyBoard() {

  if (game.player2.shipsArePlaced() === false) {

    for (var i = 0; i < game.player2.shipsToPlace.length; i++) {
      if (game.player2.shipsToPlace[i].placed === 1) {
         game.player2.placeState = [game.player2.shipsToPlace[i].type,Util.randNum(4),Util.randNum(4),Util.directions[Util.randNum(4) - 1],"player2"];

         valid = game.placeShipState.apply(this, game.player2.placeState);

         if (valid) {
           game.player2.shipsToPlace[i].placed = 0;
         } else {      
           buildEnemyBoard();
         }
      };
    }
  }
      console.log(attemps ++);
}
function autoPlaceBoard() {
  //loop though the ships
  // pick a random spot on the board
  // pick a random index out of up down left right
  // try and place ship
  if (game.player1.shipsArePlaced() === false) {

    for (var i = 0; i < game.player1.shipsToPlace.length; i++) {
      if (game.player1.shipsToPlace[i].placed === 1) {
         game.player1.placeState = [game.player1.shipsToPlace[i].type,Util.randNum(4),Util.randNum(4),Util.directions[Util.randNum(4) - 1],"player1"];

         valid = game.placeShipState.apply(this, game.player1.placeState);

         if (valid) {
           game.player1.shipsToPlace[i].placed = 0;
         } else {      
           autoPlaceBoard();
         }
      };
    }
  }
      console.log(attemps ++);
}



function placeShips(callback) {
  if (game.player1.shipsArePlaced() === false) {

    if (game.player1.placeState[0] === null) {
      console.log('What ship are you going to place?');
      console.log('Ships left to place:');
      var shipArray = [];
      for (var i = 0; i < game.player1.shipsToPlace.length; i++) {

        // loops thought to see if any ships are still left
        // 1 = unplaced.

        if (game.player1.shipsToPlace[i].placed === 1) {
          shipArray.push(game.player1.shipsToPlace[i].type);
        }

      }
      console.log(shipArray.join("\n") + "\n");

      process.stdin.once('data', function (input) {
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
      process.stdin.once('data', function (input) {
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
      process.stdin.once('data', function (input) {
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
      process.stdin.once('data', function (input) {
        if (input === 'quit\n') {
          process.exit();
        } else {
          input = input.trim();
          game.player1.placeState[3] = input;

          game.player1.placeState.push('player1'); //set player 

          validPlacement = game.placeShipState.apply(this, game.player1.placeState);

          if (validPlacement) {
            for (var i = 0; i < game.player1.shipsToPlace.length; i++) {
              if (game.player1.shipsToPlace[i].type === game.player1.placeState[0]) {
                game.player1.shipsToPlace[i].placed = 0;
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
