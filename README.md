# CardSim - Trading Card Simulator

A web-based trading card collector simulator with custom card creation, pack opening, and collection management.

## 🚀 Features
- **Pack Opening**: Animations, sounds, and probability-based card drops.
- **Card Builder**: Create custom cards with images, names, and rarities.
- **Expansion Management**: Create custom sets and organize your cards.
- **Collection Binder**: Track your progress and view your collected cards.
- **Alchemy System**: Upgrade lower tier cards.

## 🛠 Deployment & "Burn-in" Guide

To deploy this app to Vercel with your custom cards pre-loaded (burned in):

### 1. Burn-in Custom Cards
The app saves your data to the browser's `localStorage` by default. To make this data permanent for all users on the web:
1.  Open the **Admin Panel** (Password: `1234qwer`).
2.  Click the **Download Source** button (Green button with download icon).
3.  A file named `sets.js` will download.
4.  Replace the file in your project folder at:
    `src/data/sets.js`
    with this new downloaded file.

### 2. Deploy to Vercel
1.  Push your code (with the new `sets.js`) to GitHub.
2.  Import the project in Vercel.
3.  Deploy! The app will now start with your custom cards by default.

## 💻 Development
- Run dev server: `npm run dev`
- Build for production: `npm run build`
