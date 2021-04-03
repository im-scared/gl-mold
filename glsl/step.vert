#version 300 es

uniform vec2 u_Resolution;
uniform float u_Time;
uniform float u_TimeDelta;
uniform float u_Random;

in vec2 i_Position;
in vec2 i_Velocity;

out vec2 v_Position;
out vec2 v_Velocity;

float rand(float n) {
    return fract(sin(n) * 413675.29630125);
}

vec2 flipVec(bvec2 axisBoundViolations) {
    return vec2(
        axisBoundViolations.x ? -1. : 1.,
        axisBoundViolations.y ? -1. : 1.
    );
}

void main() {

    vec2 vel = i_Velocity;
    vec2 pos = i_Position + u_TimeDelta * vel;
    vec2 uv = pos / u_Resolution;
    bvec2 axisBoundViolations = lessThan(vec2(1.), abs(uv));
    if (any(axisBoundViolations)) {
        vel = vel * flipVec(axisBoundViolations);
        pos = i_Position + u_TimeDelta * vel;
    }

    v_Position = pos;
    v_Velocity = vel;
}