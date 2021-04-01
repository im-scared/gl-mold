#version 300 es

uniform vec2 u_Resolution;
uniform float u_Time;
uniform float u_TimeDelta;

in vec2 i_Position;
in vec2 i_Velocity;

out vec2 v_Position;
out vec2 v_Velocity;

void main() {
    v_Position = i_Position + u_TimeDelta * i_Velocity;
    v_Velocity = i_Velocity;
}