precision mediump float;

varying vec3 fragNormal;
varying vec3 fragPosition;
varying vec2 fragUV;

uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform vec3 uAmbientColor;
uniform sampler2D uTexture0;
uniform vec4 uOverrideColor;

void main() {

    if (uOverrideColor.a > 0.0) {
        gl_FragColor = uOverrideColor;
    } else {

        vec3 normal = normalize(fragNormal);
        vec3 lightDir = normalize(-uLightDirection);
        vec3 viewDir = normalize(-fragPosition);
        vec3 halfwayDir = normalize(lightDir + viewDir);

        vec3 ambient = uAmbientColor;

        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = uLightColor * diff;

        float specularStrength = 0.5;
        float shininess = 32.0;
        vec3 reflectDir = reflect(-lightDir, normal);

        float spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);
        vec3 specular = uLightColor * spec * specularStrength;

        vec4 texColor = texture2D(uTexture0, fragUV);

        vec3 litColor = (ambient + diffuse) * texColor.rgb + specular;

        gl_FragColor = vec4(litColor, texColor.a);
    }
}