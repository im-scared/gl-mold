#version 300 es
precision mediump float;

/* Number of seconds since the animation started */
uniform float u_Time;

/* Number of seconds (possibly fractional) that has passed since the last
   update step. */
uniform float u_TimeDelta;

/* A texture with just 2 channels (red and green), filled with random values.
   This is needed to assign a random direction to newly born particles. */
uniform sampler2D u_RgNoise;

/* This is the gravity vector. It's a force that affects all particles all the
   time.*/
uniform vec2 u_Gravity;

/* This is the point from which all newborn particles start their movement. */
uniform vec2 u_Origin;

/* Theta is the angle between the vector (1, 0) and a newborn particle's
   velocity vector. By setting u_MinTheta and u_MaxTheta, we can restrict it
   to be in a certain range to achieve a directed "cone" of particles.
   To emit particles in all directions, set these to -PI and PI. */
uniform float u_MinTheta;
uniform float u_MaxTheta;

/* The min and max values of the (scalar!) speed assigned to a newborn
   particle.*/
uniform float u_MinSpeed;
uniform float u_MaxSpeed;

/* Inputs. These reflect the state of a single particle before the update. */

/* Where the particle is. */
in vec2 i_Position;

/* Age of the particle in seconds. */
in float i_Age;

/* How long this particle is supposed to live. */
in float i_Life;

/* Which direction it is moving, and how fast. */
in vec2 i_Velocity;

/* Outputs. These mirror the inputs. These values will be captured
   into our transform feedback buffer! */
out vec2 v_Position;
out float v_Age;
out float v_Life;
out vec2 v_Velocity;

// 2D Random
float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))
                 * 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    // Smooth Interpolation

    // Cubic Hermine Curve.  Same as SmoothStep()
    vec2 u = f*f*(3.0-2.0*f);
    // u = smoothstep(0.,1.,f);

    // Mix 4 coorners percentages
    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

vec2 noise2(in vec2 st, in float offset) {
  return vec2(
    noise(st + vec2(offset)),
    noise(st + vec2(offset * 1.4137))
  );
}

void main() {
  if (i_Age >= i_Life) {
    /* Particle has exceeded its lifetime! Time to spawn a new one
       in place of the old one, in accordance with our rules.*/

    /* First, choose where to sample the random texture. I do it here
       based on particle ID. It means that basically, you're going to
       get the same initial random values for a given particle. The result
       still looks good. I suppose you could get fancier, and sample
       based on particle ID *and* time, or even have a texture where values
       are not-so-random, to control the pattern of generation. */
    vec2 noise_coord = vec2(gl_VertexID * 0.26 * u_Time, gl_VertexID * 1.3 * u_Time);

    /* Get the pair of random values. */
    float r_1 = noise(noise_coord);

    /* Decide the direction of the particle based on the first random value.
       The direction is determined by the angle theta that its vector makes
       with the vector (1, 0).*/
    float theta = u_MinTheta + r_1*(u_MaxTheta - u_MinTheta);

    /* Derive the x and y components of the direction unit vector.
       This is just basic trig. */
    float x = cos(theta);
    float y = sin(theta);

    /* Return the particle to origin. */
    v_Position = u_Origin;

    /* It's new, so age must be set accordingly.*/
    v_Age = 0.0;
    v_Life = i_Life;

    /* Generate final velocity vector. We use the second random value here
       to randomize speed. */
    float r_2 = noise(noise_coord + vec2(2.76, 3.21));
    v_Velocity =
      vec2(x, y) * (u_MinSpeed + r_2 * (u_MaxSpeed - u_MinSpeed));

  } else {
    /* Update parameters according to our simple rules.*/
    v_Position = i_Position + i_Velocity * u_TimeDelta;
    v_Age = i_Age + u_TimeDelta;
    v_Life = i_Life;
    vec2 force = 4.0 * (2.0 * noise2(i_Position, 4.365) - vec2(1.0));
    v_Velocity = i_Velocity + u_Gravity * u_TimeDelta + force * u_TimeDelta;
  }
}
