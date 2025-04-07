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
    // If override color is opaque, use it directly
    if (uOverrideColor.a > 0.0) {
        gl_FragColor = uOverrideColor;
    } else {
        // Otherwise, perform standard lighting and texturing
        vec3 normal = normalize(fragNormal);
        vec3 lightDir = normalize(-uLightDirection);
        vec3 viewDir = normalize(-fragPosition); // Direction from fragment to camera in view space
        vec3 halfwayDir = normalize(lightDir + viewDir);

        // Ambient
        vec3 ambient = uAmbientColor;

        // Diffuse
        float diff = max(dot(normal, lightDir), 0.0);
        vec3 diffuse = uLightColor * diff;

        // Specular (Phong)
        // Use fixed shininess or add a uniform later
        float specularStrength = 0.5; // Adjust specular intensity
        float shininess = 32.0;
        vec3 reflectDir = reflect(-lightDir, normal); // Reflection vector needed for Blinn-Phong or Phong
        // Using Blinn-Phong NdotH is generally preferred and simpler
        float spec = pow(max(dot(normal, halfwayDir), 0.0), shininess);
        vec3 specular = uLightColor * spec * specularStrength;

        vec4 texColor = texture2D(uTexture0, fragUV);

        // Combine lighting and texture
        vec3 litColor = (ambient + diffuse) * texColor.rgb + specular; // Add specular separately

        gl_FragColor = vec4(litColor, texColor.a);
    }
}