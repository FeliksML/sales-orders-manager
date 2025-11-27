import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { writeFileSync } from 'fs'
import { resolve } from 'path'

// Plugin to generate version.json with build timestamp
function versionPlugin() {
  return {
    name: 'version-plugin',
    writeBundle(options) {
      const version = Date.now().toString()
      const versionFile = resolve(options.dir, 'version.json')
      writeFileSync(versionFile, JSON.stringify({ version }))
      console.log(`✅ Generated version.json with version: ${version}`)
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    'process.env': {}
  },
  plugins: [
    react(),
    tailwindcss(),
    versionPlugin(),
  ],
})
