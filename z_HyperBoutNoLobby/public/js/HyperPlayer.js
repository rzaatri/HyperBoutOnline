//Player class
var HyperPlayer = function(){
    this.hp = 5;
    this.id = 1;
    this.invincibility = 0;
    this.playerNumber = -1;
    this.direction = 0;
    this.points = 0;
    this.leftRight = 0; //0 for right

    //Movement and location variables
    this.xpos = 100;
    this.ypos = 68;
    this.xspeed = 1;
    this.yspeed = 0;
    //Maximum Boundary Variables
    this.minx = 0;
    this.miny = 0;
    this.maxx = 1122;
    this.maxy = 548;
    this.maxSpeed = 7;
    this.throwCooldown = 0;

    this.bombArray = new Array();

    //Getters and Setters for position
    HyperPlayer.prototype.getX = function() {
        return this.xpos;
    };

    HyperPlayer.prototype.getY = function() {
        return this.ypos;
    };

    HyperPlayer.prototype.setX = function(newX) {
        this.xpos = newX;
    };

    HyperPlayer.prototype.setY = function(newY) {
        this.ypos = newY;
    };
    
    //Player image
    this.playerImage = new Image();
    this.playerImage.src = "images/player/p1standright.png";

    this.shieldImage = new Image();
    this.shieldImage.src = 'images/shield.png';

    this.playerBomb = new Image();
    this.playerBomb.src = 'images/projectileBladeBomb.png';

    var fixDef = new box2d.b2FixtureDef();
    fixDef.density = 1;
    fixDef.friction = 0.5;
    fixDef.filter.categoryBits = 0x0002;
    fixDef.filter.maskBits = 0x0001;
    //Now we need to define the body, static (not affected by gravity), dynamic (affected by grav)
    var bodyDef = new box2d.b2BodyDef();
    bodyDef.type = box2d.b2Body.b2_dynamicBody; //We're setting the ground to static.
    bodyDef.position.x = this.xpos  / SCALE; //Registration point is in the center for box2d entities.
    bodyDef.position.y = this.ypos / SCALE;
    bodyDef.fixedRotation = true;
    fixDef.shape = new box2d.b2PolygonShape; //setting the shape of the ground.
    fixDef.shape.SetAsBox((30 / SCALE) / 2, (40 / SCALE)/2);
    fixDef.friction = 4;

    this.playerFixture = world.CreateBody(bodyDef).CreateFixture(fixDef);
    this.playerFixture.GetBody().SetSleepingAllowed(false);

    var self = this;
    Engine.RegisterInputHandler(new Engine.InputHandler('player', function(event) {
        if (HyperPlayer.IsMovementKey(event.which)) {
            if (event.type == 'keydown') {
                self.onKeyDown(event);
            }
            else if (event.type == 'keyup') {
                self.onKeyUp(event);
            }
        }
    }));

};

HyperPlayer.IsMovementKey = function(keyCode) {
    return keyCode == HyperKeys.Codes['a'] ||
           keyCode == HyperKeys.Codes['s'] || // 's'
           keyCode == HyperKeys.Codes['space'] || // 'w'
           keyCode == HyperKeys.Codes['d'];   // 'd'
};

HyperPlayer.prototype.onKeyDown = function(event) {
    this.direction = this.combineKey(event.which, this.direction);
};

HyperPlayer.prototype.onKeyUp = function(event) {
    this.direction = this.removeKey(event.which, this.direction);
};

HyperPlayer.prototype.draw = function(canvasctx)
{   
    canvasctx.drawImage(this.playerImage, (this.playerFixture.GetBody().GetPosition().x * SCALE) - 15, (this.playerFixture.GetBody().GetPosition().y * SCALE) - 20);
    if(this.invincibility == 1)
    {
        canvasctx.drawImage(this.shieldImage, (this.playerFixture.GetBody().GetPosition().x * SCALE) - 15, (this.playerFixture.GetBody().GetPosition().y * SCALE) - 20);
    }
};

//Movement function for players
HyperPlayer.prototype.move = function(args)
{
    var vec = this.getMoveVector();
    return vec;
};

