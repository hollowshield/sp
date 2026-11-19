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
`
});
