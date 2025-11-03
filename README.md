# Poker Odds Calculator

A responsive Texas Hold'em odds calculator that estimates your winning, tying, and losing
probabilities using Monte Carlo simulation. The interface is designed for both desktop and
mobile screens with a modern, touch-friendly layout.

## Repository Contents

| File | Purpose |
| --- | --- |
| `index.html` | Main application markup with layout containers for the interactive table, card inputs, previews, and results. |
| `styles.css` | Responsive styling for desktop and mobile layouts, including the card grid and results panels. |
| `script.js` | Card selection logic, Monte Carlo odds simulation, hand evaluation, and UI updates. |

If you do not see these files on GitHub, make sure you are viewing the `work` branch or the latest commit.

## Publishing the code to GitHub

If the files are missing from your remote repository, push the current branch by
running:

```bash
git remote add origin <your-github-repo-url>  # if not already set
git push -u origin work
```

After the initial push, subsequent updates can be sent with:

```bash
git push
```

You can also merge the `work` branch into your default branch (`main` or
`master`) before pushing if you prefer to expose the calculator there:

```bash
git checkout main
git merge work
git push -u origin main
```

## Features

- 🎯 Select your two hole cards and up to five known community cards.
- 🃏 Live card previews render your chosen hole and board cards with suit-aware visuals.
- ♠️ Interactive poker table view lets you tap card slots to launch a full-deck picker.
- 🪄 Full-sized playing card artwork on the virtual table mirrors the rank and suit for instant recognition.
- 👥 Simulate games against one to five opponents.
- 🔁 Adjustable simulation runs (1,000–20,000) for balancing speed and accuracy.
- ⚡ Automatic win/tie/loss updates whenever you change cards, opponent count, or simulation runs.
- 📊 Contextual status messaging that explains each batch of simulations.
- 🧠 Real-time description of your current best made hand based on the cards you've revealed.
- 📱 Responsive design that adapts seamlessly to phones, tablets, and desktops, including a widescreen layout that surfaces controls beside live results.

## Getting Started

This project is a static web app—no build tools required. To run it locally, serve the files
with any static server. For example, using Python:

```bash
python -m http.server 8000
```

Then open [http://localhost:8000](http://localhost:8000) in your browser.

## Development Notes

- Card validation prevents selecting the same card twice across all inputs.
- Odds are approximated using Monte Carlo simulation, so rerunning with the same inputs can
  produce slightly different results.
- Increase the number of simulations for greater accuracy at the cost of longer computation
  time.
