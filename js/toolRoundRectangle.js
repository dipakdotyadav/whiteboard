var toolRoundRectangle = new paper.Tool();
toolRoundRectangle.closePath = function() {
	if (this.pathId != -1) {
		deselectAllPoints();
		this.pathId = -1;
	}
};
toolRoundRectangle.resetHot = function(type, event, mode) {
};
toolRoundRectangle.testHot = function(type, event, mode) {
    if (mode != 'tool-round-rectangle')
		return false;
	if (event.modifiers.command)
		return false;
	if (type == 'keyup') {
		if (event.key == 'enter' || event.key == 'escape') {
			this.closePath();
		}
	}
	return this.hitTest(event, type);
};
toolRoundRectangle.hitTest = function(event) {
    this.hitItem = null;
    return true;
};
toolRoundRectangle.on({
    activate: function() {
        $("#tools").children().removeClass("selected");
		$("#tool-rectangle").addClass("selected");
		setCanvasCursor('cursor-rectangle');
    },
    deactivate: function() {
		if (toolStack.mode != 'tool-round-rectangle') {
			this.closePath();
			updateSelectionState();
		}
		this.currentSegment = null;
	},
    
    mouseup: function(event) {
        var rectangle = new paper.Rectangle(event.downPoint, event.point);
        var cornerSize = new paper.Size(+$("#rectangle-width").val(), +$("#rectangle-height").val());
        this.path = new paper.Path.RoundRectangle(rectangle, cornerSize);
        this.path.fillColor = fillColor;
        this.path.strokeColor = strokeColor;
    }
});
