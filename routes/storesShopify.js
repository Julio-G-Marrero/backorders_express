const routerShopify = require('express').Router();
const cron = require('node-cron');

const { syncFirebirdWithShopify,saveLastSyncResults, getLastSyncResults, } = require('../controllers/storesShopify');

// Sincronización inicial al iniciar el servidor
(async () => {
  console.log('Iniciando sincronización inicial...');
  try {
      const result = await syncFirebirdWithShopify();
      saveLastSyncResults(result);
      console.log('Sincronización inicial completada.');
  } catch (error) {
      console.error('Error en la sincronización inicial:', error.message);
  }
})();

// Definimos la ruta para actualizar el inventario
let isSyncInProgress = false;
cron.schedule('0 */2 * * *', async () => {
  console.log('Iniciando sincronización automática...');
  try {
      const result = await syncFirebirdWithShopify();
      saveLastSyncResults(result);
      console.log('Sincronización completada.');
  } catch (error) {
      console.error('Error en la sincronización automática:', error.message);
  }
});

// Programar sincronización automática cada 2 horas
cron.schedule('0 */2 * * *', async () => {
  console.log('Iniciando sincronización automática...');
  try {
      const result = await syncFirebirdWithShopify();
      saveLastSyncResults(result);
      console.log('Sincronización automática completada.');
  } catch (error) {
      console.error('Error en la sincronización automática:', error.message);
  }
});

routerShopify.get('/syncInventory', async (req, res) => {
    if (isSyncInProgress) {
        return res.status(400).json({ status: 'error', message: 'Sincronización en progreso, intente más tarde.' });
    }

    isSyncInProgress = true;
    console.log(`Sincronización iniciada a las: ${new Date().toISOString()}`);

    try {
        const result = await syncFirebirdWithShopify();
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        isSyncInProgress = false; // Liberar el bloqueo
        console.log(`Sincronización finalizada a las: ${new Date().toISOString()}`);
    }
});

routerShopify.get('/lastSyncResults', (req, res) => {
  const lastResults = getLastSyncResults();
  if (!lastResults) {
      return res.status(404).json({ message: 'No hay resultados disponibles.' });
  }
  res.json(lastResults);
});

module.exports = routerShopify;
