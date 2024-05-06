const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/admin');
const isAuth = require('../middleware/is-auth');

const router = express.Router();

router.get('/add-product', isAuth, adminController.getAddProduct);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.post(
    '/add-product',
    [
        body('title', 'Please enter a valid title with min 5 characters.').isString().isLength({min: 3}).trim(),
        body('url', 'Please enter a valid url.'),
        body('price', 'Please enter a valid price (float format).').isFloat(),
        body('description', 'Please enter a valid title with min 5 and max 400 characters.').isLength({min: 3, max: 400}).trim()
    ],
    isAuth,
    adminController.postAddProduct
);

router.post(
    '/edit-product',
    [
        body('title', 'Please enter a valid title with min 5 characters.').isString().isLength({min: 3}).trim(),
        body('url', 'Please enter a valid url.'),
        body('price', 'Please enter a valid price (float format).').isFloat(),
        body('description', 'Please enter a valid title with min 5 and max 400 characters.').isLength({min: 3, max: 400}).trim()
    ],
    isAuth,
    adminController.postEditProduct
    );

//router.post('/delete-product', isAuth, adminController.postDeleteProduct);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

router.get('/products', isAuth, adminController.getProducts);

module.exports = router;