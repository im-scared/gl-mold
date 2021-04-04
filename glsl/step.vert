#version 300 es

uniform vec2 u_Resolution;
uniform float u_Time;
uniform float u_TimeDelta;
uniform float u_Random;

in vec2 i_Position;
in vec2 i_Velocity;
in vec4 i_Debug;

out vec2 v_Position;
out vec2 v_Velocity;
out vec4 v_Debug;

vec4 bbRight;
vec4 bbTop;
vec4 bbLeft;
vec4 bbBot;
vec4 bounds[4];
vec2 bounds_normals[4];

void initBounds() {
    bbRight = vec4(u_Resolution * vec2( 1., -1.), u_Resolution * vec2( 1.,  1.));
    bbTop   = vec4(u_Resolution * vec2( 1.,  1.), u_Resolution * vec2(-1.,  1.));
    bbLeft  = vec4(u_Resolution * vec2(-1.,  1.), u_Resolution * vec2(-1., -1.));
    bbBot   = vec4(u_Resolution * vec2(-1., -1.), u_Resolution * vec2( 1., -1.));
    bounds = vec4[4](bbRight, bbTop, bbLeft, bbBot);
    bounds_normals = vec2[4](vec2(-1., 0.), vec2(0., -1.), vec2(1., 0.), vec2(0., 1.));
}

float rand(float n) {
    return fract(sin(n) * 413675.29630125);
}

float determ(float a, float b, float c, float d) {
    return a*d - b*c;
}

float determ(vec2 ac, vec2 bd) {
    return determ(ac.x, bd.x, ac.y, bd.y);
}

struct Intersection {
    bool intersects_axis;
    vec2 intersection;
};

Intersection intersect(vec2 pos, vec2 dir, vec4 boundary) {
    vec2 p1 = pos;
    vec2 p2 = pos + dir;
    vec2 p3 = boundary.xy;
    vec2 p4 = boundary.zw;

    float denom = determ(p1 - p2, p3 - p4);

    float u_prime = determ(p2 - p1, p1 - p3);
    float t_prime = determ(p1 - p3, p3 - p4);
    if (u_prime < 0. || denom < u_prime || t_prime < 0. || denom < t_prime) {
        return Intersection(false, vec2(0.));
    }
    float u = u_prime / denom;

    return Intersection(
        true,
        p3 + u*(p4 - p3)
    );
}

struct Step {
    vec2 pos;
    float remainingDist;
    vec2 exitDir;
};

Step step(Step lastStep) {
    vec2 pos = lastStep.pos;
    vec2 dist = lastStep.remainingDist*lastStep.exitDir;

    for(int i = 0; i < bounds.length(); i++) {
        Intersection intersection = intersect(pos, dist, bounds[i]);
        if (intersection.intersects_axis) {
            return Step(
                intersection.intersection,
                lastStep.remainingDist - length(intersection.intersection - pos),
                normalize(reflect(lastStep.exitDir, bounds_normals[i]))
            );
        }
    }

    return Step(
        pos + dist,
        0.,
        lastStep.exitDir
    );
}

Step step(vec2 pos, vec2 dist) {
    return step(Step(pos, length(dist), normalize(dist)));
}

vec4 update(vec2 pos, vec2 vel) {
    Step lastStep = step(pos, u_TimeDelta*vel);
    for (int i = 0; i < 100; i++) {
        if (lastStep.remainingDist == 0.) {
            return vec4(
                lastStep.pos + lastStep.remainingDist*lastStep.exitDir,
                length(vel)*lastStep.exitDir
            );
        }
        lastStep = step(lastStep);
    }

    return vec4(0.);
}

void main() {
    initBounds();

    v_Debug = i_Debug;
    v_Debug.x = u_Time;

    vec4 pv = update(i_Position, i_Velocity);
    vec2 pos = pv.xy;
    vec2 vel = pv.zw;

    v_Position = pos;
    v_Velocity = vel;
}