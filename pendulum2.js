var blocks = new Array();
var deltaT = 1.0 / 400.0;
var Ag = 200;
var jointK = 50;
var rootX = 600;
var rootY = 300;
var running = true;
var newBlock = null;
var overlap = new Object();
var mute = true;
var mouseDownPoint;
var lines = false;
var trailBlock;
var trailSide;
var trail = new Array();
var paused = false;
var startAdd;

function reset() {
	blocks = new Array();
	overlap = new Object();
	running = true;
	newBlock = null;
	trailBlock = null;
	trail = new Array();
	initializeBlock("root", 40, 125, 1, 0, 3, null, 0, 0);
}

function setupProcessing(processing) {
	processing.setup = function() {
		processing.size(1200, 1000);
		processing.background(0);
		processing.stroke(120, 23, 200);
		processing.fill(120, 23, 200);
		processing.frameRate(30);
		reset();
	};

	processing.draw = function() {
		processing.background(255);
		var i;

		if (running) {
			drawTrail(processing);
		}

		if (lines) {
			processing.fill(0);
			processing.ellipse(rootX, rootY, 10, 10);

			for (i = 0; i < blocks.length; i++) {
				drawLines(processing, blocks[i]);
			}
		}
		for (i = 0; i < blocks.length; i++) {
			drawWeights(processing, blocks[i]);
		}

		if (running && !paused) {
			for (i = 0; i < blocks.length; i++) {
				moveBlock(blocks[i]);
			}
			for (i = 0; i < blocks.length; i++) {
				pushBlock(blocks[i]);
			}
			for (i = 0; i < blocks.length; i++) {
				processOverlaps(i);
			}
		}
	};

	processing.mousePressed = function() {
		if (running) {
			mouseDownPoint = getVector(processing.mouseX, processing.mouseY);
			var newTrailBlockInfo = findBlockCorner(mouseDownPoint);
			if (newTrailBlockInfo == null) {
				running = false;
				addBlock(mouseDownPoint);
				startAdd = (new Date()).getTime();
			} else {
				if (trailBlock != null && trailBlock.name == newTrailBlockInfo.block.name && trailSide == newTrailBlockInfo.side) {
					trailBlock = null;
				} else {
					trailBlock = newTrailBlockInfo.block;
					trailSide = newTrailBlockInfo.side;					
				}
				trail = new Array();
			}
		}
	};

	processing.mouseDragged = function() {
		if (newBlock != null) {
			var mousePoint = getVector(processing.mouseX, processing.mouseY);
			changeNewBlock(mousePoint);
		}
	};

	processing.mouseReleased = function() {
		if (newBlock != null) {
			var downTime = (new Date()).getTime() - startAdd;
			if (downTime < 1000) {
				if (newBlock.parentSide < 0) {
					newBlock.parent.childA = null;
				} else {
					newBlock.parent.childB = null;					
				}
				blocks.pop();
			} else {
				newBlock.theta = Math.random() * Math.PI * 2;
				newBlock.omega = Math.random() * 1 - 1;				
			}
			running = true;
			newBlock = null;
		}
	};

}

function init() {
	new Processing(document.getElementById("canvas"), setupProcessing);
};

function addBlock(mousePosition) {
	var parentInfo = findAnchor(mousePosition);
	if (parentInfo == null) {
		console.log("Error!");
	}
	newBlock = initializeBlock("b" + blocks.length, 50 + Math.random() * 100,
			50 + Math.random() * 200, 0, Math.random() * 2 - 1, 2 + Math
					.random() * 10, parentInfo.block, parentInfo.side, Math
					.random());
}

function changeNewBlock(newPoint) {
	newBlock.width = 100 + newPoint.x - mouseDownPoint.x;
	if (newBlock.width < 1) {
		newBlock.width = 1;
	} else if (newBlock.width > 400) {
		newBlock.width = 400;
	}
	newBlock.height = 50 + newPoint.y - mouseDownPoint.y;
	if (newBlock.height < 10) {
		newBlock.height = 10;
	} else if (newBlock.height > 400) {
		newBlock.height = 400;
	}
	reinitializeBlockPosition(newBlock);
}

