#version 300 es

uniform vec2 u_Resolution;
uniform float u_Time;

in vec2 i_Position;

void main() {
    vec2 uv = i_Position / u_Resolution * u_Resolution.y;
    // gl_Position is a special variable a vertex shader is responsible for setting
    gl_Position = vec4(uv.x, uv.y, 0, 1);
}