HyperPlayer.prototype.moveToSpawn = function()
{
    this.playerFixture.SetUserData('player' + this.playerNumber);
    if (this.playerNumber == 1)
    {
        this.leftRight = 0;
        var pos = this.playerFixture.GetBody().GetPosition();
        pos.x = 6.83;
        pos.y = 2.33;
        this.playerImage.src = "images/player/p1standright.png";
        this.playerFixture.GetBody().SetPosition(pos);
    }
    else if (this.playerNumber == 2)
    {
        this.leftRight = 1;
        var pos = this.playerFixture.GetBody().GetPosition();
        pos.x = 30.83;
        pos.y = 2.33;
        this.playerImage.src = "images/player/p2standleft.png";
        this.playerFixture.GetBody().SetPosition(pos);
    }
    else if (this.playerNumber == 3)
    {
        this.leftRight = 0;
        var pos = this.playerFixture.GetBody().GetPosition();
        pos.x = 6.83;
        pos.y = 12.33;
        this.playerImage.src = "images/player/p3standright.png";
        this.playerFixture.GetBody().SetPosition(pos);
    }
    else if (this.playerNumber == 4)
    {
        this.leftRight = 1;
        var pos = this.playerFixture.GetBody().GetPosition();
        pos.x = 30.83;
        pos.y = 12.33;
        this.playerImage.src = "images/player/p4standleft.png";
        this.playerFixture.GetBody().SetPosition(pos);
    }
};

HyperPlayer.prototype.movePlayerToPosition = function(xPos, yPos)
{
        var pos = this.playerFixture.GetBody().GetPosition();
        pos.x = xPos;
        pos.y = yPos;
        this.playerFixture.GetBody().SetPosition(pos);
};

HyperPlayer.prototype.getXPosition = function()
{
    var pos = this.playerFixture.GetBody().GetPosition();
    return pos.x;
};

HyperPlayer.prototype.getYPosition = function()
{
    var pos = this.playerFixture.GetBody().GetPosition();
    return pos.y;
};

