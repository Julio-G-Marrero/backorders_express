const routerShopify = require('express').Router();
const cron = require('node-cron');
const logger = require('./logger')
const path = require('path');
const fs = require('fs');

const { syncFirebirdWithShopify,saveLastSyncResults, getLastSyncResults, } = require('../controllers/storesShopify');

// Sincronización inicial al iniciar el servidor
(async () => {
  console.log('Iniciando sincronización inicial...');
  try {
      const result = await syncFirebirdWithShopify();
      saveLastSyncResults(result);
      console.log('Sincronización inicial completada.');
  } catch (error) {
      logger.error(`Error durante la sincronización: ${error.message}`);
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

routerShopify.get('/syncInventory', async (req, res) => {
  if (isSyncInProgress) {
      return res.status(400).json({ status: 'error', message: 'Sincronización en progreso, intente más tarde.' });
  }

  isSyncInProgress = true;
  const startTime = new Date();

  console.log(`Sincronización iniciada a las: ${startTime.toISOString()}`);

  try {
      // Ejecuta la sincronización
      const result = await syncFirebirdWithShopify();

      // Registra los detalles de la sincronización en la base de datos
      const syncData = {
          status: result.status,
          totalProcessed: result.totalProcessed,
          totalUpdated: result.totalUpdated,
          notFoundCount: result.notFound ? result.notFound.length : 0,
          updateErrorCount: result.updateErrors ? result.updateErrors.length : 0,
          errors: result.updateErrors || [],
          notFound: result.notFound || [],
          lastUpdated: startTime,
          completedAt: new Date(),
      };

      await saveLastSyncResults(syncData); // Función para guardar la información en la base de datos

      res.json(result);
  } catch (error) {
      // Maneja errores y registra un intento fallido
      await saveLastSyncResults({
          status: 'error',
          totalProcessed: 0,
          totalUpdated: 0,
          notFoundCount: 0,
          updateErrorCount: 0,
          errors: [{ message: error.message }],
          lastUpdated: startTime,
          completedAt: new Date(),
      });
      res.status(500).json({ status: 'error', message: error.message });
  } finally {
      isSyncInProgress = false; // Liberar el bloqueo
      console.log(`Sincronización finalizada a las: ${new Date().toISOString()}`);
  }
});

routerShopify.get('/lastSyncResults', async (req, res) => {
  try {
      // Leer los datos de la última sincronización (reemplaza esta función según tu lógica actual)
      const lastSyncData = await getLastSyncResults(); // Implementa esta función según tus necesidades

      // Inicializa la estructura de datos
      const syncResults = {
          status: '',
          totalProcessed: 0,
          totalUpdated: 0,
          notFound: [],
          errors: [],
          updated: [],
      };

      // Actualiza la estructura con los datos obtenidos
      if (lastSyncData) {
          syncResults.status = lastSyncData.status || '';
          syncResults.totalProcessed = lastSyncData.totalProcessed || 0;
          syncResults.totalUpdated = lastSyncData.totalUpdated || 0;
          syncResults.notFound = lastSyncData.notFound || [];
          syncResults.errors = lastSyncData.errors || [];
          syncResults.updated = lastSyncData.updated || [];
      }

      // Leer los errores registrados en el archivo de logs
      const logFilePath = path.join(__dirname, '../logs/errors.log');
      const errorLogs = fs.existsSync(logFilePath)
          ? fs.readFileSync(logFilePath, 'utf8')
              .split('\n')
              .filter((line) => line.trim() !== '') // Filtrar líneas vacías
          : [];

      // Agregar los logs al resultado
      syncResults.errorLogs = errorLogs;

      res.json(syncResults);
  } catch (error) {
      logger.error(`Error al obtener los resultados de la sincronización: ${error.message}`);
      res.status(500).json({
          status: 'error',
          message: 'Error al obtener los resultados de la sincronización.',
      });
  }
});

module.exports = routerShopify;
