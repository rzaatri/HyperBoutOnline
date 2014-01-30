describe("Image Spec", function(){
    it("Should load and show Hyper Bout title", function()
    {
        expect($('#HBTitleImage').length).not.toEqual(0);
    });

    it("Should load all the game images", function(){
        expect($('#game-images').length).not.toEqual(0);
    });
});