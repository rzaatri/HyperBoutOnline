/**************************************************
** NODE.JS REQUIREMENTS
**************************************************/
var util = require("util"),                                 // Utility resources (logging, object inspection, etc)
    io = require("socket.io"),                              // Socket.IO
    HyperPlayer = require("./ServerPlayer").HyperPlayer;    // HyperPlayer class

var _this;
/**************************************************
** GAME VARIABLES
**************************************************/
var socket,     // Socket controller
    players,    // Array of connected players
    xPositions,
    yPositions,
    spawnID;


/**************************************************
** GAME INITIALISATION
**************************************************/
function init() {
    // Create an empty array to store players
    players = [];
    xPositions = [];
    yPositions = [];

    // Set up Socket.IO to listen on port 8000
    socket = io.listen(8000);

    // Configure Socket.IO
    socket.configure(function() {
        // Only use WebSockets
        socket.set("transports", ["websocket"]);

        // Restrict log output
        socket.set("log level", 2);
    });
    
    // Start listening for events
    setEventHandlers();
};

function generateRandomNum(lowerRange, upperRange) 
{ 
    return Math.floor(Math.random()*(upperRange-lowerRange+1)+lowerRange); 
}

/**************************************************
** GAME EVENT HANDLERS
**************************************************/
var setEventHandlers = function() {
    // Socket.IO
    socket.sockets.on("connection", onSocketConnection);
};

// New socket connection
function onSocketConnection(client) {  
    util.log("New player has connected: "+client.id);
    
    // Listen for client disconnected
    client.on("disconnect", onClientDisconnect);

    // Listen for new player message
    client.on("new player", onNewPlayer);

    // Listen for move player message
    client.on("move player", onMovePlayer);

    //Listen for player update position
    client.on("get position", onGetPosition);

    //Listen for player position request of other players
    client.on("request position", onRequestPosition);

    //Listen for player throwing bomb
    client.on("bomb throw", onBombThrow);

    //Listen for player who got hit
    client.on("player hit", onHit);

    //Listen for game end
    client.on("game end", onGameEnd);

    //Listen for invincibility down
    client.on("invincibility down", onInvincibilityDown);

    //Listen for invincibility on
    client.on("invincibility on", onInvincibilityOn);

    //Listen for HP Get
    client.on("hp get", onHPGet);

};

function onHPGet(data)
{
    this.broadcast.emit("hp update", data);
};

function dropPowerUp()
{
    setInterval(function()
    {
        spawnID++; 
        var powerUpID = generateRandomNum(0,1); //there are only two power ups, 0 for health, 1 for shield
        var spawnLocationX = generateRandomNum(40, 1100);
        //spawn power ups here
        _this.emit("power", {spawnID: spawnID, powerUpID: powerUpID, 
                        xLocation: spawnLocationX});
        _this.broadcast.emit("power", {spawnID: spawnID, powerUpID: powerUpID, 
                        xLocation: spawnLocationX});
        // util.log("hehehehehehe");
    }, 3000);
};

// Socket client has disconnected
function onClientDisconnect() {
    util.log("Player has disconnected: "+this.id);

    var removePlayer = playerById(this.id);

    // Player not found
    if (!removePlayer) {
        util.log("Player not found: "+this.id);
        return;
    };

    // Remove player from players array
    players.splice(players.indexOf(removePlayer), 1);

    // Broadcast removed player to connected socket clients
    this.broadcast.emit("remove player", {id: this.id});
};

// New player has joined
function onNewPlayer(data) {
    _this = this;
    dropPowerUp();

    // Create a new player
    var newPlayer = new HyperPlayer();
    newPlayer.id = this.id;
    newPlayer.playerNumber = players.length + 1;
    util.log("Player Joined. There are now: " + (players.length+1) + " player(s)");
    this.emit("update id", {id: newPlayer.id, playerNumber: newPlayer.playerNumber});

    // Broadcast new player to connected socket clients
    this.broadcast.emit("new player", {id: newPlayer.id, playerNumber: newPlayer.playerNumber, x: newPlayer.getX(), y: newPlayer.getY()});

    // Send existing players to the new player
    var i, existingPlayer;
    for (i = 0; i < players.length; i++) {
        existingPlayer = players[i];
        this.emit("new player", {id: existingPlayer.id, playerNumber: existingPlayer.playerNumber, x: existingPlayer.getX(), y: existingPlayer.getY()});
    };   
    // Add new player to the players array
    players.push(newPlayer);
};

// Player has moved
function onMovePlayer(data) {
    // Find player in array
    var movePlayer = playerById(this.id);

    // Player not found
    if (!movePlayer) {
        util.log("Player not found: "+this.id);
        return;
    };

    // Broadcast updated position to connected socket clients
    data.id = this.id;
    // this.emit("power", {spawnID: 0, powerUpID: 0, xLocation: 500});
    this.broadcast.emit("move player", data);
};

function onGetPosition(data) {
    var playerNumber = data.playerNumber;
    var xPos = data.x;
    var yPos = data.y;
    xPositions[playerNumber-1] = xPos;
    yPositions[playerNumber-1] = yPos;
}

function onRequestPosition() {
    this.emit("update player positions", {xPositions: xPositions, yPositions: yPositions});
    //this.broadcast.emit("update player positions", {xPositions: xPositions, yPositions: yPositions});
}

function onBombThrow(data) {
    //util.log("BOMB THROW");
    this.broadcast.emit("remote bomb throw", data);
}

function onInvincibilityDown(data) {
    this.broadcast.emit("send invincibility down", data);
}

function onInvincibilityOn(data) {
    this.broadcast.emit("send invincibility on", data);
}

function onHit(data) {
    util.log("Player " + data.playerWhoGotHit + " has been hit");
    this.broadcast.emit("remote player got hit", data);
}

function onGameEnd(data) {
    util.log("Player " + data.winner + " has reached win score");
    this.broadcast.emit("game finished", data); 
    this.emit("game finished", data); 
    
}
/**************************************************
** GAME HELPER FUNCTIONS
**************************************************/
// Find player by ID
function playerById(id) {
    var i;
    for (i = 0; i < players.length; i++) {
        if (players[i].id == id)
            return players[i];
    };
    
    return false;
};


/**************************************************
** RUN THE GAME
**************************************************/
init();