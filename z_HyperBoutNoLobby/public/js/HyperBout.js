/**************************************************
** GAME VARIABLES
**************************************************/
var localPlayer;
var remotePlayers;
var socket;

//Box2d measures things in meters, to compensate we are going to be converting it to pixels. 
//Scale to convert is 30. 
var SCALE = 30;
var world;
var gBombArray = new Array();
var powerUps = new Array();

/**************************************************
** BOX2D NAMESPACE CREATION
**************************************************/
//Creating a box2d namespace, so we can call the instances
//by just doing box2d.b2Vec2 etc.
var box2d = {
   b2Vec2 : Box2D.Common.Math.b2Vec2,
   b2BodyDef : Box2D.Dynamics.b2BodyDef,
   b2Body : Box2D.Dynamics.b2Body,
   b2FixtureDef : Box2D.Dynamics.b2FixtureDef,
   b2Fixture : Box2D.Dynamics.b2Fixture,
   b2World : Box2D.Dynamics.b2World,
   b2MassData : Box2D.Collision.Shapes.b2MassData,
   b2PolygonShape : Box2D.Collision.Shapes.b2PolygonShape,
   b2CircleShape : Box2D.Collision.Shapes.b2CircleShape,
   b2DebugDraw : Box2D.Dynamics.b2DebugDraw
};

/**************************************************
** SOCKET ENABLE
**************************************************/
var setupSockets = function()
{
    // Initialise socket connection
    socket = io.connect("http://localhost", {port: 8000, transports: ["websocket"]});

    // Socket connection successful
    socket.on("connect", onSocketConnected);

    // Socket disconnection
    socket.on("disconnect", onSocketDisconnect);

    // New player message received
    socket.on("new player", onNewPlayer);

    // Player move message received
    socket.on("move player", onMovePlayer);

    // Player removed message received
    socket.on("remove player", onRemovePlayer);

    // Update the players ID
    socket.on("update id", updateID);

    // Receive player position updates from Server
    socket.on("update player positions", updatePositions);

    // Receive other player's bomb throws
    socket.on("remote bomb throw", handleRemoteBombs);

    // Receive when other players get hit
    socket.on("remote player got hit", handleHit);

    // Receive when game end
    socket.on("game finished", handleEnd);

    // Receive when player invincibility is down.
    socket.on("send invincibility down", handleInvincibilityDown);

    // Receive when player invincibility is on.
    socket.on("send invincibility on", handleInvincibilityOn);

    // Receive when power up is spawned.
    socket.on("power", handlePowerUpSpawn);

    socket.on("hp update", handleHPUpdate);

};

/**************************************************
** SOCKET FUNCTIONS
**************************************************/
// Socket connected

function updateID(data){
    localPlayer.id = data.id;
    localPlayer.playerNumber = data.playerNumber;
}

function onSocketConnected() {
    console.log("Connected to socket server");

    // Send local player data to the game server
    socket.emit("new player", {x: localPlayer.getX(), y: localPlayer.getY()});
};

// Socket disconnected
function onSocketDisconnect() {
    console.log("Disconnected from socket server");
};

// New player
function onNewPlayer(data) {
    console.log("New player connected: "+data.id);
    
    // Initialise the new player
    var newPlayer = new HyperPlayer();
    newPlayer.id = data.id;
    newPlayer.playerNumber = data.playerNumber;
    
    // Add new player to the remote players array
    remotePlayers.push(newPlayer);

    //Refresh the game so everyone starts back at their spawn points
    setTimeout(function()
    {
        localPlayer.moveToSpawn();
        for(i = 0; i < remotePlayers.length; i++) 
        {        
            console.log("HIT");
            console.log(remotePlayers[i].id);
            console.log(remotePlayers[i].playerNumber);
            remotePlayers[i].moveToSpawn();
        }
    }, 1000)

};

// Move player
function onMovePlayer(data) {
    
    //Get the player that moved
    var movePlayer = playerById(data.id);
    
    // Player not found
    if (!movePlayer) {
        console.log("Player not found: "+data.id);
        return;
    };

    // console.log(data);
    movePlayer.remotePlayerMove(data);

};

// Remove player
function onRemovePlayer(data) {
    //Get player that disconnected
    var removePlayer = playerById(data.id);

    // Player not found
    if (!removePlayer) {
        console.log("Player not found: "+data.id);
        return;
    };

    // Remove player from array
    remotePlayers.splice(remotePlayers.indexOf(removePlayer), 1);
};


function sendPosition()
{
    var xPos = localPlayer.getXPosition();
    var yPos = localPlayer.getYPosition();
    var playerNumber = localPlayer.playerNumber;
    socket.emit("get position", {playerNumber: playerNumber, x: xPos, y: yPos});
    socket.emit("request position");

};

function updatePositions(data) {
    var xPositions = data.xPositions;
    var yPositions = data.yPositions;
    var xPos;
    var yPos;
    for(i = 0; i < remotePlayers.length; i++) 
    {        
        //console.log("Player ID is: " + remotePlayers[i].id);
        //console.log("Player Number is: " +remotePlayers[i].playerNumber);
        xPos = xPositions[remotePlayers[i].playerNumber-1];
        yPos = yPositions[remotePlayers[i].playerNumber-1];
        remotePlayers[i].movePlayerToPosition(xPos, yPos);
    }
};

function handleInvincibilityDown(data)
{
    var invinciblePlayer = playerByPlayerNumber(data.playerNum);
    invinciblePlayer.invincibility = 0;

    //PUT YOUR SHIELD HERRRREE!! >O
}

function handleInvincibilityOn(data)
{
    var invinciblePlayer = playerByPlayerNumber(data.playerNum);
    invinciblePlayer.invincibility = 1;

    //PUT YOUR SHIELD HERRRREE!! >O
}

function handlePowerUpSpawn(data)
{
    console.log("muhahahahha");
    var hyperPowerUp = new HyperPowerUp(data.xLocation, data.spawnID, data.powerUpID);
    powerUps.push(hyperPowerUp);

}

function handleRemoteBombs(data) {
    var fixDef = new box2d.b2FixtureDef();
    fixDef.density = 1;
    fixDef.friction = 0.5;
    fixDef.restitution = 0.5;
    fixDef.filter.categoryBits = 0x0004;
    fixDef.filter.maskBits = 0x0001;
    var bodyDef = new box2d.b2BodyDef();
    bodyDef.type = box2d.b2Body.b2_dynamicBody; 
    bodyDef.position.x = (data.playerX); 
    bodyDef.position.y = (data.playerY);
    var impulse = data.impulse;
    fixDef.shape = new box2d.b2CircleShape(20 / SCALE);  
    var remoteBomb = world.CreateBody(bodyDef).CreateFixture(fixDef);
    remoteBomb.SetUserData("Bomb"+data.playerNumber);
    remoteBomb.GetBody().ApplyImpulse(impulse, remoteBomb.GetBody().GetPosition());
    gBombArray.push(remoteBomb);
};