HyperPlayer.prototype.getMoveVector = function() 
{
    var direction = this.direction;
    switch(direction) 
    {
    
    case HyperPlayer.MoveLeft:
        if(this.playerFixture.GetBody().GetLinearVelocity().x > -this.maxSpeed)
        {
            this.leftRight = 1;
            var vec = new box2d.b2Vec2(-0.2 * SCALE, 0);
            this.playerFixture.GetBody().ApplyImpulse(vec, this.playerFixture.GetBody().GetPosition());

            //Set Direction
            if (this.playerNumber == 1)
            {
                this.playerImage.src = "images/player/p1runleft.png";
            }
            else if (this.playerNumber == 2)
            {
                this.playerImage.src = "images/player/p2runleft.png";
            }
            else if (this.playerNumber == 3)
            {
                this.playerImage.src = "images/player/p3runleft.png";
            }
            else if (this.playerNumber == 4)
            {
                this.playerImage.src = "images/player/p4runleft.png";
            }

            return {playerVector: vec, direction: "left", leftRight: this.leftRight};
        }
        break;

    case HyperPlayer.MoveUp:
        if(this.playerFixture.GetBody().GetLinearVelocity().y == 0)
        {
            var vec = new box2d.b2Vec2(0, -0.8 * SCALE);
            this.playerFixture.GetBody().ApplyImpulse(vec, this.playerFixture.GetBody().GetPosition());
            if(this.leftRight == 1)
            {
                if (this.playerNumber == 1)
                {
                    this.playerImage.src = "images/player/p1jumpleft.png";
                }
                else if (this.playerNumber == 2)
                {
                    this.playerImage.src = "images/player/p2jumpleft.png";
                }
                else if (this.playerNumber == 3)
                {
                    this.playerImage.src = "images/player/p3jumpleft.png";
                }
                else if (this.playerNumber == 4)
                {
                    this.playerImage.src = "images/player/p4jumpleft.png";
                }
            }
            else if(this.leftRight == 0)
            {
                if (this.playerNumber == 1)
                {
                    this.playerImage.src = "images/player/p1jumpright.png";
                }
                else if (this.playerNumber == 2)
                {
                    this.playerImage.src = "images/player/p2jumpright.png";
                }
                else if (this.playerNumber == 3)
                {
                    this.playerImage.src = "images/player/p3jumpright.png";
                }
                else if (this.playerNumber == 4)
                {
                    this.playerImage.src = "images/player/p4jumpright.png";
                }
            }
            return {playerVector: vec, direction: "up", leftRight: this.leftRight};
        }
        break;

    case HyperPlayer.MoveRight:
        if(this.playerFixture.GetBody().GetLinearVelocity().x < this.maxSpeed)
        {
            this.leftRight = 0;
            var vec = new box2d.b2Vec2(0.2 * SCALE, 0);
            this.playerFixture.GetBody().ApplyImpulse(vec, this.playerFixture.GetBody().GetPosition());

            //Set Direction
            if (this.playerNumber == 1)
            {
                this.playerImage.src = "images/player/p1runright.png";
            }
            else if (this.playerNumber == 2)
            {
                this.playerImage.src = "images/player/p2runright.png";
            }
            else if (this.playerNumber == 3)
            {
                this.playerImage.src = "images/player/p3runright.png";
            }
            else if (this.playerNumber == 4)
            {
                this.playerImage.src = "images/player/p4runright.png";
            }

            return {playerVector: vec, direction: "right", leftRight: this.leftRight};
        }
        break;

    case HyperPlayer.MoveLeft | HyperPlayer.MoveUp :
        if(this.playerFixture.GetBody().GetLinearVelocity().x > -this.maxSpeed && this.playerFixture.GetBody().GetLinearVelocity().y == 0)
        {
            this.leftRight = 1;
            var vec = new box2d.b2Vec2(-0.2 * SCALE, -0.8 * SCALE);
            this.playerFixture.GetBody().ApplyImpulse(vec, this.playerFixture.GetBody().GetPosition());
            
            //Set Direction
            if (this.playerNumber == 1)
            {
                this.playerImage.src = "images/player/p1jumpleft.png";
            }
            else if (this.playerNumber == 2)
            {
                this.playerImage.src = "images/player/p2jumpleft.png";
            }
            else if (this.playerNumber == 3)
            {
                this.playerImage.src = "images/player/p3jumpleft.png";
            }
            else if (this.playerNumber == 4)
            {
                this.playerImage.src = "images/player/p4jumpleft.png";
            }

            return {playerVector: vec, direction: "leftup", leftRight: this.leftRight};
        }
        break;

    case HyperPlayer.MoveRight | HyperPlayer.MoveUp:
        if(this.playerFixture.GetBody().GetLinearVelocity().x < this.maxSpeed && this.playerFixture.GetBody().GetLinearVelocity().y == 0)
        {
            this.leftRight = 0;
            var vec = new box2d.b2Vec2(0.2 * SCALE, -0.8 * SCALE);
            this.playerFixture.GetBody().ApplyImpulse(vec, this.playerFixture.GetBody().GetPosition());
            
            //Set Direction
            if (this.playerNumber == 1)
            {
                this.playerImage.src = "images/player/p1jumpright.png";
            }
            else if (this.playerNumber == 2)
            {
                this.playerImage.src = "images/player/p2jumpright.png";
            }
            else if (this.playerNumber == 3)
            {
                this.playerImage.src = "images/player/p3jumpright.png";
            }
            else if (this.playerNumber == 4)
            {
                this.playerImage.src = "images/player/p4jumpright.png";
            }

            return {playerVector: vec, direction: "rightup", leftRight: this.leftRight};
        }
        break;

    case HyperPlayer.MoveDown:
        var x = this.playerFixture.GetBody().GetPosition().x;
        var y = this.playerFixture.GetBody().GetPosition().y;
        console.log("POS:::"+x+" "+y);
        console.log("Player Server ID: "+ this.id);
        console.log("Player Number: "+ this.playerNumber);
        break; 

    default:
        if(this.leftRight == 1)
        {
            if (this.playerNumber == 1)
            {
                this.playerImage.src = "images/player/p1standleft.png";
            }
            else if (this.playerNumber == 2)
            {
                this.playerImage.src = "images/player/p2standleft.png";
            }
            else if (this.playerNumber == 3)
            {
                this.playerImage.src = "images/player/p3standleft.png";
            }
            else if (this.playerNumber == 4)
            {
                this.playerImage.src = "images/player/p4standleft.png";
            }
        }
        else if(this.leftRight == 0)
        {
            if (this.playerNumber == 1)
            {
                this.playerImage.src = "images/player/p1standright.png";
            }
            else if (this.playerNumber == 2)
            {
                this.playerImage.src = "images/player/p2standright.png";
            }
            else if (this.playerNumber == 3)
            {
                this.playerImage.src = "images/player/p3standright.png";
            }
            else if (this.playerNumber == 4)
            {
                this.playerImage.src = "images/player/p4standright.png";
            }
        }
        return {playerVector: vec, direction: null, leftRight: this.leftRight};
    }
    return false;
};

