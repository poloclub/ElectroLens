(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _MultiviewControlInitializeViewSetupsJs = require("./MultiviewControl/initializeViewSetups.js");

var _view_setupJs = require("./view_setup.js");

var _DHeatmapsHeatmapViewJs = require("./2DHeatmaps/HeatmapView.js");

var _DViewsPointCloud_selectionJs = require("./3DViews/PointCloud_selection.js");

var _UtilitiesReadDataFileJs = require("./Utilities/readDataFile.js");

var _DViewsSetupOptionBox3DViewJs = require("./3DViews/setupOptionBox3DView.js");

var _DHeatmapsSetupOptionBox2DHeatmapJs = require("./2DHeatmaps/setupOptionBox2DHeatmap.js");

var _MultiviewControlSetupViewBasicJs = require("./MultiviewControl/setupViewBasic.js");

var _MultiviewControlOptionBoxControlJs = require("./MultiviewControl/optionBoxControl.js");

var _MultiviewControlControllerControlJs = require("./MultiviewControl/controllerControl.js");

var _DHeatmapsUtilitiesJs = require("./2DHeatmaps/Utilities.js");

var _DHeatmapsTooltipJs = require("./2DHeatmaps/tooltip.js");

var _MultiviewControlCalculateViewportSizesJs = require("./MultiviewControl/calculateViewportSizes.js");

if (!Detector.webgl) Detector.addGetWebGLMessage();
var container, stats, renderer;
var selectionPlaneMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.5, transparent: true, side: THREE.DoubleSide, needsUpdate: true });
var mouseX = 0,
    mouseY = 0;
var windowWidth, windowHeight;
var clickRequest = false;
var mouseHold = false;

var showOptionBoxesBool = true;

//var heightScale = 2., widthScale = 1.;

options: new function () {
	this.heightScale = 2.;
	this.widthScale = 1.;
}();

_MultiviewControlInitializeViewSetupsJs.initializeViewSetups(_view_setupJs.views);

var unfilteredData = [];
var num = 0;
var queue = d3.queue();

for (var ii = 0; ii < _view_setupJs.views.length; ++ii) {
	var view = _view_setupJs.views[ii];
	if (view.viewType == '3DView') {
		queue.defer(_UtilitiesReadDataFileJs.readCSV, view, view.dataFilename, unfilteredData, num);
	}
}

queue.awaitAll(function (error) {
	if (error) throw error;
	init();
	animate();
});

function init() {
	console.log('started initialization');
	container = document.getElementById('container');
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight * 2);
	container.appendChild(renderer.domElement);

	for (var ii = 0; ii < _view_setupJs.views.length; ++ii) {
		var view = _view_setupJs.views[ii];

		view.unfilteredData = unfilteredData;

		_MultiviewControlSetupViewBasicJs.setupViewCameraSceneController(view, renderer);
		_MultiviewControlOptionBoxControlJs.addOptionBox(view);

		if (view.viewType == '3DView') {
			_DViewsPointCloud_selectionJs.getPointCloudGeometry(view);
			_DViewsSetupOptionBox3DViewJs.setupOptionBox3DView(view);
		}
		if (view.viewType == '2DHeatmap') {
			view.controller.enableRotate = false;
			_DHeatmapsTooltipJs.initializeHeatmapToolTip(view);
			_DHeatmapsSetupOptionBox2DHeatmapJs.setupOptionBox2DHeatmap(view);
			_DHeatmapsUtilitiesJs.getAxis(view);

			_DHeatmapsHeatmapViewJs.arrangeDataToHeatmap(view, unfilteredData);
			_DHeatmapsHeatmapViewJs.getHeatmap(view);
		}
	}

	stats = new Stats();
	container.appendChild(stats.dom);
	document.addEventListener('mousemove', onDocumentMouseMove, false);
	window.addEventListener('mousedown', function (event) {
		mouseHold = true;
		console.log(mouseHold);
		if (event.button == 0) {
			clickRequest = true;
		}
	}, false);
	window.addEventListener('mouseup', function (event) {
		mouseHold = false;
		console.log(mouseHold);
		if (event.button == 0) {
			clickRequest = false;
		}
	}, false);

	window.addEventListener('dblclick', function (event) {
		//console.log(event.button);
		//if (event.button == 2 ){
		for (var ii = 0; ii < _view_setupJs.views.length; ++ii) {
			var view = _view_setupJs.views[ii];
			if (view.viewType == "2DHeatmap") {
				var temp = view.scene.getObjectByName('selectionPlane');
				if (temp != null) {
					view.scene.remove(temp);
					updateSelection();
				}
			}
		}
		//}
	}, false);

	window.addEventListener("keydown", onKeyDown, true);
}

function onKeyDown(e) {
	if (e.keyCode == 72) {
		_MultiviewControlOptionBoxControlJs.showHideAllOptionBoxes(_view_setupJs.views, showOptionBoxesBool);showOptionBoxesBool = !showOptionBoxesBool;
	}
}

function onDocumentMouseMove(event) {
	mouseX = event.clientX;
	mouseY = event.clientY;
	if (mouseHold == false) {
		_MultiviewControlControllerControlJs.updateController(_view_setupJs.views, windowWidth, windowHeight, mouseX, mouseY);
	}

	for (var ii = 0; ii < _view_setupJs.views.length; ++ii) {
		var view = _view_setupJs.views[ii];
		if (view.controllerEnabled) {
			var left = Math.floor(windowWidth * view.left);
			var top = Math.floor(windowHeight * view.top);
			var width = Math.floor(windowWidth * view.width) + left;
			var height = Math.floor(windowHeight * view.height) + top;
			var vector = new THREE.Vector3();

			vector.set((event.clientX - left) / (width - left) * 2 - 1, -((event.clientY - top) / (height - top)) * 2 + 1, 0.1);
			vector.unproject(view.camera);
			var dir = vector.sub(view.camera.position).normalize();
			var distance = -view.camera.position.z / dir.z;
			view.mousePosition = view.camera.position.clone().add(dir.multiplyScalar(distance));
			if (view.viewType == "2DHeatmap") {
				_DHeatmapsTooltipJs.updateHeatmapTooltip(view);
			}
		}
	}
}
function updateSize() {
	if (windowWidth != window.innerWidth || windowHeight != window.innerHeight) {
		windowWidth = window.innerWidth;
		windowHeight = window.innerHeight;
		renderer.setSize(windowWidth, windowHeight);

		for (var ii = 0; ii < _view_setupJs.views.length; ++ii) {
			var view = _view_setupJs.views[ii];
			//view.guiContainer.style.top = view.windowTop + 'px';
			//view.guiContainer.style.left = view.windowLeft + 'px';
			if (view.viewType == "2DHeatmap") {

				var left = Math.floor(windowWidth * view.left);
				var top = Math.floor(windowHeight * view.top);
				var width = Math.floor(windowWidth * view.width);
				var height = Math.floor(windowHeight * view.height);

				view.windowLeft = left;
				view.windowTop = top;
				view.windowWidth = width;
				view.windowHeight = height;

				//view.title.style.top = view.windowTop + 'px';
				//view.title.style.left = view.windowLeft + 'px';
			}
		}

		_MultiviewControlOptionBoxControlJs.updateOptionBoxLocation(_view_setupJs.views);
	}
}
function animate() {
	render();
	processClick();
	stats.update();
	requestAnimationFrame(animate);
}

