var toolRectangle = new paper.Tool();
toolRectangle.closePath = function() {
	if (this.pathId != -1) {
		deselectAllPoints();
		this.pathId = -1;
	}
};
toolRectangle.resetHot = function(type, event, mode) {
};
toolRectangle.testHot = function(type, event, mode) {
    if (mode != 'tool-rectangle')
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
toolRectangle.hitTest = function(event) {
    this.hitItem = null;
    return true;
};
toolRectangle.on({
    activate: function() {
        $("#tools").children().removeClass("selected");
		$("#tool-rectangle").addClass("selected");
		setCanvasCursor('cursor-rectangle');
    },
    deactivate: function() {
		if (toolStack.mode != 'tool-rectangle') {
			this.closePath();
			updateSelectionState();
		}
		this.currentSegment = null;
	},
    
    mouseup: function(event) {
        var rectangle = new paper.Rectangle(event.downPoint, event.point);
        this.path = new paper.Path.Rectangle(rectangle);
        this.path.fillColor = fillColor;
        this.path.strokeColor = strokeColor;
    }
});
