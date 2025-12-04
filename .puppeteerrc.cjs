/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Cambiar al directorio de caché para que Render pueda usar espacio de escritura
  cacheDirectory: `${require('os').homedir()}/.cache/puppeteer`,
};
