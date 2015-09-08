
function Undo(maxUndos) {
	this.states = [];
	this.head = -1;
	this.maxUndos = maxUndos || 10;
	this.updateUI();
}

Undo.prototype.snapshot = function(name) {

//	console.log("snapshot() layers: "+paper.project.layers);

	// Update previous state's selection to the selection as of now
	// so that undo feels more natural after undo. Omitting this
	// makes the undo feel like it lost your selection.
	if (this.head >= 0 && this.head < this.states.length)
		this.states[this.head].selection = this.snapshotSelection();

	// HACK: Store original ID into the data of an item.
	this.captureIDs();

	var state = {
		name: name,
		stamp: Date.now(),
		json: this.snapshotProject(),
		selection: this.snapshotSelection()
	};

	// Group similar actions done close to each other.
/*	if (this.states.length > 0 && this.head == (this.states.length-1)) {
		var last = this.states[this.states.length-1];
		if (last.name == state.name && (state.stamp - last.stamp) < 5000) {
			last.json = state.json;
			last.selection = state.selection;
			return;
		}
	}*/

	// Discard states after the current one.
	if (this.head < this.states.length-1)
		this.states = this.states.slice(0, this.head+1);

	this.states.push(state);

	// Remove the oldest state if we have too many states.
	if (this.states.length > this.maxUndos)
		this.states.shift();

	this.head = this.states.length-1;

	this.updateUI();
}

Undo.prototype.restoreIDs = function() {
	// Restore IDs from the 'data'.
	var maxId = 0;
	function visitItem(item) {
		if (item.data.id) {
			item._id = item.data.id;
			if (item.id > maxId)
				maxId = item.id;
		}
		if (item.children) {
			for (var j = item.children.length-1; j >= 0; j--)
				visitItem(item.children[j]);
		}
	}
	for (var i = 0, l = paper.project.layers.length; i < l; i++) {
		var layer = paper.project.layers[i];
		visitItem(layer);
	}
	if (maxId > paper.Item._id)
		Item._id = maxId;
}

Undo.prototype.captureIDs = function() {
	// Store IDs of the items into 'data' so that they get serialized.
	function visitItem(item) {
		item.data.id = item.id;
		if (item.children) {
			for (var j = item.children.length-1; j >= 0; j--)
				visitItem(item.children[j]);
		}
	}
	for (var i = 0, l = paper.project.layers.length; i < l; i++) {
		var layer = paper.project.layers[i];
		visitItem(layer);
	}
}

Undo.prototype.snapshotProject = function() {
	var json = paper.project.exportJSON({ asString: false });
	// TODO: Remove objects marked as guides.
	return json;
}

Undo.prototype.snapshotSelection = function() {
	var selection = [];
	var selected = paper.project.selectedItems;
	for (var i = 0; i < selected.length; i++) {
		var item = selected[i];
		if (item.guide) continue;
		var state = {id: item.id, segs: []};
		if (item instanceof paper.Path) {
			var segs = [];
			for (var j = 0; j < item.segments.length; j++) {
				if (item.segments[j].selected)
					segs.push(item.segments[j].index);
			}
			if (segs.length > 0) {
				state.segs = segs;
			}
		}
		selection.push(state);
	}
	return selection;
}

Undo.prototype.restoreSelection = function(sel) {
	paper.project.deselectAll();
	// HACK: some logic in Paper.js prevents deselectAll in some cases,
	// enforce deselect.
	paper.project._selectedItems = {};

	for (var i = 0; i < sel.length; i++) {
		var state = sel[i];
		var item = findItemById(state.id);
		if (item == null) {
			console.log("restoreSelection: could not find "+state.id);
			continue;
		}
		item.selected = true;
		for (var j = 0; j < state.segs.length; j++) {
			var idx = state.segs[j];
			if (idx >= 0 && idx < item.segments.length)
				item.segments[idx].selected = true;
		}
	}
}