HyperPlayer.prototype.remotePlayerMove = function(args) {
    var direction = args.direction;
    // console.log(args);

    switch(direction) {
    case "left":
        args.leftRight = 1;
        if (this.playerNumber == 1)
        {
            this.playerImage.src = "images/player/p1runleft.png";
        }
        else if (this.playerNumber == 2)
        {
            this.playerImage.src = "images/player/p2runleft.png";
        }
        else if (this.playerNumber == 3)
        {
            this.playerImage.src = "images/player/p3runleft.png";
        }
        else if (this.playerNumber == 4)
        {
            this.playerImage.src = "images/player/p4runleft.png";
        }

        if(this.playerFixture.GetBody().GetLinearVelocity().x > -this.maxSpeed)
        {
            this.playerFixture.GetBody().ApplyImpulse(args.playerVector, this.playerFixture.GetBody().GetPosition());
        }
        break;

    case "up":
        if(this.playerFixture.GetBody().GetLinearVelocity().y == 0)
        {
            this.playerFixture.GetBody().ApplyImpulse(args.playerVector, this.playerFixture.GetBody().GetPosition());
        }
        if(args.leftRight == 1)
        {
            if (this.playerNumber == 1)
            {
                this.playerImage.src = "images/player/p1jumpleft.png";
            }
            else if (this.playerNumber == 2)
            {
                this.playerImage.src = "images/player/p2jumpleft.png";
            }
            else if (this.playerNumber == 3)
            {
                this.playerImage.src = "images/player/p3jumpleft.png";
            }
            else if (this.playerNumber == 4)
            {
                this.playerImage.src = "images/player/p4jumpleft.png";
            }
        }
        else if(args.leftRight == 0)
        {
            if (this.playerNumber == 1)
            {
                this.playerImage.src = "images/player/p1jumpright.png";
            }
            else if (this.playerNumber == 2)
            {
                this.playerImage.src = "images/player/p2jumpright.png";
            }
            else if (this.playerNumber == 3)
            {
                this.playerImage.src = "images/player/p3jumpright.png";
            }
            else if (this.playerNumber == 4)
            {
                this.playerImage.src = "images/player/p4jumpright.png";
            }
        }
        break;

    case "right":
        args.leftRight = 0;
        //Set Direction
        if (this.playerNumber == 1)
        {
            this.playerImage.src = "images/player/p1runright.png";
        }
        else if (this.playerNumber == 2)
        {
            this.playerImage.src = "images/player/p2runright.png";
        }
        else if (this.playerNumber == 3)
        {
            this.playerImage.src = "images/player/p3runright.png";
        }
        else if (this.playerNumber == 4)
        {
            this.playerImage.src = "images/player/p4runright.png";
        }

        if(this.playerFixture.GetBody().GetLinearVelocity().x < this.maxSpeed)
        {
            this.playerFixture.GetBody().ApplyImpulse(args.playerVector, this.playerFixture.GetBody().GetPosition());
        }
        break;

    case "leftup":
        args.leftRight = 1;
        if (this.playerNumber == 1)
        {
            this.playerImage.src = "images/player/p1jumpleft.png";
        }
        else if (this.playerNumber == 2)
        {
            this.playerImage.src = "images/player/p2jumpleft.png";
        }
        else if (this.playerNumber == 3)
        {
            this.playerImage.src = "images/player/p3jumpleft.png";
        }
        else if (this.playerNumber == 4)
        {
            this.playerImage.src = "images/player/p4jumpleft.png";
        }

        if(this.playerFixture.GetBody().GetLinearVelocity().x > -this.maxSpeed && this.playerFixture.GetBody().GetLinearVelocity().y == 0)
        {
            this.playerFixture.GetBody().ApplyImpulse(args.playerVector, this.playerFixture.GetBody().GetPosition());
            return vector;
        }
        break;

    case "rightup":
        args.leftRight = 0;
        //Set Direction
        if (this.playerNumber == 1)
        {
            this.playerImage.src = "images/player/p1jumpright.png";
        }
        else if (this.playerNumber == 2)
        {
            this.playerImage.src = "images/player/p2jumpright.png";
        }
        else if (this.playerNumber == 3)
        {
            this.playerImage.src = "images/player/p3jumpright.png";
        }
        else if (this.playerNumber == 4)
        {
            this.playerImage.src = "images/player/p4jumpright.png";
        }

        if(this.playerFixture.GetBody().GetLinearVelocity().x < this.maxSpeed && this.playerFixture.GetBody().GetLinearVelocity().y == 0)
        {
            this.playerFixture.GetBody().ApplyImpulse(args.playerVector, this.playerFixture.GetBody().GetPosition());
            return vector;
        }
        break;

    case "s":
        this.playerFixture.GetBody().position.Set(22,22);
    
    break;

    default:
        if(args.leftRight == 1)
        {
            if (this.playerNumber == 1)
            {
                this.playerImage.src = "images/player/p1standleft.png";
            }
            else if (this.playerNumber == 2)
            {
                this.playerImage.src = "images/player/p2standleft.png";
            }
            else if (this.playerNumber == 3)
            {
                this.playerImage.src = "images/player/p3standleft.png";
            }
            else if (this.playerNumber == 4)
            {
                this.playerImage.src = "images/player/p4standleft.png";
            }
        }
        else if(args.leftRight == 0)
        {
            if (this.playerNumber == 1)
            {
                this.playerImage.src = "images/player/p1standright.png";
            }
            else if (this.playerNumber == 2)
            {
                this.playerImage.src = "images/player/p2standright.png";
            }
            else if (this.playerNumber == 3)
            {
                this.playerImage.src = "images/player/p3standright.png";
            }
            else if (this.playerNumber == 4)
            {
                this.playerImage.src = "images/player/p4standright.png";
            }
        }
    }
};
//Sets the location for each player based on the player number.
HyperPlayer.prototype.setLocation = function(playerList){
    
}

