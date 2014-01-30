/**************************************************
** NODE.JS REQUIREMENTS
**************************************************/
var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

    app.use(express.static(__dirname + '/public'));
    //app.use("/css", express.static(__dirname + '/public/style'));
    //app.use("/js", express.static(__dirname + '/public/js'));
    //app.use("/img", express.static(__dirname + '/public/images'));

    app.get('/', function (req, res){
        res.sendfile(__dirname + '/public/index.html');
    });

    server.listen(8000);

var util = require("util"),                                 // Utility resources (logging, object inspection, etc)
    //io = require("socket.io"),                              // Socket.IO
    HyperPlayer = require("./ServerPlayer").HyperPlayer;    // HyperPlayer class

var _this;
/**************************************************
** GAME VARIABLES
**************************************************/
var socket,     // Socket controller
    players,    // Array of connected players
    xPositions,
    yPositions,
    spawnID,
    usernameArray,  // Array of usernames in lobby
    chatHistory,    // Stores chat history for late users
    readyArray;     // Array to store ready state in lobby


/**************************************************
** GAME INITIALISATION
**************************************************/
function init() {
    // Create an empty array to store players
    players = [];
    xPositions = [];
    yPositions = [];
    usernameArray = [];    
    readyArray = [];

    // Set up Socket.IO to listen on port 8000
    socket = io;
    //socket = io.listen(8000);

    // Configure Socket.IO
    socket.configure(function() {
        // Only use WebSockets
        socket.set("transports", ["websocket"]);

        // Restrict log output
        socket.set("log level", 2);
    });
    
    // Start listening for events
    setEventHandlers();
}

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

    //Listen for bomb throw
    client.on("throw", onThrow);

    //Listen for invincibility down
    client.on("invincibility down", onInvincibilityDown);

    //Listen for invincibility on
    client.on("invincibility on", onInvincibilityOn);

    //Listen for HP Get
    client.on("hp get", onHPGet);

    //--------------Lobby Stuff----------------
    //Listen for when a player inputs his/her name
    client.on("on username input", onUsername);

    //Listen when player submits something to chat
    client.on("recieve chat", onMessage);

    //Update new player on existing chat history
    client.on("request chat", onChatRequest);

    //Update players on who is ready
    client.on("recieve ready", onReady);

    //Do stuff when all players have readied up
    client.on("game started", onStart);

}

/**************************************************
** LOBBY EVENTS
**************************************************/
function onUsername(data) {
    //Checks to see for duplicates names. Adds the duplication # at end
    var count = 0;
    var str = data.username;
    for (var i = 0; i < usernameArray.length; i++) 
    {
        if (usernameArray[i] === data.username) 
        {
            count = 1;
        }

        if (usernameArray[i] === data.username +" (1)") 
        {
            count = str.substring(str.length - 2, str.length - 1);
            if(typeof count !== 'number')
            {
                count = 2;
            }
        }

        if (usernameArray[i] === data.username +" (2)") 
        {
            count = str.substring(str.length - 2, str.length - 1);
            if(typeof count !== 'number')
            {
                count = 3;
            }
        }

        if (usernameArray[i] === data.username +" (3)") 
        {
            count = str.substring(str.length - 2, str.length - 1);
            if(typeof count !== 'number')
            {
                count = 4;
            }
        }
    }

    //If original name
    if (count == 0)
    {
        util.log("New Player: " + data.username);
        usernameArray.splice(data.playerNumber - 1, 0, data.username);
        this.emit("username update", {usernames: usernameArray});
        this.broadcast.emit("username update", {usernames: usernameArray});
    }

    //If name already taken "count" many times
    else
    {
        util.log("New Player: " + data.username +" (" + count+")");
        usernameArray.splice(data.playerNumber - 1, 0, data.username +" (" + count+")");
        this.emit("username update", {usernames: usernameArray});
        this.broadcast.emit("username update", {usernames: usernameArray});
    }
}

function onMessage(data) {
    util.log("Recieved Chat Message: " + data.chatSession);
    chatHistory = data.chatSession;
    this.emit("update chat", {chatSession: data.chatSession});
    this.broadcast.emit("update chat", {chatSession: data.chatSession});
}

