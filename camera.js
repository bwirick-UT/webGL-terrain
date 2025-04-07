export class Camera {
    constructor(worldWidth, worldHeight, terrain, cellSize) {
        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
        this.terrain = terrain;
        this.cellSize = cellSize;
        this.viewMode = 'observer';
        this.modelViewMatrix = mat4.create();

        const initialCenterX = this.worldWidth / 2;
        const initialCenterY = this.worldHeight / 2;
        const initialEyeZ = Math.max(this.worldWidth, this.worldHeight) * 0.75;
        const initialEyeYOffset = Math.max(this.worldWidth, this.worldHeight) * -0.2;

        this.observerCenter = vec3.fromValues(initialCenterX, initialCenterY, 0);
        this.observerEye = vec3.fromValues(initialCenterX, initialCenterY + initialEyeYOffset, initialEyeZ);
        this.observerUp = vec3.fromValues(0, 0, 1);

        this.panSpeed = 0.1;
        this.rotationSpeed = 0.005;
        this.zoomSpeedFactor = 0.2;
        this.minPitch = 0.05;
        this.maxPitch = Math.PI / 2 - 0.05;
        this.panMargin = 5.0;
        this.minZoomDistance = 10.0;
        this.maxZoomDistance = Math.max(this.worldWidth, this.worldHeight) * 2.0;
    }

    getModelViewMatrix() {
        return this.modelViewMatrix;
    }

    pan(screenDx, screenDy) {
        if (this.viewMode !== 'observer') return;

        const forward = vec3.create();
        vec3.subtract(forward, this.observerCenter, this.observerEye);
        vec3.normalize(forward, forward);

        const right = vec3.create();
        vec3.cross(right, forward, this.observerUp);
        vec3.normalize(right, right);

        const localUp = vec3.create();
        vec3.cross(localUp, right, forward);

        const moveRight = vec3.create();
        const moveUp = vec3.create();
        vec3.scale(moveRight, right, screenDx * this.panSpeed);
        vec3.scale(moveUp, localUp, screenDy * this.panSpeed);

        const totalMoveLocal = vec3.create();
        vec3.add(totalMoveLocal, moveRight, moveUp);

        const totalMoveWorldXY = vec3.clone(totalMoveLocal);
        totalMoveWorldXY[2] = 0;

        const potentialCenter = vec3.create();
        vec3.add(potentialCenter, this.observerCenter, totalMoveWorldXY);

        const clampedCenter = vec3.clone(potentialCenter);
        clampedCenter[0] = Math.max(this.panMargin, Math.min(this.worldWidth - this.panMargin, clampedCenter[0]));
        clampedCenter[1] = Math.max(this.panMargin, Math.min(this.worldHeight - this.panMargin, clampedCenter[1]));
        clampedCenter[2] = this.observerCenter[2];

        const actualMove = vec3.create();
        vec3.subtract(actualMove, clampedCenter, this.observerCenter);

        vec3.add(this.observerEye, this.observerEye, actualMove);
        vec3.add(this.observerCenter, this.observerCenter, actualMove);
    }

    orbit(screenDx, screenDy) {
        if (this.viewMode !== 'observer') return;

        const offset = vec3.create();
        vec3.subtract(offset, this.observerEye, this.observerCenter);

        const yawAngle = -screenDx * this.rotationSpeed;
        const yawRotation = mat4.create();
        mat4.fromRotation(yawRotation, yawAngle, this.observerUp);
        vec3.transformMat4(offset, offset, yawRotation);

        const forward = vec3.create();
        vec3.negate(forward, offset);
        vec3.normalize(forward, forward);

        const right = vec3.create();
        vec3.cross(right, forward, this.observerUp);
        vec3.normalize(right, right);

        const currentPitch = Math.asin(forward[2]);
        const deltaPitch = -screenDy * this.rotationSpeed;
        let newPitch = currentPitch + deltaPitch;
        const actualPitchAngle = newPitch - currentPitch;

        if (Math.abs(actualPitchAngle) > 0.0001) {
            const pitchRotation = mat4.create();
            mat4.fromRotation(pitchRotation, actualPitchAngle, right);
            vec3.transformMat4(offset, offset, pitchRotation);
        }

        vec3.add(this.observerEye, this.observerCenter, offset);
    }

    zoom(scrollAmount) {
        if (this.viewMode !== 'observer') return;

        const offset = vec3.create();
        vec3.subtract(offset, this.observerEye, this.observerCenter);

        const currentDistance = vec3.length(offset);
        const forward = vec3.create();
        vec3.normalize(forward, offset);

        let distanceChangeFactor = 1.0 + scrollAmount * this.zoomSpeedFactor;
        let newDistance = currentDistance * distanceChangeFactor;
        newDistance = Math.max(this.minZoomDistance, Math.min(this.maxZoomDistance, newDistance));

        const newOffset = vec3.create();
        vec3.scale(newOffset, forward, newDistance);
        vec3.add(this.observerEye, this.observerCenter, newOffset);
    }

    updateProjection(gl, projectionMatrixUniform, player, isPlayerFreeLooking) {
        const perspectiveMatrix = mat4.create();
        const lookAtMatrix = mat4.create();

        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const fovy = Math.PI / 2;
        const near = Math.min(this.minZoomDistance * 0.5, 1.0);
        const far = this.maxZoomDistance * 1.5;

        mat4.perspective(perspectiveMatrix, fovy, aspect, near, far);

        let eye, center, up;

        if (this.viewMode === 'observer') {
            eye = this.observerEye;
            center = this.observerCenter;
            up = this.observerUp;
        } else if (this.viewMode === 'player') {
            up = [0, 0, 1];

            if (!player || !this.terrain || typeof this.terrain.terrainFunction !== 'function' || typeof this.terrain.waterHeight === 'undefined') {
                console.error("Camera update error: Player or Terrain object invalid!");
                eye = [0, 0, 10];
                center = [0, 0, 0];
            } else {
                const playerGridX = player.x / this.cellSize;
                const playerGridY = player.y / this.cellSize;
                const terrainHeightAtPlayer = this.terrain.terrainFunction(playerGridX, playerGridY);
                const eyeHeight = Math.max(terrainHeightAtPlayer, this.terrain.waterHeight) + player.hoverAbove + 0.3;
                eye = [player.x, player.y, eyeHeight];

                if (isPlayerFreeLooking) {
                    const totalYaw = player.radians + player.freeLookYawOffset;
                    const pitch = player.freeLookPitch;

                    const lookDirX = Math.cos(pitch) * Math.cos(totalYaw);
                    const lookDirY = Math.cos(pitch) * Math.sin(totalYaw);
                    const lookDirZ = Math.sin(pitch);

                    center = [
                        eye[0] + lookDirX,
                        eye[1] + lookDirY,
                        eye[2] + lookDirZ
                    ];
                } else {
                    const lookAheadDist = 2.0;
                    const lookAheadX = player.x + Math.cos(player.radians) * lookAheadDist;
                    const lookAheadY = player.y + Math.sin(player.radians) * lookAheadDist;

                    const lookAheadGridX = lookAheadX / this.cellSize;
                    const lookAheadGridY = lookAheadY / this.cellSize;
                    const terrainHeightLookAhead = this.terrain.terrainFunction(lookAheadGridX, lookAheadGridY);
                    const centerHeight = Math.max(terrainHeightLookAhead, this.terrain.waterHeight) + player.hoverAbove;

                    center = [lookAheadX, lookAheadY, centerHeight];
                }
            }
        } else {
            eye = [0, 0, 10];
            center = [0, 0, 0];
            up = [0, 0, 1];
        }

        if (eye && center && up) {
            mat4.lookAt(lookAtMatrix, eye, center, up);
        } else {
            mat4.identity(lookAtMatrix);
        }

        gl.uniformMatrix4fv(projectionMatrixUniform, false, perspectiveMatrix);
        this.modelViewMatrix = lookAtMatrix;
    }
}