function findAnchor(point) {
	var i;
	var bestAnchor = null;
	for (i = 0; i < blocks.length; i++) {
		var block = blocks[i];
		if (block.childA == null) {
			bestAnchor = updateBestAnchor(bestAnchor, block, -1, point);
		}
		if (block.childB == null) {
			bestAnchor = updateBestAnchor(bestAnchor, block, 1, point);
		}
	}
	return bestAnchor;
}

function updateBestAnchor(bestAnchor, block, side, point) {
	var newAnchor = new Object();
	newAnchor.block = block;
	newAnchor.side = side;
	if (bestAnchor == null) {
		return newAnchor;
	} else {
		var newDistance = vectorMagnitude(vectorSubtract(getCornerPosition(
				block, side), point));
		var existingDistance = vectorMagnitude(vectorSubtract(
				getCornerPosition(bestAnchor.block, bestAnchor.side), point));
		if (newDistance < existingDistance) {
			return newAnchor;
		} else {
			return bestAnchor;
		}
	}
}

function initializeBlock(name, height, width, angle, omega, mass, parent,
		parentSide, hue) {
	var block = new Object();
	block.name = name;
	block.position = getVector(0, 0);
	block.theta = angle;
	block.width = width;
	block.height = height;
	block.v = getVector(0, 0);
	block.a = getVector(0, 0);
	block.omega = omega;
	block.alpha = 0;
	block.mass = mass;
	block.I = block.width * block.mass * 2;
	if (block.width < 10) {
		block.I = 10 * block.mass * 2; // minimum moment of inertia
	}
	block.parent = parent;
	block.parentSide = parentSide;
	block.hue = hue;
	block.saturation = 0.5 + Math.random() * 0.5;
	block.childA = null;
	block.childB = null;
	if (parent != null) {
		if (parentSide < 0) {
			parent.childA = block;
		} else {
			parent.childB = block;
		}
	}
	reinitializeBlockPosition(block);
	blocks.push(block);
	return block;
}

function reinitializeBlockPosition(block) {
	if (block.parent === null) {
		block.position = vectorAdd(getVector(rootX, rootY), vectorMultiply(
				getPivotPosition(block), -1));
	} else {
		block.position = vectorSubtract(getCornerPosition(block.parent,
				block.parentSide), getPivotOffset(block));
	}
}

function moveBlock(block) {
	block.v = vectorAdd(block.v, vectorMultiply(block.a, deltaT));
	// instead of computing the new position based on the last position, we are
	// going to
	// compute it relative to its anchor position on its parent. This helps with
	// stability
	block.position = vectorSubtract(getParentAnchorPosition(block),
			getPivotOffset(block));
	// block.position = vectorAdd(block.position, vectorMultiply(block.v,
	// deltaT));
	block.omega = block.omega + block.alpha * deltaT;
	block.theta = block.theta + block.omega * deltaT;
}

function pushBlock(block) {
	var fGravity = getGravityForce(block);
	var fParent = getPivotForce(block);
	var fChildLeft = getChildForce(block, -1);
	var fChildRight = getChildForce(block, 1);
	var fDamping = getVelocityDamping(block);

	var force = vectorAdd(fGravity, fParent);
	force = vectorAdd(force, fChildLeft);
	force = vectorAdd(force, fChildRight);
	force = vectorAdd(force, fDamping);

	block.a = vectorMultiply(force, 1.0 / (block.mass * 2));

	var parentMoment = getPivotMoment(block, fParent);
	var childAMoment = getChildLeftMoment(block);
	var childBMoment = getChildRightMoment(block);
	var dampingMoment = getAngularDampingMoment(block);
	var moment = parentMoment + childAMoment + childBMoment + dampingMoment;
	block.alpha = moment / block.I;
}

function processOverlaps(index) {
	var block = blocks[index];
	var i;
	for (i = 0; i < blocks.length; i++) {
		if (i != index) {
			checkOverlap(block, -1, blocks[i], -1);
			checkOverlap(block, 1, blocks[i], -1);
			checkOverlap(block, -1, blocks[i], 1);
			checkOverlap(block, 1, blocks[i], 1);
		}
	}
}

