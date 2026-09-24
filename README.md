# PictorIsle

A browser-based image editor inspired by Photoshop: layers with blend modes, brush/eraser, selections, gradients, text, shapes, free transform (resize, crop, rotate, flip), adjustments and filters, and undo history.

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the production build
```

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In the repository, open **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually from the **Actions** tab).

The site will be published at `https://<username>.github.io/<repository>/`.