function handleHit(data) {
    var hitPlayerNumber = data.playerWhoGotHit;
    var healthOfHitPlayer = data.health;
    var shootingPlayerNumber = data.playerWhoShoots;
    var score = data.score;

    //Update Score (May be redundant since score is updated per hit, not elimination)
    if (shootingPlayerNumber == localPlayer.playerNumber)
    {
        localPlayer.points = score;
    }
    else 
    {
        playerByPlayerNumber(shootingPlayerNumber).points = score;
    }

    //Update Health
    playerByPlayerNumber(hitPlayerNumber).hp = healthOfHitPlayer;

    //Update GUI for Score and Health
    updateGUIScore();
};

function handleHPUpdate(data)
{
    var playerNumber = data.playerNumber;
    var health = data.health;
    if (playerNumber == localPlayer.playerNumber)
    {
        //Do Nothing
    }
    else
    {
        playerByPlayerNumber(playerNumber).hp = health;
    }
    updateGUIScore();
};

function handleEnd(data)
{
    var winner = data.winner;
    alert("Game Finished. The Winner Is Player " + winner);
};

/**************************************************
** ENGINE
**************************************************/
var hyperBout = function()
{
    this.width = 1122;
    this.height = 548;
    return new CanvasWrapper('backgroundCanvas', 'entityCanvas', 'animationCanvas', width, height);
};

var Engine = function()
{   
    //Create a new hyperBout object.
    this.hyperBout = hyperBout();

    //Create an image and set the source to the background, add it to HyperBout canvas context
    var backgroundImg = new Image();
    backgroundImg.src = 'images/Background.png';
    this.hyperBout.ctx.drawImage(backgroundImg, 0, 0);


    //Variable reference to this eventngine
    var self = this;
    
    //Set dem physics
    self.setupPhysics();
   
    //Create the player
    localPlayer = new HyperPlayer();
    this.hyperBout.entityCanvas.addEventListener('click', function(event) {localPlayer.bombThrow(event);}, false);
    // Initialise remote players array
    remotePlayers = [];

    //Enable Sockets
    setupSockets();
    
    /*
    entityCanvas.onclick = function()
    {
        var slash = Engine.prototype.MuteUnmuteAudio('audiofiles/stab.wav', false);

        var fixDef = new box2d.b2FixtureDef();
        fixDef.density = 1;
        fixDef.friction = 0.5;
        fixDef.restiution = 0.5;

        var bodyDef = new box2d.b2BodyDef();
        bodyDef.type = box2d.b2Body.b2_dynamicBody; //We're setting the ground to static.
        bodyDef.position.x =Math.random()*1122 / SCALE; //Registration point is in the center for box2d entities.
        bodyDef.position.y = 0;
        fixDef.shape = new box2d.b2CircleShape(Math.random()*100 / SCALE); //setting the shape of the ground.
        
        world.CreateBody(bodyDef).CreateFixture(fixDef);
        
    }
    */
    //Start the engine, vroom!
    $(document).ready(function() { self.start(); });
};



//Awe yeah sweeet physaks
Engine.prototype.setupPhysics = function()
{
    //The b2Vec2 require 2 variables, gravity for X and Y axis. Since we don't want
    //any gravity on the X axis, we set it to 0 and we'll set Y to 50 for now.
    //true at the end means we're allowing bodies to sleep, this improves performance
    //when entities come to a halt.
    world = new box2d.b2World(new box2d.b2Vec2(0,50), true);

    //Ground Image
    var floorImage = new Image();
    floorImage.src = 'images/floor.png';


    /***Create Platforms***/
    var platformImage = new Image();
    platformImage.src = 'images/log.png';

    //Top Left - P1 Start
    var testFix = new box2d.b2FixtureDef();
    testFix.density = 1;
    testFix.friction = 0.5;
    var testDef = new box2d.b2BodyDef();
    testDef.type = box2d.b2Body.b2_staticBody;
    testDef.position.x = 400 / 2 / SCALE;
    testDef.position.y = 200 / 2 / SCALE;
    testFix.shape = new box2d.b2PolygonShape;
    testFix.shape.SetAsBox((300/SCALE)/2, (20 / SCALE) / 2);
    var topLeftFloor = world.CreateBody(testDef).CreateFixture(testFix);
    this.hyperBout.ctx.drawImage(platformImage, testDef.position.x * 6, testDef.position.y * 25);
    topLeftFloor.SetUserData('Floor');
    //Top Right - P2 Start
    var testFix2 = new box2d.b2FixtureDef();
    testFix2.density = 1;
    testFix2.friction = 0.5;
    var testDef2 = new box2d.b2BodyDef();
    testDef2.type = box2d.b2Body.b2_staticBody;
    testDef2.position.x = 1800 / 2 / SCALE;
    testDef2.position.y = 200 / 2 / SCALE;
    testFix2.shape = new box2d.b2PolygonShape;
    testFix2.shape.SetAsBox((300/SCALE)/2, (20 / SCALE) / 2);
    var topRightFloor = world.CreateBody(testDef2).CreateFixture(testFix2);
    this.hyperBout.ctx.drawImage(platformImage, testDef2.position.x * 25 - 6, testDef2.position.y * 25);
    topRightFloor.SetUserData('Floor');
    
    //Bottom Left Platform- P3 Start
    var testFix3 = new box2d.b2FixtureDef();
    testFix3.density = 1;
    testFix3.friction = 0.5;
    var testDef3 = new box2d.b2BodyDef();
    testDef3.type = box2d.b2Body.b2_staticBody;
    testDef3.position.x = 280/ 2 / SCALE;
    testDef3.position.y = 840 / 2 / SCALE;
    testFix3.shape = new box2d.b2PolygonShape;
    testFix3.shape.SetAsBox((660/SCALE)/2, (20 / SCALE) / 2);
    var bottomLeft = world.CreateBody(testDef3).CreateFixture(testFix3);
    this.hyperBout.ctx.drawImage(platformImage, testDef3.position.x * 6, testDef3.position.y *28 + 10);
    bottomLeft.SetUserData("Floor");

    //Bottom Right - P4 Start
    var testFix4 = new box2d.b2FixtureDef();
    testFix4.density = 1;
    testFix4.friction = 0.5;
    var testDef4 = new box2d.b2BodyDef();
    testDef4.type = box2d.b2Body.b2_staticBody;
    testDef4.position.x = 1940 / 2 / SCALE;
    testDef4.position.y = 840 / 2 / SCALE;
    testFix4.shape = new box2d.b2PolygonShape;
    testFix4.shape.SetAsBox((640/SCALE)/2, (20 / SCALE) / 2);
    var bottomRightFloor = world.CreateBody(testDef4).CreateFixture(testFix4);
    this.hyperBout.ctx.drawImage(platformImage, testDef4.position.x * 25 - 6 , testDef4.position.y *28 + 10);
    bottomRightFloor.SetUserData("Floor");
    
    //Box2d has some nice default drawing, so let's draw the ground.
    var debugDraw = new box2d.b2DebugDraw();
    debugDraw.SetSprite(document.getElementById("entityCanvas").getContext("2d"));
    debugDraw.SetDrawScale(SCALE);
    debugDraw.SetFillAlpha(0.3);
    debugDraw.SetLineThickness(1.0);
    //Says what we want to draw
    debugDraw.SetFlags(box2d.b2DebugDraw.e_shapeBit | box2d.b2DebugDraw.e_jointBit);
    world.SetDebugDraw(debugDraw);
    
}