function checkOverlap(block1, side1, block2, side2) {
	if (isOverlap(block1, side1, block2, side2)) {
		if (addOverlap(block1, side1, block2, side2) && !mute) {
			var m = block1.mass * block2.mass;
			var snd;
			if (m > 35) {
				snd = new Audio("bell-ring-01.wav");
			} else {
				snd = new Audio("small-bell-ring-01.wav");
			}
			console.log(m);
			var volume = 0.6 * (1 - (1 / (Math.abs(m * 0.02) + 1)));
			snd.volume = volume;
			snd.play();
		}
	} else {
		removeOverlap(block1, side1, block2, side2);
	}
}

function isOverlap(block1, side1, block2, side2) {
	var corner1 = getCornerPosition(block1, side1);
	var corner2 = getCornerPosition(block2, side2);
	var radius = (getRadius(block1) + getRadius(block2)) / 2;
	var delta = vectorSubtract(corner1, corner2);
	return vectorMagnitude(delta) < radius;
}

function getRadius(block) {
	return block.mass * 10;
}

function getOverlapKey(block1, side1, block2, side2) {
	return block1.name + ":" + side1 + "/" + block2.name + ":" + side2;
}

function addOverlap(block1, side1, block2, side2) {
	if (typeof overlap[getOverlapKey(block1, side1, block2, side2)] === "undefined") {
		overlap[getOverlapKey(block1, side1, block2, side2)] = true;
		overlap[getOverlapKey(block2, side2, block1, side1)] = true;
		return true;
	} else {
		return false;
	}
}

function removeOverlap(block1, side1, block2, side2) {
	delete overlap[getOverlapKey(block1, side1, block2, side2)];
	delete overlap[getOverlapKey(block2, side2, block1, side1)];
}

function getVelocityDamping(block) {
	var result = getVector(block.v.x, block.v.y);
	result = vectorMultiply(block.v, 0);
	return result;
}

function getAngularDampingMoment(block) {
	var result = block.omega * block.I * -1 * 0;
	return result;
}

function drawWeights(processing, block) {
	var size = getRadius(block);
	var bottomLeft = getCornerPosition(block, -1);
	var bottomRight = getCornerPosition(block, 1);
	processing.noStroke();		
	processing.strokeWeight(2);
	setupColorForBlock(processing, block);
	if (trailBlock != null && trailBlock.name == block.name && trailSide == -1) {
		processing.stroke(30);
	}
	processing.ellipse(bottomLeft.x, bottomLeft.y, size, size);
	processing.noStroke();		
	if (trailBlock != null && trailBlock.name == block.name && trailSide == 1) {
		processing.stroke(30);
	}
	processing.ellipse(bottomRight.x, bottomRight.y, size, size);
	processing.fill(255, 255, 255);
	processing.noStroke();		
	processing.ellipse(bottomLeft.x, bottomLeft.y, 4, 4);
	processing.ellipse(bottomRight.x, bottomRight.y, 4, 4);
}

function setupColorForBlock(processing, block) {
	var h = block.hue;
	var s = getSaturationForBlock(block);
	var l = getLuminanceForBlock(block);
	var rgb = hslToRgb(h, s, l);
	processing.fill(rgb.r, rgb.g, rgb.b);
}

function setupColorForTrail(processing, block, luminance, intensity) {
	var h = block.hue;
	var s = getSaturationForBlock(block);
	var l = 1 - (1 - luminance) * intensity;
	var rgb = hslToRgb(h, s, l);
	processing.fill(rgb.r, rgb.g, rgb.b);
}

function getSaturationForBlock(block) {
	return block.saturation;
}

function getLuminanceForBlock(block) {
	var v = block.omega
			* Math
					.sqrt(block.height * block.height + block.width
							* block.width)
			+ Math.sqrt(block.v.x * block.v.x + block.v.y * block.v.y);
	var result = 0.3 + 0.5 * (1 - (1 / (Math.abs(v * 0.001) + 1)));
	return result;
}

function drawLines(processing, block) {
	var pivot = getParentAnchorPosition(block);
	var bottomLeft = getCornerPosition(block, -1);
	var bottomRight = getCornerPosition(block, 1);
	processing.stroke(127);
	processing.strokeWeight(3);
	processing.line(bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y);
	processing.line(pivot.x, pivot.y, block.position.x, block.position.y);
}

