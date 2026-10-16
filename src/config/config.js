const backendUrl = import.meta.env.VITE_API_URL?.trim();
// The game (game/atelier-city) opened by the home page's Marketplace button.
// Set VITE_GAME_URL once the game is hosted; without it the live site shows no
// button rather than linking to someone's own computer.
const gameUrl = import.meta.env.VITE_GAME_URL?.trim();

const config = {
    development: {
      backendUrl: backendUrl || "http://localhost:8080/api/v1/dalle",
      gameUrl: gameUrl || "http://localhost:8792/street.html",
    },
    production: {
      backendUrl: backendUrl || "/api/v1/dalle",
      gameUrl: gameUrl || "",
    },
  };
  
  export default config;
