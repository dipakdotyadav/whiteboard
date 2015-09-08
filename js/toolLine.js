var toolLine = new paper.Tool();
toolLine.closePath = function() {
	if (this.pathId != -1) {
		deselectAllPoints();
		this.pathId = -1;
	}
};
toolLine.resetHot = function(type, event, mode) {
};
toolLine.testHot = function(type, event, mode) {
    if (mode != 'tool-line')
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
toolLine.hitTest = function(event) {
    this.hitItem = null;
    return true;
};
toolLine.on({
    activate: function() {
        $("#tools").children().removeClass("selected");
		$("#tool-line").addClass("selected");
		setCanvasCursor('cursor-line');
    },
    deactivate: function() {
		if (toolStack.mode != 'tool-line') {
			this.closePath();
			updateSelectionState();
		}
		this.currentSegment = null;
	},
    
    mouseup: function(event) {
        this.path = new paper.Path();
        this.path.strokeColor = strokeColor;
        this.path.add(event.downPoint);
        this.path.add(event.point);
        //this.path.selected = true;
    }
});
