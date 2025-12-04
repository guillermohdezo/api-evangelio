# API Evangelio del Día

API Node.js/Express que extrae las lecturas del día desde Vatican News.

## 🎯 Funcionalidades

- ✅ Extrae lecturas desde `vaticannews.va`
- ✅ Acepta fechas personalizadas en formato `YYYY-MM-DD`
- ✅ Usa la fecha actual si no se especifica
- ✅ Web scraping con Cheerio
- ✅ Manejo de errores robusto

## 📋 Requisitos

- Node.js 14.0 o superior
- npm o yarn

## 🚀 Instalación y Uso

### Local

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Iniciar el servidor:**
   ```bash
   npm start
   ```
   O en modo desarrollo con hot-reload:
   ```bash
   npm run dev
   ```

3. **El servidor escuchará en:** `http://localhost:3000`

### Producción (Render)

**⚠️ IMPORTANTE:** Render no permite instalar Chrome automáticamente (límite de espacio). Tienes varias opciones:

#### Opción 1: Browserless (Recomendado)

1. **Obtener token de Browserless:**
   - Ve a https://www.browserless.io/
   - Regístrate (gratis)
   - Obtén tu API token

2. **En Render:**
   - **Settings → Environment Variables**
   - Agrega: `BROWSERLESS_TOKEN` = tu token
   - **Save** → **Trigger Deploy**

#### Opción 2: Usar otra alternativa (si Browserless no funciona)

Puedes usar otros servicios como:
- **BrowserStack** (https://www.browserstack.com/) - Versión gratuita disponible
- **Headless Chrome API** (https://chromeheadless.io/) 
- **Apify** (https://apify.com/) - Tiene plan gratuito

O simplemente deployer en un servidor con Chrome preinstalado como:
- **Railway** (mejor soporte para Chrome)
- **DigitalOcean App Platform**
- **Azure Container Instances**

## 📡 Endpoints

### GET `/api/lecturas`

Obtiene las lecturas del día.

**Parámetros:**
- `fecha` (opcional): Formato `YYYY-MM-DD`. Si no se proporciona, usa la fecha actual.

**Ejemplo:**
```bash
# Lecturas de hoy
curl http://localhost:3000/api/lecturas

# Lecturas del 3 de diciembre de 2025
curl http://localhost:3000/api/lecturas?fecha=2025-12-03
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "fecha": "2025-12-03",
  "url": "https://www.vaticannews.va/es/evangelio-de-hoy/2025/12/03.html",
  "lecturas": ["Lectura 1...", "Lectura 2...", ...]
}
```

### GET `/api/health`

Verifica que el servidor está activo.

**Ejemplo:**
```bash
curl http://localhost:3000/api/health
```

**Respuesta:**
```json
{
  "status": "ok"
}
```

### GET `/api/help`

Obtiene información sobre cómo usar la API.

## 🔧 Tecnologías Utilizadas

- **Express.js**: Framework web
- **Axios**: Cliente HTTP
- **Cheerio**: Parsing de HTML (jQuery para Node.js)

## 📝 Notas

- La API respeta las políticas de Vatican News
- Incluye User-Agent para evitar bloqueos
- Timeout de 10 segundos por solicitud
- Manejo de errores con códigos HTTP apropiados

## 📄 Licencia

ISC
