var express = require('express');
var app = express();
var fs = require('fs');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var bcrypt = require('bcrypt');
var session = require('express-session');
var router = express.Router();
var jwtMid = require('express-jwt');
var jwt = require('jsonwebtoken');
var _ = require('lodash');
var multer = require('multer');
var server = require('http').createServer(app);
var io = require('socket.io')(server);

const saltRounds = 10;
const myPlaintextPassword = 's0/\/\P4$$w0rD';
const someOtherPlaintextPassword = 'not_bacon';
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers',  'Origin, X-Requested-With, Content-Type, Authorization, Accept');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
})
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json());

// app.use(multer({ dest: './uploads/',
//     rename: function (fieldname, filename) {
//       return filename;
//     },
// }))

// PRODUCTS: 

app.get('/products', function(req, res) {
    Product.find({}, function(err, products) {
        if (err) {
            console.log(err);
            res.sendStatus(500);
        }
        return res.json(products);
    });
})

app.get('/search/:name', function(req, res){
    var regex = new RegExp(req.params.name,'i');
    return Product.find({name: regex}, function(err, products){
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        return res.json(products);
    });
});

app.get('/category/:category', function(req, res){
    var regex = new RegExp(req.params.category,'i');
    return Product.find({category: regex}, function(err, products){
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        return res.json(products);
    });
});

app.get('/product/:id', function(req, res) {
    return Product.findById(req.params.id, function(err, product){
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        console.log("Found product: " + JSON.stringify(product));
        return res.json(product);
    })
})

app.post('/product', jwtMid({secret: "secret"}), function(req, res) {
    var product = new Product(req.body);
    // product.photos.data = fs.readFileSync(imgPath);
    // product.photos.contentType = 'image/png';
    console.log(JSON.stringify(product));
    product.save(function(err) {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        console.log('Product saved.');
        io.emit('messages' , { message: 'UWAGA! W ofercie jest nowy produkt: ' + req.body.name});
        return res.json(product);
    });
}); 

app.delete('/delete/:id', jwtMid({secret: "secret"}), function (req, res) {
    Product.remove({_id: req.params.id}, function(err) {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        console.log("Product removed");
        io.emit('messages' , { message: 'UWAGA! Usunięty został produkt: ' + req.body.name});
        return res.sendStatus(200);
    });
});

app.put('/product/:id', jwtMid({secret: "secret"}), function(req, res) {
    var product = req.body;
    Product.update({_id: req.params.id}, product, function(err, product){
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        console.log("Updating product: " + JSON.stringify(product));
        io.emit('messages' , { message: 'UWAGA! Nastąpiła zmiana w produkcie: ' + req.body.name});
        return res.sendStatus(200);
    });
});

app.put('/update/:id', function(req, res) {
    var product = req.body;
    Product.update({_id: req.params.id}, product, function(err, product){
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        console.log("Updating product's availability: " + JSON.stringify(product));
        return res.sendStatus(200);
    });
});

app.post('/discount', jwtMid({secret: "secret"}), function(req, res) {
    io.emit('messages' , { message: 'Pojawiły się nowe obniżki! Nie przegap okazji!!' });
    // let countdown = req.body.discountTime*60000;
    // setInterval(function() {  
    //     countdown--;
    //     io.sockets.emit('timer', { countdown: countdown });
    //   }, 1000);
    return res.sendStatus(200);
});

// ORDERS:

app.get('/waiting', jwtMid({secret: "secret"}), function(req, res){
    Order.find({completed: false}, function(err, orders){
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        return res.json(orders);
    });
});

app.get('/completed', jwtMid({secret: "secret"}), function(req, res){
    Order.find({completed: true}, function(err, orders) {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        return res.json(orders);
    });
});

app.post('/order', function(req, res) {
    var order = new Order(req.body);
    console.log(JSON.stringify(order));
    order.save(function(err) {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        console.log('Order saved.');
        return res.json(order);
    });
});

app.put('/complete/:id', jwtMid({secret: "secret"}), function(req, res) {
    var order = req.body;
    console.log('Updating order: ' + JSON.stringify(order));
    Order.update({_id: req.params.id}, {$set: { completed: true }}, function(err, result) {
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        return res.sendStatus(200);
    });
});

