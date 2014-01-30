describe("Hyper Player", function(){
	var player;
	beforeEach (function(){
		player = new HyperPlayer();
		player.setX(68);
		player.setY(68);
	});

	it("should be able to set position X correctly", function(){
		player.setX(89);
		expect(player.getX()).toEqual(89);
	});

	it("should be able to get position X correctly", function(){
		expect(player.getX()).toEqual(68);
	});

	it("should be able to set position Y correctly", function(){
		player.setY(89);
		expect(player.getY()).toEqual(89);
	});

	it("should be able to get position Y correctly", function(){
		expect(player.getY()).toEqual(68);
	});

	it("should be have starting health point as 5", function(){
		expect(player.hp).toEqual(5);
	});

	it("should have id as 1 for the first player", function(){
		expect(player.id).toEqual(1);
	});

	it("should have maximum x boundary as 1122", function(){
		expect(player.maxx).toEqual(1122);
	});

	it("should have maximum y boundary as 548", function(){
		expect(player.maxy).toEqual(548);
	});
});