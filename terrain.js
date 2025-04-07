class Terrain {
    constructor(width, height, cellSize) {
        this.WIDTH = width;
        this.HEIGHT = height;
        this.cellSize = cellSize;
        this.waterHeight = -2.0;
        this.vertexBuffer = null;
        this.normalBuffer = null;
        this.uvBuffer = null;
        this.vertexCount = 0;
        this.waterBuffer = null;
        this.waterUVBuffer = null;
        this.waterVertexCount = 0;
        this.textures = [];
    }

    terrainFunction(x, y) {
        let z = 0;
        const zscale = 0.75;
        z += 2 * Math.sin(0.4 * y);
        z += 1.5 * Math.cos(0.3 * x);
        z += 4 * Math.sin(0.2 * x) * Math.cos(0.3 * y);
        z += 6 * Math.sin(0.11 * x) * Math.cos(0.03 * y);
        return z * zscale;
    }

    terrainFunctionPartialX(x, y) {
        let dz_dx = 0;
        const zscale = 0.75;
        dz_dx += 1.5 * (-0.3) * Math.sin(0.3 * x);
        dz_dx += 4 * (0.2 * Math.cos(0.2 * x) * Math.cos(0.3 * y));
        dz_dx += 6 * (0.11 * Math.cos(0.11 * x) * Math.cos(0.03 * y));
        return dz_dx * zscale;
    }

    terrainFunctionPartialY(x, y) {
        let dz_dy = 0;
        const zscale = 0.75;
        dz_dy += 2 * 0.4 * Math.cos(0.4 * y);
        dz_dy += 4 * (-0.3 * Math.sin(0.2 * x) * Math.sin(0.3 * y));
        dz_dy += 6 * (-0.03 * Math.sin(0.11 * x) * Math.sin(0.03 * y));
        return dz_dy * zscale;
    }

    terrainNormalFunction(x, y) {
        const dx = vec3.fromValues(1, 0, this.terrainFunctionPartialX(x, y));
        const dy = vec3.fromValues(0, 1, this.terrainFunctionPartialY(x, y));
        const normal = vec3.create();
        vec3.cross(normal, dx, dy);
        vec3.normalize(normal, normal);
        return normal;
    }

    async loadTextures(gl) {
        const texturePaths = [
            'textures/rocky_grass.jpg',
            'textures/water.jpg'
        ];
        for (let i = 0; i < texturePaths.length; i++) {
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
            const image = new Image();
            image.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            };
            image.src = texturePaths[i];
            this.textures[i] = texture;
        }
    }

    initBuffers(gl, shaderProgram) {
        const vertices = [];
        const normals = [];
        const uvs = [];

        for (let y = 0; y < this.HEIGHT - 1; y++) {
            for (let x = 0; x < this.WIDTH - 1; x++) {
                const x0 = x * this.cellSize;
                const x1 = (x + 1) * this.cellSize;
                const y0 = y * this.cellSize;
                const y1 = (y + 1) * this.cellSize;
                const z00 = this.terrainFunction(x, y);
                const z01 = this.terrainFunction(x + 1, y);
                const z10 = this.terrainFunction(x, y + 1);
                const z11 = this.terrainFunction(x + 1, y + 1);

                vertices.push(x0, y0, z00, x1, y0, z01, x1, y1, z11);
                vertices.push(x0, y0, z00, x1, y1, z11, x0, y1, z10);

                const n00 = this.terrainNormalFunction(x, y);
                const n01 = this.terrainNormalFunction(x + 1, y);
                const n10 = this.terrainNormalFunction(x, y + 1);
                const n11 = this.terrainNormalFunction(x + 1, y + 1);

                normals.push(...n00, ...n01, ...n11);
                normals.push(...n00, ...n11, ...n10);

                uvs.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
            }
        }

        const waterVertices = [
            0, 0, this.waterHeight,
            this.WIDTH * this.cellSize, 0, this.waterHeight,
            this.WIDTH * this.cellSize, this.HEIGHT * this.cellSize, this.waterHeight,
            0, 0, this.waterHeight,
            this.WIDTH * this.cellSize, this.HEIGHT * this.cellSize, this.waterHeight,
            0, this.HEIGHT * this.cellSize, this.waterHeight
        ];
        const waterUVs = [0, 0, 10, 0, 10, 10, 0, 0, 10, 10, 0, 10]; // Scaled UVs for tiling

        this.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        this.normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        this.uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

        this.vertexCount = vertices.length / 3;

        this.waterBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.waterBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(waterVertices), gl.STATIC_DRAW);

        this.waterUVBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.waterUVBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(waterUVs), gl.STATIC_DRAW);

        this.waterVertexCount = waterVertices.length / 3;
    }

    getHeightAt(x, y) {
        const cellX = Math.floor(x / this.cellSize);
        const cellY = Math.floor(y / this.cellSize);
        if (cellX < 0 || cellX >= this.WIDTH - 1 || cellY < 0 || cellY >= this.HEIGHT - 1) {
            return 0;
        }
        return Math.max(this.terrainFunction(cellX, cellY), this.waterHeight);
    }

    isLegal(x, y) {
        return x >= 0 && x < this.WIDTH * this.cellSize && y >= 0 && y < this.HEIGHT * this.cellSize;
    }

    draw(gl, shaderProgram) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        const posLoc = gl.getAttribLocation(shaderProgram, 'vertPosition');
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
        const normLoc = gl.getAttribLocation(shaderProgram, 'vertNormal');
        gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(normLoc);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
        const uvLoc = gl.getAttribLocation(shaderProgram, 'vertUV');
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(uvLoc);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
        gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uTexture0'), 0);

        gl.drawArrays(gl.TRIANGLES, 0, this.vertexCount);

        const centerX = this.WIDTH * this.cellSize / 2;
        const centerY = this.HEIGHT * this.cellSize / 2;
        const centerZ = this.terrainFunction(centerX / this.cellSize, centerY / this.cellSize);
        //console.log(`Terrain Center: [${centerX.toFixed(2)}, ${centerY.toFixed(2)}, ${centerZ.toFixed(2)}]`);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.waterBuffer);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);

        const waterNormal = [0, 0, 1];
        gl.vertexAttrib3fv(normLoc, waterNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.waterUVBuffer);
        gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(uvLoc);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[1]);
        gl.uniform1i(gl.getUniformLocation(shaderProgram, 'uTexture0'), 0);

        gl.drawArrays(gl.TRIANGLES, 0, this.waterVertexCount);
    }
}

export { Terrain };