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

        // Free look related (will be used later)
        this.freeLookPitch = 0.0;
        this.freeLookYawOffset = 0.0;
    }

    initBuffers(gl) {
        // Simple triangle vertices (adjust size/shape as needed)
        // Centered around [0, 0, 0] before model transformation
        const s = 2; // Size factor
        const vertices = [
             s, 0, 0,  // Tip
            -s, -s / 1.5, 0, // Back left
            -s,  s / 1.5, 0  // Back right
        ];

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        this.vertexCount = vertices.length / 3;
    }

    draw(gl, shaderProgram, viewMatrix, modelViewMatrixUniformLocation, normalMatrixUniformLocation, overrideColorUniformLocation) {
        if (!this.vertexBuffer) return;

        // 1. Calculate Player Height
        const playerGridX = this.x / this.terrain.cellSize; // Assuming terrain has cellSize
        const playerGridY = this.y / this.terrain.cellSize;
        const playerHeight = Math.max(this.terrain.terrainFunction(playerGridX, playerGridY), this.terrain.waterHeight) + this.hoverAbove;

        // 2. Calculate Model Matrix
        const modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [this.x, this.y, playerHeight]);
        mat4.rotate(modelMatrix, modelMatrix, this.radians, [0, 0, 1]); // Rotate around Z

        // 3. Calculate ModelView Matrix
        const modelViewMatrix = mat4.create();
        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix); // modelView = view * model

        // 4. Set ModelView Uniform
        gl.uniformMatrix4fv(modelViewMatrixUniformLocation, false, modelViewMatrix);

        // 5. Calculate and Set Normal Matrix (use identity for simple triangle or calculate)
        // For a flat triangle, could calculate normal once, but easier to just use identity
        // or derive from modelView if shader expects accurate normals. Let's assume simple.
        const normalMatrix = mat3.create();
        // mat3.normalFromMat4(normalMatrix, modelViewMatrix); // Use this if shader needs proper normal
        mat3.identity(normalMatrix); // Use this if lighting isn't critical for the simple triangle
        gl.uniformMatrix3fv(normalMatrixUniformLocation, false, normalMatrix);


        // 6. Set Override Color Uniform (if shader supports it)
        if (overrideColorUniformLocation) {
             gl.uniform4fv(overrideColorUniformLocation, this.color);
        }

        // 7. Bind Vertex Buffer and Set Attributes
        const posLoc = gl.getAttribLocation(shaderProgram, 'vertPosition');
        // const normLoc = gl.getAttribLocation(shaderProgram, 'vertNormal');
        // const uvLoc = gl.getAttribLocation(shaderProgram, 'vertUV');

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);

        // --- Disable or provide dummy data for other attributes ---
        // If shader REQUIRES them, you must provide data or disable.
        // Option A: Disable (if possible/shader handles it)
         const normLoc = gl.getAttribLocation(shaderProgram, 'vertNormal');
         if (normLoc !== -1) gl.disableVertexAttribArray(normLoc); // Disable if exists
         const uvLoc = gl.getAttribLocation(shaderProgram, 'vertUV');
         if (uvLoc !== -1) gl.disableVertexAttribArray(uvLoc);   // Disable if exists

        // Option B: Provide dummy single value (Simpler if disabling causes issues)
        // if (normLoc !== -1) gl.vertexAttrib3f(normLoc, 0, 0, 1); // Dummy normal Z up
        // if (uvLoc !== -1) gl.vertexAttrib2f(uvLoc, 0, 0);     // Dummy UV

        // 8. Draw
        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

        // 9. Reset State (Important!)
        // Re-enable attributes if disabled, reset override color
        if (overrideColorUniformLocation) {
            gl.uniform4fv(overrideColorUniformLocation, [0, 0, 0, 0]); // Reset (transparent black)
        }
         if (normLoc !== -1) gl.enableVertexAttribArray(normLoc); // Re-enable for terrain
         if (uvLoc !== -1) gl.enableVertexAttribArray(uvLoc);   // Re-enable for terrain
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
        const lookSpeed = 0.003; // Radians per pixel movement
        const maxPitch = Math.PI / 2 - 0.1; // Limit looking straight up/down
        const minPitch = -maxPitch;

        // Yaw affects the offset from the base body rotation
        this.freeLookYawOffset -= deltaX * lookSpeed;
        // Keep yaw offset reasonable if needed, but wrap-around isn't essential here

        // Pitch is absolute
        this.freeLookPitch -= deltaY * lookSpeed;
        this.freeLookPitch = Math.max(minPitch, Math.min(maxPitch, this.freeLookPitch));
    }

    resetFreeLook() {
        this.freeLookPitch = 0.0;
        this.freeLookYawOffset = 0.0;
    }
}

export { Player };