//Array of input handlers
Engine.InputHandlers = [ ];

Engine.InputHandler = function(tag, handler) {
    this.tag = tag;
    this.handler = handler;
};

Engine.UpdateState = function(){
    //Stores all of the current powerups on the field
    
    //Stores the time left inside the game.
    var timeLeft;
    //STores the number of players currently inside the game.
    var players;
    //Top player stores the current player with the most points
    var topPlayer;

}

Engine.RegisterInputHandler = function(inputHandler) {
    if (!(inputHandler instanceof Engine.InputHandler)) {
        throw "Error, I only accept Engine.InputHandler types";
    } 
    Engine.InputHandlers.push(inputHandler);
};

Engine.HandleInput = function(event) {
    for (var i = 0; i < Engine.InputHandlers.length; i++) {
        Engine.InputHandlers[i].handler(event);
    }
};

Engine.RemoveInputHandler = function(tag) {
    for (var i = 0; i < Engine.InputHandlers.length; i++) {
        if (Engine.InputHandlers[i].tag == tag) {
            // an array in javascript is just a list
            // splice(startIndex, numElementsToRemove, [elementsToAdd])
            // the following line just removes the element at i
            Engine.InputHandlers.splice(i, 1);
        }
    }
};

/**************************************************
** AUDIO
**************************************************/
//play music without loop if bool sets to false
//returns the audio object.
Engine.prototype.MusicPlayer = function(soundFile, bool)
{
    //create a new audio
    var myAudio = document.createElement('audio');
    //set the source to soundfile
    myAudio.setAttribute('src', soundFile);
    myAudio.loop = bool;
    //audio is not muted at first.
    myAudio.muted = false;
    myAudio.play();
    return myAudio;
};

//mainly for sound effects. For a check if the mute button is pressed or not.
Engine.prototype.MuteUnmuteAudio = function(soundFile, bool)
{
    if(mute == false)
    {
        var slash = Engine.prototype.MusicPlayer(soundFile, bool);
    }
};

/**************************************************
** GAME START
**************************************************/
//Set the frames per second to 30
var FPS = 30;


