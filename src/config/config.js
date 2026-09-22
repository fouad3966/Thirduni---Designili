const backendUrl = import.meta.env.VITE_API_URL?.trim();

const config = {
    development: {
      backendUrl: backendUrl || "http://localhost:8080/api/v1/dalle",
    },
    production: {
      backendUrl: backendUrl || "/api/v1/dalle",
    },
  };
  
  export default config;
