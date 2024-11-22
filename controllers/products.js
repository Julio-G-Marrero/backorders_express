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