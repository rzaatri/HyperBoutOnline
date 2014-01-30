// Power Up Class
var HyperPowerUp = function(xLocation, spawnID, powerUpID){
	//Type of power up, 0 = health, 1 = shield
	this.type = powerUpID;
    this.id = spawnID;
	//Set the power up image
	this.powerUpImage = new Image();
	this.powerUpImage.src = '';
    this.state = 1;
    this.powerUpImage = new Image();
    this.powerUpImage.src = 'images/health.png';
	//Create PowerUp Box2d body
	var fixDef = new box2d.b2FixtureDef();
    fixDef.density = 1;
    fixDef.friction = 0.5;
    //Now we need to define the body, static (not affected by gravity), dynamic (affected by grav)
    var bodyDef = new box2d.b2BodyDef();
    bodyDef.type = box2d.b2Body.b2_dynamicBody; //We're setting the ground to static.
    bodyDef.position.x = xLocation / SCALE; //Registration point is in the center for box2d entities.
    bodyDef.position.y = 0 / SCALE;
    bodyDef.fixedRotation = true;
    fixDef.shape = new box2d.b2PolygonShape; //setting the shape of the ground.
    fixDef.shape.SetAsBox((10 / SCALE) / 2, (10 / SCALE)/2);
    fixDef.friction = 4;


    this.powerUpFixture = world.CreateBody(bodyDef).CreateFixture(fixDef);
    this.powerUpFixture.SetUserData('powerup' + this.type + "-" + this.id);

}
HyperPowerUp.prototype.draw = function(canvas)
{
    canvas.drawImage(this.powerUpImage, (this.powerUpFixture.GetBody().GetPosition().x * SCALE) -5, (this.powerUpFixture.GetBody().GetPosition().y * SCALE) -5);
}