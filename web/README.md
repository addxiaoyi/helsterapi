# Helstare OS Web

This directory contains the React frontend for the Go gateway.

## Run Locally

**Prerequisites:** Node.js and a running Go backend.


1. Install dependencies: `npm install`
2. For local development, optionally set `VITE_BACKEND_URL` to the Go backend origin. It defaults to `http://127.0.0.1:3000` for the Vite proxy.
3. Run the frontend: `npm run dev`
4. For a separately hosted frontend, set `VITE_API_BASE_URL` to the public API base, such as `https://api.example.com/api`. Leave it empty when the frontend is served behind the same-origin `/api` reverse proxy.
5. Build for deployment: `npm run build`