function render() {
	updateSize();
	for (var ii = 0; ii < _view_setupJs.views.length; ++ii) {
		var view = _view_setupJs.views[ii];
		var camera = view.camera;
		var left = Math.floor(windowWidth * view.left);
		var top = Math.floor(windowHeight * view.top);
		var width = Math.floor(windowWidth * view.width);
		var height = Math.floor(windowHeight * view.height);

		view.windowLeft = left;
		view.windowTop = top;
		view.windowWidth = width;
		view.windowHeight = height;

		renderer.setViewport(left, top, width, height);
		renderer.setScissor(left, top, width, height);
		renderer.setScissorTest(true);
		renderer.setClearColor(0xffffff, 1); // border color
		renderer.clearColor(); // clear color buffer
		if (view.controllerEnabled) {
			renderer.setClearColor(view.controllerEnabledBackground);
		} else {
			renderer.setClearColor(view.background);
		}
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.render(view.scene, camera);
	}
}

function spawnPlane(view) {
	//console.log(views[1].controllerEnabled);
	for (var ii = 0; ii < _view_setupJs.views.length; ++ii) {
		var temp_view = _view_setupJs.views[ii];
		if (temp_view.viewType == '2DHeatmap' && temp_view.controllerEnabled == false) {
			var tempSelectionPlane = temp_view.scene.getObjectByName('selectionPlane');
			if (tempSelectionPlane != null) {
				console.log('remove plane');
				temp_view.scene.remove(tempSelectionPlane);
			}
		}
	}

	var scene = view.scene;
	var mousePosition = view.mousePosition;
	var selectionPlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1), selectionPlaneMaterial);
	selectionPlane.geometry.attributes.position.needsUpdate = true;
	var p = selectionPlane.geometry.attributes.position.array;

	var i = 0;
	p[i++] = mousePosition.x - 0.01;
	p[i++] = mousePosition.y + 0.01;
	p[i++] = mousePosition.z;
	p[i++] = mousePosition.x;
	p[i++] = mousePosition.y + 0.01;
	p[i++] = mousePosition.z;
	p[i++] = mousePosition.x - 0.01;
	p[i++] = mousePosition.y;
	p[i++] = mousePosition.z;
	p[i++] = mousePosition.x;
	p[i++] = mousePosition.y;
	p[i] = mousePosition.z;

	selectionPlane.name = 'selectionPlane';
	scene.add(selectionPlane);
	updateSelection();
}

function updatePlane(view, plane) {
	var scene = view.scene;

	var mousePosition = view.mousePosition;

	var selectionPlane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1, 1), selectionPlaneMaterial);
	selectionPlane.geometry.attributes.position.needsUpdate = true;

	var pOriginal = plane.geometry.attributes.position.array;

	var originalFirstVerticesCoordx = pOriginal[0],
	    originalFirstVerticesCoordy = pOriginal[1],
	    originalFirstVerticesCoordz = pOriginal[2];

	var p = selectionPlane.geometry.attributes.position.array;
	var i = 0;
	p[i++] = originalFirstVerticesCoordx;
	p[i++] = originalFirstVerticesCoordy;
	p[i++] = originalFirstVerticesCoordz;
	p[i++] = mousePosition.x;
	p[i++] = originalFirstVerticesCoordy;
	p[i++] = mousePosition.z;
	p[i++] = originalFirstVerticesCoordx;
	p[i++] = mousePosition.y;
	p[i++] = mousePosition.z;
	p[i++] = mousePosition.x;
	p[i++] = mousePosition.y;
	p[i] = mousePosition.z;

	scene.remove(plane);
	selectionPlane.name = 'selectionPlane';
	scene.add(selectionPlane);
	updateSelection();
}

function updateSelectionFromHeatmap(view) {
	var data = view.data;
	for (var x in data) {
		for (var y in data[x]) {
			if (data[x][y].selected) {
				for (var i = 0; i < data[x][y]['list'].length; i++) {
					data[x][y]['list'][i].selected = true;
				}
			} else {
				for (var i = 0; i < data[x][y]['list'].length; i++) {
					data[x][y]['list'][i].selected = false;
				}
			}
		}
	}
}

function updateSelection() {
	var noSelection = true;
	for (var ii = 0; ii < _view_setupJs.views.length; ++ii) {
		var temp_view = _view_setupJs.views[ii];
		if (temp_view.viewType == '2DHeatmap') {
			var tempSelectionPlane = temp_view.scene.getObjectByName('selectionPlane');
			if (tempSelectionPlane != null) {
				noSelection = false;
				var p = tempSelectionPlane.geometry.attributes.position.array;
				var xmin = Math.min(p[0], p[9]),
				    xmax = Math.max(p[0], p[9]),
				    ymin = Math.min(p[1], p[10]),
				    ymax = Math.max(p[1], p[10]);
				var tempx, tempy;

				var data = temp_view.data;
				for (var x in data) {
					for (var y in data[x]) {
						tempx = parseFloat(x) - 50;
						tempy = parseFloat(y) - 50;
						if (tempx > xmin && tempx < xmax && tempy > ymin && tempy < ymax) {
							//console.log('true')
							data[x][y].selected = true;
						} else {
							data[x][y].selected = false;
						}
					}
				}
				updateSelectionFromHeatmap(temp_view);
			}
		}
	}

	if (noSelection) {
		for (var i = 0; i < unfilteredData.length; i++) {
			unfilteredData[i].selected = true;
		}
	}

	for (var ii = 0; ii < _view_setupJs.views.length; ++ii) {
		var view = _view_setupJs.views[ii];
		if (view.viewType == '2DHeatmap') {
			//updatePointCloud(view,unfilteredData.length);
			_DHeatmapsHeatmapViewJs.updateHeatmap(view);
		}
	}

	//updatePointCloudGeometry(options);
	for (var ii = 0; ii < _view_setupJs.views.length; ++ii) {
		var view = _view_setupJs.views[ii];
		if (view.viewType == '3DView') {
			_DViewsPointCloud_selectionJs.updatePointCloudGeometry(view);
		}
	}
}

function processClick() {
	if (clickRequest) {
		for (var ii = 0; ii < _view_setupJs.views.length; ++ii) {
			var view = _view_setupJs.views[ii];
			if (view.viewType == '2DHeatmap' && view.controllerEnabled) {
				var temp = view.scene.getObjectByName('selectionPlane');
				if (temp != null) {
					updatePlane(view, temp);
				} else {
					spawnPlane(view);
				}
			}
		}
	}
}

},{"./2DHeatmaps/HeatmapView.js":2,"./2DHeatmaps/Utilities.js":3,"./2DHeatmaps/setupOptionBox2DHeatmap.js":5,"./2DHeatmaps/tooltip.js":6,"./3DViews/PointCloud_selection.js":7,"./3DViews/setupOptionBox3DView.js":9,"./MultiviewControl/calculateViewportSizes.js":10,"./MultiviewControl/controllerControl.js":11,"./MultiviewControl/initializeViewSetups.js":12,"./MultiviewControl/optionBoxControl.js":13,"./MultiviewControl/setupViewBasic.js":14,"./Utilities/readDataFile.js":15,"./view_setup.js":16}],2:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.arrangeDataToHeatmap = arrangeDataToHeatmap;
exports.getHeatmap = getHeatmap;
exports.updateHeatmap = updateHeatmap;
exports.replotHeatmap = replotHeatmap;

