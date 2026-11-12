/* SP-3 shader sources. Every lab, answer and demo on the SP-3 page reads from here,
   and the playground offers them as examples. Edit a shader here and every page updates. */
window.SHADERS = Object.assign(window.SHADERS || {}, {
  'hero': `// The shader behind the home page.
// Each loop pass bends space a little more, which makes the flowing shapes.
void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y * 1.5;
    float t = iTime * 0.25;

    for (int i = 1; i < 6; i++) {
        float f = float(i);
        p += vec2(0.7 / f * sin(f * p.y + t + 0.3 * f),
                  0.7 / f * cos(f * p.x + t + 0.5 * f));
    }

    float v = 0.5 + 0.5 * sin(p.x + p.y);
    vec3 col = mix(vec3(0.04, 0.10, 0.17), vec3(0.0, 0.52, 0.79), smoothstep(0.15, 0.85, v));
    col = mix(col, vec3(0.6, 0.85, 1.0), smoothstep(0.9, 1.0, v) * 0.5);

    // drag on the image: a soft orange glow follows your cursor
    vec2 q = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec2 m = (2.0 * iMouse.xy - iResolution.xy) / iResolution.y;
    float clicked = step(1.0, iMouse.x + iMouse.y);
    col += vec3(0.96, 0.62, 0.17) * clicked * 0.08 / (length(q - m) + 0.08);

    fragColor = vec4(col, 1.0);
}
`,
  'hello': `void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = fragCoord / iResolution.xy;    // 0..1 across the screen
    fragColor = vec4(uv.x, uv.y, 0.5, 1.0); // red = x, green = y
}
`,
  'hello-a1': `void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = fragCoord / iResolution.xy;    // 0..1 across the screen
    // Every pixel returns the same color, so the whole screen is ACM blue.
    fragColor = vec4(0.0, 0.52, 0.79, 1.0);
}
`,
  'hello-a2': `void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = fragCoord / iResolution.xy;    // 0..1 across the screen
    // uv.y goes in the red slot, so red grows from the bottom (0) to the top (1).
    fragColor = vec4(uv.y, uv.x, 0.5, 1.0);
}
`,
  'hello-a3': `void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = fragCoord / iResolution.xy;    // 0..1 across the screen
    // sin() swings between -1 and 1; 0.5 + 0.5 * sin() remaps that to 0..1 over time.
    fragColor = vec4(uv.x, uv.y, 0.5 + 0.5 * sin(iTime), 1.0);
}
`,
  'circle': `void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y; // (0,0) = center, square pixels
    float d = length(p) - 0.5;                                    // negative inside
    vec3 col = d < 0.0 ? vec3(1.0, 0.6, 0.2) : vec3(0.1);
    fragColor = vec4(col, 1.0);
}
`,
  'circle-a1': `void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y; // (0,0) = center, square pixels
    float d = length(p - vec2(0.3, 0.0)) - 0.5;   // measure from a new center
    vec3 col = d < 0.0 ? vec3(1.0, 0.6, 0.2) : vec3(0.1);
    fragColor = vec4(col, 1.0);
}
`,
  'circle-a2': `void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y; // (0,0) = center, square pixels
    float d = length(p) - 0.5;
    vec3 col = vec3(0.5 + 0.5 * cos(40.0 * d));   // rings, evenly spaced because d grows evenly
    fragColor = vec4(col, 1.0);
}
`,
  'circle-a3': `void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y; // (0,0) = center, square pixels
    float d = length(p) - 0.5;
    // smoothstep fades 0 -> 1 across a thin band at the edge; mix blends by that amount
    vec3 col = mix(vec3(1.0, 0.6, 0.2), vec3(0.1), smoothstep(0.0, 0.01, d));
    fragColor = vec4(col, 1.0);
}
`,
  'face': `float circle(vec2 p, vec2 c, float r) { return length(p - c) - r; }
float fill(float d) { return 1.0 - smoothstep(0.0, 0.01, d); }

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec3 col = vec3(0.04, 0.09, 0.17);                                        // background

    col = mix(col, vec3(0.96, 0.78, 0.62), fill(circle(p, vec2(0.0), 0.7)));  // head

    float eyes = min(circle(p, vec2(-0.25, 0.15), 0.08),
                     circle(p, vec2( 0.25, 0.15), 0.08));
    col = mix(col, vec3(0.06), fill(eyes));                                   // eyes

    float mouth = max(abs(circle(p, vec2(0.0), 0.35)) - 0.03, p.y + 0.1);
    col = mix(col, vec3(0.55, 0.12, 0.18), fill(mouth));                      // smile

    fragColor = vec4(col, 1.0);
}
`,
  'face-full': `// SP-3 Main challenge answer key: a face with every stretch goal
// Turn each goal on (1) or off (0) to show it on its own. Press Alt+Enter after changing.
#define HAIR        1
#define GLASSES     1
#define BLINK       1
#define LOOK_AROUND 1   // click and drag on the image
#define BACKGROUND  1
#define EXTRAS      1   // freckles and a hat

float circle(vec2 p, vec2 c, float r) { return length(p - c) - r; }
float box(vec2 p, vec2 c, vec2 size)  { return length(max(abs(p - c) - size, 0.0)); }
float fill(float d) { return 1.0 - smoothstep(0.0, 0.01, d); }

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    p *= 1.15;                                                   // zoom out a little so the hat fits

    // ---- Background: gradient + stripes ----
    vec3 col = vec3(0.04, 0.09, 0.17);
#if BACKGROUND
    col = mix(vec3(0.02, 0.06, 0.14), vec3(0.0, 0.32, 0.52), p.y * 0.4 + 0.5);
    col *= 0.88 + 0.12 * sin(p.x * 20.0 + iTime);               // slowly moving stripes
#endif

    // ---- Hair: a bigger circle behind the head, cut to the top half ----
#if HAIR
    float hair = max(circle(p, vec2(0.0, 0.08), 0.78), -p.y);   // max(d, -p.y) keeps only p.y > 0
    col = mix(col, vec3(0.17, 0.11, 0.08), fill(hair));
#endif

    // ---- Head ----
    col = mix(col, vec3(0.96, 0.78, 0.62), fill(circle(p, vec2(0.0), 0.7)));

#if HAIR
    // Bangs: a box drawn AFTER the head so it sits on top
    float bangs = max(box(p, vec2(0.0, 0.58), vec2(0.5, 0.15)), circle(p, vec2(0.0), 0.7));
    col = mix(col, vec3(0.17, 0.11, 0.08), fill(bangs));
#endif

    // ---- Eyes ----
    vec2 eyeL = vec2(-0.25, 0.15), eyeR = vec2(0.25, 0.15);
    vec2 q = p;
#if BLINK
    // Every few seconds, stretch the eye's y coordinate so the circles collapse into a line.
    float open = mix(1.0, 0.08, step(0.95, fract(iTime * 0.3)));
    q.y = (q.y - 0.15) / open + 0.15;
#endif
    float whites = min(circle(q, eyeL, 0.10), circle(q, eyeR, 0.10));
    col = mix(col, vec3(0.97), fill(whites));

    vec2 look = vec2(0.0);
#if LOOK_AROUND
    // iMouse.xy is (0,0) until you click; only follow it after a click.
    vec2 m = (2.0 * iMouse.xy - iResolution.xy) / iResolution.y * 1.15;
    float clicked = step(1.0, iMouse.x + iMouse.y);
    look = clamp((m - vec2(0.0, 0.15)) * 0.08, -0.045, 0.045) * clicked;
#endif
    float pupils = min(circle(q, eyeL + look, 0.05), circle(q, eyeR + look, 0.05));
    col = mix(col, vec3(0.06), fill(pupils));

    // ---- Glasses: rings are abs(circle) - thickness, plus a thin box for the bridge ----
#if GLASSES
    float rings  = min(abs(circle(p, eyeL, 0.16)), abs(circle(p, eyeR, 0.16))) - 0.015;
    float bridge = box(p, vec2(0.0, 0.17), vec2(0.09, 0.012));
    col = mix(col, vec3(0.08, 0.08, 0.10), fill(min(rings, bridge)));
#endif

    // ---- Mouth: a ring, cut to the bottom ----
    float mouth = max(abs(circle(p, vec2(0.0, 0.02), 0.33)) - 0.025, p.y + 0.12);
    col = mix(col, vec3(0.55, 0.12, 0.18), fill(mouth));

#if EXTRAS
    // Freckles: a few tiny circles under each eye
    float fr = 1e5;
    fr = min(fr, circle(p, vec2(-0.32, -0.05), 0.012));
    fr = min(fr, circle(p, vec2(-0.25, -0.08), 0.012));
    fr = min(fr, circle(p, vec2(-0.18, -0.05), 0.012));
    fr = min(fr, circle(p, vec2( 0.32, -0.05), 0.012));
    fr = min(fr, circle(p, vec2( 0.25, -0.08), 0.012));
    fr = min(fr, circle(p, vec2( 0.18, -0.05), 0.012));
    col = mix(col, vec3(0.70, 0.45, 0.32), fill(fr));

    // Hat: a brim box and a crown box, in ACM blue
    float hat = min(box(p, vec2(0.0, 0.72), vec2(0.62, 0.035)),
                    box(p, vec2(0.0, 0.88), vec2(0.36, 0.14)));
    col = mix(col, vec3(0.0, 0.52, 0.79), fill(hat));
#endif

    fragColor = vec4(col, 1.0);
}
`,
  'saber-start': `float seg(vec2 p, vec2 a, vec2 b)                          // distance to a line segment
{
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    float d = seg(p, vec2(-0.5, -0.4), vec2(0.5, 0.4));
    float flicker = 0.9 + 0.1 * sin(iTime * 47.0);

    vec3 col = vec3(0.02, 0.03, 0.06);
    col += vec3(0.1, 0.45, 1.0) * 0.012 / (d + 0.004) * flicker;        // the glow
    col = mix(col, vec3(1.0), 1.0 - smoothstep(0.0, 0.01, d - 0.015));  // white-hot core

    fragColor = vec4(col, 1.0);
}
`,
  'saber-answer': `// SP-3 Take-home answer key: Forge your own lightsaber
// Answers all three "your turn" asks: change the color, add a hilt, make the blade ignite.

float seg(vec2 p, vec2 a, vec2 b)                          // distance to a line segment
{
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

float fill(float d) { return 1.0 - smoothstep(0.0, 0.01, d); }

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;

    vec2 hiltStart = vec2(-0.6, -0.45);
    vec2 hiltEnd   = vec2(-0.35, -0.26);                    // blade starts here
    vec2 fullTip   = vec2( 0.6,  0.45);

    // 1) Color: any RGB works. Red here; try (0.2, 1.0, 0.3) for green or (0.7, 0.2, 1.0) for purple.
    vec3 bladeColor = vec3(1.0, 0.12, 0.08);

    // 3) Ignition: grow from 0 to full length over the first 1.5 seconds.
    //    (Swap iTime for fract(iTime * 0.2) * 5.0 to replay it every 5 seconds.)
    float len = smoothstep(0.0, 1.5, iTime);
    vec2 tip  = hiltEnd + (fullTip - hiltEnd) * max(len, 0.002);
    float on  = step(0.01, len);

    float d = seg(p, hiltEnd, tip);
    float flicker = 0.9 + 0.1 * sin(iTime * 47.0);

    vec3 col = vec3(0.02, 0.03, 0.06);
    col += bladeColor * 0.012 / (d + 0.004) * flicker * on;        // the glow
    col = mix(col, vec3(1.0), fill(d - 0.015) * on);              // white-hot core

    // 2) Hilt: a thicker gray segment drawn on top, plus a dark grip.
    col = mix(col, vec3(0.60, 0.62, 0.66), fill(seg(p, hiltStart, hiltEnd) - 0.035));
    col = mix(col, vec3(0.10, 0.10, 0.12), fill(seg(p, mix(hiltStart, hiltEnd, 0.2), mix(hiltStart, hiltEnd, 0.7)) - 0.04));

    fragColor = vec4(col, 1.0);
}
`,
  'lightsaber': `// SP-3 demo: Stick -> Lightsaber
// Paste into a new Shadertoy, press Alt+Enter.
// Live demo: set BLAND to 1 for the plain stick, then back to 0 and recompile.
#define BLAND 0

float fill(float d) { return 1.0 - smoothstep(0.0, 0.008, d); }

// distance from p to the line segment a-b
float seg(vec2 p, vec2 a, vec2 b)
{
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    vec2 a = vec2(-0.6, -0.45);   // bottom end
    vec2 b = vec2( 0.6,  0.45);   // top end

#if BLAND
    vec3 col = vec3(0.20, 0.22, 0.25);
    float d = seg(p, a, b) - 0.03;
    col = mix(col, vec3(0.55, 0.40, 0.25), fill(d));          // solid brown stick
#else
    vec2 c = a + (b - a) * 0.22;                               // where hilt meets blade

    // ignition: blade grows, holds, then retracts on a loop
    float k   = fract(iTime * 0.12);
    float len = smoothstep(0.0, 0.12, k) * (1.0 - smoothstep(0.9, 1.0, k));
    float on  = step(0.01, len);
    vec2 tip  = c + (b - c) * max(len, 0.002);

    float d = seg(p, c, tip);
    float flicker = 0.9 + 0.1 * sin(iTime * 47.0) * sin(iTime * 13.0);
    vec3 blade = vec3(0.1, 0.45, 1.0);                         // try vec3(1.0, 0.1, 0.1) for red

    vec3 col = vec3(0.02, 0.03, 0.06);
    col += blade * 0.012 / (d + 0.004) * flicker * on;         // glow: fades with distance
    col += blade * 0.25 * exp(-d * 6.0) * flicker * len;       // soft bloom
    col = mix(col, vec3(1.0), fill(d - 0.016) * on);           // white-hot core

    col = mix(col, vec3(0.60, 0.62, 0.66), fill(seg(p, a, c) - 0.035));                         // hilt
    col = mix(col, vec3(0.10, 0.10, 0.12), fill(seg(p, a + (c - a) * 0.2, a + (c - a) * 0.7) - 0.04)); // grip
#endif

    fragColor = vec4(col, 1.0);
}
`,
  'planet': `// SP-3 demo: Circle -> Planet (fake 3D lighting)
// Paste into a new Shadertoy, press Alt+Enter.
// Live demo: set BLAND to 1 for the flat circle, then back to 0 and recompile.
#define BLAND 0

float fill(float d) { return 1.0 - smoothstep(0.0, 0.008, d); }

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    float r = 0.7;
    float dist = length(p);

#if BLAND
    vec3 col = vec3(0.20, 0.22, 0.25);
    col = mix(col, vec3(0.85, 0.50, 0.25), fill(dist - r));   // flat orange circle
#else
    // twinkling stars: a random number per 2x2 pixel block
    float h = fract(sin(dot(floor(fragCoord / 2.0), vec2(12.9898, 78.233))) * 43758.5453);
    vec3 col = vec3(0.01, 0.02, 0.05) + vec3(step(0.996, h)) * (0.5 + 0.5 * sin(iTime * 2.0 + h * 90.0));

    // atmosphere glow outside the planet
    col += vec3(0.3, 0.6, 1.0) * 0.5 * exp(-max(dist - r, 0.0) * 10.0);

    // Pythagoras: how far the sphere bulges toward us at this pixel
    float z = sqrt(max(r * r - dot(p, p), 0.0));
    vec3 n = normalize(vec3(p, z + 0.0001));                   // surface direction (normal)
    vec3 light = normalize(vec3(-0.6, 0.5, 0.6));
    float diffuse = max(dot(n, light), 0.0);                   // facing the light = bright

    // spinning gas-giant bands
    float lon = atan(n.x, n.z) + iTime * 0.3;
    float bands = 0.5 + 0.5 * sin(n.y * 14.0 + sin(lon * 3.0) * 0.8);
    vec3 base = mix(vec3(0.80, 0.40, 0.18), vec3(0.97, 0.82, 0.58), bands);

    vec3 surface = base * (0.06 + 1.1 * diffuse);
    surface += vec3(0.35, 0.65, 1.0) * pow(1.0 - clamp(z / r, 0.0, 1.0), 3.0) * 0.9; // blue rim

    col = mix(col, surface, fill(dist - r));
#endif

    fragColor = vec4(col, 1.0);
}
`,
  'synthwave': `// SP-3 demo: Gradient -> Synthwave sunset (perspective + repetition)
// Paste into a new Shadertoy, press Alt+Enter.
// Live demo: set BLAND to 1 for the plain gradient, then back to 0 and recompile.
#define BLAND 0

float fill(float d) { return 1.0 - smoothstep(0.0, 0.008, d); }

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
#if BLAND
    vec2 uv = fragCoord / iResolution.xy;
    vec3 col = mix(vec3(0.50, 0.45, 0.55), vec3(0.30, 0.35, 0.50), uv.y);
#else
    vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
    float horizon = -0.15;

    // sky: orange near the horizon, deep purple up top
    vec3 col = mix(vec3(0.95, 0.35, 0.45), vec3(0.08, 0.02, 0.20), clamp((p.y - horizon) * 1.2, 0.0, 1.0));

    // sun: a circle with scrolling stripes cut out of its lower half
    float sun = length(p - vec2(0.0, 0.3)) - 0.42;
    float stripes = step(0.5, fract(p.y * 14.0 - iTime * 0.6)) * step(p.y, 0.22);
    vec3 sunCol = mix(vec3(1.0, 0.25, 0.55), vec3(1.0, 0.85, 0.30), clamp((p.y + 0.12) / 0.84, 0.0, 1.0));
    col = mix(col, sunCol, fill(sun) * (1.0 - stripes));
    col += vec3(1.0, 0.4, 0.6) * 0.35 * exp(-max(sun, 0.0) * 6.0);   // sun glow

    // ground: perspective grid. z grows as we approach the horizon.
    float z = 1.0 / max(horizon - p.y, 0.001);
    float gx = smoothstep(0.44, 0.5, abs(fract(p.x * z) - 0.5));          // lines going away from you
    float gz = smoothstep(0.44, 0.5, abs(fract(z + iTime * 1.5) - 0.5));  // lines across, moving toward you
    float fade = clamp((horizon - p.y) * 4.0, 0.0, 1.0);                  // hide aliasing at the horizon
    vec3 ground = vec3(0.05, 0.0, 0.10) + vec3(1.0, 0.2, 0.8) * max(gx, gz) * fade;

    col = mix(col, ground, step(p.y, horizon));
    col += vec3(1.0, 0.3, 0.6) * exp(-abs(p.y - horizon) * 14.0) * 0.6;   // horizon haze
#endif

    fragColor = vec4(col, 1.0);
}
`,
});
