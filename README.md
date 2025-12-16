# 🖥️ ITStock - Système de Gestion d'Inventaire IT

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![SQLite](https://img.shields.io/badge/SQLite-3-blueviolet?style=for-the-badge&logo=sqlite)
![License](https://img.shields.io/badge/License-ISC-yellow?style=for-the-badge)

**Application de gestion d'inventaire IT complète avec gestion des prêts de PC, suivi des stocks et gamification.**

</div>

---

## 📋 Table des matières

- [Aperçu](#-aperçu)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Prérequis](#-prérequis)
- [Installation rapide](#-installation-rapide)
- [Structure du projet](#-structure-du-projet)
- [Technologies utilisées](#-technologies-utilisées)
- [Configuration](#-configuration)
- [Scripts disponibles](#-scripts-disponibles)
- [API Endpoints](#-api-endpoints)
- [Base de données](#-base-de-données)
- [Sécurité](#-sécurité)
- [Contribution](#-contribution)

---

## 🎯 Aperçu

**ITStock** est une application web moderne permettant de gérer l'inventaire informatique d'une entreprise. Elle offre un suivi en temps réel des stocks, une gestion complète des prêts de PC, et un système de gamification pour encourager l'engagement des utilisateurs.

### Captures d'écran

| Dashboard | Inventaire | Prêts PC |
|-----------|-----------|----------|
| Vue d'ensemble statistique | Gestion des produits | Calendrier des prêts |

---

## ✨ Fonctionnalités

### 📊 Tableau de bord
- Statistiques en temps réel (stocks bas, prêts actifs, etc.)
- Graphiques interactifs (Chart.js)
- Activité récente
- Vue personnalisable

### 📦 Gestion d'inventaire
- CRUD complet des produits
- Catégorisation (PC, Laptop, Écrans, etc.)
- Alertes de stock bas
- Importation/Exportation CSV
- Photos de produits
- QR Codes pour identification rapide

### 💻 Gestion des prêts PC
- Prêt et retour de PC
- Calendrier interactif avec vue journalière détaillée
- Réservations futures
- Historique complet par PRT
- Mode "Remastering"

### 👥 Gestion des utilisateurs
- Rôles: Admin, Hotliner, Employé
- **25 permissions granulaires** en 6 groupes :
  - 📦 **Inventaire** : voir, ajouter, éditer, supprimer, exporter
  - 👥 **Employés** : voir, ajouter, éditer, supprimer, assigner matériel
  - 💻 **Prêts PC** : voir, créer, retourner, gérer, réserver, historique
  - 🏷️ **Catégories** : voir, gérer
  - 📝 **Notes** : voir, créer, supprimer
  - 🔐 **Admin** : paramètres, utilisateurs, audit, sécurité, dashboard
- **7 rôles prédéfinis** avec permissions automatiques :
  - 👁️ Lecteur, 🎧 Hotliner, 🔧 Technicien, 📦 Gestionnaire Stock, 👑 Chef d'équipe, 🔓 Accès Complet
- Interface de sélection avec effet lumineux et barres de progression
- Authentification JWT avec expiration configurable
- Session timeout avec modal stylisé

### 🎮 Gamification (Easter Egg)
- Système XP
- Badges déblocables
- Thème Neon secret (code: 3150)
- Terminal interactif
- Mini-jeu Snake

### 🎨 Interface utilisateur
- Design moderne (Glassmorphism, Glow effects)
- Thèmes multiples (Light, Dark, Dim, Neon, Vaporwave)
- Animations fluides
- Responsive design
- Tutoriel interactif (Driver.js)

---

## 🏗️ Architecture

```
┌──────────────────┐         ┌──────────────────┐
│    CLIENT        │   API   │     SERVER       │
│  (React + Vite)  │ ◄─────► │  (Express.js)    │
│   Port: 5173     │  JSON   │   Port: 3000     │
└──────────────────┘         └────────┬─────────┘
                                      │
                             ┌────────▼─────────┐
                             │     SQLite       │
                             │  inventory.db    │
                             └──────────────────┘
```

---

## 📋 Prérequis

- **Node.js** >= 18.x
- **npm** >= 9.x
- Navigateur moderne (Chrome, Firefox, Edge)

---

## 🚀 Installation rapide

```bash
# 1. Cloner le repository
git clone <repository-url>
cd CRM

# 2. Installer les dépendances (racine + client + server)
npm install
npm run install-all

# 3. Démarrer en mode développement (client + server)
npm start
```

L'application sera accessible à :
- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:3000

### Identifiants par défaut

| Utilisateur | Mot de passe | Rôle |
|-------------|--------------|------|
| `admin`     | `admin123`   | Admin |
| `Hotline6`  | `Elouan`     | Admin |

> ⚠️ **Important** : Changez ces identifiants en production !

---

## 📁 Structure du projet

```
CRM/
├── client/                    # Application React
│   ├── public/               # Fichiers statiques
│   ├── src/
│   │   ├── components/       # Composants React
│   │   ├── context/          # Contextes React (Auth, Theme, etc.)
│   │   ├── pages/            # Pages de l'application
│   │   ├── utils/            # Utilitaires (permissions, etc.)
│   │   ├── App.jsx           # Composant principal
│   │   ├── main.jsx          # Point d'entrée
│   │   └── index.css         # Styles globaux + thèmes
│   ├── index.html
│   ├── package.json
│   └── vite.config.js        # Configuration Vite + Proxy API
│
├── server/                   # API Backend
│   ├── index.js              # Point d'entrée Express
│   ├── database.js           # Configuration SQLite + migrations
│   ├── inventory.db          # Base de données SQLite (générée)
│   └── package.json
│
├── package.json              # Scripts monorepo
└── README.md
```

---

## 🛠️ Technologies utilisées

### Frontend
| Technologie | Usage |
|-------------|-------|
| React 18 | Framework UI |
| Vite 5 | Build tool & Dev server |
| React Router 6 | Navigation SPA |
| Axios | Requêtes HTTP |
| Chart.js | Graphiques |
| Lucide React | Icônes |
| Driver.js | Tutoriel interactif |
| jsPDF | Export PDF |

### Backend
| Technologie | Usage |
|-------------|-------|
| Express.js | Framework API |
| SQLite3 | Base de données |
| JWT | Authentification |
| bcrypt | Hashage des mots de passe |
| CORS | Cross-Origin Resource Sharing |

---

## ⚙️ Configuration

### Variables d'environnement (optionnel)

Créez un fichier `.env` dans `/server` :

```env
PORT=3000
JWT_SECRET=votre_clé_secrète_très_longue_et_complexe
NODE_ENV=production
```

### Configuration Client (vite.config.js)

Le proxy API est configuré pour rediriger les appels `/api/*` vers le serveur :

```javascript
server: {
  proxy: {
    '/api': {
      target: 'http://127.0.0.1:3000',
      changeOrigin: true,
    }
  }
}
```

---

## 📜 Scripts disponibles

### Racine du projet

| Commande | Description |
|----------|-------------|
| `npm start` | Lance serveur + client simultanément |
| `npm run server` | Lance uniquement le serveur |
| `npm run client` | Lance uniquement le client |
| `npm run install-all` | Installe les dépendances client + server |

### Client (`/client`)

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production |
| `npm run preview` | Prévisualiser le build |
| `npm run lint` | Linter ESLint |

### Server (`/server`)

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur avec nodemon (hot reload) |
| `npm start` | Serveur en mode production |

---

## 🔌 API Endpoints

### Authentification
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/login` | Connexion utilisateur |
| GET | `/api/me` | Informations utilisateur actuel |

### Inventaire
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/products` | Liste des produits |
| POST | `/api/products` | Créer un produit |
| PUT | `/api/products/:id` | Modifier un produit |
| DELETE | `/api/products/:id` | Supprimer un produit |
| PUT | `/api/products/:id/quantity` | Modifier la quantité |

### Prêts PC
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/loan-pcs` | Liste des PC disponibles |
| POST | `/api/loan-pcs` | Ajouter un PC |
| POST | `/api/loan-pcs/:id/loan` | Prêter un PC |
| POST | `/api/loan-pcs/:id/return` | Retourner un PC |
| GET | `/api/loan-history` | Historique des prêts |

### Utilisateurs (Admin)
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/users` | Liste des utilisateurs |
| POST | `/api/users` | Créer un utilisateur |
| PUT | `/api/users/:id` | Modifier un utilisateur |
| DELETE | `/api/users/:id` | Supprimer un utilisateur |

---

## 🗄️ Base de données

### Schéma principal

```sql
-- Utilisateurs système
users (id, username, password, role, permissions, xp, team3150_unlocked, ...)

-- Produits inventaire
products (id, name, category_id, quantity, min_quantity, location, photo, ...)

-- Catégories
categories (id, name, icon)

-- PC de prêt
loan_pcs (id, name, serial_number, status, current_user, ...)

-- Historique des prêts
loan_history (id, pc_id, pc_name, user_name, start_date, end_date, ...)

-- Réservations
reservations (id, pc_id, user_name, start_date, end_date, ...)

-- Logs d'activité
logs (id, user_id, action, details, timestamp, ...)

-- Logs d'audit sécurisé
audit_logs (id, user_id, username, action, ip_address, timestamp, ...)
```

### Emplacement

La base de données SQLite est automatiquement créée à :
```
server/inventory.db
```

### Migrations

Les migrations sont gérées automatiquement au démarrage du serveur dans `database.js`. Les colonnes manquantes sont ajoutées sans perte de données.

---

## 🔐 Sécurité

### Fonctionnalités de sécurité

| Fonctionnalité | Description |
|----------------|-------------|
| **JWT Sécurisé** | Token avec expiration configurable (8h par défaut) |
| **Helmet** | Headers HTTP de sécurité (XSS, clickjacking, MIME sniffing) |
| **Rate Limiting** | 5 tentatives login/15min, 100 requêtes API/15min |
| **Blocage IP** | Auto-blocage après 10 tentatives, déblocage auto après 1h |
| **CORS Configuré** | Origines autorisées dans `.env` |
| **Validation Entrées** | Validation côté serveur sur login |
| **Politique MDP** | 8 caractères min, majuscule, chiffre, caractère spécial |
| **Audit Logs** | Logs de toutes les actions sensibles avec IP |

### Configuration sécurité (`.env`)

```env
# JWT
JWT_SECRET=votre_clé_secrète_très_longue_minimum_32_caractères
JWT_EXPIRES_IN=8h

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5

# CORS (origines autorisées, séparées par des virgules)
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
```

### Gestion des IPs bloquées (Admin)

Les administrateurs peuvent gérer les IPs bloquées dans **Paramètres > Sécurité** :
- Voir la liste des IPs bloquées
- Débloquer manuellement une IP
- Débloquer toutes les IPs

### API Sécurité (Admin)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/admin/blocked-ips` | Liste des IPs bloquées |
| DELETE | `/api/admin/blocked-ips/:ip` | Débloquer une IP |
| DELETE | `/api/admin/blocked-ips` | Débloquer toutes les IPs |
| POST | `/api/validate-password` | Valider force mot de passe |

### Recommandations production

1. ✅ Configurez `JWT_SECRET` dans `.env` (minimum 32 caractères)
2. ✅ Utilisez HTTPS en production
3. ✅ Configurez un reverse proxy (Nginx/Apache)
4. ✅ Sauvegardez régulièrement `inventory.db`
5. ✅ Limitez l'accès réseau au serveur
6. ✅ Mettez à jour régulièrement les dépendances

---

## 🤝 Contribution

1. Fork le projet
2. Créez une branche feature (`git checkout -b feature/ma-fonctionnalite`)
3. Committez vos changements (`git commit -m 'Ajout de ma fonctionnalité'`)
4. Push sur la branche (`git push origin feature/ma-fonctionnalite`)
5. Ouvrez une Pull Request

---

## 📄 Licence

Ce projet est sous licence ISC.

---

<div align="center">

**ITStock** - Développé avec ❤️ pour simplifier la gestion IT

</div>
