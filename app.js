const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require("cors");
const auth = require('./middleware/auth');
const routerOrders = require('./routes/orders')
const routerUsers = require('./routes/users')
const {createUser,login } = require('./controllers/users')

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const allowedOrigins = [
  "http://localhost:3000", // Utiliza el puerto en el que se sirve tu front-end
  "https://julio-g-marrero.github.io", // Utiliza el puerto en el que se sirve tu front-end
];

app.use(cors({
  origin: allowedOrigins,
  methods:["GET","POST","PATCH","DELETE"]
}));
mongoose.connect('mongodb://localhost:27017/backorder',{});

const { PORT = 4000 } = process.env;

app.listen(PORT, () => {
  console.log(`App listening at port ${PORT}`);
})

app.use('/users/register', createUser);
app.post('/users/login', login);

app.use(auth);

app.use('/users',routerUsers)
app.use('/orders',routerOrders)

app.get('*', function(req, res){
  res.status(404).send('404 Not Found');
});