Undo.prototype.restore = function(state) {
	// Empty the project and deserialize the project from JSON.
	paper.project.clear();
	paper.project.importJSON(state.json);
	// HACK: paper does not retain IDs, we capture them on snapshot,
	// restore them here.
	this.restoreIDs();

	// Selection is serialized separately, restore now (requires correct IDs).
	this.restoreSelection(state.selection);

	// Update UI
	updateSelectionState();
	paper.project.view.update();
}

Undo.prototype.undo = function() {
	if (this.head > 0) {
		this.head--;
		this.restore(this.states[this.head]);
	}
	this.updateUI();
}

Undo.prototype.redo = function() {
	if (this.head < this.states.length-1) {
		this.head++;
		this.restore(this.states[this.head]);
	}
	this.updateUI();
}

Undo.prototype.canUndo = function() {
	return this.head > 0;
}

Undo.prototype.canRedo = function() {
	return this.head < this.states.length-1;
}

Undo.prototype.updateUI = function() {
	if (this.canUndo())
		$("#undo").removeClass("disabled");
	else
		$("#undo").addClass("disabled");

	if (this.canRedo())
		$("#redo").removeClass("disabled");
	else
		$("#redo").addClass("disabled");
}

var undo = null;


function setCanvasCursor(name) {
	$canvas.removeClass (function (index, css) {
	    return (css.match (/\bcursor-\S+/g) || []).join(' ');
	}).addClass(name);
	
}

function snapDeltaToAngle(delta, snapAngle) {
	var angle = Math.atan2(delta.y, delta.x);
	angle = Math.round(angle/snapAngle) * snapAngle;
	var dirx = Math.cos(angle);
	var diry = Math.sin(angle);
	var d = dirx*delta.x + diry*delta.y;
	return new paper.Point(dirx*d, diry*d);
}

function indexFromAngle(angle) {
	var octant = Math.PI*2/8;
	var index = Math.round(angle/octant);
	if (index < 0) index += 8;
	return index % 8;
}

var oppositeCorner = {
	'top-left': 'bottom-right',
	'top-center': 'bottom-center',
	'top-right': 'bottom-left',
	'right-center': 'left-center',
	'bottom-right': 'top-left',
	'bottom-center': 'top-center',
	'bottom-left': 'top-right',
	'left-center': 'right-center',
};

function setCanvasRotateCursor(dir, da) {
	// zero is up, counter clockwise
	var angle = Math.atan2(dir.x, -dir.y) + da;
	var index = indexFromAngle(angle);
	var cursors = [
		'cursor-rotate-0',
		'cursor-rotate-45',
		'cursor-rotate-90',
		'cursor-rotate-135',
		'cursor-rotate-180',
		'cursor-rotate-225',
		'cursor-rotate-270',
		'cursor-rotate-315'
	];
	setCanvasCursor(cursors[index % 8]);
}

function setCanvasScaleCursor(dir) {
	// zero is up, counter clockwise
	var angle = Math.atan2(dir.x, -dir.y);
	var index = indexFromAngle(angle);
	var cursors = [
		'cursor-scale-0',
		'cursor-scale-45',
		'cursor-scale-90',
		'cursor-scale-135'
	];
	setCanvasCursor(cursors[index % 4]);
}

function dragRect(p1, p2) {
	// Create pixel perfect dotted rectable for drag selections.
	var half = new paper.Point(0.5 / paper.view.zoom, 0.5 / paper.view.zoom);
	var start = p1.add(half);
	var end = p2.add(half);
	var rect = new paper.CompoundPath();
	rect.moveTo(start);
	rect.lineTo(new paper.Point(start.x, end.y));
	rect.lineTo(end);
	rect.moveTo(start);
	rect.lineTo(new paper.Point(end.x, start.y));
	rect.lineTo(end);
	rect.strokeColor = 'black';
	rect.strokeWidth = 1.0 / paper.view.zoom;
	rect.dashOffset = 0.5 / paper.view.zoom;
	rect.dashArray = [1.0 / paper.view.zoom, 1.0 / paper.view.zoom];
	rect.removeOn({
		drag: true,
		up: true
	});
	rect.guide = true;
	return rect;
}

