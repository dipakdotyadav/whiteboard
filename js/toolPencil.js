var toolPencil = new paper.Tool();
toolPencil.closePath = function() {
	if (this.pathId != -1) {
		deselectAllPoints();
		this.pathId = -1;
	}
};
toolPencil.resetHot = function(type, event, mode) {
};
toolPencil.testHot = function(type, event, mode) {
    if (mode != 'tool-pencil')
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
toolPencil.hitTest = function(event) {
    this.hitItem = null;
    return true;
};
toolPencil.on({
    activate: function() {
        $("#tools").children().removeClass("selected");
		$("#tool-pencil").addClass("selected");
		setCanvasCursor('cursor-pencil');
    },
    deactivate: function() {
		if (toolStack.mode != 'tool-pencil') {
			this.closePath();
			updateSelectionState();
		}
		this.currentSegment = null;
	},
    mousedown: function(event) {
        deselectAllPoints();
        this.path = new paper.Path();
        this.path.strokeColor = strokeColor;
        this.pathId = this.path.id;
    },
    mousedrag: function(event) {
        this.path.add(event.point);
    },
    mouseup: function(event) {
        //this.path.selected = true;
        this.path.smooth();
    }
});
