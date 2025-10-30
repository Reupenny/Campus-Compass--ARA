import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    root: './admin',
    server: {
        proxy: {
            '/save-contacts': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
            '/knowledge/contacts.json': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            }
        }
    }
})
