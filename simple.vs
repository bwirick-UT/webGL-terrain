precision mediump float;

attribute vec3 vertPosition;
attribute vec3 vertNormal;
attribute vec2 vertUV;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;
varying vec3 fragNormal;
varying vec3 fragPosition;
varying vec2 fragUV;

void main() {
    fragUV = vertUV;
    fragPosition = vec3(uModelViewMatrix * vec4(vertPosition, 1.0));
    fragNormal = normalize(uNormalMatrix * vertNormal);
    gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(vertPosition, 1.0);
}