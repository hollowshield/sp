# ACM Workshops

Every ACM workshop as a lesson students can do on their own time, with notes, live code and activities. Shader workshops run right in the browser with a built-in, Shadertoy-compatible editor.

It's a plain static site: HTML, CSS and JavaScript, with no build step, no backend and no accounts.

## Put it online with GitHub Pages

1. Create a new public repository on GitHub (for example `acm-workshops`) and push this folder to it.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**, pick `main` and `/ (root)`, and save.
4. After a minute the site is live at `https://<your-username>.github.io/acm-workshops/`.
5. Search the project for `[GitHub repo URL]` and replace it with your repo's URL, and fill in the other `[bracketed]` placeholders.

The empty `.nojekyll` file tells GitHub Pages to serve the folders exactly as they are (including `_template`). Keep it.

## Run it on your computer

Open a terminal in this folder and run:

```
python3 -m http.server 8000
```

Then visit `http://localhost:8000`. (Opening `index.html` by double-clicking also mostly works, but a local server matches GitHub Pages exactly.)

## What's where

```
index.html                     Home page: hero shader + list of workshops
playground/index.html          Full-page shader editor with share links
assets/css/site.css            All styles (light and dark mode)
assets/js/shader.js            The renderer: runs Shadertoy-style shaders with one WebGL2 context
assets/js/components.js        Turns markup into editors, comparisons, answers and the page contents list
assets/js/workshops.js         The list of workshops shown on the home page
assets/img/                    ACM logo (site icon, and the image the donut demo spins)
workshops/graphics-donut-window/   "How to donut": lesson, donut.js (live demos), sources.js (full C++)
workshops/sp-3-shaders/        "Shaders? Never heard of them": lesson and shaders.js
workshops/connect-4-ai/        "Impossible Connect 4": lesson, connect4.js (playable board + AI), sources.js
workshops/sp-4-hand-tracking/   "Make a computer see your hand": lesson, hands.js (webcam + gesture editor), code.js (starters and answers)
workshops/_template/           Copy this to start a new workshop
```

## Add a workshop

1. Copy `workshops/_template/` to `workshops/<new-name>/`.
2. Fill in the page. The comment at the top of the template lists every building block.
3. Add an entry to `assets/js/workshops.js` (title, link, summary, tags and `status: 'ready'` or `'outline'`).
4. Commit and push. GitHub Pages updates on its own.

## Building blocks

All of these are plain HTML; `components.js` makes them interactive.

| Markup | What it does |
| --- | --- |
| `<div class="activity">` | An orange "your turn" block. Orange always means students build something. |
| `<ul class="challenges"><li><b>Title</b>Text</li></ul>` | Challenge cards inside an activity. |
| `<details class="answer"><summary>Show answers</summary><div class="answer-body">…</div></details>` | Answers stay collapsed until a student opens them. |
| `<pre class="code"><code>…</code></pre>` | Read-only code with comments and numbers highlighted. |
| `<div class="lab" id="lab-x" data-src="name"></div>` | Editor and live preview. `data-src` is a key in the page's `shaders.js`. Optional: `data-title`, `data-height`. |
| `<button class="btn" data-load="name" data-into="lab-x">` | Loads another shader (an answer, say) into a lab. |
| `<pre class="code" data-src="name"></pre>` | Shows a shader from `shaders.js` as read-only code. |
| `<div class="compare" data-src="name"></div>` | Side-by-side "Bland" and "Unique" previews of a shader that has `#define BLAND 0`. |
| `<div class="demo" data-src="name"></div>` | One live preview with no editor. |

Every `<h2 id="…">` inside `<main>` appears in the "On this page" list automatically. Use `data-toc="Short name"` on an `h2` to shorten its entry.

## Writing shaders for the site

Shaders use the Shadertoy format, so code moves freely between this site and shadertoy.com:

```glsl
void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = fragCoord / iResolution.xy;
    fragColor = vec4(uv, 0.5, 1.0);
}
```

Available inputs: `iResolution`, `iTime`, `iTimeDelta`, `iFrame`, `iMouse`, `iDate`. Textures, buffers and sound aren't supported.

Put a workshop's shaders in a `shaders.js` file next to its page, as template-string entries in `window.SHADERS` (see `workshops/sp-3-shaders/shaders.js`). Avoid backticks and `${` inside shader code.

## Updating the C++ shown on a lesson

The donut and Connect 4 pages show the full workshop code in "Show the full…" panels. That code lives in each folder's `sources.js`, copied from the GitHub repos. If you change the C++ in a repo, paste the new version into `sources.js` too (it's a JSON string, so keep the quotes and escapes valid), or regenerate it with a small script.

## Notes

- The Connect 4 AI that runs on the website is a simplified teaching version (a few moves of look-ahead plus a guess). The real perfect solver is the C++ in the ImpossibleConnect4 repo.

- Shaders need WebGL2, which every current desktop and mobile browser supports. If it's missing, the page explains that instead of showing a broken preview.
- Previews pause when they scroll off screen, and start paused for anyone who has "reduce motion" turned on.
- The playground saves a student's draft in their own browser. Share links carry the code inside the URL, so nothing is stored on a server.