function arrangeDataToHeatmap(view, unfilteredData) {

	var X = view.options.plotX,
	    Y = view.options.plotY;
	var XTransform = view.options.plotXTransform,
	    YTransform = view.options.plotYTransform;
	var numPerSide = view.options.numPerSide;

	var heatmapStep = [];

	for (var i = 1; i <= numPerSide; i++) {
		heatmapStep.push("" + i);
	}

	if (XTransform == 'linear') {
		var xValue = function xValue(d) {
			return d[X];
		};
	}
	if (YTransform == 'linear') {
		var yValue = function yValue(d) {
			return d[Y];
		};
	}

	/*if (XTransform == 'log10') {
 	if (X == 'epxc') {var xValue = function(d) {return Math.log10(-1*d[X]);}}
 	else {var xValue = function(d) {return Math.log10(d[X]);};}
 }
 if (YTransform == 'log10') {
 	if (Y == 'epxc') {var yValue = function(d) {return Math.log10(-1*d[Y]);}}
 	else {var yValue = function(d) {return Math.log10(d[Y]);};}
 }*/

	if (XTransform == 'log10') {
		var xValue = function xValue(d) {
			return Math.log10(d[X]);
		};
	}
	if (YTransform == 'log10') {
		var yValue = function yValue(d) {
			return Math.log10(d[Y]);
		};
	}

	if (XTransform == 'neglog10') {
		var xValue = function xValue(d) {
			return Math.log10(-1 * d[X]);
		};
	}
	if (YTransform == 'neglog10') {
		var yValue = function yValue(d) {
			return Math.log10(-1 * d[Y]);
		};
	}

	var xMin = Math.floor(d3.min(unfilteredData, xValue));
	var xMax = Math.ceil(d3.max(unfilteredData, xValue));
	var yMin = Math.floor(d3.min(unfilteredData, yValue));
	var yMax = Math.ceil(d3.max(unfilteredData, yValue));

	/*var xMin = d3.min(unfilteredData,xValue);
 var xMax = d3.max(unfilteredData,xValue);
 var yMin = d3.min(unfilteredData,yValue);
 var yMax = d3.max(unfilteredData,yValue);*/

	view.xMin = xMin;
	view.xMax = xMax;
	view.yMin = yMin;
	view.yMax = yMax;

	var xScale = d3.scaleQuantize().domain([xMin, xMax]).range(heatmapStep);

	var yScale = d3.scaleQuantize().domain([yMin, yMax]).range(heatmapStep);

	var xMap = function xMap(d) {
		return xScale(xValue(d));
	};
	var yMap = function yMap(d) {
		return yScale(yValue(d));
	};

	view.data = {};
	view.dataXMin = d3.min(unfilteredData, xValue);
	view.dataXMax = d3.max(unfilteredData, xValue);
	view.dataYMin = d3.min(unfilteredData, yValue);
	view.dataYMax = d3.max(unfilteredData, yValue);

	view.xScale = xScale;
	view.yScale = yScale;

	//console.log(xScale.invertExtent(""+50))

	for (var i = 0; i < unfilteredData.length; i++) {
		var heatmapX = xMap(unfilteredData[i]);
		var heatmapY = yMap(unfilteredData[i]);

		view.data[heatmapX] = view.data[heatmapX] || {};
		view.data[heatmapX][heatmapY] = view.data[heatmapX][heatmapY] || { list: [], selected: true };
		view.data[heatmapX][heatmapY]['list'].push(unfilteredData[i]);
	}

	//console.log(view.data);
}

function getHeatmap(view) {
	var uniforms = {

		color: { value: new THREE.Color(0xffffff) },
		texture: { value: new THREE.TextureLoader().load("textures/sprites/disc.png") }

	};

	var shaderMaterial = new THREE.ShaderMaterial({

		uniforms: uniforms,
		vertexShader: document.getElementById('vertexshader').textContent,
		fragmentShader: document.getElementById('fragmentshader').textContent,

		blending: THREE.AdditiveBlending,
		depthTest: false,
		transparent: true

	});

	var X = view.options.plotX;
	var Y = view.options.plotY;
	var options = view.options;
	var scene = view.scene;

	var data = view.data;

	var num = heatmapPointCount(data);

	var geometry = new THREE.BufferGeometry();
	var colors = new Float32Array(num * 3);
	var positions = new Float32Array(num * 3);
	var sizes = new Float32Array(num);
	var alphas = new Float32Array(num);

	var heatmapInformation = [];
	//console.log(unfilteredData.length);
	//console.log(num);

	var lut = new THREE.Lut(options.colorMap, 500);
	lut.setMax(1000);
	lut.setMin(0);

	var i = 0;
	var i3 = 0;

	for (var x in data) {
		for (var y in data[x]) {
			var xPlot = parseFloat(x);
			var yPlot = parseFloat(y);

			positions[i3 + 0] = xPlot - 50;
			positions[i3 + 1] = yPlot - 50;
			positions[i3 + 2] = 0;

			var numberDatapointsRepresented = countListSelected(data[x][y]['list']);
			if (numberDatapointsRepresented > 0) {
				var color = lut.getColor(numberDatapointsRepresented);

				colors[i3 + 0] = color.r;
				colors[i3 + 1] = color.g;
				colors[i3 + 2] = color.b;
			} else {
				colors[i3 + 0] = 100;
				colors[i3 + 1] = 100;
				colors[i3 + 2] = 100;
			}
			sizes[i] = options.pointCloudSize;
			alphas[i] = options.pointCloudAlpha;

			i++;
			i3 += 3;

			var tempInfo = { x: xPlot - 50,
				y: yPlot - 50,
				numberDatapointsRepresented: numberDatapointsRepresented,
				xStart: view.xScale.invertExtent("" + xPlot)[0],
				xEnd: view.xScale.invertExtent("" + xPlot)[1],
				yStart: view.yScale.invertExtent("" + yPlot)[0],
				yEnd: view.yScale.invertExtent("" + yPlot)[1]
			};
			//console.log(tempInfo);
			heatmapInformation.push(tempInfo);
		}
	}

	view.heatmapInformation = heatmapInformation;
	geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.addAttribute('customColor', new THREE.BufferAttribute(colors, 3));
	geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
	geometry.addAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

	var System = new THREE.Points(geometry, shaderMaterial);
	//return System;

	//particles.name = 'scatterPoints';

	view.System = System;
	//view.attributes = particles.attributes;
	//view.geometry = particles.geometry;
	scene.add(System);
}

