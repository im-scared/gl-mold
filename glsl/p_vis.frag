#version 300 es
precision mediump float;

in float v_Age;
in float v_Life;

out vec4 o_FragColor;

/* From http://iquilezles.org/www/articles/palettes/palettes.htm */
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d )
{  return a + b*cos( 6.28318*(c*t+d) ); }

void main() {
  float t =  v_Age/v_Life;
  vec3 a, b, c, d;
  a = vec3(0.5, 0.5, 0.5);
  b = vec3(0.5, 0.5, 0.5);
  c = vec3(2.0, 1.0, 0.0);
  d = vec3(0.50, 0.20, 0.25);
  vec3 col = palette(t, a, b, c, d);
  o_FragColor = vec4(col, sqrt(1.0 - t*t));
}
