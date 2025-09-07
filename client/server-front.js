import express from 'express'
import https from 'https'
import fs from 'fs'
import path from 'path'

const app = express()
const __dirname = path.resolve()

// Ruta al build del frontend
const distPath = path.join(__dirname, 'client', 'dist')

// Ruta de los certificados SSL
const certPath = path.join(__dirname, 'client')

app.use(express.static(distPath))

app.get('*', (_, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

const server = https.createServer(
  {
    key: fs.readFileSync(path.join(certPath, 'localhost+2-key.pem')),
    cert: fs.readFileSync(path.join(certPath, 'localhost+2.pem')),
  },
  app
)

const PORT = 5173
server.listen(PORT, () => {
  console.log(`✅ Frontend disponible en https://localhost:${PORT}`)
})

client/server-front.js
/home/luami/electrocaja/client/server-front.js