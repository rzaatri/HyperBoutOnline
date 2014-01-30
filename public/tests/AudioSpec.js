describe("Audio Spec", function(){
    it("should show the audio controls", function()
    {
        expect($('#audioControls').length).not.toEqual(0);
    });
});