# 🚀 Guide de Déploiement en Production - ITStock

Ce document détaille les étapes pour déployer ITStock dans un environnement de production d'entreprise.

---

## 📋 Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Prérequis serveur](#2-prérequis-serveur)
3. [Préparation du serveur](#3-préparation-du-serveur)
4. [Déploiement du Backend](#4-déploiement-du-backend)
5. [Déploiement du Frontend](#5-déploiement-du-frontend)
6. [Configuration Nginx (Reverse Proxy)](#6-configuration-nginx-reverse-proxy)
7. [Configuration HTTPS (SSL/TLS)](#7-configuration-https-ssltls)
8. [Base de données SQLite](#8-base-de-données-sqlite)
9. [Gestion des processus (PM2)](#9-gestion-des-processus-pm2)
10. [Sauvegarde et restauration](#10-sauvegarde-et-restauration)
11. [Monitoring et logs](#11-monitoring-et-logs)
12. [Mise à jour de l'application](#12-mise-à-jour-de-lapplication)
13. [Sécurité](#13-sécurité)
14. [Dépannage](#14-dépannage)

---

## 1. Vue d'ensemble

### Architecture de production recommandée

```
                                    ┌─────────────────────────────────┐
                                    │        SERVEUR PRODUCTION       │
                                    │         (Windows/Linux)         │
┌──────────┐                        │  ┌─────────────────────────┐    │
│  Client  │ ──── HTTPS (443) ────► │  │      Nginx / IIS        │    │
│ (Browser)│                        │  │   (Reverse Proxy)       │    │
└──────────┘                        │  └───────────┬─────────────┘    │
                                    │              │                  │
                                    │    ┌─────────▼─────────┐        │
                                    │    │   Express API     │        │
                                    │    │   (Port 3000)     │        │
                                    │    └─────────┬─────────┘        │
                                    │              │                  │
                                    │    ┌─────────▼─────────┐        │
                                    │    │   SQLite DB       │        │
                                    │    │  inventory.db     │        │
                                    │    └───────────────────┘        │
                                    └─────────────────────────────────┘
```

### Ports utilisés

| Service | Port | Usage |
|---------|------|-------|
| Nginx/IIS | 80, 443 | Accès public (HTTP/HTTPS) |
| Express API | 3000 | Backend (interne uniquement) |

---

## 2. Prérequis serveur

### Configuration minimale

| Ressource | Minimum | Recommandé |
|-----------|---------|------------|
| CPU | 2 cœurs | 4 cœurs |
| RAM | 2 Go | 4 Go |
| Stockage | 10 Go | 50 Go (pour les logs et sauvegardes) |
| OS | Windows Server 2019+ / Ubuntu 20.04+ | Ubuntu 22.04 LTS |

### Logiciels requis

- **Node.js** >= 18.x LTS
- **npm** >= 9.x
- **PM2** (gestionnaire de processus Node.js)
- **Nginx** ou **IIS** (reverse proxy)
- **Git** (pour le déploiement)

---

## 3. Préparation du serveur

### 🐧 Linux (Ubuntu/Debian)

```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation de Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Vérification
node -v   # v18.x.x
npm -v    # 9.x.x

# Installation de PM2 (gestionnaire de processus)
sudo npm install -g pm2

# Installation de Nginx
sudo apt install -y nginx

# Installation de Git
sudo apt install -y git
```

### 🪟 Windows Server

```powershell
# Installation via winget (Windows Package Manager)
winget install OpenJS.NodeJS.LTS
winget install Git.Git

# Ou téléchargez depuis:
# - Node.js: https://nodejs.org/
# - Git: https://git-scm.com/

# Installation PM2
npm install -g pm2
npm install -g pm2-windows-startup

# Configuration pour démarrage automatique
pm2-startup install
```

---

## 4. Déploiement du Backend

### 4.1 Cloner le projet

```bash
# Créer le dossier d'application
sudo mkdir -p /var/www/itstock
cd /var/www/itstock

# Cloner le repository
git clone <repository-url> .

# Ou copier les fichiers manuellement via SFTP/SCP
```

### 4.2 Installer les dépendances

```bash
cd /var/www/itstock

# Installer les dépendances
npm install
npm run install-all
```

### 4.3 Configuration du serveur

Créez le fichier de configuration `/var/www/itstock/server/.env` :

```env
# Configuration Production
PORT=3000
NODE_ENV=production

# IMPORTANT: Changez cette clé secrète !
# Générez une clé: openssl rand -hex 64
JWT_SECRET=VOTRE_CLE_SECRETE_TRES_LONGUE_ET_COMPLEXE_A_CHANGER_ABSOLUMENT

# Durée de validité des tokens (en secondes)
JWT_EXPIRATION=86400
```

### 4.4 Modifier le serveur pour utiliser les variables d'environnement

Dans `/var/www/itstock/server/index.js`, modifiez les premières lignes :

```javascript
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION';
```

### 4.5 Tester le serveur

```bash
cd /var/www/itstock/server
node index.js

# Vous devriez voir:
# Database initialized
# Server running on port 3000
```

---

## 5. Déploiement du Frontend

### 5.1 Build de production

```bash
cd /var/www/itstock/client

# Créer le build de production
npm run build
```

Cela génère un dossier `dist/` contenant les fichiers statiques optimisés.

### 5.2 Configuration pour la production

Avant le build, créez `/var/www/itstock/client/.env.production` :

```env
VITE_API_URL=/api
```

Et modifiez `vite.config.js` pour la production :

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false, // Désactiver les sourcemaps en prod
  },
  // Le proxy n'est utilisé qu'en développement
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      }
    }
  }
})
```

---

## 6. Configuration Nginx (Reverse Proxy)

### 6.1 Configuration Linux

Créez `/etc/nginx/sites-available/itstock` :

```nginx
server {
    listen 80;
    server_name itstock.votre-entreprise.com;

    # Redirection HTTP vers HTTPS (décommenter après configuration SSL)
    # return 301 https://$server_name$request_uri;

    # Racine des fichiers statiques (build React)
    root /var/www/itstock/client/dist;
    index index.html;

    # Servir les fichiers statiques
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy vers l'API backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Sécurité: désactiver l'affichage de la version Nginx
    server_tokens off;

    # Logs
    access_log /var/log/nginx/itstock_access.log;
    error_log /var/log/nginx/itstock_error.log;
}
```

### 6.2 Activer le site

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/itstock /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

### 6.3 Configuration Windows (IIS)

1. Installez le module **URL Rewrite** et **Application Request Routing (ARR)**
2. Créez un nouveau site web pointant vers `C:\itstock\client\dist`
3. Ajoutez une règle de réécriture pour l'API :

```xml
<!-- web.config dans client/dist -->
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- Proxy API -->
                <rule name="API Proxy" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://127.0.0.1:3000/api/{R:1}" />
                </rule>
                <!-- SPA Fallback -->
                <rule name="SPA Routes" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

---

## 7. Configuration HTTPS (SSL/TLS)

### 7.1 Let's Encrypt (Linux - Gratuit)

```bash
# Installation Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir un certificat (remplacez par votre domaine)
sudo certbot --nginx -d itstock.votre-entreprise.com

# Renouvellement automatique (déjà configuré par défaut)
sudo systemctl enable certbot.timer
```

### 7.2 Certificat d'entreprise

Si vous utilisez un certificat interne :

```nginx
server {
    listen 443 ssl http2;
    server_name itstock.votre-entreprise.com;

    ssl_certificate /etc/ssl/certs/itstock.crt;
    ssl_certificate_key /etc/ssl/private/itstock.key;

    # Configuration SSL sécurisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    # ... reste de la configuration
}
```

---

## 8. Base de données SQLite

### 8.1 Emplacement

La base de données est stockée dans :
```
/var/www/itstock/server/inventory.db
```

### 8.2 Permissions (Linux)

```bash
# Créer un utilisateur dédié (optionnel mais recommandé)
sudo useradd -r -s /bin/false itstock

# Définir les permissions
sudo chown -R itstock:itstock /var/www/itstock
sudo chmod 750 /var/www/itstock/server
sudo chmod 640 /var/www/itstock/server/inventory.db
```

### 8.3 Sauvegarde manuelle

```bash
# Sauvegarde simple (copie du fichier)
cp /var/www/itstock/server/inventory.db /backup/inventory_$(date +%Y%m%d_%H%M%S).db
```

### 8.4 Migration vers une autre DB (optionnel)

Pour les besoins de scalabilité, vous pouvez migrer vers PostgreSQL ou MySQL. Cela nécessite une modification du code `database.js`.

---

## 9. Gestion des processus (PM2)

### 9.1 Configuration PM2

Créez `/var/www/itstock/ecosystem.config.js` :

```javascript
module.exports = {
  apps: [{
    name: 'itstock-api',
    script: './server/index.js',
    cwd: '/var/www/itstock',
    instances: 1,       // SQLite ne supporte pas le multi-instance
    exec_mode: 'fork',
    watch: false,
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/itstock/error.log',
    out_file: '/var/log/itstock/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '500M',
  }]
};
```

### 9.2 Démarrer l'application

```bash
# Créer le dossier de logs
sudo mkdir -p /var/log/itstock
sudo chown itstock:itstock /var/log/itstock

# Démarrer avec PM2
cd /var/www/itstock
pm2 start ecosystem.config.js --env production

# Sauvegarder la configuration pour redémarrage auto
pm2 save
pm2 startup
```

### 9.3 Commandes utiles PM2

```bash
pm2 status           # Voir l'état des applications
pm2 logs itstock-api # Voir les logs en temps réel
pm2 restart itstock-api   # Redémarrer
pm2 stop itstock-api      # Arrêter
pm2 monit            # Monitoring interactif
```

---

## 10. Sauvegarde et restauration

### 10.1 Script de sauvegarde automatique

Créez `/var/www/itstock/scripts/backup.sh` :

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/backup/itstock"
DB_PATH="/var/www/itstock/server/inventory.db"
RETENTION_DAYS=30

# Créer le dossier de backup
mkdir -p $BACKUP_DIR

# Date du backup
DATE=$(date +%Y%m%d_%H%M%S)

# Backup de la base de données
sqlite3 $DB_PATH ".backup $BACKUP_DIR/inventory_$DATE.db"

# Compression
gzip $BACKUP_DIR/inventory_$DATE.db

# Suppression des vieux backups
find $BACKUP_DIR -name "*.db.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: inventory_$DATE.db.gz"
```

### 10.2 Planification (Cron)

```bash
# Éditer le crontab
crontab -e

# Ajouter (backup quotidien à 2h du matin)
0 2 * * * /var/www/itstock/scripts/backup.sh >> /var/log/itstock/backup.log 2>&1
```

### 10.3 Restauration

```bash
# Arrêter l'application
pm2 stop itstock-api

# Décompresser le backup
gunzip /backup/itstock/inventory_20241216_020000.db.gz

# Remplacer la base actuelle
cp /backup/itstock/inventory_20241216_020000.db /var/www/itstock/server/inventory.db

# Redémarrer
pm2 start itstock-api
```

---

## 11. Monitoring et logs

### 11.1 Logs disponibles

| Log | Emplacement | Contenu |
|-----|-------------|---------|
| Application | `/var/log/itstock/out.log` | Logs de l'API |
| Erreurs | `/var/log/itstock/error.log` | Erreurs Node.js |
| Nginx accès | `/var/log/nginx/itstock_access.log` | Requêtes HTTP |
| Nginx erreurs | `/var/log/nginx/itstock_error.log` | Erreurs Nginx |
| Audit | Base de données (`audit_logs`) | Actions utilisateurs |

### 11.2 Rotation des logs

```bash
# Créer /etc/logrotate.d/itstock
sudo nano /etc/logrotate.d/itstock
```

```
/var/log/itstock/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 itstock itstock
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 11.3 Alertes (optionnel)

Intégrez avec des outils comme :
- **UptimeRobot** (monitoring externe)
- **Grafana + Prometheus** (métriques)
- **Sentry** (erreurs applicatives)

---

## 12. Mise à jour de l'application

### 12.1 Procédure standard

```bash
cd /var/www/itstock

# 1. Sauvegarder la base de données
./scripts/backup.sh

# 2. Récupérer les mises à jour
git pull origin main

# 3. Installer les nouvelles dépendances
npm run install-all

# 4. Rebuild le frontend
cd client && npm run build && cd ..

# 5. Redémarrer l'API
pm2 restart itstock-api

# 6. Vérifier que tout fonctionne
pm2 logs itstock-api
```

### 12.2 Rollback en cas de problème

```bash
# Restaurer la version précédente
git checkout HEAD~1

# Restaurer la base de données
./scripts/restore.sh /backup/itstock/inventory_YYYYMMDD.db.gz

# Redéployer
npm run install-all
cd client && npm run build && cd ..
pm2 restart itstock-api
```

---

## 13. Sécurité

### 13.1 Checklist de sécurité

- [ ] **JWT_SECRET** : Changé avec une clé forte (64+ caractères)
- [ ] **Mots de passe par défaut** : Changés (`admin`, `Hotline6`)
- [ ] **HTTPS** : Activé avec certificat valide
- [ ] **Firewall** : Port 3000 fermé de l'extérieur (uniquement 80/443)
- [ ] **Mises à jour** : Node.js et dépendances à jour
- [ ] **Sauvegardes** : Automatisées et testées
- [ ] **Logs d'audit** : Activés et surveillés

### 13.2 Configuration Firewall (Linux)

```bash
# UFW (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 13.3 Changer le mot de passe admin

```bash
cd /var/www/itstock/server

# Créer un script de changement de mot de passe
node -e "
const bcrypt = require('bcrypt');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

(async () => {
  const db = await sqlite.open({ filename: './inventory.db', driver: sqlite3.Database });
  const newPassword = 'VotreNouveauMotDePasse';
  const hash = await bcrypt.hash(newPassword, 10);
  await db.run('UPDATE users SET password = ? WHERE username = ?', [hash, 'admin']);
  console.log('Password updated for admin');
})();
"
```

---

## 14. Dépannage

### Problèmes courants

#### L'API ne démarre pas

```bash
# Vérifier les logs
pm2 logs itstock-api --lines 50

# Vérifier les permissions de la DB
ls -la /var/www/itstock/server/inventory.db
```

#### Erreur 502 Bad Gateway

```bash
# Vérifier que l'API tourne
pm2 status

# Vérifier la connexion Nginx <-> API
curl http://127.0.0.1:3000/api/products
```

#### Base de données corrompue

```bash
# Vérifier l'intégrité
sqlite3 /var/www/itstock/server/inventory.db "PRAGMA integrity_check;"

# Si corrompu, restaurer depuis backup
./scripts/restore.sh /backup/itstock/DERNIER_BACKUP.db.gz
```

#### Performances lentes

```bash
# Vérifier l'utilisation mémoire
pm2 monit

# Optimiser SQLite
sqlite3 /var/www/itstock/server/inventory.db "VACUUM;"
sqlite3 /var/www/itstock/server/inventory.db "ANALYZE;"
```

---

## 📞 Support

En cas de problème :

1. Consultez les logs (`pm2 logs`, `/var/log/nginx/`)
2. Vérifiez la documentation
3. Contactez l'équipe de développement

---

<div align="center">

**ITStock Deployment Guide** - v1.0

</div>