// CATEGORIES: 

app.get('/categories', function(req, res){
    Category.find({}, function(err, categories){
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        return res.json(categories);
    });
});

// USERS: 

app.get('/users', jwtMid({secret: "secret"}), function(req, res){
    User.find({}, function(err, users){
        if (err) {
            console.log(err);
            return res.sendStatus(500);
        }
        return res.json(users);
    });
});

app.post('/login', (req, res) => {
    User.findOne({username: req.body.username}, (err, user) => {
        if(err) {
            console.log(err);
            return res.sendStatus(500);
        }
        console.log(1, user);
        console.log(2, req.body);
        if(user && bcrypt.compareSync(req.body.password, user.password)) {
            if (req.body.username === 'admin') {
                console.log("Logged as admin");
                let token = jwt.sign({user: _.omit(user, ['password'])}, "secret");
                return res.json({user: _.omit(user, ['password']), token: token});
            }
            console.log("Logged as user");
            let token = jwt.sign({user: _.omit(user, ['password'])}, "normal");
            return res.json({user: _.omit(user, ['password']), token: token});
        }
        return res.sendStatus(401);
    })
});

app.post('/register', function(req, res) {
    if (req.body.password !== req.body.passwordConf) {
        return res.sendStatus(401).json({error: "passwords don't match"});
    }

    if (req.body.email &&
        req.body.username &&
        req.body.password &&
        req.body.passwordConf) {

        var userData = {
            email: req.body.email,
            username: req.body.username,
            password: req.body.password
        }

        User.create(userData, function(err, user) {
            if (err) {
                console.log(err);
                return res.sendStatus(401);
            } else {
                console.log("Registration succeeded");
                return res.json({message: "ok"});
            }
        });
    } 
});

// app.get('/logout', function(req, res) {
//     if (req.session) {
//         req.session.destroy(function(err) {
//             if (err) {
//                 return res.sendStatus(500);
//             } else {
//                 return res.redirect('/');
//             }
//         });
//     }
// });

// ---------------------------------------

io.on('connection' , function(client) {
    console.log('Client connected...' );
    // client.emit('messages' , { message: 'Witaj w Sklepie Sportowym!' });
});

server.listen(5000, function () {
    var host = server.address().address
    var port = server.address().port
    console.log("Listenieng on: http://%s:%s", host, port)
});

mongoose.connect('mongodb://admin:admin@ds127126.mlab.com:27126/sport_shop');
var db = mongoose.connection;
db.on('error', () => console.error('connection error'));
db.on('open', function() {});

var Schema = mongoose.Schema;   

var Products = new Schema({
    name: String,
    description: String,
    price: Number,
    category: String,
    moreDescription: String,
    available: Number,
    photos: [{
        data: Buffer, 
        contentType: String
    }]
});

var Product = mongoose.model('Product', Products);

var Orders = new Schema({
    clientName: String,
    clientAddress: String,
    completed: Boolean,
    products: [{
        amount: Number,
        value: Number,
        product: {
            name: String,
            description: String,
            price: Number,
            category: String,
            moreDescription: String,
            available: Number,
            photos: [ { data: Buffer, contentType: String } ]
        }
    }]
});

var Order = mongoose.model('Order', Orders);


var Categories = new Schema({
    categoryName: String
});

var Category = mongoose.model('Category', Categories);

var Users = new Schema({
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    username: {
        type: String,
        unique: true,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    }
});

Users.statics.authenticate = function(email, password, callback) {
    User.findOne({email: email}).exec(function(err, user) {
        if (err) {
            return callback(err);
        } else if (!user) {
            var err = new Error('User not found');
            err.status = 401;
            return callback(err);
        }
        bcrypt.compare(password, user.password, function(err, result) {
            if (result === true) {
                return callback(null, user);
            } else {
                return callback();
            }
        });
    });
}

Users.pre('save', function(next) {
    var user = this;
    bcrypt.hash(user.password, saltRounds, function(err, hash) {
        if (err) {
            return next(err);
        }
        user.password = hash;
        next();
    });
});

var User = mongoose.model('User', Users);
module.exports = User;
