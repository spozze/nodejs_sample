// const username = 'spozzebon';
// const password = '9VP6Hhy1gaAVKQBi';
// const cluster = 'cluster0.6uevkik.mongodb.net';
// const database = 'shop';

const express = require('express');
const fs = require('fs');
const https = require('https');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const errorController = require('./controllers/error');
const User = require('./models/user');

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.6uevkik.mongodb.net/${process.env.MONGO_DATABASE}?&w=majority&appName=Cluster0`;

const app = express();
const store = new MongoDBStore({
	uri: uri,//`mongodb+srv://spozzebon:9VP6Hhy1gaAVKQBi@cluster0.6uevkik.mongodb.net/shop?&w=majority&appName=Cluster0`,
	collection: 'sessions'
});
const csrfProtection = csrf();

// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

const fileStorage = multer.diskStorage({
	destination: (request, file, callback) => {
		callback(null, 'images');
	},
	filename: (request, file, callback) => {
		callback(null, `${new Date().toISOString().replace(/:/g, '-')}-${file.originalname}`);
	}
});
const fileFilter = (request, file, callback) => {
	if (['image/png', 'image/jpg', 'image/jpeg'].includes(file.mimetype)) {
		callback(null, true);
	} else {
		callback(null, false);
	}
};

app.set('view engine', 'ejs');

const adminRoute = require('./routes/admin');
const shopRoute = require('./routes/shop');
const authRoute = require('./routes/auth');
const user = require('./models/user');
const accessLogStream = fs.createWriteStream(
	path.join(__dirname, 'access.log'),
	{ flags: 'a' }
);

app.use(helmet());
app.use(compression());
app.use(morgan('combined', { stream: accessLogStream }));

app.get('/favicon.ico', (request, response) => response.status(204));

app.use(express.urlencoded({extended: false}));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(session({secret: 'my secret', resave: false, saveUninitialized: false, store: store }));

app.use(csrfProtection);
app.use(flash());

app.use('/', (request, response, next) => {
	console.log("Always Runs");
	response.locals.isAuthenticated = request.session.isLoggedIn;
	response.locals.csrfToken = request.csrfToken();
	if (request.session.user == undefined) {
		next();
	}
	else {
		User.findById(request.session.user._id)
			.then ((user) => {
				if (user) {
					request.user = user;
					console.log(`User: ${user.name}`);
				} else {
					request.user = null;
					request.session.user = undefined;
					request.session.isAuthenticated = false;
				}
				next();
			})
			.catch((error) => {
				next(new Error(error));
			});
	}
});



app.use('/admin', adminRoute);
app.use(shopRoute);
app.use(authRoute);

app.use(errorController.error404);

app.use(errorController.error500);

mongoose.connect(`mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0.6uevkik.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority&appName=Cluster0`)
	.then(() => {
		// app.listen(3000);
		// https.createServer(
		// 	{ key: privateKey, cert: certificate },
		// 	app
		// ).listen(process.env.PORT || 3000);
		app.listen(process.env.PORT || 3000);
	})
	.catch((error) => {
		console.log(error);
	});