HyperPlayer.prototype.bombThrow = function(ev)
{
    //Need temporary assignment for this for scope
    var _this = this;
    //player animation

    if (this.throwCooldown != 1)
    {
        this.throwCooldown = 1;
        setTimeout(function()
        {
            _this.throwCooldown = 0;
        }, 1000);

        var canvas = document.getElementById('main');
        //console.log("Canvas is offset on x by:" + canvas.offsetLeft);
        //console.log("Canvas is offset on y by:" + canvas.offsetTop);
        // console.log("Clicked at x point:" + ev.clientX/SCALE);
        // console.log("Clicked at y point:" + ev.clientY/SCALE);

        var x = ev.clientX;
        var y = ev.clientY;
     
        var fixDef = new box2d.b2FixtureDef();
        fixDef.density = 1;
        fixDef.friction = 0.5;
        fixDef.restitution = 0.5;
        fixDef.filter.categoryBits = 0x0004;
        fixDef.filter.maskBits = 0x0001;
        var bodyDef = new box2d.b2BodyDef();
        bodyDef.type = box2d.b2Body.b2_dynamicBody; 
        bodyDef.position.x = ((this.playerFixture.GetBody().GetPosition().x)); 
        bodyDef.position.y = ((this.playerFixture.GetBody().GetPosition().y)) - (20 / SCALE);


        fixDef.shape = new box2d.b2CircleShape(20 / SCALE);                

        var bombFixture = world.CreateBody(bodyDef).CreateFixture(fixDef);
        bombFixture.SetUserData('Bomb'+ this.playerNumber);

        //To calculate Bomb Trajectory: Click Region/Pixel to Box2d Scale - Player Position - Canvas Offset/Scale - Image Offset/Scale (+1 and -2 are slight alterations) 
        var impulseVector =  new box2d.b2Vec2(((x / SCALE) - bodyDef.position.x - (canvas.offsetLeft/SCALE)-(25/SCALE)+1)*5, ((y / SCALE) - bodyDef.position.y - (canvas.offsetTop/SCALE)-(25/SCALE)-2) *5); 
        bombFixture.GetBody().ApplyImpulse(impulseVector, bombFixture.GetBody().GetPosition());
        this.bombArray.push(bombFixture);


        socket.emit("bomb throw", {playerX: bodyDef.position.x, playerY: bodyDef.position.y, impulse: impulseVector, playerNumber: this.playerNumber});
        
    }
    
}

