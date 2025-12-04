const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

async function inspectPageWithPuppeteer() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    await page.goto('https://www.vaticannews.va/es/evangelio-de-hoy.html', { 
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Esperar a que se cargue el contenido
    await page.waitForSelector('body', { timeout: 10000 });

    const html = await page.content();
    const $ = cheerio.load(html);

    console.log('=== Buscando indicazioneLiturgica ===');
    const indicacion = $('[class*="indicazioneLiturgica"], .indicazioneLiturgica');
    console.log(`Encontrados: ${indicacion.length}`);
    indicacion.each((i, el) => {
      console.log(`${i}: clase="${$(el).attr('class')}" - "${$(el).text().trim()}"`);
    });

    console.log('\n=== Buscando secciones con "Palabra del día" ===');
    
    // Buscar todas las secciones
    $('section.section--evidence').each((i, element) => {
      const section = $(element);
      const title = section.find('h2').text().trim();
      console.log(`\nSección ${i}: ${title}`);
      
      // Buscar párrafos dentro de esta sección
      const paragraphs = section.find('p');
      console.log(`Párrafos encontrados: ${paragraphs.length}`);
      
      paragraphs.each((j, p) => {
        const text = $(p).text().trim();
        if (text.length > 0) {
          console.log(`  P${j}: ${text.substring(0, 100)}...`);
        }
      });

      // Buscar divs con clases específicas
      const divs = section.find('div[class*="content"], div[class*="text"]');
      console.log(`Divs especiales: ${divs.length}`);
      divs.each((j, d) => {
        const text = $(d).text().trim();
        if (text.length > 50 && text.length < 500) {
          console.log(`  Div${j} (${$(d).attr('class')}): ${text.substring(0, 80)}...`);
        }
      });
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (browser) await browser.close();
  }
}

inspectPageWithPuppeteer();
