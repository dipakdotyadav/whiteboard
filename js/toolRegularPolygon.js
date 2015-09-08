var toolRegularPolygon = new paper.Tool();
toolRegularPolygon.closePath = function() {
	if (this.pathId != -1) {
		deselectAllPoints();
		this.pathId = -1;
	}
};
toolRegularPolygon.resetHot = function(type, event, mode) {
};
toolRegularPolygon.testHot = function(type, event, mode) {
    if (mode != 'tool-regular-polygon')
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
toolRegularPolygon.hitTest = function(event) {
    this.hitItem = null;
    return true;
};
toolRegularPolygon.on({
    activate: function() {
        $("#tools").children().removeClass("selected");
		$("#tool-regular-polygon").addClass("selected");
		setCanvasCursor('cursor-polygon');
    },
    deactivate: function() {
		if (toolStack.mode != 'tool-regular-polygon') {
			this.closePath();
			updateSelectionState();
		}
		this.currentSegment = null;
	},
    
    mouseup: function(event) {
        this.path = new paper.Path.RegularPolygon(event.middlePoint, +$("#noOfSides").val(), event.delta.length / 2);
        this.path.fillColor = fillColor;
        this.path.strokeColor = strokeColor;
        
        
    }
});
