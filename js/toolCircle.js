var toolCircle = new paper.Tool();
toolCircle.closePath = function() {
	if (this.pathId != -1) {
		deselectAllPoints();
		this.pathId = -1;
	}
};
toolCircle.resetHot = function(type, event, mode) {
};
toolCircle.testHot = function(type, event, mode) {
    if (mode != 'tool-circle')
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
toolCircle.hitTest = function(event) {
    this.hitItem = null;
    return true;
};
toolCircle.on({
    activate: function() {
        $("#tools").children().removeClass("selected");
		$("#tool-circle").addClass("selected");
		setCanvasCursor('cursor-circle');
    },
    deactivate: function() {
		if (toolStack.mode != 'tool-circle') {
			this.closePath();
			updateSelectionState();
		}
		this.currentSegment = null;
	},
    
    mouseup: function(event) {
        this.path = new paper.Path.Circle({
            center: event.middlePoint,
            radius: event.delta.length / 2,
            fillColor: fillColor,
            strokeColor: strokeColor
            //selected: true
        });
    }
});
