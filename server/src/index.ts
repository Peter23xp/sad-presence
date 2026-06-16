import express from 'express'
import cors from 'cors'
import os from 'os'
import path from 'path'
import fs from 'fs'
import './db/database'

import employesRoutes from './routes/employes'
import presencesRoutes from './routes/presences'
import parametresRoutes from './routes/parametres'
import dbRoutes from './routes/db'
import authRoutes from './routes/auth'
import { requireAuth } from './middleware/authMiddleware'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

// Middleware de logging
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(`[${req.method}] ${req.originalUrl} - ${res.statusCode} - ${duration}ms`)
  })
  next()
})

// Middleware de validation des entrées simple
const validateInput = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const str = JSON.stringify({ ...req.body, ...req.query })
  if (/<script|DELETE FROM|DROP TABLE/i.test(str)) {
    return res.status(400).json({ error: 'Caractères non autorisés détectés dans la requête.' })
  }
  next()
}
app.use(validateInput)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'SAD-International Presence API' })
})

app.get('/api/network-info', (_req, res) => {
  const interfaces = os.networkInterfaces()
  let localIp = '127.0.0.1'
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        localIp = iface.address
        break
      }
    }
    if (localIp !== '127.0.0.1') break
  }
  res.json({ ip: localIp })
})

app.use('/api/auth', authRoutes)
app.use('/api/employes', requireAuth, employesRoutes)
app.use('/api/presences', (req, res, next) => {
  if (req.path === '/scan' && req.method === 'POST') return next(); // public
  requireAuth(req, res, next);
}, presencesRoutes)
app.use('/api/parametres', requireAuth, parametresRoutes)
app.use('/api/db', requireAuth, dbRoutes)

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err)
  const status = err.status || 500
  res.status(status).json({
    error: err.message || 'Erreur interne du serveur',
    code: status
  })
})

// En production Electron : servir le frontend React compilé
// CLIENT_DIST_PATH est défini par electron/main.js
const clientDist = process.env.CLIENT_DIST_PATH
if (clientDist && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  // Toutes les routes non-API → index.html (React Router)
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

async function start() {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

start()
