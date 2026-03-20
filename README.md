# Personal Website (Static)

This website is **plain HTML/CSS/JS** (no Jekyll theme).

## Local Run (with visitor map backend)
This repo now includes a lightweight Node backend endpoint:
- `GET /api/visitor-pins`
- `POST /api/visitor-pins`

Run locally:
1. `npm start`
2. Open `http://localhost:8000`

If you deploy the Node backend to a hosting platform, set `HOST=0.0.0.0`.

Data is stored in `backend/visitor-pins.json`.

## Deploy on GitHub Pages
1. Put all files in your repository root.
2. Enable GitHub Pages: Settings → Pages → Build and deployment → Source: `Deploy from a branch`
3. Choose branch `main` (or `master`) and folder `/ (root)`.
4. Visit your GitHub Pages URL.

Note: GitHub Pages cannot run Node endpoints. On GitHub Pages, the map can still detect the current visitor IP/location in the browser, but site-wide visitor tracking remains browser-local unless you deploy the backend somewhere that can serve /api/visitor-pins.

## Update essentials
- Portrait: `assets/images/portrait.jpg`
- Avatar: `assets/images/avatar.jpg`
- CV PDF: `assets/files/CV.pdf`
- Social links: edit `index.html` and `about.html`

## Dark mode
Click the bottom-right button. Preference is saved in localStorage.