function onChatRequest()
{
    util.log("Updating player's chat history");
    this.emit("update chat", {chatSession: chatHistory, readyArray: readyArray});
}

function onReady(data)
{
    util.log(data.username + " : Has readied up");
    var index = usernameArray.indexOf(data.username);
    readyArray[index] = true;
    this.emit("ready update", {readyArray: readyArray});
    this.broadcast.emit("ready update", {readyArray: readyArray});
}

function onStart()
{
    dropPowerUp();
}
/**************************************************
** GAME EVENTS
**************************************************/
// Socket client has disconnected
function onClientDisconnect() {
    util.log("Player has disconnected: "+this.id);

    var removePlayer = playerById(this.id);
    var indexOfRemovedPlayer = players.indexOf(removePlayer);

    // Player not found
    if (!removePlayer) {
        // util.log("Player not found: "+this.id);
        return;
    }

    // Remove player from players array
    players.splice(indexOfRemovedPlayer, 1);

    // Remove player from readyArray
    readyArray.splice(indexOfRemovedPlayer, 1);
    this.broadcast.emit("ready update", {readyArray: readyArray});

    // Remove player from usernameArray
    util.log("Before: " +usernameArray);
    util.log(removePlayer.playerNumber-1);
    usernameArray.splice(indexOfRemovedPlayer, 1);
    util.log("After: " +usernameArray);
    this.broadcast.emit("username update", {usernames:usernameArray});


    // Broadcast removed player to connected socket clients
    this.broadcast.emit("remove player", {id: this.id});
}

// New player has joined
function onNewPlayer(data) {
    _this = this;
    var one = false, two = false, three = false, four = false;

    // Create a new player
    var newPlayer = new HyperPlayer();
    newPlayer.id = this.id;

    // Need to assign #s properly here
    for(var i = 0; i < players.length; i++)
    {
        if(players[i].playerNumber == 1)
            one = true;
        if(players[i].playerNumber == 2)
            two = true;
        if(players[i].playerNumber == 3)
            three = true;
        if(players[i].playerNumber == 4)
            four = true;
    }

    if(!one)
    {
        newPlayer.playerNumber = 1;
    }
    else if(!two)
    {
        newPlayer.playerNumber = 2;
    }
    else if(!three)
    {
        newPlayer.playerNumber = 3;
    }
    else
    {
        newPlayer.playerNumber = 4;
    }


    util.log("Player Joined. There are now: " + (players.length+1) + " player(s)");
    this.emit("update id", {id: newPlayer.id, playerNumber: newPlayer.playerNumber});

    // Broadcast new player to connected socket clients
    this.broadcast.emit("new player", {id: newPlayer.id, playerNumber: newPlayer.playerNumber, x: newPlayer.getX(), y: newPlayer.getY()});

    // Send existing players to the new player
    var i, existingPlayer;
    for (i = 0; i < players.length; i++) {
        existingPlayer = players[i];
        this.emit("new player", {id: existingPlayer.id, playerNumber: existingPlayer.playerNumber, x: existingPlayer.getX(), y: existingPlayer.getY()});
    }
    // Add new player to the players array
    players.push(newPlayer);
}

// Player has moved
function onMovePlayer(data) {
    // Find player in array
    var movePlayer = playerById(this.id);

    // Player not found
    if (!movePlayer) {
        // util.log("Player not found: "+this.id);
        return;
    }

    // Broadcast updated position to connected socket clients
    data.id = this.id;
    // this.emit("power", {spawnID: 0, powerUpID: 0, xLocation: 500});
    this.broadcast.emit("move player", data);
}

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
    
    //Reset Everything Here and transmit
    usernameArray = [];
    readyArray = [];
    for (i = 0; i < players.length; i++) 
    {
        players[i].hp = 5;
        players[i].points = 0;
    }

    this.broadcast.emit("game finished", data); 
    this.emit("game finished", data);
}

function onThrow(data)
{
    this.broadcast.emit("throw update", data); 
    this.emit("throw update", data);
}

function onHPGet(data)
{
    this.broadcast.emit("hp update", data);
}

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
    }, 60000);
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
    }
    
    return false;
}


/**************************************************
** RUN THE GAME
**************************************************/
init();