function updateHeatmap(view) {
	var options = view.options;
	var System = view.System;
	var data = view.data;
	var num = heatmapPointCount(data);
	var colors = new Float32Array(num * 3);
	var sizes = new Float32Array(num);
	var alphas = new Float32Array(num);
	var lut = new THREE.Lut(options.colorMap, 500);
	lut.setMax(1000);
	lut.setMin(0);
	var i = 0;
	var i3 = 0;
	for (var x in data) {
		for (var y in data[x]) {

			var numberDatapointsRepresented = countListSelected(data[x][y]['list']);
			if (numberDatapointsRepresented > 0) {
				var color = lut.getColor(numberDatapointsRepresented);

				colors[i3 + 0] = color.r;
				colors[i3 + 1] = color.g;
				colors[i3 + 2] = color.b;
			} else {
				colors[i3 + 0] = 100;
				colors[i3 + 1] = 100;
				colors[i3 + 2] = 100;
			}

			sizes[i] = options.pointCloudSize;
			alphas[i] = options.pointCloudAlpha;

			i++;
			i3 += 3;
		}
	}

	//geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
	System.geometry.addAttribute('customColor', new THREE.BufferAttribute(colors, 3));
	System.geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
	System.geometry.addAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
}

function replotHeatmap(view) {
	view.scene.remove(view.System);
	//var options = view.options;
	arrangeDataToHeatmap(view, view.unfilteredData);
	getHeatmap(view);
}

function countListSelected(list) {
	var count = 0;

	for (var i = 0; i < list.length; i++) {
		if (list[i].selected) {
			count += 1;
		}
	}
	return count;
}

function heatmapPointCount(data) {
	var count = 0;
	for (var x in data) {
		for (var y in data[x]) {
			count = count + 1;
		}
	}
	return count;
}

},{}],3:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.getAxis = getAxis;
exports.addTitle = addTitle;

function getAxis(view) {
	var geometry = new THREE.Geometry();
	geometry.vertices.push(new THREE.Vector3(-50, -50, 0));
	geometry.vertices.push(new THREE.Vector3(50, -50, 0));
	geometry.vertices.push(new THREE.Vector3(50, 50, 0));
	geometry.vertices.push(new THREE.Vector3(-50, 50, 0));
	geometry.vertices.push(new THREE.Vector3(-50, -50, 0));
	var material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 3 });
	var line = new THREE.Line(geometry, material);
	view.scene.add(line);
}

function addTitle(view) {
	var titleText = view.plotYTransform + " " + view.plotY + " v.s. " + view.plotXTransform + " " + view.plotX;
	//var titleText = " v.s. ";
	var tempTitle = document.createElement('div');
	tempTitle.style.position = 'absolute';
	tempTitle.innerHTML = titleText;
	tempTitle.style.backgroundColor = "black";
	tempTitle.style.opacity = 0.7;
	tempTitle.style.color = "white";
	tempTitle.style.top = view.windowTop + 'px';
	tempTitle.style.left = view.windowLeft + 'px';
	view.title = tempTitle;
	document.body.appendChild(tempTitle);
}

},{}],4:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.initialize2DHeatmapSetup = initialize2DHeatmapSetup;

var _HeatmapViewJs = require("./HeatmapView.js");

var _MultiviewControlCalculateViewportSizesJs = require("../MultiviewControl/calculateViewportSizes.js");

function initialize2DHeatmapSetup(viewSetup, views) {
	var defaultSetting = {
		background: new THREE.Color(0, 0, 0),
		controllerEnabledBackground: new THREE.Color(0.1, 0.1, 0.1),
		eye: [0, 0, 150],
		up: [0, 0, 1],
		fov: 45,
		mousePosition: [0, 0],
		viewType: '2DHeatmap',
		//plotX: 'gamma',
		//plotY: 'epxc',
		//plotXTransform: 'linear',
		//plotYTransform: 'log10',
		controllerEnabled: false,
		controllerZoom: true,
		controllerRotate: false,
		controllerPan: true,
		options: new function () {
			this.numPerSide = 100;
			this.pointCloudAlpha = 1;
			this.pointCloudSize = 3.0;
			this.plotX = viewSetup.plotX;
			this.plotY = viewSetup.plotY;
			this.plotXTransform = viewSetup.plotXTransform;
			this.plotYTransform = viewSetup.plotYTransform;
			this.colorMap = 'rainbow';
			this.resetCamera = function () {
				viewSetup.controller.reset();
			};
			this.replotHeatmap = function () {
				_HeatmapViewJs.replotHeatmap(viewSetup);
			};
			this.fullscreen = function () {
				_MultiviewControlCalculateViewportSizesJs.fullscreenOneView(views, viewSetup);
			};
			this.defullscreen = function () {
				_MultiviewControlCalculateViewportSizesJs.deFullscreen(views);
			};
		}()
	};

	viewSetup = extendObject(viewSetup, defaultSetting);
	//viewSetup = defaultSetting;
}

function extendObject(obj, src) {
	for (var key in src) {
		if (src.hasOwnProperty(key)) obj[key] = src[key];
	}
	return obj;
}

},{"../MultiviewControl/calculateViewportSizes.js":10,"./HeatmapView.js":2}],5:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.setupOptionBox2DHeatmap = setupOptionBox2DHeatmap;

var _HeatmapViewJs = require("./HeatmapView.js");

function setupOptionBox2DHeatmap(view) {

	var options = view.options;
	var gui = view.gui;
	gui.width = 200;
	//gui.height = 10;

	//var moleculeFolder 		= gui.addFolder( 'Molecule Selection' );
	var plotFolder = gui.addFolder('Plot Setting');
	var viewFolder = gui.addFolder('View Selection');
	//var pointCloudFolder 	= gui.addFolder( 'point cloud control' );

	/*	moleculeFolder.add( options, 'moleculeName')
 	.name( 'Molecule' )
 	.onChange(function( value ){
 		options.moleculeName = view.moleculeName;
 		gui.updateDisplay();		
 	});
 	moleculeFolder.add( options, 'propertyOfInterest',{'n':'n','epxc':'epxc', 'gamma':'gamma','ad0p2':'ad0p2','deriv1':'deriv1','deriv2':'deriv2'})
 	.name( 'Color Basis' )
 	.onChange( function( value ) {
 		updatePointCloudGeometry(view);
 	});
 	moleculeFolder.open();*/

	/*
 	viewFolder.add( options, 'view',{'pointCloud':'pointCloud', 'box':'box', 'pointMatrix':'pointMatrix'}).onChange( function( value ){
 		changeGeometry(options);
 		updateControlPanel(options);
 	});*/

	plotFolder.add(options, 'plotX', { 'n': 'n', 'epxc': 'epxc', 'gamma': 'gamma', 'ad0p2': 'ad0p2', 'deriv1': 'deriv1', 'deriv2': 'deriv2' }).name('X').onChange(function (value) {
		//updatePointCloudGeometry(view);
	});

	plotFolder.add(options, 'plotXTransform', { 'linear': 'linear', 'log10': 'log10', 'log10(-1*)': 'neglog10' }).name('X scale').onChange(function (value) {
		//updatePointCloudGeometry(view);
	});

	plotFolder.add(options, 'plotY', { 'n': 'n', 'epxc': 'epxc', 'gamma': 'gamma', 'ad0p2': 'ad0p2', 'deriv1': 'deriv1', 'deriv2': 'deriv2' }).name('Y').onChange(function (value) {
		//updatePointCloudGeometry(view);
	});

	plotFolder.add(options, 'plotYTransform', { 'linear': 'linear', 'log10': 'log10', 'log10(-1*)': 'neglog10' }).name('Y scale').onChange(function (value) {
		//updatePointCloudGeometry(view);
	});
	plotFolder.add(options, 'replotHeatmap');

	plotFolder.open();

	viewFolder.add(options, 'colorMap', { 'rainbow': 'rainbow', 'cooltowarm': 'cooltowarm', 'blackbody': 'blackbody', 'grayscale': 'grayscale' }).name('Color Scheme').onChange(function (value) {
		_HeatmapViewJs.updateHeatmap(view);
	});
	viewFolder.add(options, 'resetCamera');
	viewFolder.add(options, 'fullscreen');
	viewFolder.add(options, 'defullscreen');
	//viewFolder.open();

	viewFolder.add(options, 'pointCloudAlpha', 0, 1).step(0.01).name('Point Opacity').onChange(function (value) {
		_HeatmapViewJs.updateHeatmap(view);
	});
	viewFolder.add(options, 'pointCloudSize', 0, 10).step(0.1).name('Point Size').onChange(function (value) {
		_HeatmapViewJs.updateHeatmap(view);
	});
	/*pointCloudFolder.add( options, 'pointCloudColorSetting', 0.1, 20.0 ).step( 0.1 ).onChange( function( value ) {
 	updatePointCloudGeometry(view);
 });*/
	//pointCloudFolder.open();

	//console.log(gui);
}

},{"./HeatmapView.js":2}],6:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.initializeHeatmapToolTip = initializeHeatmapToolTip;
exports.updateHeatmapTooltip = updateHeatmapTooltip;

