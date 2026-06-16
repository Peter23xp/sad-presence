# SAD-International - Gestion de Présence

Application web de gestion de présence pour SAD-International (ONG basée en RDC).

## Stack technique

- **Frontend** : React 18 + TypeScript + Vite + TailwindCSS
- **Backend** : Express.js + better-sqlite3 (SQLite)
- **Architecture** : Monorepo avec npm workspaces

## Prérequis

- Node.js >= 18
- npm >= 9

## Installation

```bash
cd sad-presence
npm install
```

## Démarrage (développement)

Lance le client (port 5173) et le serveur (port 3001) en parallèle :

```bash
npm run dev
```

Ou séparément :

```bash
# Client uniquement
npm run dev -w client

# Serveur uniquement
npm run dev -w server
```

## Build (production)

```bash
npm run build
```

## Structure du projet

```
sad-presence/
├── client/          # Frontend React + Vite
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── main.tsx
│   └── ...
├── server/          # Backend Express + SQLite
│   ├── src/
│   │   ├── routes/
│   │   ├── db/
│   │   └── index.ts
│   └── ...
└── package.json     # Workspace root
```

## API

Le proxy Vite redirige toutes les requêtes `/api/*` vers le serveur Express (port 3001).

- `GET /api/health` — Vérifier que le serveur fonctionne
