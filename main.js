import { initShaderProgram } from "./shader.js";
import { Terrain } from "./terrain.js";
import { Player } from "./player.js";
import { Camera } from "./camera.js";

main();
async function main() {
    const canvas = document.getElementById('glcanvas');
    const gl = canvas.getContext('webgl');
    if (!gl) {
        alert('Your browser does not support WebGL');
        return;
    }
    gl.clearColor(0.529, 0.808, 0.922, 1.0);
    gl.clearDepth(1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    const vertexShaderText = await (await fetch("simple.vs")).text();
    const fragmentShaderText = await (await fetch("simple.fs")).text();
    const shaderProgram = initShaderProgram(gl, vertexShaderText, fragmentShaderText);
    if (!shaderProgram) return;
    const overrideColorUniform = gl.getUniformLocation(shaderProgram, "uOverrideColor");

    const projectionMatrixUniform = gl.getUniformLocation(shaderProgram, "uProjectionMatrix");
    const modelViewMatrixUniform = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
    const normalMatrixUniform = gl.getUniformLocation(shaderProgram, "uNormalMatrix");
    const lightDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightDirection");
    const lightColorUniform = gl.getUniformLocation(shaderProgram, "uLightColor");
    const ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");

    const terrainWidth = 100;
    const terrainHeight = 100;
    const cellSize = 1.0;

    const terrain = new Terrain(terrainWidth, terrainHeight, cellSize);
    await terrain.loadTextures(gl);
    terrain.initBuffers(gl, shaderProgram);
    const player = new Player(terrainWidth * cellSize / 2, terrainHeight * cellSize / 2, Math.PI / 2, terrain);
    player.initBuffers(gl);
    const camera = new Camera(terrainWidth * cellSize, terrainHeight * cellSize, terrain, cellSize);

    const lightDirection = vec3.fromValues(-1, -1, -1);
    vec3.normalize(lightDirection, lightDirection);
    const lightColor = vec3.fromValues(1, 1, 1);
    const ambientColor = vec3.fromValues(0.2, 0.2, 0.2);

    let isPlayerFreeLooking = false;
    let spinLeft = false;
    let spinRight = false;
    let moveForward = false;
    let moveBackward = false;
    let draggingButton = -1;
    let isDragging = false;
    let lastMouseX = -1;
    let lastMouseY = -1;

    document.addEventListener('keydown', (e) => {
        if (isPlayerFreeLooking) return;
        if (e.code === 'KeyW') moveForward = true;
        if (e.code === 'KeyS') moveBackward = true;
        if (e.code === 'KeyA') spinLeft = true;
        if (e.code === 'KeyD') spinRight = true;
        if (e.code === 'KeyO') { camera.viewMode = 'observer'; player.resetFreeLook(); }
        if (e.code === 'KeyR') camera.viewMode = 'player';
        if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyO', 'KeyR'].includes(e.code)) {
            e.preventDefault();
        }
    });
    document.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW') moveForward = false;
        if (e.code === 'KeyS') moveBackward = false;
        if (e.code === 'KeyA') spinLeft = false;
        if (e.code === 'KeyD') spinRight = false;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (camera.viewMode === 'observer' && (e.button === 0 || e.button === 2)) {
            isDragging = true;
            draggingButton = e.button;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            canvas.style.cursor = (draggingButton === 0) ? 'move' : 'grabbing';
            e.preventDefault();
        } else if (camera.viewMode === 'player' && e.button === 2) {
            isPlayerFreeLooking = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
            canvas.requestPointerLock();
            e.preventDefault();
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isDragging && camera.viewMode === 'observer') {
            const deltaX = e.clientX - lastMouseX;
            const deltaY = e.clientY - lastMouseY;

            lastMouseX = e.clientX;
            lastMouseY = e.clientY;

            if (draggingButton === 0) {
                camera.pan(-deltaX, deltaY);
                canvas.style.cursor = 'grabbing';
            } else if (draggingButton === 2) {
                camera.orbit(deltaX, deltaY);
                canvas.style.cursor = 'move';
            }
        } else if (isPlayerFreeLooking && camera.viewMode === 'player') {
            const deltaX = e.movementX || 0;
            const deltaY = e.movementY || 0;

            player.updateFreeLook(deltaX, deltaY);
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (isDragging && e.button === draggingButton && camera.viewMode === 'observer') {
            isDragging = false;
            draggingButton = -1;
            canvas.style.cursor = (camera.viewMode === 'observer') ? 'grab' : 'default';
        } else if (isPlayerFreeLooking && e.button === 2 && camera.viewMode === 'player') {
            isPlayerFreeLooking = false;
            player.resetFreeLook();
            document.exitPointerLock();
        }
    });

    canvas.addEventListener('mouseleave', () => {
        if (isDragging) {
             isDragging = false;
             draggingButton = -1;
             canvas.style.cursor = (camera.viewMode === 'observer') ? 'grab' : 'default';
        }
    });

    document.addEventListener('pointerlockchange', () => {
        if (document.pointerLockElement !== canvas && isPlayerFreeLooking) {
            isPlayerFreeLooking = false;
            player.resetFreeLook();
        }
    });

    document.addEventListener('pointerlockerror', () => {
        console.error("Pointer lock failed.");
        isPlayerFreeLooking = false;
    });

    canvas.addEventListener('contextmenu', e => e.preventDefault());

    canvas.addEventListener('wheel', (e) => {
        if (camera.viewMode === 'observer') {
            e.preventDefault();
            const scrollAmount = Math.sign(e.deltaY) * 0.1;
            camera.zoom(scrollAmount);
        }
    }, { passive: false });

    canvas.style.cursor = (camera.viewMode === 'observer') ? 'grab' : 'default';

    let previousTime = 0;
    function redraw(currentTime) {
        currentTime *= 0.001;
        let dt = currentTime - previousTime;
        if (dt > 0.1) dt = 0.1;
        previousTime = currentTime;

        if (camera.viewMode === 'player' && !isPlayerFreeLooking) {
            if (spinLeft) player.spinLeft(dt);
            if (spinRight) player.spinRight(dt);
            if (moveForward) player.moveForward(dt);
            if (moveBackward) player.moveBackward(dt);
        }

        if (!isDragging && !isPlayerFreeLooking) {
            const expectedCursor = (camera.viewMode === 'observer') ? 'grab' : 'default';
            if (canvas.style.cursor !== expectedCursor) {
                canvas.style.cursor = expectedCursor;
            }
        } else if (isPlayerFreeLooking) {
            canvas.style.cursor = 'none';
        }

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(shaderProgram);
        gl.uniform3fv(lightDirectionUniform, lightDirection);
        gl.uniform3fv(lightColorUniform, lightColor);
        gl.uniform3fv(ambientColorUniform, ambientColor);

        camera.updateProjection(gl, projectionMatrixUniform, player, isPlayerFreeLooking);
        const viewMatrix = camera.getModelViewMatrix();

        gl.uniformMatrix4fv(modelViewMatrixUniform, false, viewMatrix);
        const normalMatrix = mat3.create();
        mat3.normalFromMat4(normalMatrix, viewMatrix);
        gl.uniformMatrix3fv(normalMatrixUniform, false, normalMatrix);
        if (overrideColorUniform ) {
            gl.uniform4fv(overrideColorUniform, [0,0,0,0]);
        }

        terrain.draw(gl, shaderProgram);
        if (camera.viewMode === 'observer') {
            player.draw(gl, shaderProgram, viewMatrix, modelViewMatrixUniform, normalMatrixUniform, overrideColorUniform);
        }

        requestAnimationFrame(redraw);
    }
    requestAnimationFrame(redraw);
}