function initializeHeatmapToolTip(view) {
	var tempRaycaster = new THREE.Raycaster();
	view.raycaster = tempRaycaster;
	view.INTERSECTED = null;

	var tempTooltip = document.createElement('div');
	tempTooltip.style.position = 'absolute';
	tempTooltip.innerHTML = "";
	//tempTooltip.style.width = 100;
	//tempTooltip.style.height = 100;
	tempTooltip.style.backgroundColor = "blue";
	tempTooltip.style.opacity = 0.5;
	tempTooltip.style.color = "white";
	tempTooltip.style.top = 0 + 'px';
	tempTooltip.style.left = 0 + 'px';
	view.tooltip = tempTooltip;
	document.body.appendChild(tempTooltip);
}

function updateHeatmapTooltip(view) {

	var mouse = new THREE.Vector2();
	mouse.set((event.clientX - view.windowLeft) / view.windowWidth * 2 - 1, -((event.clientY - view.windowTop) / view.windowHeight) * 2 + 1);

	view.raycaster.setFromCamera(mouse.clone(), view.camera);
	var intersects = view.raycaster.intersectObject(view.System);
	if (intersects.length > 0) {
		//console.log("found intersect")

		view.tooltip.style.top = event.clientY + 5 + 'px';
		view.tooltip.style.left = event.clientX + 5 + 'px';

		var interesctIndex = intersects[0].index;
		view.tooltip.innerHTML = "x: " + view.heatmapInformation[interesctIndex].xStart + " : " + view.heatmapInformation[interesctIndex].xEnd + '<br>' + "y: " + view.heatmapInformation[interesctIndex].yStart + " : " + view.heatmapInformation[interesctIndex].yEnd + '<br>' + "# points: " + view.heatmapInformation[interesctIndex].numberDatapointsRepresented;

		view.System.geometry.attributes.size.array[interesctIndex] = 2 * view.options.pointCloudSize;
		view.System.geometry.attributes.size.needsUpdate = true;

		if (view.INTERSECTED != intersects[0].index) {
			view.System.geometry.attributes.size.array[view.INTERSECTED] = view.options.pointCloudSize;
			view.INTERSECTED = intersects[0].index;
			view.System.geometry.attributes.size.array[view.INTERSECTED] = 2 * view.options.pointCloudSize;
			view.System.geometry.attributes.size.needsUpdate = true;
		}
	} else {
		view.tooltip.innerHTML = '';
		view.System.geometry.attributes.size.array[view.INTERSECTED] = view.options.pointCloudSize;
	}
}

},{}],7:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.getPointCloudGeometry = getPointCloudGeometry;
exports.updatePointCloudGeometry = updatePointCloudGeometry;
exports.changePointCloudGeometry = changePointCloudGeometry;

function getPointCloudGeometry(view) {

	/*var vertexshaderText = ""
 
 var fragmentShaderText = ""*/
	var uniforms = {

		color: { value: new THREE.Color(0xffffff) },
		texture: { value: new THREE.TextureLoader().load("textures/sprites/disc.png") }

	};

	var shaderMaterial = new THREE.ShaderMaterial({

		uniforms: uniforms,
		vertexShader: document.getElementById('vertexshader').textContent,
		fragmentShader: document.getElementById('fragmentshader').textContent,

		blending: THREE.AdditiveBlending,
		depthTest: false,
		transparent: true

	});

	var options = view.options;
	var scene = view.scene;

	var particles = options.pointCloudParticles;
	var num_blocks = view.data.length;
	var points_in_block = new Float32Array(num_blocks);
	var total = 100;
	var count = 0;

	for (var k = 0; k < num_blocks; k++) {
		var num_points = Math.min(Math.floor(view.data[k]['n'] / total * particles), 80);
		points_in_block[k] = num_points;
		count += num_points;
	}

	var n = 100;
	var n2 = Math.pow(n, 2);
	var n_inc = n / 2;

	var geometry = new THREE.BufferGeometry();

	var positions = new Float32Array(count * 3);
	var colors = new Float32Array(count * 3);
	var sizes = new Float32Array(count);
	var alphas = new Float32Array(count);

	var colorMap = options.colorMap;
	var numberOfColors = 512;

	var lut = new THREE.Lut(colorMap, numberOfColors);
	lut.setMax(options.pointCloudColorSettingMax);
	lut.setMin(options.pointCloudColorSettingMin);
	console.log(options.pointCloudColorSettingMin, options.pointCloudColorSettingMax);
	console.log(lut);

	var i = 0,
	    i3 = 0;
	var temp_num_points = 0;
	for (var k = 0; k < num_blocks; k++) {
		temp_num_points = points_in_block[k];
		if (temp_num_points > 0) {
			var x_start = view.data[k]['x'] * 10 + 50;
			var y_start = view.data[k]['y'] * 10 + 50;
			var z_start = view.data[k]['z'] * 10 + 50;
			var x_end = x_start + 1;
			var y_end = y_start + 1;
			var z_end = z_start + 1;

			for (var j = 0; j < temp_num_points; j++) {

				var x = Math.random() * 10 + x_start;
				var y = Math.random() * 10 + y_start;
				var z = Math.random() * 10 + z_start;

				positions[i3 + 0] = (x - n_inc) * 10;
				positions[i3 + 1] = (y - n_inc) * 10;
				positions[i3 + 2] = (z - n_inc) * 10;
				var color = lut.getColor(view.data[k][options.propertyOfInterest]);

				colors[i3 + 0] = color.r;
				colors[i3 + 1] = color.g;
				colors[i3 + 2] = color.b;

				if (x_start >= options.x_low && x_end <= options.x_high && y_start >= options.y_low && y_end <= options.y_high && z_start >= options.z_low && z_end <= options.z_high && view.data[k].selected) {
					alphas[i] = options.pointCloudAlpha;
					sizes[i] = options.pointCloudSize;
				} else {
					alphas[i] = 0;
					sizes[i] = 0;
				}

				i++;
				i3 += 3;
			}
		}
	}

	geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
	geometry.addAttribute('customColor', new THREE.BufferAttribute(colors, 3));
	geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
	geometry.addAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

	var System = new THREE.Points(geometry, shaderMaterial);
	view.System = System;
	scene.add(System);
}

