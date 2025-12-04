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
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    const html = await page.content();
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
    return {
      success: false,
      error: error.message,
      fecha: fecha
    };
  } finally {
    if (browser) {
      await browser.close();
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
