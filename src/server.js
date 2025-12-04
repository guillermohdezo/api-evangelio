const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * Formatea una fecha a formato YYYY/MM/DD para la URL
 * @param {Date} date - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
function formatDateForUrl(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}/${month}/${day}`;
}

/**
 * Extrae las lecturas del HTML de la página
 * @param {string} html - HTML de la página
 * @returns {object} - Objeto con indicazioneLiturgica, primeraLectura y evangelio
 */
function extractReadings(html) {
  const $ = cheerio.load(html);
  
  let indicazioneLiturgica = null;
  let primeraLectura = {
    cita: null,
    lectura: null
  };
  
  let evangelio = {
    cita: null,
    lectura: null
  };

  // Buscar indicazioneLiturgica
  const indicacion = $('[class*="indicazioneLiturgica"], .indicazioneLiturgica');
  if (indicacion.length > 0) {
    indicazioneLiturgica = indicacion.eq(0).text().trim();
  }

  // Buscar la sección "Lectura del Día"
  $('section.section--evidence').each((i, element) => {
    const section = $(element);
    const title = section.find('h2').text().trim();
    
    if (title === 'Lectura del Día') {
      const paragraphs = section.find('p');
      if (paragraphs.length >= 2) {
        // La primera línea es información (ej: "Lectura del libro de...")
        // La segunda línea es la cita (ej: "Isaías 25, 6-10")
        // Las siguientes líneas son el texto de la lectura
        primeraLectura.cita = paragraphs.eq(1).text().trim();
        
        // Obtener el texto completo de la lectura (desde el tercer párrafo)
        let lecturaTexto = '';
        for (let j = 2; j < paragraphs.length; j++) {
          const texto = $(paragraphs[j]).text().trim();
          if (texto.length > 0) {
            lecturaTexto += (lecturaTexto ? ' ' : '') + texto;
          }
        }
        primeraLectura.lectura = lecturaTexto;
      }
    } else if (title === 'Evangelio del Día') {
      const paragraphs = section.find('p');
      if (paragraphs.length >= 2) {
        // Similar a la lectura del día
        evangelio.cita = paragraphs.eq(1).text().trim();
        
        let lecturaTexto = '';
        for (let j = 2; j < paragraphs.length; j++) {
          const texto = $(paragraphs[j]).text().trim();
          if (texto.length > 0) {
            lecturaTexto += (lecturaTexto ? ' ' : '') + texto;
          }
        }
        evangelio.lectura = lecturaTexto;
      }
    }
  });

  return {
    indicazioneLiturgica: indicazioneLiturgica,
    primeraLectura: primeraLectura,
    evangelio: evangelio
  };
}

/**
 * Intenta conectar con reintentos
 * @param {string} token - Token de Browserless
 * @param {number} intentos - Número de intentos (máximo 3)
 * @returns {Promise<object>} - Browser conectado
 */
async function conectarBrowserless(token, intentos = 3) {
  for (let i = 1; i <= intentos; i++) {
    try {
      const tokenPreview = token.substring(0, 10) + '...' + token.substring(token.length - 5);
      console.log(`Intento ${i}/${intentos} - Conectando a Browserless (${tokenPreview})...`);
      
      const browserlessUrl = `wss://chrome.browserless.io?token=${token}`;
      const browser = await puppeteer.connect({
        browserWSEndpoint: browserlessUrl
      });
      
      console.log('✅ Conectado a Browserless exitosamente');
      return browser;
    } catch (error) {
      console.error(`❌ Intento ${i} fallido:`, error.message);
      
      if (i < intentos) {
        // Esperar progresivamente más tiempo entre intentos (1s, 2s, 3s)
        const espera = i * 1000;
        console.log(`Esperando ${espera}ms antes de reintentar...`);
        await new Promise(resolve => setTimeout(resolve, espera));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Obtiene las lecturas del día de Vatican News usando Puppeteer
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @returns {Promise<object>} - Objeto con las lecturas
 */
async function getReadingsFromVatican(fecha) {
  let browser;
  try {
    const date = new Date(fecha);
    if (isNaN(date.getTime())) {
      throw new Error('Formato de fecha inválido. Use YYYY-MM-DD');
    }

    const urlDate = formatDateForUrl(date);
    const url = `https://www.vaticannews.va/es/evangelio-de-hoy/${urlDate}.html`;

    // Usar Puppeteer para cargar la página completamente
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (process.env.BROWSERLESS_TOKEN) {
      // Usar Browserless si está configurado
      try {
        const token = process.env.BROWSERLESS_TOKEN;
        browser = await conectarBrowserless(token);
      } catch (browserlessError) {
        console.error('❌ Browserless no disponible, usando fallback a Puppeteer local...');
        try {
          // Intentar con Puppeteer local como fallback
          browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
          });
          console.log('✅ Fallback a Puppeteer local exitoso');
        } catch (puppeteerError) {
          console.error('❌ Error en fallback:', puppeteerError.message);
          const token = process.env.BROWSERLESS_TOKEN;
          const tokenPreview = token.substring(0, 10) + '...' + token.substring(token.length - 5);
          throw new Error(`No se pudo conectar a Browserless (reintentos agotados) ni a Puppeteer local. Token: ${tokenPreview}. Error Browserless: ${browserlessError.message}`);
        }
      }
    } else {
      // Usar Puppeteer local
      console.log('Usando Puppeteer local...');
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    
    const page = await browser.newPage();
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    const html = await page.content();
    await page.close();
    
    const readings = extractReadings(html);

    return {
      success: true,
      fecha: fecha,
      url: url,
      lecturas: {
        indicazioneLiturgica: readings.indicazioneLiturgica,
        primeraLectura: readings.primeraLectura,
        evangelio: readings.evangelio
      }
    };
  } catch (error) {
    console.error('Error en getReadingsFromVatican:', error.message);
    const tokenInfo = process.env.BROWSERLESS_TOKEN ? 
      'Token ' + process.env.BROWSERLESS_TOKEN.substring(0, 10) + '...' + process.env.BROWSERLESS_TOKEN.substring(process.env.BROWSERLESS_TOKEN.length - 5) + 
      ' (longitud: ' + process.env.BROWSERLESS_TOKEN.length + ')' :
      'NO CONFIGURADO';
    return {
      success: false,
      error: error.message,
      fecha: fecha,
      browserlessToken: tokenInfo,
      hint: 'Si estás en Render, configura la variable BROWSERLESS_TOKEN. Obtén tu token gratis en https://www.browserless.io/'
    };
  } finally {
    if (browser && !process.env.BROWSERLESS_TOKEN) {
      try {
        await browser.close();
      } catch (e) {
        // Ignorar errores al cerrar
      }
    }
  }
}

/**
 * Endpoint GET que retorna las lecturas del día
 * Query params: fecha (formato YYYY-MM-DD)
 */
app.get('/api/lecturas', async (req, res) => {
  try {
    let fecha = req.query.fecha;

    // Si no se proporciona fecha, usa la de hoy
    if (!fecha) {
      const today = new Date();
      fecha = today.toISOString().split('T')[0];
    }

    const result = await getReadingsFromVatican(fecha);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
});

/**
 * Endpoint GET health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

/**
 * Endpoint GET que retorna información sobre cómo usar la API
 */
app.get('/api/help', (req, res) => {
  res.json({
    nombre: 'API Evangelio del Día',
    descripcion: 'Extrae las lecturas del día desde Vatican News',
    endpoints: {
      lecturas: {
        url: '/api/lecturas',
        metodo: 'GET',
        parametros: {
          fecha: 'Opcional. Formato: YYYY-MM-DD. Si no se proporciona, usa la fecha actual.'
        },
        ejemplo: 'GET /api/lecturas?fecha=2025-12-03'
      },
      health: {
        url: '/api/health',
        metodo: 'GET',
        descripcion: 'Verifica que el servidor está activo'
      }
    }
  });
});

app.listen(PORT, () => {
  console.log(`🙏 API Evangelio del Día escuchando en puerto ${PORT}`);
  console.log(`📖 Para obtener ayuda, visita: http://localhost:${PORT}/api/help`);
});
