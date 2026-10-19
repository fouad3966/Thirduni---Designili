const backendUrl = import.meta.env.VITE_API_URL?.trim();
// The game (game/atelier-city) opened by the home page's Marketplace button.
// Set VITE_GAME_URL once the game is hosted; without it the live site shows no
// button rather than linking to someone's own computer.
const gameUrl = import.meta.env.VITE_GAME_URL?.trim();

// The darja "understand" endpoint lives next to the generation endpoint:
// .../api/v1/dalle  ->  .../api/v1/nlp/understand
const nlpUrlFor = (url) => url.replace(/\/dalle\/?$/, '/nlp/understand');

const developmentUrl = backendUrl || "http://localhost:8080/api/v1/dalle";
const productionUrl = backendUrl || "/api/v1/dalle";

const config = {
  development: {
    backendUrl: developmentUrl,
    nlpUrl: nlpUrlFor(developmentUrl),
    gameUrl: gameUrl || "http://localhost:8792/street.html",
  },
  production: {
    backendUrl: productionUrl,
    nlpUrl: nlpUrlFor(productionUrl),
    gameUrl: gameUrl || "",
  },
};

export default config;
