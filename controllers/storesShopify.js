const axios = require('axios');
const Firebird = require('node-firebird');

// Configuración de Firebird
const firebirdOptions = {
    host: 'almacennorte.ddns.net',
    port: 3050,
    database: 'C:\\FSPCorona_NEW\\SISTCRASH.GDB',
    user: 'SYSDBA',
    password: 'masterkey',
    WireCrypt: false,
    connectTimeout: 40000,
};

// Obtener datos de Firebird por lotes
const fetchAllFirebirdData = async (batchSize = 500) => {
    console.log('Iniciando consulta por lotes a Firebird...');
    let start = 1;
    let results = [];
    let hasMore = true;

    while (hasMore) {
        console.log(`Consultando registros ${start} a ${start + batchSize - 1}...`);
        const query = `
            SELECT CODIGO_BARRAS, EXISTENCIA_FINAL_CANTIDAD
            FROM EXISTENCIAS_INICIO_DIA
            WHERE EXISTENCIA_FINAL_CANTIDAD > 0
            ROWS ${start} TO ${start + batchSize - 1};
        `;

        const batch = await new Promise((resolve, reject) => {
            Firebird.attach(firebirdOptions, (err, db) => {
                if (err) {
                    console.error('Error al conectar a Firebird:', err);
                    return reject(err);
                }

                db.query(query, (err, result) => {
                    db.detach();
                    if (err) {
                        console.error('Error ejecutando consulta:', err);
                        return reject(err);
                    }
                    resolve(result);
                });
            });
        });

        if (batch.length === 0) {
            hasMore = false;
        } else {
            results = results.concat(batch);
            start += batchSize;
        }
    }

    console.log(`Consulta finalizada, total de registros obtenidos: ${results.length}`);
    return results;
};

// Obtener productos de Shopify
const fetchShopifyProducts = async () => {
  console.log('SHOPIFY_STORE_NAME:', process.env.SHOPIFY_STORE_NAME);
    try {
        const response = await axios.get(
            `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2023-01/products.json?limit=250`,
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_API_ACCESS_TOKEN,
                },
            }
        );

        // Aplanar variantes de productos
        const products = response.data.products.flatMap(product =>
            product.variants.map(variant => ({
                id: variant.id,
                inventory_item_id: variant.inventory_item_id,
                barcode: variant.barcode,
                title: product.title,
                inventory_quantity: variant.inventory_quantity,
            }))
        );

        console.log(`Productos obtenidos de Shopify: ${products.length}`);
        return products;
    } catch (error) {
        console.error('Error al obtener productos de Shopify:', error.response?.data || error.message);
        throw error;
    }
};

// Actualizar inventario en Shopify
const updateShopifyInventory = async (inventoryItemId, locationId, availableQuantity) => {
    try {
        const response = await axios.post(
            `https://${process.env.SHOPIFY_STORE_NAME}/admin/api/2023-01/inventory_levels/set.json`,
            {
                location_id: locationId,
                inventory_item_id: inventoryItemId,
                available: availableQuantity,
            },
            {
                headers: {
                    'X-Shopify-Access-Token': process.env.SHOPIFY_API_ACCESS_TOKEN,
                },
            }
        );

        console.log(`Inventario actualizado para ${inventoryItemId}: ${availableQuantity}`);
        return response.data;
    } catch (error) {
        console.error('Error al actualizar inventario en Shopify:', error.response?.data || error.message);
        throw error;
    }
};

// Sincronizar inventarios entre Firebird y Shopify
const syncFirebirdWithShopify = async () => {
  try {
      console.log('Iniciando sincronización...');
      const startTime = Date.now();

      // Paso 1: Obtener datos de Firebird
      const firebirdData = await fetchAllFirebirdData(500);

      // Paso 2: Obtener datos de Shopify
      const shopifyProducts = await fetchShopifyProducts();

      // Paso 3: Cruce y actualización
      let totalProcessed = 0;
      let totalUpdated = 0;
      let notFound = [];
      let updateErrors = [];

      const updates = [];

      for (const firebirdItem of firebirdData) {
          totalProcessed++;
          const shopifyProduct = shopifyProducts.find(
              product => product.barcode === firebirdItem.CODIGO_BARRAS
          );

          if (shopifyProduct) {
              // Intentar actualizar el inventario
              try {
                  updates.push(
                      updateShopifyInventory(
                          shopifyProduct.inventory_item_id,
                          process.env.SHOPIFY_LOCATION_ID,
                          firebirdItem.EXISTENCIA_FINAL_CANTIDAD
                      )
                  );
                  totalUpdated++;
              } catch (error) {
                  console.error(`Error actualizando producto ${shopifyProduct.barcode}:`, error.message);
                  updateErrors.push({ barcode: shopifyProduct.barcode, error: error.message });
              }
          } else {
              // Producto no encontrado en Shopify
              notFound.push({ barcode: firebirdItem.CODIGO_BARRAS });
          }
      }

      // Esperar a que todas las actualizaciones se completen
      await Promise.all(updates);

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000; // Tiempo total en segundos

      console.log('Sincronización completada.');

      return {
          status: 'success',
          totalProcessed,
          totalUpdated,
          notFoundCount: notFound.length,
          updateErrorCount: updateErrors.length,
          durationInSeconds: duration,
          notFound,
          updateErrors,
      };
  } catch (error) {
      console.error('Error durante la sincronización:', error.message);
      throw error;
  }
};

module.exports = {
    fetchAllFirebirdData,
    fetchShopifyProducts,
    updateShopifyInventory,
    syncFirebirdWithShopify,
};
