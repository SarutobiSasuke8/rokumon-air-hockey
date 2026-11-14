import { defineConfig } from "vite";
const proxy = { '/match': { target: 'ws://127.0.0.1:8089', ws: true } };
export default defineConfig({ base: "./", server: { proxy }, preview: { proxy } });