HyperPlayer.prototype.combineKey = function(keyCode, direction) {
    switch(keyCode) {
        case HyperKeys.Codes['a']: direction |= 1; break;
        case HyperKeys.Codes['s']: direction |= 2; break;
        case HyperKeys.Codes['space']: direction |= 4; break;
        case HyperKeys.Codes['d']: direction |= 8; break;
    }
    return direction;
}

HyperPlayer.prototype.removeKey = function(keyCode, direction) {
    switch(keyCode) {
        case HyperKeys.Codes['a']: direction ^= 1; break;
        case HyperKeys.Codes['s']: direction ^= 2; break;
        case HyperKeys.Codes['space']: direction ^= 4; break;
        case HyperKeys.Codes['d']: direction ^= 8; break;
    }
    return direction;
}

HyperPlayer.MoveLeft  = 1;
HyperPlayer.MoveDown  = 2;
HyperPlayer.MoveUp    = 4;
HyperPlayer.MoveRight = 8;

HyperPlayer.DiagLength = Math.sqrt(2);

HyperKeys = {};
HyperKeys.Codes = {
    'backspace': 8,
    'tab': 9,
    'enter': 13,
    'shift': 16,
    'ctrl': 17,
    'alt': 18,
    'pause': 19,
    'caps': 20,
    'escape': 27,
    'space' : 32,
    'page_up': 33,
    'page_down': 34,
    'end': 35,
    'home': 36,
    'left_arrow': 37,
    'up_arrow': 38,
    'right_arrow': 39,
    'down_arrow': 40,
    'insert': 45,
    'delete': 46,
    '0': 48,
    '1': 49,
    '2': 50,
    '3': 51,
    '4': 52,
    '5': 53,
    '6': 54,
    '7': 55,
    '8': 56,
    '9': 57,
    'a': 65,
    'b': 66,
    'c': 67,
    'd': 68,
    'e': 69,
    'f': 70,
    'g': 71,
    'h': 72,
    'i': 73,
    'j': 74,
    'k': 75,
    'l': 76,
    'm': 77,
    'n': 78,
    'o': 79,
    'p': 80,
    'q': 81,
    'r': 82,
    's': 83,
    't': 84,
    'u': 85,
    'v': 86,
    'w': 87,
    'x': 88,
    'y': 89,
    'z': 90,
    'left_window_key': 91,
    'right_window_key': 92,
    'select': 93,
    'numpad_0': 96,
    'numpad_1': 97,
    'numpad_2': 98,
    'numpad_3': 99,
    'numpad_4': 100,
    'numpad_5': 101,
    'numpad_6': 102,
    'numpad_7': 103,
    'numpad_8': 104,
    'numpad_9': 105,
    'numpad_*': 106,
    'numpad_+': 107,
    'numpad_-': 109,
    'numpad_.': 110,
    'numpad_/': 111,
    'f1': 112,
    'f2': 113,
    'f3': 114,
    'f4': 115,
    'f5': 116,
    'f6': 117,
    'f7': 118,
    'f8': 119,
    'f9': 120,
    'f10': 121,
    'f11': 122,
    'f12': 123,
    'num_lock': 144,
    'scroll_lock': 145,
    ';': 186,
    '=': 187,
    ',': 188,
    '-': 189,
    '.': 190,
    '/': 191,
    '`': 192,
    '[': 219,
    '\\': 220,
    ']': 221,
    "'": 222
};

HyperKeys.ReverseCodes = (function(codes) {
    var reverse = {};
    for (var prop in codes) {
        if (codes.hasOwnProperty(prop)) {
            reverse[codes[prop]] = prop;
        }
    }
    return reverse;
})(HyperKeys.Codes);