Engine.prototype.start = function()
{
    var graveYard = new Array();
    var pGraveYard = new Array();
    var listener = Box2D.Dynamics.b2ContactListener;

    //Listener to handle collision between to Box2D Objects
    listener.BeginContact = function(contact)
    {
        var contactA = contact.GetFixtureA();
        var contactB = contact.GetFixtureB();

        //Listen to when Bomb Hits the Floor
        if(contactA.GetUserData().charAt(0) == 'B' || contactB.GetUserData().charAt(0) == 'B')
        {
            //If contact B is the bomb, then push contactB's body into the graveYard.
            if(contactA.GetUserData() == 'Floor')
            {
                contactB.SetUserData('dead'+contactB.GetUserData().charAt(4)); //for the gBombArray and the blade bomb
                contactB.GetBody().SetUserData('dead'+contactB.GetUserData().charAt(4)); //for passing into graveyard
                // console.log(contactB.GetUserData());
                graveYard.push(contactB.GetBody());
            }
            //If contact A is the bomb, then push contactA's body into the graveyard.
            else if(contactB.GetUserData() == 'Floor')
            {
                contactA.SetUserData('dead'+contactA.GetUserData().charAt(4));
                contactA.GetBody().SetUserData('dead'+contactA.GetUserData().charAt(4));
                console.log(contactA.GetUserData());
                graveYard.push(contactA.GetBody());
            }
        }

        //start statement for handling explosion and player collision
        contactA = contact.GetFixtureA();
        contactB = contact.GetFixtureB();

        //Listen to when explosions interacts with player
        if( contactA.GetUserData().substring(0, 6) == 'player' && 
            contactB.GetUserData().substring(1, 10) == 'explosion' ||
            contactB.GetUserData().substring(0, 6) == 'player' && 
            contactA.GetUserData().substring(1, 10) == 'explosion'
            )
        {
            var playerWhoShoots, playerWhoGotHit;
            //assign the variable correctly depends on the contacts
            if(contactA.GetUserData().substring(0, 6) == 'player')
            {
                playerWhoShoots = contactB.GetUserData().charAt(0);
                playerWhoGotHit = contactA.GetUserData().charAt(6);
            }
            else
            {
                playerWhoShoots = contactA.GetUserData().charAt(0);
                playerWhoGotHit = contactB.GetUserData().charAt(6);
            }
            //only gets points for kill
            
            var playerHitNum = parseInt(playerWhoGotHit);
            var playerNumInArray = -1; //in remote array
            var allPlayerArray = remotePlayers.slice(0);
            var pointsOfShooter = -1; //Temporary store shooters points
            allPlayerArray.push(localPlayer); //add the local player too so all player is in this array.

            if (playerWhoShoots != playerWhoGotHit && playerWhoGotHit == localPlayer.playerNumber)
            {
                if(localPlayer.invincibility == 1)
                {
                    //do nothing
                }
                else if(localPlayer.invincibility == 0)
                {
                    localPlayer.invincibility = 1;

                    //send signal that invins is ON!
                    socket.emit("invincibility on", {playerNum: localPlayer.playerNumber});

                    //set timeout so that invinsibility is turned down.
                    setTimeout(function()
                    {
                        localPlayer.invincibility = 0;
                        socket.emit("invincibility down", {playerNum: localPlayer.playerNumber});
                    }, 3000);

                    localPlayer.hp -= 1;
                    if (localPlayer.hp > 0)
                    {
                        for(var i = 0; i < allPlayerArray.length; i++)
                        {
                            if (allPlayerArray[i].playerNumber == playerHitNum)
                            {
                                playerNumInArray = i;
                            }
                        }
                        var vec = new box2d.b2Vec2(0, -0.8 * SCALE);
                        allPlayerArray[playerNumInArray].playerFixture.GetBody().ApplyImpulse(vec, allPlayerArray[playerNumInArray].playerFixture.GetBody().GetPosition());
                    }
                }
                if(localPlayer.hp <= 0)
                {
                    setTimeout(function()
                    {
                        localPlayer.moveToSpawn();
                    }, 1000)
                    localPlayer.hp = 5;
                    playerByPlayerNumber(playerWhoShoots).points += 1;

                    //If Score Limit Has been reached, alert other players
                    if (playerByPlayerNumber(playerWhoShoots).points == 2)
                    {
                        socket.emit("game end", {winner: playerWhoShoots});
                    }
                }
                pointsOfShooter = playerByPlayerNumber(playerWhoShoots).points;
                socket.emit("player hit", {playerWhoGotHit: playerWhoGotHit, health: localPlayer.hp, playerWhoShoots: playerWhoShoots, score: pointsOfShooter});
            }
            updateGUIScore();
        }

        if(contactA.GetUserData().substring(0,7) == "powerup" && contactB.GetUserData().substring(0,6) == 'player')
        {
            console.log("contactA: " + contactA.GetUserData().substring(0,7));
            // playerNumber = contactB.GetUserData().charAt(6);
            // powerUpID = contactA.GetUserData().charAt(7);


            contactA.SetUserData('dead'+contactA.GetUserData().charAt(4));
            contactA.GetBody().SetUserData('dead'+contactA.GetUserData().charAt(4));
                
            pGraveYard.push(contactA.GetBody());

            if(contactA.GetUserData().charAt(7) == 0 && contactB.GetUserData().charAt(6)==localPlayer.playerNumber) //Get Health
            {
                localPlayer.hp++;
                socket.emit("hp get", {playerNumber: localPlayer.playerNumber, health: localPlayer.hp});
                updateGUIScore();
            }
            else if(contactA.GetUserData().charAt(7) == 1 && contactB.GetUserData().charAt(6)==localPlayer.playerNumber) //Get Shield
            {
                localPlayer.hp++;
                socket.emit("hp get", {playerNumber: localPlayer.playerNumber, health: localPlayer.hp});
                updateGUIScore();
            }
        }

        else if(contactB.GetUserData().substring(0,7) == "powerup" && contactA.GetUserData().substring(0,6) == 'player')
        {
            console.log("contactB : " + contactB.GetUserData().substring(0,7));
            // playerNumber = contactA.GetUserData().charAt(6);
            // powerUpID = contactB.GetUserData().charAt(7);

            contactB.SetUserData('dead'+contactB.GetUserData().charAt(4));
            contactB.GetBody().SetUserData('dead'+contactB.GetUserData().charAt(4));
                
            pGraveYard.push(contactB.GetBody());

            if(contactB.GetUserData().charAt(7) == 0 && contactA.GetUserData().charAt(6)==localPlayer.playerNumber) //Get Health
            {
                localPlayer.hp++;
                socket.emit("hp get", {playerNumber: localPlayer.playerNumber, health: localPlayer.hp});
                updateGUIScore();
            }
            else if(contactB.GetUserData().charAt(7) == 1 && contactA.GetUserData().charAt(6)==localPlayer.playerNumber) //Get Shield
            {
                localPlayer.hp++;
                socket.emit("hp get", {playerNumber: localPlayer.playerNumber, health: localPlayer.hp});
                updateGUIScore();
            }

            
        }
    }

    listener.EndContact = function(contact) {
    // console.log(contact.GetFixtureA().GetBody().GetUserData());
    }
    listener.PostSolve = function(contact, impulse) 
    {
    }
    listener.PreSolve = function(contact, oldManifold) {
    // PreSolve
    }
    world.SetContactListener(listener);

    var gameStartTime = new Date().getTime();
    // use jQuery to bind to all key press events
    $(document).keydown(Engine.HandleInput);
    $(document).keyup(Engine.HandleInput);
    
    //Center the Canvas
    //If you wish to place it back to 0,0 remove this chunk and replace the bomb click function back to SCALE instead of 40
    var canvas = document.getElementById('main');
    var viewportWidth = window.innerWidth;
    var viewportHeight = window.innerHeight;
    var canvasWidth = viewportWidth * 0.8;
    var canvasHeight = canvasWidth / 2;

    canvas.style.position = "absolute";
    canvas.setAttribute("width", canvasWidth);
    canvas.setAttribute("height", canvasHeight);
    canvas.style.top = (viewportHeight - canvasHeight) / 2 + "px";
    canvas.style.left = (viewportWidth - canvasWidth) / 2 + "px";

    //Load cloud images and their x coordinates.
    var cloudArray = this.loadClouds();
    //Load star images.
    var starArray = this.loadStars();
    //Current frame for the star animation.
    var starIndex = 0;
    //Platform images
    var platformArray = this.loadPlatformImages();

    var lightsArray = this.loadLights();
    var lightsIndex = 0;

    var starIndexLast = starIndex;
    var starAnimationTime = new Date().getTime();
    var lightsAnimationTime = new Date().getTime();
    var explosionAnimationTime = new Date().getTime();
    var explosions = new Array();
    var explosionNumber = 0;
    //Currently set to wait 1 second so that all players can have a position assigned to them
    setTimeout(function()
    {
        localPlayer.moveToSpawn();
        for(i = 0; i < remotePlayers.length; i++) 
        {        
            console.log("Respawning all players");
            console.log(remotePlayers[i].id);
            console.log(remotePlayers[i].playerNumber);
            remotePlayers[i].moveToSpawn();
        }
    }, 1000)

    var self = this;

    setInterval(function()
    {
        self.update();
        self.draw();
        //Global Bomb Drawing---------------------------------------------------------------------------------------------------------------------------------------------
        self.drawBombs();
        //gBombArray = [];
        //CloudAnimation--------------------------------------------------------------------------------------------------------------------------------------------------
        cloudArray = self.updateCloudInformation(cloudArray).splice(0);
        self.animateClouds(cloudArray);
        //-----------------------------------------------------------------------------------------------------------------------------------------------------------------
        self.drawPlatforms(platformArray);
        //Star animation--------------------------------------------------------------------------------------------------------------------------------------------------
        starIndex = self.animateStars(starArray, starIndex, starAnimationTime, gameStartTime);

        if(starIndexLast != starIndex)
        {
            starIndexLast = starIndex;
            starAnimationTime = gameStartTime;
        }
        //-----------------------------------------------------------------------------------------------------------------------------------------------------------------

        //Lights Animation-------------------------------------------------------------------------------------------------------------------------------------------------
        if(self.animateLights(lightsArray, lightsIndex, lightsAnimationTime, gameStartTime) == true)
        {
            lightsAnimationTime = gameStartTime;
            lightsIndex++;
        }
        
      
        if(lightsIndex > 11)
         {
            lightsIndex = 0;
         }
        //Lights animation end----------------------------------------------------------------------------------------------------------------------------------------------

        localPlayer.draw(self.hyperBout.entityctx);
        //Animate the explosions
        self.animateExplosionSprite(explosions, self.entityCanvas);
        if(self.animateExplosions(explosionAnimationTime, gameStartTime, explosions, graveYard, explosionNumber) == true)
        {
                explosionAnimationTime = gameStartTime;
        }

        //Temporary emit to server, need to find more permanent version
        var playerVectorAndDirection = localPlayer.move();
        if(playerVectorAndDirection) {
            socket.emit("move player", playerVectorAndDirection);            
        }

        //Tell each player to draw themselves on the canvas
        gBombArray = gBombArray.concat(localPlayer.bombArray);
        localPlayer.bombArray = [];
        for (i = 0; i < remotePlayers.length; i++) 
        {
            //Ask for each player's array
            gBombArray = gBombArray.concat(remotePlayers[i].bombArray)
            remotePlayers[i].draw(self.hyperBout.entityctx);
        };

        for(i = 0; i < graveYard.length; i++)
        {
            //console.log(graveYard[i].GetPosition());
            self.createExplosion(graveYard[i], explosions);
            world.DestroyBody(graveYard[i]);
            graveYard.splice(i);
        };

        for(i = 0; i < pGraveYard.length; i++)
        {
            world.DestroyBody(pGraveYard[i]);
            pGraveYard.splice(i, 1);
        }

        var allPlayers = new Array();
        allPlayers.push(localPlayer);
        allPlayers = allPlayers.concat(remotePlayers);
        self.drawPowerUpSprites(self.hyperBout.entityctx);
        //Set position of localPlayer if falls off screen
        //Can probably send hp loss signal to other players here as well
        //May be more efficent if we fire it off an event instead of checking 30 times per second
        if(localPlayer.playerFixture.GetBody().GetPosition().y > 20)
        {
            localPlayer.moveToSpawn();
        }
        gameStartTime = new Date().getTime();
    }, 1000/FPS);
    
    setInterval(sendPosition, 10);
};

