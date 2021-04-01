#version 300 es

uniform vec2 u_Resolution;

in vec2 i_Position;

void main() {
    vec2 uv = i_Position / u_Resolution;

    gl_PointSize = 2.;
    gl_Position = vec4(uv, 0., 1.);
}