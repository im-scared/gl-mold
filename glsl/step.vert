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

ivec2 outOfBounds(vec2 pos, vec2 vel) {
    vec2 uv = pos / u_Resolution;
    bvec2 abv = lessThan(vec2(1.), abs(uv)); // Axis Bound Violations
    if (all(not(abv))) {
        return ivec2(0, 0);
    }
    // convert sign of vel components from (-1., 1.) to (false, true)
    bvec2 velSignB = lessThan(vec2(0), sign(vel));
    // convert sign of vel components from (false, true) to (-1, 1)
    ivec2 velSignI = 2*ivec2(velSignB) - ivec2(1);
    // return 0 if not out of bounds, otherwise -1 for OOB on the negative side of the axis, and 1 on the positive side
    return ivec2(abv)*velSignI;
}

vec4 update(vec2 pos, vec2 vel) {
    vec2 newPos = i_Position + u_TimeDelta * vel;
    ivec2 oob = outOfBounds(newPos, vel);
    if (oob == ivec2(0)) {
        return vec4(newPos, vel);
    }

    vel = vel*-1.*vec2(2*abs(oob) - 1);
    return vec4(
        pos + u_TimeDelta * vel,
        vel
    );
}

void main() {

    vec4 pv = update(i_Position, i_Velocity);
    vec2 pos = pv.xy;
    vec2 vel = pv.zw;

    v_Position = pos;
    v_Velocity = vel;
}