Engine.prototype.drawBombs = function()
{
    var playerBomb = new Image();
    playerBomb.src = 'images/projectileBladeBomb.png';
    for (i=0;i<gBombArray.length;i++)
    {
        //console.log(gBombArray[i].GetUserData());
        if(gBombArray[i].GetUserData().substring(0,4) == 'dead')
        {   
            gBombArray.splice(i, 1);
        }
        else
        {
             this.hyperBout.entityctx.drawImage(playerBomb, (gBombArray[i].GetBody().GetPosition().x * SCALE) - 25, (gBombArray[i].GetBody().GetPosition().y * SCALE) - 25);
        }
    }
}
Engine.prototype.drawPowerUpSprites = function(canvas)
{
    var powerUpImage = new Image();
    powerUpImage.src = 'images/projectileBladeBomb.png';

    for (i=0;i<powerUps.length;i++)
    {
        if(powerUps[i].powerUpFixture.GetUserData().substring(0,4) == 'dead')
        {
            powerUps.splice(i,1);
        }
        powerUps[i].draw(canvas);
    }
}
Engine.prototype.createExplosion = function(bombBody, explosions)
{
    var testFix = new box2d.b2FixtureDef();
    testFix.density = 1;
    testFix.friction = 0.5;
    // testFix.categoryBits = 0x0008;
    //testFix.filter.maskBits = 0x0001;
    var testDef = new box2d.b2BodyDef();
    testDef.type = box2d.b2Body.b2_dynamicBody;
    testDef.position.x = bombBody.GetPosition().x;
    testDef.position.y = bombBody.GetPosition().y - (20 / SCALE);
    testFix.shape = new box2d.b2PolygonShape;
    testFix.shape.SetAsBox((25/SCALE)/2, (70 / SCALE) / 2);
    var bombExplosion = world.CreateBody(testDef).CreateFixture(testFix);
    
    bombExplosion.SetUserData(bombBody.GetUserData().charAt(4)+'explosion0');

    explosions.push(bombExplosion);
}