function updatePointCloudGeometry(view) {

	var options = view.options;

	var particles = options.pointCloudParticles;
	var num_blocks = view.data.length;
	var points_in_block = new Float32Array(num_blocks);
	var total = 100;
	var count = 0;

	for (var k = 0; k < num_blocks; k++) {
		//var num_points  = Math.floor((unfilteredData[k]['n'] / total) * particles);
		var num_points = Math.min(Math.floor(view.data[k]['n'] / total * particles), 80);
		points_in_block[k] = num_points;
		count += num_points;
	}

	var n = 100;
	var n2 = Math.pow(n, 2);
	var n_inc = n / 2;

	var colors = new Float32Array(count * 3);
	var sizes = new Float32Array(count);
	var alphas = new Float32Array(count);

	var colorMap = options.colorMap;
	var numberOfColors = 512;

	var lut = new THREE.Lut(colorMap, numberOfColors);
	lut.setMax(options.pointCloudColorSettingMax);
	lut.setMin(options.pointCloudColorSettingMin);

	var i = 0,
	    i3 = 0;
	var temp_num_points = 0;
	for (var k = 0; k < num_blocks; k++) {
		temp_num_points = points_in_block[k];
		if (temp_num_points > 0) {
			var x_start = view.data[k]['x'] * 10 + 50;
			var y_start = view.data[k]['y'] * 10 + 50;
			var z_start = view.data[k]['z'] * 10 + 50;
			var x_end = x_start + 1;
			var y_end = y_start + 1;
			var z_end = z_start + 1;

			for (var j = 0; j < temp_num_points; j++) {

				var color = lut.getColor(view.data[k][options.propertyOfInterest]);

				colors[i3 + 0] = color.r;
				colors[i3 + 1] = color.g;
				colors[i3 + 2] = color.b;

				if (x_start >= options.x_low && x_end <= options.x_high && y_start >= options.y_low && y_end <= options.y_high && z_start >= options.z_low && z_end <= options.z_high && view.data[k].selected) {
					alphas[i] = options.pointCloudAlpha;
					sizes[i] = options.pointCloudSize;
				} else {
					alphas[i] = 0;
					sizes[i] = 0;
				}

				i++;
				i3 += 3;
			}
		}
	}

	view.System.geometry.addAttribute('customColor', new THREE.BufferAttribute(colors, 3));
	view.System.geometry.addAttribute('size', new THREE.BufferAttribute(sizes, 1));
	view.System.geometry.addAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
}

function changePointCloudGeometry(view) {
	view.scene.remove(view.System);
	getPointCloudGeometry(view);
}

},{}],8:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.initialize3DViewSetup = initialize3DViewSetup;

var _MultiviewControlCalculateViewportSizesJs = require("../MultiviewControl/calculateViewportSizes.js");

function initialize3DViewSetup(viewSetup, views) {
	var defaultSetting = {
		//left: 0,
		//top: 0,
		//width: 0.6,
		//height: 0.5,
		background: new THREE.Color(0, 0, 0),
		controllerEnabledBackground: new THREE.Color(0.1, 0.1, 0.1),
		eye: [0, 0, 800],
		up: [0, 1, 0],
		fov: 100,
		mousePosition: [0, 0],
		//viewType: '3Dview',
		//moleculeName: 'CO2',
		//dataFilename: "data/CO2_B3LYP_0_0_0_all_descriptors.csv",
		controllerEnabled: false,
		controllerZoom: true,
		controllerRotate: true,
		controllerPan: true,
		options: new function () {
			this.pointCloudParticles = 1000;
			this.pointCloudColorSettingMax = 1.2;
			this.pointCloudColorSettingMin = 0.0;
			this.pointCloudAlpha = 1;
			this.pointCloudSize = 1;
			/*this.boxParticles = 200;
   this.boxColorSetting = 10.0;
   this.boxSize = 10;
   this.boxOpacity = 1;
   this.pointMatrixParticles = 100;
   this.pointMatrixColorSettingMax = 1.2;
   this.pointMatrixColorSettingMin = 0.0;
   this.pointMatrixAlpha = 1;
   this.pointMatrixSize = 10;*/
			this.x_low = 0;
			this.x_high = 100;
			this.y_low = 0;
			this.y_high = 100;
			this.z_low = 0;
			this.z_high = 100;
			this.x_slider = 0;
			this.y_slider = 0;
			this.z_slider = 0;
			this.densityCutoff = -3;
			this.view = 'pointCloud';
			this.moleculeName = viewSetup.moleculeName;
			this.propertyOfInterest = 'n';
			this.colorMap = 'rainbow';
			//this.dataFilename = "data/CO2_B3LYP_0_0_0_all_descriptors.csv";
			this.planeVisibilityU = false;
			this.planeVisibilityD = false;
			this.planeVisibilityR = false;
			this.planeVisibilityL = false;
			this.planeVisibilityF = false;
			this.planeVisibilityB = false;
			this.planeOpacity = 0.05;
			this.resetCamera = function () {
				viewSetup.controller.reset();
			};
			this.fullscreen = function () {
				_MultiviewControlCalculateViewportSizesJs.fullscreenOneView(views, viewSetup);
			};
			this.defullscreen = function () {
				_MultiviewControlCalculateViewportSizesJs.deFullscreen(views);
			};
		}()
	};

	viewSetup = extendObject(viewSetup, defaultSetting);
}

function extendObject(obj, src) {
	for (var key in src) {
		if (src.hasOwnProperty(key)) obj[key] = src[key];
	}
	return obj;
}

},{"../MultiviewControl/calculateViewportSizes.js":10}],9:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.setupOptionBox3DView = setupOptionBox3DView;

var _PointCloud_selectionJs = require("./PointCloud_selection.js");