function findItemById(id) {
	if (id == -1) return null;
	function findItem(item) {
		if (item.id == id)
			return item;
		if (item.children) {
			for (var j = item.children.length-1; j >= 0; j--) {
				var it = findItem(item.children[j]);
				if (it != null)
					return it;
			}
		}
		return null;
	}

	for (var i = 0, l = paper.project.layers.length; i < l; i++) {
		var layer = paper.project.layers[i];
		var it = findItem(layer);
		if (it != null)
			return it;
	}
	return null;
}


var clipboard = null;

var selectionBounds = null;
var selectionBoundsShape = null;
var drawSelectionBounds = 0;

function clearSelectionBounds() {
	if (selectionBoundsShape)
		selectionBoundsShape.remove();
	selectionBoundsShape = null;
	selectionBounds = null;
};

function showSelectionBounds() {
	drawSelectionBounds++;
	if (drawSelectionBounds > 0) {
		if (selectionBoundsShape)
			selectionBoundsShape.visible = true;
	}
}

function hideSelectionBounds() {
	if (drawSelectionBounds > 0)
		drawSelectionBounds--;
	if (drawSelectionBounds == 0) {
		if (selectionBoundsShape)
			selectionBoundsShape.visible = false;
	}
}

function updateSelectionState() {
	clearSelectionBounds();
	selectionBounds = getSelectionBounds();
	if (selectionBounds != null) {
		var rect =  new paper.Path.Rectangle(selectionBounds);
		//var color = paper.project.activeLayer.getSelectedColor();
		rect.strokeColor = 'rgba(0,0,0,0)'; //color ? color : '#009dec';
		rect.strokeWidth = 1.0 / paper.view.zoom;
//		rect._boundsSelected = true;
		rect.selected = true;
		rect.setFullySelected(true);
		rect.guide = true;
		rect.visible = drawSelectionBounds > 0;
//		rect.transformContent = false;
		selectionBoundsShape = rect;
	}
	updateSelectionUI();
}

function updateSelectionUI() {
	if (selectionBounds == null) {
		$("#cut").addClass("disabled");
		$("#copy").addClass("disabled");
		$("#delete").addClass("disabled");
	} else {
		$("#cut").removeClass("disabled");
		$("#copy").removeClass("disabled");
		$("#delete").removeClass("disabled");
	}

	if (clipboard == null) {
		$("#paste").addClass("disabled");
	} else {
		$("#paste").removeClass("disabled");
	}
}

function cutSelection() {
	clipboard = captureSelectionState();
	var selected = paper.project.selectedItems;
	for (var i = 0; i < selected.length; i++) {
		selected[i].remove();
	}
	undo.snapshot("Cut");
}

function copySelection() {
	clipboard = captureSelectionState();
	updateSelectionState();
}

function pasteSelection() {
	if (clipboard == null)
		return;

	deselectAll();

	var items = [];
	for (var i = 0; i < clipboard.length; i++) {
		var content = clipboard[i];
		var item = paper.Base.importJSON(content.json);
		if (item) {
			item.selected = true;
			items.push(item);
		}
	}

	// Center pasted items to center of the view
	var bounds = null;
	for (var i = 0; i < items.length; i++) {
		if (bounds == null)
			bounds = items[i].bounds.clone();
		else
			bounds = bounds.unite(items[i].bounds);
	}
	if (bounds) {
		var delta = paper.view.center.subtract(bounds.center);
		for (var i = 0; i < items.length; i++) {
			items[i].position = items[i].position.add(delta);
		}
	}

	undo.snapshot("Paste");

	updateSelectionState();
	paper.project.view.update();
}

function deleteSelection() {
	var selected = paper.project.selectedItems;
	for (var i = 0; i < selected.length; i++)
		selected[i].remove();

	undo.snapshot("Delete");

	updateSelectionState();
	paper.project.view.update();
}

// Returns serialized contents of selected items. 
function captureSelectionState() {
	var originalContent = [];
	var selected = paper.project.selectedItems;
	for (var i = 0; i < selected.length; i++) {
		var item = selected[i];
		if (item.guide) continue;
		var orig = {
			id: item.id,
			json: item.exportJSON({ asString: false }),
			selectedSegments: []
		};
		originalContent.push(orig);
	}
	return originalContent;
}

