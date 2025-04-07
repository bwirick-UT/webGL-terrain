class Player {
    constructor(x = 50, y = 50, radians = Math.PI / 2, terrain) {
        this.x = x;
        this.y = y;
        this.radians = radians;
        this.terrain = terrain;
        this.moveSpeed = 5.0;
        this.spinSpeed = 5.0;
        this.hoverAbove = .5;
        this.vertexBuffer = null;
        this.vertexCount = 0;
        this.color = [1.0, 0.0, 0.0, 1.0];
        this.freeLookPitch = 0.0;
        this.freeLookYawOffset = 0.0;
    }

    initBuffers(gl) {
        const s = 2;
        const vertices = [
             s, 0, 0,
            -s, -s / 1.5, 0,
            -s,  s / 1.5, 0
        ];

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        this.vertexCount = vertices.length / 3;
    }

    draw(gl, shaderProgram, viewMatrix, modelViewMatrixUniformLocation, normalMatrixUniformLocation, overrideColorUniformLocation) {
        if (!this.vertexBuffer) return;

        const playerGridX = this.x / this.terrain.cellSize;
        const playerGridY = this.y / this.terrain.cellSize;
        const playerHeight = Math.max(this.terrain.terrainFunction(playerGridX, playerGridY), this.terrain.waterHeight) + this.hoverAbove;

        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [this.x, this.y, playerHeight]);
        mat4.rotate(modelMatrix, modelMatrix, this.radians, [0, 0, 1]);

        const modelViewMatrix = mat4.create();
        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

        gl.uniformMatrix4fv(modelViewMatrixUniformLocation, false, modelViewMatrix);

        const normalMatrix = mat3.create();
        mat3.identity(normalMatrix);
        gl.uniformMatrix3fv(normalMatrixUniformLocation, false, normalMatrix);

        if (overrideColorUniformLocation) {
             gl.uniform4fv(overrideColorUniformLocation, this.color);
        }

        const posLoc = gl.getAttribLocation(shaderProgram, 'vertPosition');

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);

        const normLoc = gl.getAttribLocation(shaderProgram, 'vertNormal');
        if (normLoc !== -1) gl.disableVertexAttribArray(normLoc);
        const uvLoc = gl.getAttribLocation(shaderProgram, 'vertUV');
        if (uvLoc !== -1) gl.disableVertexAttribArray(uvLoc);

        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

        if (overrideColorUniformLocation) {
            gl.uniform4fv(overrideColorUniformLocation, [0, 0, 0, 0]);
        }
        if (normLoc !== -1) gl.enableVertexAttribArray(normLoc);
        if (uvLoc !== -1) gl.enableVertexAttribArray(uvLoc);
    }

    spinLeft(dt) {
        this.radians += this.spinSpeed * dt;
    }

    spinRight(dt) {
        this.radians -= this.spinSpeed * dt;
    }

    moveForward(dt) {
        const newX = this.x + Math.cos(this.radians) * this.moveSpeed * dt;
        const newY = this.y + Math.sin(this.radians) * this.moveSpeed * dt;
        if (this.terrain.isLegal(newX, newY)) {
            this.x = newX;
            this.y = newY;
        }
    }

    moveBackward(dt) {
        this.moveForward(-dt);
    }

    updateFreeLook(deltaX, deltaY) {
        const lookSpeed = 0.003;
        const maxPitch = Math.PI / 2 - 0.1;
        const minPitch = -maxPitch;

        this.freeLookYawOffset -= deltaX * lookSpeed;
        this.freeLookPitch -= deltaY * lookSpeed;
        this.freeLookPitch = Math.max(minPitch, Math.min(maxPitch, this.freeLookPitch));
    }

    resetFreeLook() {
        this.freeLookPitch = 0.0;
        this.freeLookYawOffset = 0.0;
    }
}

export { Player };
