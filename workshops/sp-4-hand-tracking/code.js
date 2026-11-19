/* SP-4 starter code and answers. Every editor and answer on the SP-4 page reads from here. */
window.SHADERS = Object.assign(window.SHADERS || {}, {

  /* ---------------- Activity 1: hello, hand ---------------- */

  'hello': `// detect(hand) runs on every frame. Return a word to show it on screen.
// hand.points is a list of 21 points. Each has an x, y and z.
// x: 0 is the left edge, 1 is the right edge.
// y: 0 is the TOP, 1 is the bottom.

function detect(hand) {
  const tip = hand.points[8];        // the tip of your index finger

  if (tip.y < 0.4) return "hand up high";
  return "";
}
`,

  'hello-a1': `function detect(hand) {
  const tip = hand.points[8];

  // x = 0.5 is the middle of the picture
  if (tip.x < 0.5) return "left side";
  return "right side";
}
`,

  'hello-a2': `function detect(hand) {
  const tip = hand.points[8];

  if (tip.y < 0.4) return "hand up high";
  return "";
}

// onGesture runs ONCE each time detect returns something new.
function onGesture(name) {
  if (name === "hand up high") say("hello");
}
`,

  'hello-a3': `function detect(hand) {
  const thumb = hand.points[4];
  const index = hand.points[8];

  // Smaller y means higher up the screen
  if (thumb.y < index.y) return "thumb is higher";
  return "index is higher";
}
`,

  /* ---------------- Activity 2: count fingers ---------------- */

  'count': `const WRIST = 0;
const TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const PIPS = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 };  // the middle joint of each finger

// TODO: return true when this finger is straight (up), false when it is bent.
function isUp(hand, finger) {
  const p = hand.points;
  const tip = p[TIPS[finger]];
  const pip = p[PIPS[finger]];

  return false;
}

function detect(hand) {
  let count = 0;
  for (const finger in TIPS) {
    if (isUp(hand, finger)) count++;
  }
  return count + " fingers";
}
`,

  'count-a1': `const WRIST = 0;
const TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const PIPS = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 };

// A straight finger's tip is farther from the wrist than its middle joint.
// A bent finger folds the tip back in, so the tip ends up closer.
function isUp(hand, finger) {
  const p = hand.points;
  const tip = p[TIPS[finger]];
  const pip = p[PIPS[finger]];
  return distance(tip, p[WRIST]) > distance(pip, p[WRIST]);
}

function detect(hand) {
  let count = 0;
  for (const finger in TIPS) {
    if (isUp(hand, finger)) count++;
  }
  return count + " fingers";
}
`,

  'count-a2': `const WRIST = 0;
const TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const PIPS = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 };

function isUp(hand, finger) {
  const p = hand.points;
  const tip = p[TIPS[finger]];
  const pip = p[PIPS[finger]];

  // The thumb bends sideways, across the palm, so measure from the pinky knuckle (17).
  // A tucked thumb points toward it; a stuck-out thumb points away.
  if (finger === "thumb") return distance(tip, p[17]) > distance(pip, p[17]);

  return distance(tip, p[WRIST]) > distance(pip, p[WRIST]);
}

function detect(hand) {
  let count = 0;
  for (const finger in TIPS) {
    if (isUp(hand, finger)) count++;
  }
  return count + " fingers";
}
`,

  'count-a3': `const TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const PIPS = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 };

// The "obvious" rule: a finger is up when its tip is higher than its middle joint.
// It works with your hand upright. Turn your hand sideways or upside down and it breaks,
// because "up" on the screen is no longer "along the finger".
function isUp(hand, finger) {
  const p = hand.points;
  return p[TIPS[finger]].y < p[PIPS[finger]].y;
}

function detect(hand) {
  let count = 0;
  for (const finger in TIPS) {
    if (isUp(hand, finger)) count++;
  }
  return count + " fingers (y rule)";
}
`,

  /* ---------------- Activity 3: gestures to sounds ---------------- */

  'gestures': `const WRIST = 0;
const TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const PIPS = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 };

function isUp(hand, finger) {
  const p = hand.points;
  const tip = p[TIPS[finger]], pip = p[PIPS[finger]];
  if (finger === "thumb") return distance(tip, p[17]) > distance(pip, p[17]);
  return distance(tip, p[WRIST]) > distance(pip, p[WRIST]);
}

function detect(hand) {
  // up.index is true when the index finger is up, and so on
  const up = {};
  for (const finger in TIPS) up[finger] = isUp(hand, finger);

  if (!up.thumb && !up.index && !up.middle && !up.ring && !up.pinky) return "fist";

  // TODO: thumbs up (only the thumb is up)
  // TODO: peace sign (only index and middle are up)

  return "";
}

// Runs once each time the gesture changes.
// Sounds: ding, pop, drum, clap, chord, beep, whoosh, sad
function onGesture(name) {
  if (name === "fist") play("drum");
}
`,

  'gestures-answer': `const WRIST = 0;
const TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const PIPS = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 };

function isUp(hand, finger) {
  const p = hand.points;
  const tip = p[TIPS[finger]], pip = p[PIPS[finger]];
  if (finger === "thumb") return distance(tip, p[17]) > distance(pip, p[17]);
  return distance(tip, p[WRIST]) > distance(pip, p[WRIST]);
}

function detect(hand) {
  const p = hand.points;
  const up = {};
  for (const finger in TIPS) up[finger] = isUp(hand, finger);
  const others = up.index || up.middle || up.ring || up.pinky;   // any of the four fingers up?

  if (!up.thumb && !others) return "fist";

  // Only the thumb is up, and its tip is above its knuckle (smaller y = higher)
  if (up.thumb && !others && p[4].y < p[2].y) return "thumbs up";

  if (up.thumb && !others && p[4].y > p[2].y) return "thumbs down";

  if (up.index && up.middle && !up.ring && !up.pinky) return "peace";

  return "";
}

function onGesture(name) {
  if (name === "fist") play("drum");
  if (name === "thumbs up") play("ding");
  if (name === "thumbs down") play("sad");
  if (name === "peace") play("chord");
}
`,

  /* ---------------- Activity 4: invent your own ---------------- */

  'invent-answer': `const WRIST = 0;
const TIPS = { thumb: 4, index: 8, middle: 12, ring: 16, pinky: 20 };
const PIPS = { thumb: 3, index: 6, middle: 10, ring: 14, pinky: 18 };

function isUp(hand, finger) {
  const p = hand.points;
  const tip = p[TIPS[finger]], pip = p[PIPS[finger]];
  if (finger === "thumb") return distance(tip, p[17]) > distance(pip, p[17]);
  return distance(tip, p[WRIST]) > distance(pip, p[WRIST]);
}

// How big the hand looks on screen: wrist to middle knuckle.
// Dividing by this makes a rule work whether your hand is near or far from the camera.
function handSize(hand) {
  return distance(hand.points[0], hand.points[9]);
}

function detect(hand) {
  const p = hand.points;
  const up = {};
  for (const finger in TIPS) up[finger] = isUp(hand, finger);
  const others = up.index || up.middle || up.ring || up.pinky;

  // Pinch: thumb tip and index tip touching, with the other fingers relaxed.
  // Check it first, since a pinch can also look like other gestures. Without the
  // "relaxed" check, a fist counts as a pinch: a tucked thumb sits right on the index finger.
  const touching = distance(p[4], p[8]) < 0.25 * handSize(hand);
  const relaxed = up.middle || up.ring || up.pinky;
  if (touching && relaxed) return "pinch";

  if (up.index && up.pinky && !up.middle && !up.ring) return "rock on";
  if (up.thumb && up.pinky && !up.index && !up.middle && !up.ring) return "call me";
  if (up.index && !up.middle && !up.ring && !up.pinky) return "pointing";
  if (up.index && up.middle && !up.ring && !up.pinky) return "peace";
  if (up.thumb && !others && p[4].y < p[2].y) return "thumbs up";
  if (up.thumb && !others && p[4].y > p[2].y) return "thumbs down";   // same, but the tip is BELOW the knuckle
  if (!up.thumb && !others) return "fist";
  if (up.thumb && up.index && up.middle && up.ring && up.pinky) return "open hand";

  return "";
}

function onGesture(name) {
  if (name === "pinch") play("pop");
  if (name === "rock on") play("clap");
  if (name === "call me") say("hello?");
  if (name === "pointing") play("beep");
  if (name === "peace") play("chord");
  if (name === "thumbs up") play("ding");
  if (name === "thumbs down") play("sad");
  if (name === "fist") play("drum");
  if (name === "open hand") play("whoosh");
}
`,

  'wave-answer': `// A wave is a gesture over TIME, so we remember things between frames.
// Variables outside detect() keep their values from one frame to the next.
let lastX = null;
let lastDirection = 0;
let swings = 0;
let lastSwing = 0;

function detect(hand) {
  const x = hand.points[0].x;                 // the wrist
  const now = performance.now();

  if (lastX !== null) {
    const move = x - lastX;
    if (Math.abs(move) > 0.01) {               // ignore tiny jitter
      const direction = move > 0 ? 1 : -1;
      if (direction !== lastDirection) {       // changed direction: one swing
        swings++;
        lastSwing = now;
        lastDirection = direction;
      }
    }
  }
  lastX = x;

  if (now - lastSwing > 600) swings = 0;      // stopped moving: start over
  if (swings >= 4) return "wave";
  return "";
}

function onGesture(name) {
  if (name === "wave") say("hi there!");
}
`,

  /* ---------------- Bonus: paint with your hand (GLSL) ---------------- */

  'hand-glow': `// Your index fingertip as a glowing light.
// iHand[i].xy is landmark i, in pixels, with y pointing UP (like fragCoord).
// iHandFound is 1.0 while a hand is visible and fades to 0.0 without one.

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 tip = iHand[8].xy;                 // 8 = index fingertip
    float d = length(fragCoord - tip);      // pixels from this pixel to the tip

    float glow = 12.0 / max(d, 1.0);        // bright near the tip, fades with distance
                                            // (max stops a divide by zero right on the tip)
    vec3 color = vec3(0.37, 0.72, 0.91) * glow * iHandFound;

    vec3 background = vec3(0.04, 0.10, 0.17);
    fragColor = vec4(background + color, 1.0);
}
`,

  'hand-glow-answer': `// All four tries in one shader.

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec3 col = vec3(0.04, 0.10, 0.17);
    float scale = iHandSize / 100.0;        // Try 4: a closer hand is bigger, so glow bigger

    // Try 3: is the thumb touching the index finger? Compare to the hand's size.
    float pinch = length(iHand[4].xy - iHand[8].xy) / max(iHandSize, 1.0);
    vec3 tint = pinch < 0.35 ? vec3(0.96, 0.62, 0.17)    // orange while pinching
                             : vec3(0.37, 0.72, 0.91);   // blue otherwise

    // Try 1 and 2: a light on every fingertip that is up.
    for (int f = 0; f < 5; f++) {
        vec2 tip = iHand[4 + f * 4].xy;     // tips are 4, 8, 12, 16, 20
        float d = length(fragCoord - tip);
        col += tint * (12.0 * scale / max(d, 1.0)) * iFingers[f] * iHandFound;
    }

    fragColor = vec4(col, 1.0);
}
`,

  'hand-neon': `// Neon hand: every bone drawn as a glowing line,
// rings that spin faster with more fingers up, and a spark when you pinch.

const ivec2 BONES[21] = ivec2[21](
    ivec2(0, 1), ivec2(1, 2), ivec2(2, 3), ivec2(3, 4),
    ivec2(0, 5), ivec2(5, 6), ivec2(6, 7), ivec2(7, 8),
    ivec2(5, 9), ivec2(9, 10), ivec2(10, 11), ivec2(11, 12),
    ivec2(9, 13), ivec2(13, 14), ivec2(14, 15), ivec2(15, 16),
    ivec2(13, 17), ivec2(0, 17), ivec2(17, 18), ivec2(18, 19), ivec2(19, 20));

// Distance from point p to the line segment from a to b.
float segment(vec2 p, vec2 a, vec2 b)
{
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.001), 0.0, 1.0);
    return length(pa - ba * h);
}

// Same colors as the landmark map: thumb orange, index blue, and so on.
vec3 fingerColor(int i)
{
    if (i <= 4)  return vec3(0.96, 0.62, 0.17);
    if (i <= 8)  return vec3(0.37, 0.72, 0.91);
    if (i <= 12) return vec3(0.48, 0.88, 0.69);
    if (i <= 16) return vec3(0.77, 0.65, 1.00);
    return vec3(1.00, 0.56, 0.64);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    float scale = max(iHandSize, 1.0) / 100.0;
    float up = iFingers[0] + iFingers[1] + iFingers[2] + iFingers[3] + iFingers[4];

    // Background rings spreading from the palm.
    float r = length(fragCoord - iHand[9].xy) / iResolution.y;
    float rings = 0.5 + 0.5 * sin(r * 40.0 - iTime * (1.0 + up));
    vec3 col = vec3(0.03, 0.07, 0.13);
    col += vec3(0.0, 0.10, 0.18) * rings * exp(-r * 3.0) * iHandFound;

    // Bones.
    for (int i = 0; i < 21; i++) {
        float d = segment(fragCoord, iHand[BONES[i].x].xy, iHand[BONES[i].y].xy);
        float g = 3.0 * scale / (d + 2.0);      // squared below, so the glow stays tight
        col += fingerColor(BONES[i].y) * g * g * iHandFound;
    }

    // Pinch: a spark between the thumb tip and index tip.
    float pinch = length(iHand[4].xy - iHand[8].xy) / max(iHandSize, 1.0);
    vec2 mid = (iHand[4].xy + iHand[8].xy) * 0.5;
    float s = 12.0 * scale / (length(fragCoord - mid) + 4.0);
    col += vec3(1.0, 0.9, 0.6) * s * s * smoothstep(0.4, 0.15, pinch) * iHandFound;

    col = 1.0 - exp(-col);    // soft tone map, so bright spots don't turn flat white
    fragColor = vec4(col, 1.0);
}
`
});