function drawTrail(processing) {
	if (trailBlock == null) {
		return;
	}
	var i;
	processing.noStroke();
	for (i = 0; i < trail.length; i++) {
		var info = trail[i];
		var intensity = Math.pow(0.97, trail.length - 1 - i);
		drawTrailItem(processing, info, intensity);
	}
	if (!paused) {
		var trailInfo = new Object();
		trailInfo.position = vectorClone(getCornerPosition(trailBlock,
				trailSide));
		trailInfo.luminance = getLuminanceForBlock(trailBlock);
		trail.push(trailInfo);
		if (trail.length > 200) {
			trail.shift();
		}
	}
}

function drawTrailItem(processing, info, intensity) {
	var size = getRadius(trailBlock);
	setupColorForTrail(processing, trailBlock, info.luminance, intensity);
	processing.ellipse(info.position.x, info.position.y, size, size);
}

function vectorClone(v) {
	var result = new Object();
	result.x = v.x;
	result.y = v.y;
	return result;
}

function getGravityForce(block) {
	var result = new Object();
	result.x = 0;
	result.y = block.mass * 2 * Ag;
	return result;
}

function getPivotForce(block) {
	var result = vectorAdd(getGravityForce(block), getChildForce(block, -1));
	result = vectorAdd(result, getChildForce(block, 1));
	result = vectorMultiply(result, -1);
	return result;
}

function getCornerVelocity(block, side) {
	var result = getVector(0, block.width * block.omega);
	result = vectorRotate(result, block.theta);
	result = vectorAdd(result, block.v);
	return result;
}

function getPivotVelocity(block) {
	var result = getVector(-block.height * block.omega, 0);
	result = vectorRotate(result, block.theta);
	result = vectorAdd(result, block.v);
	return result;
}

function getParentAnchorPosition(block) {
	if (block.parent === null) {
		var result = new Object();
		result.x = rootX;
		result.y = rootY;
		return result;
	} else {
		return getCornerPosition(block.parent, block.parentSide);
	}
	return null;
}

function getCornerPosition(block, side) {
	var result = new Object();
	result.x = block.position.x;
	result.y = block.position.y;
	if (side < 0) {
		result.x -= block.width * Math.cos(block.theta);
		result.y += block.width * Math.sin(block.theta);
	} else {
		result.x += block.width * Math.cos(block.theta);
		result.y -= block.width * Math.sin(block.theta);
	}
	return result;
}

function getPivotPosition(block) {
	var result = vectorAdd(block.position, getPivotOffset(block));
	return result;
}

function getPivotOffset(block) {
	var result = new Object();
	result.x = -block.height * Math.sin(block.theta);
	result.y = -block.height * Math.cos(block.theta);
	return result;
}

function getChildForce(block, side) {
	if (side < 0) {
		if (block.childA == null) {
			return getVector(0, 0);
		}
		return vectorMultiply(getPivotForce(block.childA), -1);
	} else {
		if (block.childB == null) {
			return getVector(0, 0);
		}
		return vectorMultiply(getPivotForce(block.childB), -1);
	}
}

function getPivotMoment(block, force) {
	var phi = vectorAngle(force);
	var result = block.height * Math.sin(phi - block.theta)
			* vectorMagnitude(force);
	return result;
}

function getChildLeftMoment(block) {
	if (block.childA == null) {
		return 0;
	}
	var force = vectorMultiply(getPivotForce(block.childA), -1);
	var phi = vectorAngle(force);
	var result = block.width * Math.cos(phi - block.theta)
			* vectorMagnitude(force);
	return result;
}

function getChildRightMoment(block) {
	if (block.childB == null) {
		return 0;
	}
	var force = vectorMultiply(getPivotForce(block.childB), -1);
	var phi = vectorAngle(force);
	var result = -block.width * Math.cos(phi - block.theta)
			* vectorMagnitude(force);
	return result;
}

function printVector(message, vector) {
	// log(message + ": " + vector.x + " " + vector.y);
}

function log(message) {
	// console.log(message);
}

function getVector(x, y) {
	var result = new Object();
	result.x = x;
	result.y = y;
	return result;
}

function vectorMultiply(vector, scalar) {
	var result = new Object();
	result.x = vector.x * scalar;
	result.y = vector.y * scalar;
	return result;
}

