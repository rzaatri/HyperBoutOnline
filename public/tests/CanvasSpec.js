describe("Canvas Spec", function(){
    it("should display the background canvas", function(){
        expect($("#backgroundCanvas").length).toEqual(1);
    });

    it("should display the entity canvas where characters are drawn", function(){
        expect($("#entityCanvas").length).toEqual(1);
    });

    it("should display the animation canvas where characters are drawn", function(){
        expect($("#animationCanvas").length).toEqual(1);
    });
});