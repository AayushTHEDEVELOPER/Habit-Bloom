# Habit Bloom — Daily Habit Tracker

A responsive habit tracker built with plain HTML, CSS, and JavaScript. No framework, account, database, or build step is required.

## Features

- Create, edit, and delete daily habits.
- Set 1–12 checkpoints per habit and mark progress with the checkpoint bars or `+` and `−` buttons.
- Review and update the last seven days.
- See daily totals, completed habits, and individual completion streaks.
- Switch between light and dark themes.
- Keep data in your browser with `localStorage`; export and import JSON backups.

## Run locally

Open `index.html` in a modern browser. All four website files (`index.html`, `styles.css`, `app.js`, `favicon.svg`) should stay together in the same folder. The optional web font needs an internet connection; system fonts are used if it is unavailable.

Your habits are stored in the browser on the current device and site address. They do not sync across browsers or devices. Use **Export data** to save a backup, then **Import data** to restore it. Older Daymark backups also import. Switching from a local file to a deployed URL starts with separate browser storage; import your backup at the new URL if you want to carry over your progress.

## Publish the source on GitHub

1. Sign in to GitHub and open the existing [Habit-Bloom repository](https://github.com/AayushTHEDEVELOPER/Habit-Bloom).
2. Choose **uploading an existing file** on the empty repository page (or **Add file → Upload files** after the first upload). Upload the **contents** of this folder: `index.html`, `styles.css`, `app.js`, `favicon.svg`, and `README.md`. Keep `index.html` at the repository root. Commit the files.
3. The **source code link** for the form is `https://github.com/AayushTHEDEVELOPER/Habit-Bloom`.

GitHub's guide: [upload files](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).

## Deploy with GitHub Pages

1. In your GitHub repository, open **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select your main branch and `/(root)`, then click **Save**.
4. Wait for the published URL to appear on the Pages settings screen. It will likely be `https://aayushthedeveloper.github.io/Habit-Bloom/`; use the exact URL shown by GitHub.
5. Open the URL and check that you can add a habit and mark a checkpoint. Copy this as the **deployed/live site link** for the form.

GitHub's guide: [configure a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Alternative: deploy with Netlify

Go to [Netlify Drop](https://app.netlify.com/drop), then drag this **folder** (or a ZIP of its files) into the drop zone. Netlify will provide a live URL. If you want automatic updates whenever you change your GitHub repository, use **Add new project → Import an existing project** in Netlify and select your repository. No build command is needed; use the repository root as the publish directory.

Netlify's guides: [Drop quickstart](https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/) · [deploy from a repository](https://docs.netlify.com/start/quickstarts/deploy-from-repository/).

## Submission checklist

- The GitHub repository contains the source files at its root.
- The deployed site loads correctly on desktop and mobile.
- The GitHub repository URL and live site URL are both copied into the submission form.