function vectorAdd(v1, v2) {
	var result = new Object();
	result.x = v1.x + v2.x;
	result.y = v1.y + v2.y;
	return result;
}

function vectorSubtract(v1, v2) {
	var result = new Object();
	result.x = v1.x - v2.x;
	result.y = v1.y - v2.y;
	return result;
}

function vectorMagnitude(v) {
	return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vectorAngle(v) {
	if (v.y == 0) {
		if (v.x >= 0) {
			return Math.PI / 2;
		} else {
			return -Math.PI / 2;
		}
	} else {
		return Math.atan(v.x / v.y);
	}
}

function vectorRotate(v, deltaAngle) {
	var angle = vectorAngle(v) + deltaAngle;
	var mag = vectorMagnitude(v);
	return vectorFromMagAngle(mag, angle);
}

function vectorFromMagAngle(mag, angle) {
	var result = new Object();
	result.x = mag * Math.sin(angle);
	result.y = mag * Math.cos(angle);
	return result;
}

/**
 * Converts an HSL color value to RGB. Conversion formula adapted from
 * http://en.wikipedia.org/wiki/HSL_color_space. Assumes h, s, and l are
 * contained in the set [0, 1] and returns r, g, and b in the set [0, 255].
 * 
 * @param Number
 *            h The hue
 * @param Number
 *            s The saturation
 * @param Number
 *            l The lightness
 * @return Array The RGB representation
 */
function hslToRgb(h, s, l) {
	var r, g, b;

	if (s == 0) {
		r = g = b = l; // achromatic
	} else {
		function hue2rgb(p, q, t) {
			if (t < 0)
				t += 1;
			if (t > 1)
				t -= 1;
			if (t < 1 / 6)
				return p + (q - p) * 6 * t;
			if (t < 1 / 2)
				return q;
			if (t < 2 / 3)
				return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		}

		var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		var p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	var result = new Object();
	result.r = r * 255;
	result.g = g * 255;
	result.b = b * 255;
	return result;
}

/**
 * Converts an RGB color value to HSL. Conversion formula adapted from
 * http://en.wikipedia.org/wiki/HSL_color_space. Assumes r, g, and b are
 * contained in the set [0, 255] and returns h, s, and l in the set [0, 1].
 * 
 * @param Number
 *            r The red color value
 * @param Number
 *            g The green color value
 * @param Number
 *            b The blue color value
 * @return Array The HSL representation
 */
function rgbToHsl(r, g, b) {
	r /= 255, g /= 255, b /= 255;
	var max = Math.max(r, g, b), min = Math.min(r, g, b);
	var h, s, l = (max + min) / 2;

	if (max == min) {
		h = s = 0; // achromatic
	} else {
		var d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
		case r:
			h = (g - b) / d + (g < b ? 6 : 0);
			break;
		case g:
			h = (b - r) / d + 2;
			break;
		case b:
			h = (r - g) / d + 4;
			break;
		}
		h /= 6;
	}

	return [ h, s, l ];
}

function muteClick() {
	mute = !mute;
	if (mute) {
		document.getElementById("mute").src = "img/mute.png";
	} else {
		document.getElementById("mute").src = "img/listen.png";
	}
}

function pauseClick() {
	paused = !paused;
	if (paused) {
		document.getElementById("pause").src = "img/play.png";
	} else {
		document.getElementById("pause").src = "img/pause.png";
	}
}

function resetClick() {
	reset();
}

function connectClick() {
	lines = !lines;
	if (lines) {
		document.getElementById("connect").src = "img/connect.png";
	} else {
		document.getElementById("connect").src = "img/disconnect.png";
	}
}

function findBlockCorner(point) {
	var i;
	for (i = 0; i < blocks.length; i++) {
		var block = blocks[i];
		var radius = getRadius(block);
		var spot = getCornerPosition(block, -1);
		if (vectorDistance(spot, point) < radius) {
			var result = new Object();
			result.block = block;
			result.side = -1;
			return result;
		}
		spot = getCornerPosition(block, 1);
		if (vectorDistance(spot, point) < radius) {
			var result = new Object();
			result.block = block;
			result.side = 1;
			return result;
		}
	}
	return null;
}

function vectorDistance(v1, v2) {
	return vectorMagnitude(vectorSubtract(v1, v2));
}