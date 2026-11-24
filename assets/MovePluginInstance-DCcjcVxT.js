import { D as clamp, I as getRangeValue, M as getRandom, k as getDistance, l as getItemMapFromInitializer } from "./Utils-BW5DTx99.js";
import { d as millisecondsToSeconds, i as doublePI, l as half } from "./Constants-ohzUY8CX.js";
import { y as RotateDirection } from "./index-DKD_UNAH.js";
//#region ../../plugins/move/dist/browser/Utils.js
var moveSpeedFactor = 60;
var minSpinRadius = 0;
var spinFactor = .01;
var defaultPathDelay = 0;
var noDecay = 1;
function applyDistance(particle) {
	const initialPosition = particle.initialPosition, dx = initialPosition.x - particle.position.x, dy = initialPosition.y - particle.position.y, dxFixed = Math.abs(dx), dyFixed = Math.abs(dy), { maxDistance } = particle.retina, hDistance = maxDistance.horizontal, vDistance = maxDistance.vertical;
	if (!hDistance && !vDistance) return;
	if ((((hDistance && dxFixed >= hDistance) ?? false) || ((vDistance && dyFixed >= vDistance) ?? false)) && !particle.misplaced) {
		particle.misplaced = !!hDistance && dxFixed > hDistance || !!vDistance && dyFixed > vDistance;
		if (hDistance) particle.velocity.x = particle.velocity.y * half - particle.velocity.x;
		if (vDistance) particle.velocity.y = particle.velocity.x * half - particle.velocity.y;
	} else if ((!hDistance || dxFixed < hDistance) && (!vDistance || dyFixed < vDistance) && particle.misplaced) particle.misplaced = false;
	else if (particle.misplaced) {
		const pos = particle.position, vel = particle.velocity;
		if (hDistance && (pos.x < initialPosition.x && vel.x < 0 || pos.x > initialPosition.x && vel.x > 0)) vel.x *= -getRandom();
		if (vDistance && (pos.y < initialPosition.y && vel.y < 0 || pos.y > initialPosition.y && vel.y > 0)) vel.y *= -getRandom();
	}
}
function move(particle, moveOptions, moveSpeed, maxSpeed, moveDrift, reduceFactor, delta) {
	applyPath(particle, delta);
	const gravityOptions = particle.gravity, gravityFactor = gravityOptions?.enable && gravityOptions.inverse ? -1 : 1, initialVelocityX = particle.velocity.x, initialVelocityY = particle.velocity.y, deltaFactor = delta.factor || 1, decay = particle.moveDecay ?? noDecay, decayFactor = decay < 0 ? decay : decay ** deltaFactor, accelerationX = moveDrift && moveSpeed ? moveDrift / (moveSpeedFactor * moveSpeed) : 0, accelerationY = gravityOptions?.enable && moveSpeed ? gravityFactor * gravityOptions.acceleration / (moveSpeedFactor * moveSpeed) : 0, integrateAcceleration = (acceleration) => {
		if (decay <= 0 || decay === noDecay) return acceleration * deltaFactor;
		return acceleration * (1 - decayFactor) / -Math.log(decay);
	};
	if (decay > 0) particle.velocity.multTo(decayFactor);
	particle.velocity.x += integrateAcceleration(accelerationX);
	particle.velocity.y += integrateAcceleration(accelerationY);
	if (decay <= 0) particle.velocity.multTo(decayFactor);
	const velocity = particle.velocity.mult(moveSpeed);
	let speedClamped = false;
	if (gravityOptions?.enable && maxSpeed > 0 && (!gravityOptions.inverse && velocity.y >= 0 && velocity.y >= maxSpeed || gravityOptions.inverse && velocity.y <= 0 && velocity.y <= -maxSpeed)) {
		velocity.y = gravityFactor * maxSpeed;
		speedClamped = true;
		if (moveSpeed) particle.velocity.y = velocity.y / moveSpeed;
	}
	const integrateDecayDisplacement = decay > 0 && decay < noDecay;
	if (integrateDecayDisplacement) {
		const decayRate = -Math.log(decay), decayIntegral = (1 - decayFactor) / decayRate, accelerationIntegral = (deltaFactor - decayIntegral) / decayRate;
		velocity.x = (initialVelocityX * decayIntegral + accelerationX * accelerationIntegral) * moveSpeed;
		velocity.y = speedClamped ? particle.velocity.y * moveSpeed * deltaFactor : (initialVelocityY * decayIntegral + accelerationY * accelerationIntegral) * moveSpeed;
	}
	const zIndexOptions = particle.options.zIndex, zVelocityFactor = (1 - particle.zIndexFactor) ** zIndexOptions.velocityRate;
	velocity.multTo(zVelocityFactor);
	velocity.multTo(reduceFactor);
	if (!integrateDecayDisplacement) velocity.multTo(deltaFactor);
	const { position } = particle;
	position.addTo(velocity);
	if (moveOptions.vibrate) {
		position.x += Math.sin(position.x * Math.cos(position.y)) * reduceFactor;
		position.y += Math.cos(position.y * Math.sin(position.x)) * reduceFactor;
	}
}
function spin(container, particle, moveSpeed, reduceFactor) {
	if (!particle.spin) return;
	const spinClockwise = particle.spin.direction === RotateDirection.clockwise, updateFunc = {
		x: spinClockwise ? Math.cos : Math.sin,
		y: spinClockwise ? Math.sin : Math.cos
	};
	particle.position.x = particle.spin.center.x + particle.spin.radius * updateFunc.x(particle.spin.angle) * reduceFactor;
	particle.position.y = particle.spin.center.y + particle.spin.radius * updateFunc.y(particle.spin.angle) * reduceFactor;
	particle.spin.radius += particle.spin.acceleration * reduceFactor;
	const maxCanvasSize = Math.max(container.canvas.size.width, container.canvas.size.height), halfMaxSize = maxCanvasSize * half;
	if (particle.spin.radius > halfMaxSize) {
		particle.spin.radius = halfMaxSize;
		particle.spin.acceleration *= -1;
	} else if (particle.spin.radius < minSpinRadius) {
		particle.spin.radius = minSpinRadius;
		particle.spin.acceleration *= -1;
	}
	particle.spin.angle += moveSpeed * spinFactor * (1 - particle.spin.radius / maxCanvasSize);
}
function applyPath(particle, delta) {
	const pathOptions = particle.options.move.path;
	if (!pathOptions.enable) return;
	const pathDelay = particle.pathDelay ?? defaultPathDelay;
	if (particle.lastPathTime <= pathDelay) {
		particle.lastPathTime += delta.value;
		return;
	}
	const path = particle.pathGenerator?.generate(particle, delta);
	if (path) particle.velocity.addTo(path);
	if (pathOptions.clamp) {
		particle.velocity.x = clamp(particle.velocity.x, -1, 1);
		particle.velocity.y = clamp(particle.velocity.y, -1, 1);
	}
	particle.lastPathTime -= pathDelay;
}
function getProximitySpeedFactor(particle) {
	const mod = particle.getModifier("slow");
	return mod?.enabled ? mod.speedFactor ?? 1 : 1;
}
function initSpin(container, particle) {
	const spinOptions = particle.options.move.spin;
	if (!spinOptions.enable) return;
	const spinPos = spinOptions.position ?? {
		x: 50,
		y: 50
	}, spinFactor = .01, spinCenter = {
		x: spinPos.x * spinFactor * container.canvas.size.width,
		y: spinPos.y * spinFactor * container.canvas.size.height
	}, pos = particle.getPosition(), distance = getDistance(pos, spinCenter), spinAcceleration = getRangeValue(spinOptions.acceleration);
	particle.retina.spinAcceleration = spinAcceleration * container.retina.pixelRatio;
	particle.spin = {
		center: spinCenter,
		direction: particle.velocity.x >= 0 ? RotateDirection.clockwise : RotateDirection.counterClockwise,
		angle: getRandom() * doublePI,
		radius: distance,
		acceleration: particle.retina.spinAcceleration
	};
}
//#endregion
//#region ../../plugins/move/dist/browser/MovePluginInstance.js
var defaultSizeFactor = 1;
var MovePluginInstance = class {
	availablePathGenerators;
	pathGenerators;
	#container;
	#pluginManager;
	constructor(pluginManager, container) {
		this.#pluginManager = pluginManager;
		this.#container = container;
		this.availablePathGenerators = /* @__PURE__ */ new Map();
		this.pathGenerators = /* @__PURE__ */ new Map();
	}
	destroy() {
		this.availablePathGenerators = /* @__PURE__ */ new Map();
		this.pathGenerators = /* @__PURE__ */ new Map();
	}
	isEnabled(particle) {
		return !particle.destroyed && particle.options.move.enable;
	}
	particleCreated(particle) {
		const moveOptions = particle.options.move, gravityOptions = moveOptions.gravity, pathOptions = moveOptions.path;
		particle.moveDecay = 1 - getRangeValue(moveOptions.decay);
		particle.pathDelay = getRangeValue(pathOptions.delay.value) * millisecondsToSeconds;
		if (pathOptions.generator) {
			let pathGenerator = this.pathGenerators.get(pathOptions.generator);
			if (!pathGenerator) {
				pathGenerator = this.availablePathGenerators.get(pathOptions.generator);
				if (pathGenerator) {
					this.pathGenerators.set(pathOptions.generator, pathGenerator);
					pathGenerator.init();
				}
			}
			particle.pathGenerator = pathGenerator;
		}
		particle.gravity = {
			enable: gravityOptions.enable,
			acceleration: getRangeValue(gravityOptions.acceleration),
			inverse: gravityOptions.inverse
		};
		initSpin(this.#container, particle);
	}
	particleDestroyed(particle) {
		particle.pathGenerator?.reset(particle);
	}
	particleUpdate(particle, delta) {
		const moveOptions = particle.options.move;
		if (!moveOptions.enable) return;
		const container = this.#container, slowFactor = getProximitySpeedFactor(particle), reduceFactor = container.retina.reduceFactor, baseSpeed = particle.retina.moveSpeed, moveDrift = particle.retina.moveDrift, maxSize = particle.size.max, moveSpeed = baseSpeed * (moveOptions.size ? particle.getRadius() / maxSize : defaultSizeFactor) * slowFactor * half, maxSpeed = particle.retina.maxSpeed;
		if (moveOptions.spin.enable) spin(container, particle, moveSpeed * (delta.factor || 1), reduceFactor);
		else move(particle, moveOptions, moveSpeed, maxSpeed, moveDrift, reduceFactor, delta);
		applyDistance(particle);
	}
	preInit() {
		return this.#init();
	}
	redrawInit() {
		return this.#init();
	}
	update() {
		for (const pathGenerator of this.pathGenerators.values()) pathGenerator.update();
	}
	async #init() {
		const pluginManager = this.#pluginManager;
		if (!pluginManager.initializers.pathGenerators) return;
		this.availablePathGenerators = await getItemMapFromInitializer(this.#container, pluginManager.initializers.pathGenerators);
		this.pathGenerators = /* @__PURE__ */ new Map();
		for (const pathGenerator of this.pathGenerators.values()) pathGenerator.init();
	}
};
//#endregion
export { MovePluginInstance };
