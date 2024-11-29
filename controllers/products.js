const Product = require('../models/products')

module.exports.getProducts = (req,res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 13;
  const startIndex = (page - 1) * limit;
  Product.find({}).skip(startIndex).limit(limit)
  .then(products => res.send({products}))
  .catch((err) => res.send({message:err}))
}

module.exports.createProduct = (req, res) => {
    console.log(req.body)
    Product.create({
      codigo_barras: req.body.codigo_barras,
      codigo_interno: req.body.codigo_interno,
      descripcion: req.body.descripcion,
      familia: req.body.familia,
      sub_familia: req.body.sub_familia
    })
    .then((product) => res.send(product))
    .catch((err) => res.status(err));
};

module.exports.getProductsByValues = (req,res) => {
  const {value} = req.query
  const limit = parseInt(req.query.limit) || 13;
  Product.find(
      {
        $or: [
          { codigo_barras: { $regex : value, $options: 'i' } },
          { codigo_interno: { $regex : value, $options: 'i' } },
          { descripcion: { $regex : value, $options: 'i' } },
          { familia: { $regex : value, $options: 'i' } },
          { sub_familia: { $regex : value, $options: 'i' } },
        ]
      })
  .limit(limit)
  .then(products => res.send({ products }))
  .catch((err) => res.status(500).send({ message: err }));
}

module.exports.importProductosFromCSV = async (req, res) => {  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  const filePath = req.file.path;
  const productsArray = [];

  // Leer y procesar el archivo CSV
  fs.createReadStream(filePath)
    .pipe(csv())
    .on("data", (row) => {
      productsArray.push({
        codigo_barras: row.codigo_barras,
        codigo_interno: row.codigo_interno,
        descripcion: row.descripcion,
        precio: row.precio,
        familia: row.familia,
        sub_familia: row.sub_familia,
        provedor: row.provedor || "Diverso",
      });
    })
    .on("end", async () => {
      try {
        // Filtrar duplicados según código interno o código de barras
        const bulkOperations = productsArray.map((product) => ({
          updateOne: {
            filter: {
              $or: [
                { codigo_barras: product.codigo_barras },
                { codigo_interno: product.codigo_interno }
              ]
            },
            update: { $set: product },
            upsert: true, // Inserta si no existe
          },
        }));

        const result = await Product.bulkWrite(bulkOperations);
        const importedCount = result.upsertedCount; // Cantidad de nuevos registros

        res.status(200).json({
          message: "Datos importados correctamente.",
          importedCount,
        });
      } catch (err) {
        console.error("Error al insertar datos en MongoDB:", err);
        res.status(500).send("Error al importar datos del CSV");
      } finally {
        fs.unlinkSync(filePath);
      }
    })
    .on("error", (err) => {
      console.error("Error al procesar el archivo CSV:", err);
      res.status(500).send("Error al procesar el archivo CSV");
    });
}
