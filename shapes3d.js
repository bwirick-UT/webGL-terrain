function drawQuad(gl, shaderProgram, x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, color=[1,1,1,1]) {
    const vertices = [
        x1, y1, z1,
        x2, y2, z2,
        x3, y3, z3,
        x4, y4, z4
    ];
    drawVertices(gl, shaderProgram, vertices, color, gl.TRIANGLE_FAN);
}

function drawVertices(gl, shaderProgram, vertices, color, style) {
    const vertexBufferObject = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const positionAttribLocation = gl.getAttribLocation(shaderProgram, 'vertPosition');
    if (positionAttribLocation === -1) {
        console.error("Cannot find attribute 'vertPosition'");
        return;
    }
    gl.vertexAttribPointer(
        positionAttribLocation,
        3,
        gl.FLOAT,
        gl.FALSE,
        3 * Float32Array.BYTES_PER_ELEMENT,
        0
    );
    gl.enableVertexAttribArray(positionAttribLocation);

    const colorUniformLocation = gl.getUniformLocation(shaderProgram, "uColor");
    if (colorUniformLocation === null) {
        console.error("Cannot find uniform 'uColor'");
        return;
    }
    gl.uniform4fv(colorUniformLocation, color);

    gl.drawArrays(style, 0, vertices.length / 3);
}

export { drawQuad };