// Restore the state of selected items.
function restoreSelectionState(originalContent) {
	// TODO: could use findItemById() instead.
	for (var i = 0; i < originalContent.length; i++) {
		var orig = originalContent[i];
		var item = findItemById(orig.id);
		if (!item) continue;
		// HACK: paper does not retain item IDs after importJSON,
		// store the ID here, and restore after deserialization.
		var id = item.id;
		item.importJSON(orig.json);
		item._id = id;
	}
}

function deselectAll() {
	paper.project.deselectAll();
}

function deselectAllPoints() {
	var selected = paper.project.selectedItems;
	for (var i = 0; i < selected.length; i++) {
		var item = selected[i];
		if (item instanceof paper.Path) {
			for (var j = 0; j < item.segments.length; j++)
				if (item.segments[j].selected)
					item.segments[j].selected = false;
		}
	}
}

// Returns path points which are contained in the rect. 
function getSegmentsInRect(rect) {
	var segments = [];

	function checkPathItem(item) {
		if (item._locked || !item._visible || item._guide)
			return;
		var children = item.children;
		if (!rect.intersects(item.bounds))
			return;
		if (item instanceof paper.Path) {
			for (var i = 0; i < item.segments.length; i++) {
				if (rect.contains(item.segments[i].point))
					segments.push(item.segments[i]);
			}
		} else {
			for (var j = children.length-1; j >= 0; j--)
				checkPathItem(children[j]);
		}
	}

	for (var i = paper.project.layers.length - 1; i >= 0; i--) {
		checkPathItem(paper.project.layers[i]);
	}

	return segments;
}

// Returns all items intersecting the rect.
// Note: only the item outlines are tested.
function getPathsIntersectingRect(rect) {
	var paths = [];
	var boundingRect = new paper.Path.Rectangle(rect);

	function checkPathItem(item) {
		var children = item.children;
		if (item.equals(boundingRect))
			return;
		if (!rect.intersects(item.bounds))
			return;
		if (item instanceof paper.PathItem) {
			if (rect.contains(item.bounds)) {
				paths.push(item);
				return;
			}
			var isects = boundingRect.getIntersections(item);
			if (isects.length > 0)
				paths.push(item);
		} else {
			for (var j = children.length-1; j >= 0; j--)
				checkPathItem(children[j]);
		}
	}

	for (var i = 0, l = paper.project.layers.length; i < l; i++) {
		var layer = paper.project.layers[i];
		checkPathItem(layer);
	}

	boundingRect.remove();

	return paths;
}

// Returns bounding box of all selected items.
function getSelectionBounds() {
	var bounds = null;
	var selected = paper.project.selectedItems;
	for (var i = 0; i < selected.length; i++) {
		if (bounds == null)
			bounds = selected[i].bounds.clone();
		else
			bounds = bounds.unite(selected[i].bounds);
	}
	return bounds;
}

