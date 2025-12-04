#!/bin/bash
set -e

echo "📦 Instalando dependencias..."
npm install

echo "🌐 Descargando Chrome para Puppeteer..."
npx puppeteer browsers install chrome

echo "✅ Build completado"
