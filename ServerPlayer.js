//Player class
var HyperPlayer = function(){
    var healthPoints = 5,
    bombThrowCount = 0, 
    id = 1,
    playerNumber = -1,
    invincibility = 0,
    direction = 0, 
    leftRight = 0, //0 for right
    
    //Movement and location variables
    xpos = 68,
    ypos = 68,
    xspeed = 1,
    yspeed = 0,

    //Maximum Boundary Variables
    minx = 0,
    miny = 0,
    maxx = 1122,
    maxy = 548;

    // Getters and setters
    var getX = function() {
        return xpos;
    };

    var getY = function() {
        return ypos;
    };

    var setX = function(newX) {
        xpos = newX;
    };

    var setY = function(newY) {
        ypos = newY;
    };

    return {
        getX: getX,
        getY: getY,
        setX: setX,
        setY: setY,
        id: id,
        playerNumber: playerNumber
    }
};

exports.HyperPlayer = HyperPlayer;
