#version 300 es

uniform vec2 u_Resolution;
uniform float u_Time;

in vec2 i_Position;
in vec2 i_Velocity;

out vec2 v_Position;
out vec2 v_Velocity;

void main() {
    v_Position = i_Position;
    v_Velocity = i_Velocity;

//    vec2 uv = i_Position / u_Resolution * u_Resolution.y;

    gl_Position = vec4(i_Position + i_Velocity/u_Resolution, 0, 1);

    gl_PointSize = 2.0;
}