function setupOptionBox3DView(view) {

	var options = view.options;
	var gui = view.gui;
	gui.width = 200;

	var moleculeFolder = gui.addFolder('Molecule Selection');
	var viewFolder = gui.addFolder('View Selection');
	var pointCloudFolder = gui.addFolder('point cloud control');
	var sliderFolder = gui.addFolder('Slider Control');

	moleculeFolder.add(options, 'moleculeName').name('Molecule').onChange(function (value) {
		options.moleculeName = view.moleculeName;
		gui.updateDisplay();
	});
	moleculeFolder.add(options, 'propertyOfInterest', { 'n': 'n', 'epxc': 'epxc', 'gamma': 'gamma', 'ad0p2': 'ad0p2', 'deriv1': 'deriv1', 'deriv2': 'deriv2' }).name('Color Basis').onChange(function (value) {
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
	});
	moleculeFolder.open();

	/*
 	viewFolder.add( options, 'view',{'pointCloud':'pointCloud', 'box':'box', 'pointMatrix':'pointMatrix'}).onChange( function( value ){
 		changeGeometry(options);
 		updateControlPanel(options);
 	});*/

	viewFolder.add(options, 'colorMap', { 'rainbow': 'rainbow', 'cooltowarm': 'cooltowarm', 'blackbody': 'blackbody', 'grayscale': 'grayscale' }).name('Color Scheme').onChange(function (value) {
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
	});
	viewFolder.add(options, 'resetCamera');
	viewFolder.add(options, 'fullscreen');
	viewFolder.add(options, 'defullscreen');
	viewFolder.open();

	pointCloudFolder.add(options, 'pointCloudParticles', 10, 20000).step(10).name('Point Density').onChange(function (value) {
		_PointCloud_selectionJs.changePointCloudGeometry(view);
	});
	pointCloudFolder.add(options, 'pointCloudAlpha', 0, 1).step(0.01).name('Point Opacity').onChange(function (value) {
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
	});
	pointCloudFolder.add(options, 'pointCloudSize', 0, 10).step(0.1).name('Point Size').onChange(function (value) {
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
	});
	/*pointCloudFolder.add( options, 'pointCloudColorSetting', 0.1, 20.0 ).step( 0.1 ).onChange( function( value ) {
 	updatePointCloudGeometry(view);
 });*/
	pointCloudFolder.open();

	sliderFolder.add(options, 'x_low', 0, 100).step(1).name('x low').onChange(function (value) {
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
		//updatePlane(options);
	});
	sliderFolder.add(options, 'x_high', 0, 100).step(1).name('x high').onChange(function (value) {
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
		//updatePlane(options);
	});
	sliderFolder.add(options, 'y_low', 0, 100).step(1).name('y low').onChange(function (value) {
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
		//updatePlane(options);
	});
	sliderFolder.add(options, 'y_high', 0, 100).step(1).name('y high').onChange(function (value) {
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
		//updatePlane(options);
	});
	sliderFolder.add(options, 'z_low', 0, 100).step(1).name('z low').onChange(function (value) {
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
		//updatePlane(options);
	});
	sliderFolder.add(options, 'z_high', 0, 100).step(1).name('z high').onChange(function (value) {
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
		//updatePlane(options);
	});

	sliderFolder.add(options, 'x_slider', 0, 100).step(1).onChange(function (value) {
		options.x_low = value - 1;
		options.x_high = value;
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
		//updatePlane(options);
		gui.updateDisplay();
	});
	sliderFolder.add(options, 'y_slider', 0, 100).step(1).onChange(function (value) {
		options.y_low = value - 1;
		options.y_high = value;
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
		//updatePlane(options);
		gui.updateDisplay();
	});
	sliderFolder.add(options, 'z_slider', 0, 100).step(1).onChange(function (value) {
		options.z_low = value - 1;
		options.z_high = value;
		_PointCloud_selectionJs.updatePointCloudGeometry(view);
		//updatePlane(options);
		gui.updateDisplay();
	});

	//sliderFolder.open();
	//console.log(gui);
}

},{"./PointCloud_selection.js":7}],10:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.calculateViewportSizes = calculateViewportSizes;
exports.fullscreenOneView = fullscreenOneView;
exports.deFullscreen = deFullscreen;

var _optionBoxControlJs = require("./optionBoxControl.js");

function calculateViewportSizes(views) {
	var twoDViewCount = 0.0,
	    threeDViewCount = 0.0;

	var threeDViewHeight, threeDViewWidth;
	var twoDViewHeight, twoDViewWidth;
	for (var ii = 0; ii < views.length; ++ii) {
		var view = views[ii];
		if (view.viewType == '2DHeatmap') {
			twoDViewCount += 1.0;
		}
		if (view.viewType == '3DView') {
			threeDViewCount += 1.0;
		}
	}

	if (twoDViewCount == 0) {
		threeDViewWidth = 1.0;twoDViewWidth = 0.0;
	} else {
		threeDViewWidth = 0.6;twoDViewWidth = 0.4;
	}

	if (twoDViewCount != 0) {
		twoDViewHeight = 1.0 / twoDViewCount;
	}
	if (threeDViewCount != 0) {
		threeDViewHeight = 1.0 / threeDViewCount;
	}

	var twoDViewTopCounter = 0.0,
	    threeDViewTopCounter = 0.0;

	for (var ii = 0; ii < views.length; ++ii) {
		var view = views[ii];
		if (view.viewType == '2DHeatmap') {
			view.left = threeDViewWidth;
			view.top = twoDViewTopCounter;
			view.height = twoDViewHeight;
			view.width = twoDViewWidth;

			twoDViewTopCounter += twoDViewHeight;
		}
		if (view.viewType == '3DView') {
			view.left = 0.0;
			view.top = threeDViewTopCounter;
			view.height = threeDViewHeight;
			view.width = threeDViewWidth;

			threeDViewTopCounter += threeDViewHeight;
		}
	}
}

function fullscreenOneView(views, view) {
	for (var ii = 0; ii < views.length; ++ii) {
		var tempView = views[ii];

		tempView.left = 0.0;
		tempView.top = 0.0;
		tempView.height = 0.0;
		tempView.width = 0.0;

		//tempView.guiContainer.style.display = "none";
		tempView.guiContainer.style.visibility = "hidden";
	}

	view.left = 0.0;
	view.top = 0.0;
	view.height = 1.0;
	view.width = 1.0;

	view.guiContainer.style.visibility = "visible";

	_optionBoxControlJs.updateOptionBoxLocation(views);
}

function deFullscreen(views) {
	var twoDViewCount = 0.0,
	    threeDViewCount = 0.0;

	var threeDViewHeight, threeDViewWidth;
	var twoDViewHeight, twoDViewWidth;
	for (var ii = 0; ii < views.length; ++ii) {
		var view = views[ii];
		if (view.viewType == '2DHeatmap') {
			twoDViewCount += 1.0;
		}
		if (view.viewType == '3DView') {
			threeDViewCount += 1.0;
		}
	}

	if (twoDViewCount == 0) {
		threeDViewWidth = 1.0;twoDViewWidth = 0.0;
	} else {
		threeDViewWidth = 0.6;twoDViewWidth = 0.4;
	}

	if (twoDViewCount != 0) {
		twoDViewHeight = 1.0 / twoDViewCount;
	}
	if (threeDViewCount != 0) {
		threeDViewHeight = 1.0 / threeDViewCount;
	}

	var twoDViewTopCounter = 0.0,
	    threeDViewTopCounter = 0.0;

	for (var ii = 0; ii < views.length; ++ii) {
		var view = views[ii];
		view.guiContainer.style.visibility = "visible";
		if (view.viewType == '2DHeatmap') {
			view.left = threeDViewWidth;
			view.top = twoDViewTopCounter;
			view.height = twoDViewHeight;
			view.width = twoDViewWidth;

			twoDViewTopCounter += twoDViewHeight;
		}
		if (view.viewType == '3DView') {
			view.left = 0.0;
			view.top = threeDViewTopCounter;
			view.height = threeDViewHeight;
			view.width = threeDViewWidth;

			threeDViewTopCounter += threeDViewHeight;
		}
	}

	_optionBoxControlJs.updateOptionBoxLocation(views);
}

},{"./optionBoxControl.js":13}],11:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.updateController = updateController;