Engine.prototype.animateExplosions = function(explosionAnimationTime, gameTime, explosions, graveYard, animateType)
{
    var playerNumber = -2;
    if(gameTime - explosionAnimationTime > 0)
    {
       for(i = 0; i < explosions.length; i++)
       {
            //console.log(explosions[i].GetUserData());
            playerNumber = explosions[i].GetUserData().charAt(0);
            if(explosions[i].GetUserData().substring(1) == 'explosion0')
            {
                explosions[i].GetShape().SetAsBox((25/SCALE)/2, (70 / SCALE) / 2);
                explosions[i].SetUserData(playerNumber+'explosion1');
                
            }
            else if(explosions[i].GetUserData().substring(1) == 'explosion1')
            {
                explosions[i].GetShape().SetAsBox((25/SCALE)/2, (60 / SCALE) / 2);
                explosions[i].SetUserData(playerNumber+'explosion2');
                
            }
            else if(explosions[i].GetUserData().substring(1) == 'explosion2')
            {
                explosions[i].GetShape().SetAsBox((23/SCALE)/2, (50 / SCALE) / 2);
                explosions[i].SetUserData(playerNumber+'explosion3');
                
            }
            else if(explosions[i].GetUserData().substring(1) == 'explosion3')
            {
                explosions[i].GetShape().SetAsBox((20/SCALE)/2, (40 / SCALE) / 2);
                explosions[i].SetUserData(playerNumber+'explosion4');
                
            }
            else if(explosions[i].GetUserData().substring(1) == 'explosion4')
            {
                explosions[i].GetShape().SetAsBox((18/SCALE)/2, (30 / SCALE) / 2);
                explosions[i].SetUserData(playerNumber+'explosion5');
                
            }
            else if(explosions[i].GetUserData().substring(1) == 'explosion5')
            {
                explosions[i].GetShape().SetAsBox((16/SCALE)/2, (20 / SCALE) / 2);
                explosions[i].SetUserData(playerNumber+'explosion6');
                
            }
            else if(explosions[i].GetUserData().substring(1) == 'explosion6')
            {
                explosions[i].GetShape().SetAsBox((12/SCALE)/2, (15 / SCALE) / 2);
                explosions[i].SetUserData(playerNumber+'explosion7');
                
            }
            else if(explosions[i].GetUserData().substring(1) == 'explosion7')
            {
                explosions[i].GetShape().SetAsBox((8/SCALE)/2, (10 / SCALE) / 2);
                explosions[i].SetUserData(playerNumber+'explosion8');
                
            }
            else if(explosions[i].GetUserData().substring(1) == 'explosion8')
            {
                explosions[i].GetShape().SetAsBox((6/SCALE)/2, (4 / SCALE) / 2);
                explosions[i].SetUserData(playerNumber+'explosion9');
                
            }
            else if(explosions[i].GetUserData().substring(1) == 'explosion9')
            {
                explosions[i].GetShape().SetAsBox((4/SCALE)/2, (2 / SCALE) / 2);
                explosions[i].SetUserData(playerNumber+'explosion10');
                
            }
            else if(explosions[i].GetUserData().substring(1) == 'explosion10')
            {
                world.DestroyBody(explosions[i].GetBody());
                explosions.splice(i, 1);
            }
       }
       return true;
    }
    return false;
}

Engine.prototype.animateExplosionSprite = function(explosionArray, entCanvas)
{
    for(i = 0; i < explosionArray.length; i++)
    {
        var explosionData = explosionArray[i].GetUserData().substring(1);
        
        //Uncomment to reapply opposite upward gravity
        var oppositeGravity = new box2d.b2Vec2(0,-3.5);
        explosionArray[i].GetBody().ApplyImpulse(oppositeGravity, explosionArray[i].GetBody().GetPosition());
        if(explosionData == 'explosion0')
        {
            
            var explosionImage = new Image();
            explosionImage.src = 'images/explosions/exp0.png';

           this.hyperBout.entityctx.drawImage(explosionImage, (explosionArray[i].GetBody().GetPosition().x * SCALE) - 25, (explosionArray[i].GetBody().GetPosition().y * SCALE - 90));
           break;
        }
        else if(explosionData == 'explosion1')
        {

            var explosionImage = new Image();
            explosionImage.src = 'images/explosions/exp1.png';

           this.hyperBout.entityctx.drawImage(explosionImage, (explosionArray[i].GetBody().GetPosition().x * SCALE) - 25, (explosionArray[i].GetBody().GetPosition().y * SCALE - 90) );
           break;
        }
        else if(explosionData == 'explosion2')
        {

            var explosionImage = new Image();
            explosionImage.src = 'images/explosions/exp2.png';

           this.hyperBout.entityctx.drawImage(explosionImage, (explosionArray[i].GetBody().GetPosition().x * SCALE) - 25, (explosionArray[i].GetBody().GetPosition().y * SCALE - 90) );
           break;
        }
        else if(explosionData == 'explosion3')
        {

            var explosionImage = new Image();
            explosionImage.src = 'images/explosions/exp3.png';

           this.hyperBout.entityctx.drawImage(explosionImage, (explosionArray[i].GetBody().GetPosition().x * SCALE) - 25, (explosionArray[i].GetBody().GetPosition().y * SCALE - 90) );
           break;
        }
        else if(explosionData == 'explosion4')
        {

            var explosionImage = new Image();
            explosionImage.src = 'images/explosions/exp4.png';

           this.hyperBout.entityctx.drawImage(explosionImage, (explosionArray[i].GetBody().GetPosition().x * SCALE) - 25, (explosionArray[i].GetBody().GetPosition().y * SCALE - 90));
           break;
        }
        else if(explosionData == 'explosion5')
        {

            var explosionImage = new Image();
            explosionImage.src = 'images/explosions/exp5.png';

           this.hyperBout.entityctx.drawImage(explosionImage, (explosionArray[i].GetBody().GetPosition().x * SCALE) - 25, (explosionArray[i].GetBody().GetPosition().y * SCALE - 90));
           break;
        }
        else if(explosionData == 'explosion6')
        {

            var explosionImage = new Image();
            explosionImage.src = 'images/explosions/exp6.png';

           this.hyperBout.entityctx.drawImage(explosionImage, (explosionArray[i].GetBody().GetPosition().x * SCALE) - 25, (explosionArray[i].GetBody().GetPosition().y * SCALE - 90));
           break;
        }
        else if(explosionData == 'explosion7')
        {

            var explosionImage = new Image();
            explosionImage.src = 'images/explosions/exp7.png';

           this.hyperBout.entityctx.drawImage(explosionImage, (explosionArray[i].GetBody().GetPosition().x * SCALE) - 25, (explosionArray[i].GetBody().GetPosition().y * SCALE - 90));
           break;
        }
        else if(explosionData == 'explosion8')
        {

            var explosionImage = new Image();
            explosionImage.src = 'images/explosions/exp8.png';

           this.hyperBout.entityctx.drawImage(explosionImage, (explosionArray[i].GetBody().GetPosition().x * SCALE) - 25, (explosionArray[i].GetBody().GetPosition().y * SCALE - 90));
           break;
        }
        else if(explosionData == 'explosion9')
        {

            var explosionImage = new Image();
            explosionImage.src = 'images/explosions/exp9.png';

           this.hyperBout.entityctx.drawImage(explosionImage, (explosionArray[i].GetBody().GetPosition().x * SCALE) - 25, (explosionArray[i].GetBody().GetPosition().y * SCALE - 90) );
           break;
        }
        else if(explosionData == 'explosion10')
        {

            var explosionImage = new Image();
            explosionImage.src = 'images/explosions/exp10.png';

           this.hyperBout.entityctx.drawImage(explosionImage, (explosionArray[i].GetBody().GetPosition().x * SCALE) - 25, (explosionArray[i].GetBody().GetPosition().y * SCALE - 90));
           break;
        }
    }
}