var $canvas = null;
$(document).ready(function() {
    
   $('.tooltip').tooltipster();
   
   
   $('#strokeColorSelector').ColorPicker({
        color: '#000000',
        onShow: function (colpkr) {
            $(colpkr).fadeIn(500);
            return false;
        },
        onHide: function (colpkr) {
            $(colpkr).fadeOut(500);
            return false;
        },
        onChange: function (hsb, hex, rgb) {
            //console.log($(this));
            $('#strokeColorSelector div').css('background-color', '#' + hex);
            $("#strokeColor").val("#" + hex).change();
            strokeColor = "#" + hex;
        }
    });
    
    
    $('#fillColorSelector').ColorPicker({
        color: '#FFFFFF',
        onShow: function (colpkr) {
            $(colpkr).fadeIn(500);
            return false;
        },
        onHide: function (colpkr) {
            $(colpkr).fadeOut(500);
            return false;
        },
        onChange: function (hsb, hex, rgb) {
            $('#fillColorSelector div').css('background-color', '#' + hex);
            $("#fillColor").val("#" + hex).change();
            fillColor = "#" + hex;
        }
    });
   
    
	$canvas = $('#canvas1');
	paper.setup($canvas[0]);
	

	// HACK: Do not select the children of layers, or else
	// the layers of selected objects will become selected
	// after importJSON(). 
	paper.Layer.inject({ 
		_selectChildren: false 
	});

	undo = new Undo(20);

	var path1 = new paper.Path.Circle(new paper.Point(180, 50), 30);
	path1.strokeColor = 'black';
	var path2 = new paper.Path.Circle(new paper.Point(180, 150), 20);
	path2.fillColor = 'grey';

	undo.snapshot("Init");
    
    $("#select-canvas").change(function() {
        $("canvas").hide();
        $(".shapes-config ul").hide();
        $("#shapes-tool-list").children().removeClass("selected");
        $("#prepare-canvas-overlay").show()
        setCanvasCursor("");
        $canvas.data('json', paper.project.exportJSON({asString: false}));
        $canvas = $("#" + $(this).val());
        $canvas.show();
        $(".canvax-txt").hide();
        $("#" + $(this).val() + "-txt").show();
        paper.setup($canvas[0]);
        paper.project.importJSON($canvas.data('json'));
        toolStack.activate();
        toolStack.setToolMode('tool-select');

        paper.view.draw();
        $("#prepare-canvas-overlay").hide()
    });
	$("#tool-select").click(function() {
        $(".shapes-config ul").hide();
		toolStack.setToolMode('tool-select');
	});
	$("#tool-direct-select").click(function() {
        $(".shapes-config ul").hide();
		toolStack.setToolMode('tool-direct-select');
	});
	$("#tool-pencil").click(function() {
        $(".shapes-config ul").hide();
		toolStack.setToolMode('tool-pencil');
	});
	$("#tool-pen").click(function() {
        $(".shapes-config ul").hide();
		toolStack.setToolMode('tool-pen');
	});
	$("#tool-line").click(function() {
        $(".shapes-config ul").hide();
		toolStack.setToolMode('tool-line');
	});
	$("#tool-circle").click(function() {
        $(".shapes-config ul").hide();
		toolStack.setToolMode('tool-circle');
	});
	$("#tool-rectangle").click(function() {
		toolStack.setToolMode('tool-rectangle');
        $(".shapes-config ul").hide();
        $(".params-rectangle").show();
	});
	$("#tool-regular-polygon").click(function() {
        $(".shapes-config ul").hide();
        $(".params-regular-polygon").show();
        toolStack.setToolMode('tool-regular-polygon');
	});
    
    $("#rectangle-active").click(function() {
        if ($("#rectangle-active:checked").val() != 'undefined') {
            var width = parseInt($("#rectangle-width").val(), 10);
            var height = parseInt($("#rectangle-height").val(), 10);
            if (width > 0 && height > 0) {
                toolStack.setToolMode('tool-round-rectangle');
            }
        }
    });
	$("#tool-zoompan").click(function() {
		toolStack.setToolMode('tool-zoompan');
	});

	$("#undo").click(function() {
		toolStack.command(function() {
			if (undo.canUndo())
				undo.undo();
		});
	});
	$("#redo").click(function() {
		toolStack.command(function() {
			if (undo.canRedo())
				undo.redo();
		});
	});

	$("#cut").click(function() {
		cutSelection();
	});
	$("#copy").click(function() {
		copySelection();
	});
	$("#paste").click(function() {
		pasteSelection();
	});

	$("#delete").click(function() {
		deleteSelection();
	});

	toolStack.activate();
	toolStack.setToolMode('tool-select');

	paper.view.draw();
});
function isNumber(evt) {
    evt = (evt) ? evt : window.event;
    var charCode = (evt.which) ? evt.which : evt.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57)) {
        return false;
    }
    if(toolStack.mode == 'tool-rectangle') {
        $('#rectangle-active').attr('checked', true);
        toolStack.setToolMode('tool-round-rectangle');
    }
    return true;
}