function updateController(views, windowWidth, windowHeight, mouseX, mouseY) {
	for (var ii = 0; ii < views.length; ++ii) {
		var view = views[ii];
		var left = Math.floor(windowWidth * view.left);
		var top = Math.floor(windowHeight * view.top);
		var width = Math.floor(windowWidth * view.width);
		var height = Math.floor(windowHeight * view.height);

		if (mouseX > left && mouseX < left + width && mouseY > top && mouseY < top + height) {
			enableController(view, view.controller);
		} else {
			disableController(view, view.controller);
		}
	}
}

function enableController(view, controller) {
	view.controllerEnabled = true;
	controller.enableZoom = view.controllerZoom;
	controller.enablePan = view.controllerPan;
	controller.enableRotate = view.controllerRotate;
}
function disableController(view, controller) {
	view.controllerEnabled = false;
	controller.enableZoom = false;
	controller.enablePan = false;
	controller.enableRotate = false;
}

},{}],12:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.initializeViewSetups = initializeViewSetups;

var _MultiviewControlCalculateViewportSizesJs = require("../MultiviewControl/calculateViewportSizes.js");

var _DHeatmapsInitialize2DHeatmapSetupJs = require("../2DHeatmaps/initialize2DHeatmapSetup.js");

var _DViewsInitialize3DViewSetupJs = require("../3DViews/initialize3DViewSetup.js");

function initializeViewSetups(views) {
	for (var ii = 0; ii < views.length; ++ii) {
		var view = views[ii];
		if (view.viewType == '2DHeatmap') {
			_DHeatmapsInitialize2DHeatmapSetupJs.initialize2DHeatmapSetup(view, views);
		}
		if (view.viewType == '3DView') {
			_DViewsInitialize3DViewSetupJs.initialize3DViewSetup(view, views);
		}
	}

	_MultiviewControlCalculateViewportSizesJs.calculateViewportSizes(views);
}

},{"../2DHeatmaps/initialize2DHeatmapSetup.js":4,"../3DViews/initialize3DViewSetup.js":8,"../MultiviewControl/calculateViewportSizes.js":10}],13:[function(require,module,exports){
'use strict';

exports.__esModule = true;
exports.addOptionBox = addOptionBox;
exports.updateOptionBoxLocation = updateOptionBoxLocation;
exports.showHideAllOptionBoxes = showHideAllOptionBoxes;

function addOptionBox(view) {
	var tempGuiContainer = document.createElement('div');

	tempGuiContainer.style.position = 'absolute';
	tempGuiContainer.style.top = view.windowTop + 'px';
	tempGuiContainer.style.left = view.windowLeft + 'px';
	document.body.appendChild(tempGuiContainer);
	var tempGui = new dat.GUI({ autoPlace: false });
	view.guiContainer = tempGuiContainer;
	view.gui = tempGui;

	tempGuiContainer.appendChild(tempGui.domElement);
}

function updateOptionBoxLocation(views) {
	setTimeout(function () {
		for (var ii = 0; ii < views.length; ++ii) {
			var view = views[ii];
			view.guiContainer.style.top = view.windowTop + 'px';
			view.guiContainer.style.left = view.windowLeft + 'px';
		}
	}, 30);
}

function hideAllOptionBoxes(views) {
	for (var ii = 0; ii < views.length; ++ii) {
		var view = views[ii];
		view.guiContainer.style.visibility = "hidden";
	}
}

function showAllOptionBoxes(views) {
	for (var ii = 0; ii < views.length; ++ii) {
		var view = views[ii];
		view.guiContainer.style.visibility = "visible";
	}
}

function showHideAllOptionBoxes(views, boxShowBool) {
	if (boxShowBool) {
		hideAllOptionBoxes(views);
	} else {
		showAllOptionBoxes(views);
	}
}

},{}],14:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.setupViewCameraSceneController = setupViewCameraSceneController;

function setupViewCameraSceneController(view, renderer) {

	var camera = new THREE.PerspectiveCamera(view.fov, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.fromArray(view.eye);
	view.camera = camera;
	var tempController = new THREE.OrbitControls(camera, renderer.domElement);
	view.controller = tempController;
	var tempScene = new THREE.Scene();
	view.scene = tempScene;

	var left = Math.floor(window.innerWidth * view.left);
	var top = Math.floor(window.innerHeight * view.top);
	var width = Math.floor(window.innerWidth * view.width);
	var height = Math.floor(window.innerHeight * view.height);

	view.windowLeft = left;
	view.windowTop = top;
	view.windowWidth = width;
	view.windowHeight = height;
}

},{}],15:[function(require,module,exports){
"use strict";

exports.__esModule = true;
exports.readCSV = readCSV;

function readCSV(view, filename, plotData, number, callback) {

	view.data = [];
	d3.csv(filename, function (d) {
		d.forEach(function (d, i) {
			var n = +d.rho;
			if (n > 1e-3) {
				var temp = {
					x: +d.x,
					y: +d.y,
					z: +d.z,
					n: +d.rho,
					gamma: +d.gamma,
					epxc: +d.epxc,
					ad0p2: +d.ad0p2,
					deriv1: +d.deriv1,
					deriv2: +d.deriv2,
					selected: true
				};

				view.data.push(temp);
				plotData.push(temp);
			}
		});
		number = number + view.data.length;
		//console.log(number);
		//console.log(view.data);
		callback(null);
	});
}

},{}],16:[function(require,module,exports){
'use strict';

exports.__esModule = true;
var views = [{
	viewType: '3DView',
	moleculeName: 'CO2',
	dataFilename: "data/CO2_B3LYP_0_0_0_all_descriptors.csv"
}, {
	viewType: '3DView',
	moleculeName: 'H2O',
	dataFilename: "data/H2O_B3LYP_0_0_0_all_descriptors.csv"
}, {
	viewType: '2DHeatmap',
	plotX: 'gamma',
	plotY: 'epxc',
	plotXTransform: 'linear',
	plotYTransform: 'linear'
}, {
	viewType: '2DHeatmap',
	plotX: 'n',
	plotY: 'epxc',
	plotXTransform: 'linear',
	plotYTransform: 'linear'
}, {
	viewType: '2DHeatmap',
	plotX: 'gamma',
	plotY: 'epxc',
	plotXTransform: 'linear',
	plotYTransform: 'neglog10'
}, {
	viewType: '2DHeatmap',
	plotX: 'n',
	plotY: 'epxc',
	plotXTransform: 'log10',
	plotYTransform: 'neglog10'
}];

exports.views = views;

},{}]},{},[1]);
