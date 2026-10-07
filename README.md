# Habit Bloom

Habit Bloom is a daily habit tracker made with HTML, CSS, and JavaScript. You can add habits, set checkpoints, mark progress, view the last seven days, and see streaks. It also has dark mode and JSON backup export/import.

## Files

- `index.html` - the website page
- `styles.css` - colors and layout
- `app.js` - habit tracking and saved data
- `favicon.svg` - the small browser tab icon
- `README.md` - these instructions

All five files are already unzipped and are in this folder. Keep them together. You can double-click `index.html` to open the website on your computer. No installation or build command is needed.

The site saves habits in this browser using local storage. Data does not automatically appear on another device or at another website address. Use **Export data** and **Import data** to move a backup. This version can also read older Habit Bloom and Daymark data.

Daily targets now keep their own history, so changing a target today does not rewrite the last seven days. Older saved data did not include a habit creation date; when upgrading, the app keeps at least the visible last seven days in the history. The original creation date of those older habits cannot be recovered.

## Update the existing GitHub website

Your repository is [AayushTHEDEVELOPER/Habit-Bloom](https://github.com/AayushTHEDEVELOPER/Habit-Bloom).

1. Sign in to GitHub and open the repository.
2. Click **Add file > Upload files**.
3. Select `app.js`, `styles.css`, and `README.md` from this folder. Upload these three files to the top level of the repository, alongside `index.html`.
4. Enter a commit message such as `Fix habit tracker data and navigation` and commit the files to the main branch.
5. Open the **Actions** tab and wait for the Pages deployment to finish. Then refresh [the live site](https://aayushthedeveloper.github.io/Habit-Bloom/) with Ctrl+F5.

GitHub Pages is already configured for this repository. The repository URL is the source-code link for your submission, and the live site URL above is the deployed link.

GitHub help: [upload files](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository) and [configure Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
