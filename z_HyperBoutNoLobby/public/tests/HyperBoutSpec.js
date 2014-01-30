describe("Hyper Bout", function(){
	it("should have a new remote player when a new player is added", function(){
		onNewPlayer(123);
        expect(remotePlayers.length()).toEqual(1);
	});
});