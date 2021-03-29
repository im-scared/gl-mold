#version 300 es

in vec4 i_Position;

void main() {

    // gl_Position is a special variable a vertex shader is responsible for setting
    gl_Position = i_Position;
}