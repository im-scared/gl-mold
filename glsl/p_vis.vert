#version 300 es
precision mediump float;

in vec2 i_Position;
in float i_Age;
in float i_Life;
in vec2 i_Velocity;

void main() {
  gl_PointSize = 1.0;
  gl_Position = vec4(i_Position, 0.0, 1.0);
}