//Draw text to test updating
Engine.prototype.draw = function()
{
    //Clear the canvas
    this.hyperBout.entityctx.clearRect(0, 0, this.hyperBout.width, this.hyperBout.height);
    this.hyperBout.animationctx.clearRect(0, 0, this.hyperBout.width, this.hyperBout.height);

    world.Step(
        1 / FPS
        , 10
        , 10
        );
    world.DrawDebugData();
    world.ClearForces();
}

Engine.prototype.drawPlatforms = function(platformArray)
{
    this.hyperBout.animationctx.drawImage(platformArray[0] , 0, 400);
}

Engine.prototype.loadPlatformImages = function()
{
    var bottomLeftPlatform = new Image();
    bottomLeftPlatform.src = 'images/platforms/platformBottomLeft.png';

    var platforms = new Array();
    platforms.push(bottomLeftPlatform);

    return platforms;
}

Engine.prototype.animateClouds = function(cloudArrayInformation)
{

    this.hyperBout.animationctx.drawImage(cloudArrayInformation[8], cloudArrayInformation[9], 40);
    this.hyperBout.animationctx.drawImage(cloudArrayInformation[10], cloudArrayInformation[11], 40);

    this.hyperBout.animationctx.drawImage(cloudArrayInformation[4], cloudArrayInformation[5], 20);
    this.hyperBout.animationctx.drawImage(cloudArrayInformation[6], cloudArrayInformation[7], 20);

    this.hyperBout.animationctx.drawImage(cloudArrayInformation[0], cloudArrayInformation[1], 0);
    this.hyperBout.animationctx.drawImage(cloudArrayInformation[2], cloudArrayInformation[3], 0);

    this.hyperBout.animationctx.drawImage(cloudArrayInformation[12], cloudArrayInformation[13], 500);
    this.hyperBout.animationctx.drawImage(cloudArrayInformation[14], cloudArrayInformation[15], 500);
}

Engine.prototype.animateStars = function(starArray, starIndex, starAnimation, gameTime)
{
    var starIndexTemp = starIndex;
    if((gameTime - starAnimation) > 100)
    {
        starIndex++;
    }
    if(starIndex > 5)
    {
        starIndex = 0;
    }
    this.hyperBout.animationctx.drawImage(starArray[starIndex], 500, 110);
    starIndexTemp = (starIndexTemp + 2);
    if(starIndexTemp == 6)
    {
        starIndexTemp = 0;
    }
    if(starIndexTemp == 7)
    {
        starIndexTemp = 1;
    }
    

    this.hyperBout.animationctx.drawImage(starArray[starIndexTemp], 1000, 160);
    return starIndex;
}

Engine.prototype.animateLights = function(lightsArray, lightsIndex, lightAnimationTime, gameTime)
{
    if((gameTime - lightAnimationTime) > 60)
    {
        this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 50, 431);
        lightsIndex = animateLightsHelper(lightsIndex);
        this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 146, 431);
        lightsIndex = animateLightsHelper(lightsIndex);
        this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 242, 431);
        lightsIndex = animateLightsHelper(lightsIndex);
        this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 338, 431);
        lightsIndex = animateLightsHelper(lightsIndex);
        this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 660, 431);
        lightsIndex = animateLightsHelper(lightsIndex);
        this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 755, 431);
        lightsIndex = animateLightsHelper(lightsIndex);
        this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 851, 431);
        lightsIndex = animateLightsHelper(lightsIndex);
        this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 947, 431);
        lightsIndex = animateLightsHelper(lightsIndex);
        this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 1043, 431);
        return true;
    }
     this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 50, 431);
    lightsIndex = animateLightsHelper(lightsIndex);
    this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 146, 431);
    lightsIndex = animateLightsHelper(lightsIndex);
    this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 242, 431);
    lightsIndex = animateLightsHelper(lightsIndex);
    this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 338, 431);
    lightsIndex = animateLightsHelper(lightsIndex);
    this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 660, 431);
    lightsIndex = animateLightsHelper(lightsIndex);
     this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 755, 431);
     lightsIndex = animateLightsHelper(lightsIndex);
     this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 851, 431);
     lightsIndex = animateLightsHelper(lightsIndex);
    this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 947, 431);
    lightsIndex = animateLightsHelper(lightsIndex);
    this.hyperBout.animationctx.drawImage(lightsArray[lightsIndex], 1043, 431);

    return false;      
}

animateLightsHelper = function(currentIndex)
{
    currentIndex++;
    if(currentIndex == 12)
    {
        currentIndex = 0;
    }
    return currentIndex;
}

Engine.prototype.loadStars = function()
{
    var starZero = new Image();
    var starOne = new Image();
    var starTwo = new Image();
    var starThree = new Image();
    var starFour = new Image();
    var starFive = new Image();
    var starSix = new Image();
    starZero.src = 'images/stars/star0.png';
    starOne.src = 'images/stars/star1.png';
    starTwo.src = 'images/stars/star2.png';
    starThree.src = 'images/stars/star3.png';
    starFour.src = 'images/stars/star4.png';
    starFive.src = 'images/stars/star5.png';

    var stars = new Array();
    stars[0] = starZero;
    stars[1] = starOne;
    stars[2] = starTwo;
    stars[3] = starThree;
    stars[4] = starFour;
    stars[5] = starFive;
    stars[6] = starSix;

    return stars;
}

Engine.prototype.loadLights = function()
{
    var lights0 = new Image();
    var lights1 = new Image();
    var lights2 = new Image();
    var lights3 = new Image();
    var lights4 = new Image();
    var lights5 = new Image();
    var lights6 = new Image();
    var lights7 = new Image();
    var lights8 = new Image();
    var lights9 = new Image();
    var lights10 = new Image();
    var lights11 = new Image();

    lights0.src = 'images/lights/lights0.png';
    lights1.src = 'images/lights/lights1.png';
    lights2.src = 'images/lights/lights2.png';
    lights3.src = 'images/lights/lights3.png';
    lights4.src = 'images/lights/lights4.png';
    lights5.src = 'images/lights/lights5.png';
    lights6.src = 'images/lights/lights6.png';
    lights7.src = 'images/lights/lights7.png';
    lights8.src = 'images/lights/lights8.png';
    lights9.src = 'images/lights/lights9.png';
    lights10.src = 'images/lights/lights10.png';
    lights11.src = 'images/lights/lights11.png';

    var lights = new Array();

    lights.push(lights0);
    lights.push(lights1);
    lights.push(lights2);
    lights.push(lights3);
    lights.push(lights4);
    lights.push(lights5);
    lights.push(lights6);
    lights.push(lights7);
    lights.push(lights8);
    lights.push(lights9);
    lights.push(lights10);
    lights.push(lights11);

    return lights;
}

Engine.prototype.loadClouds = function()
{
    var cloudOneImageOne = new Image();
    cloudOneImageOne.src = 'images/clouds.png';
    var x1 = 0;

    var cloudOneImageTwo = new Image();
    cloudOneImageTwo.src = 'images/clouds.png';
    var x2 = 1120;

    var cloudTwoImageOne = new Image();
    cloudTwoImageOne.src = 'images/clouds2.png';
    var x21 = -20;

    var cloudTwoImageTwo = new Image();
    cloudTwoImageTwo.src = 'images/clouds2.png';
    var x22 = 1100

    var cloudThreeImageOne = new Image();
    cloudThreeImageOne.src = 'images/clouds3.png';
    var x31 = -20;

    var cloudThreeImageTwo = new Image();
    cloudThreeImageTwo.src = 'images/clouds3.png';
    var x32 = 1100;

    var waterImageOne = new Image();
    waterImageOne.src = 'images/water.png';
    var waterX1 = 0;

    var waterImageTwo = new Image();
    waterImageTwo.src = 'images/water.png';
    var waterX2 = 1120;

    var cloudInformation = new Array();

    //0
    cloudInformation.push(cloudOneImageOne);
    cloudInformation.push(x1);
    //2
    cloudInformation.push(cloudOneImageTwo);
    cloudInformation.push(x2);
    //4
    cloudInformation.push(cloudTwoImageOne);
    cloudInformation.push(x21);
    //6
    cloudInformation.push(cloudTwoImageTwo);
    cloudInformation.push(x22);
    //8
    cloudInformation.push(cloudThreeImageOne);
    cloudInformation.push(x31);
    //10
    cloudInformation.push(cloudThreeImageTwo);
    cloudInformation.push(x32);
    //12
    cloudInformation.push(waterImageOne);
    cloudInformation.push(waterX1);
    //14
    cloudInformation.push(waterImageTwo);
    cloudInformation.push(waterX2);

    return cloudInformation;
}

Engine.prototype.updateCloudInformation = function(cloudInformationArray)
{
        cloudInformationArray[1] = cloudInformationArray[1] - 4;
        cloudInformationArray[3] = cloudInformationArray[3] - 4;
        cloudInformationArray[5] = cloudInformationArray[5] - 2;
        cloudInformationArray[7] = cloudInformationArray[7] - 2;
        cloudInformationArray[9] = cloudInformationArray[9] - 1;
        cloudInformationArray[11] = cloudInformationArray[11] - 1;
        cloudInformationArray[13] = cloudInformationArray[13] - 0.4;
        cloudInformationArray[15] = cloudInformationArray[15] - 0.4;

        if(cloudInformationArray[1] <= -1120)
        {
            cloudInformationArray[1] = 1120;
        }
        if(cloudInformationArray[3] <= -1120)
        {
            cloudInformationArray[3] = 1120;
        }
        if(cloudInformationArray[5] <= -1140)
        {
            cloudInformationArray[5] = 1100;
        }
        if(cloudInformationArray[7] <= -1140)
        {
            cloudInformationArray[7] = 1100;
        }
        if(cloudInformationArray[9] <= -1140)
        {
            cloudInformationArray[9]= 1100;
        }
        if(cloudInformationArray[11] <= - 1140)
        {
            cloudInformationArray[11] = 1100;
        }
        if(cloudInformationArray[13] <= - 1120)
        {
            cloudInformationArray[13] = 1120;
        }
        if(cloudInformationArray[15] <= -1120)
        {
            cloudInformationArray[15] = 1120;
        }
        return cloudInformationArray;
}

//Move the text diagonal
Engine.prototype.update = function()
{
    

}

//Canvas wrapper
function CanvasWrapper(backCanvasId, entityCanvasId, animationCanvasId, width, height) {
    //Canvas for storing the background image
    this.canvas = document.getElementById(backCanvasId);
    this.ctx = this.canvas.getContext('2d');
    //Canvas for drawing entities such as players and projectiles.
    this.entityCanvas = document.getElementById(entityCanvasId);
    this.entityctx = this.entityCanvas.getContext('2d');
    //Canvas for animating clouds and what not
    this.animationCanvas = document.getElementById(animationCanvasId);
    this.animationctx = this.animationCanvas.getContext('2d');

    this.width = width;
    this.height = height;
}

/**************************************************
** HELPER FUNCTIONS
**************************************************/
function playerById(id) {
    var i;
    for (i = 0; i < remotePlayers.length; i++) 
    {
        if (remotePlayers[i].id == id)
            return remotePlayers[i];
    }
    return false;
};

function playerByPlayerNumber(playerNumber) {
    var i;
    for (i = 0; i < remotePlayers.length; i++) 
    {
        if (remotePlayers[i].playerNumber == playerNumber)
            return remotePlayers[i];
    }
    return false;
};

function updateGUIScore(){
    
    var allPlayers = new Array();
    allPlayers.push(localPlayer);
    allPlayers = allPlayers.concat(remotePlayers);
    
    for (i = 0; i < allPlayers.length; i++) 
    {
        if (allPlayers[i].playerNumber == 1)
        {
            $('#1hp').html('<FONT COLOR="WHITE">'+allPlayers[i].hp+'</FONT>');
            $('#1p').html('<FONT COLOR="WHITE">'+allPlayers[i].points+'</FONT>');
        }
        else if (allPlayers[i].playerNumber == 2)
        {
            $('#2hp').html('<FONT COLOR="WHITE">'+allPlayers[i].hp+'</FONT>');
            $('#2p').html('<FONT COLOR="WHITE">'+allPlayers[i].points+'</FONT>');
        }
        else if (allPlayers[i].playerNumber == 3)
        {
            $('#3hp').html('<FONT COLOR="WHITE">'+allPlayers[i].hp+'</FONT>');
            $('#3p').html('<FONT COLOR="WHITE">'+allPlayers[i].points+'</FONT>');
        }
        else if (allPlayers[i].playerNumber == 4)
        {
            $('#4hp').html('<FONT COLOR="WHITE">'+allPlayers[i].hp+'</FONT>');
            $('#4p').html('<FONT COLOR="WHITE">'+allPlayers[i].points+'</FONT>');
        }
    }
};