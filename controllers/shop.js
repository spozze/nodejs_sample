const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const stripe = require('stripe')(process.env.STRIPE_KEY); //('sk_test_51P9jHmD1qqD4mPj3xpZon0OzzzMgPQLiiFFmTVzWALdONP5TIw7o4m1UOGVGJLrUFMFg7sSYMnj5inbvt1agisTr00mWZMNLL1');

const Product = require('../models/product');
const Order = require('../models/order');
const { totalmem } = require('os');

const ITEMS_PER_PAGE = 2;

module.exports.getProducts = (request, response, next) => {
    console.log("Product-List Middleware");
    const page = request.query.page || 1;
    let totItems;
    Product.find().countDocuments()
        .then((tot) => {
            totItems = tot;
            return Product.find().skip(ITEMS_PER_PAGE*(page-1)).limit(ITEMS_PER_PAGE);
        })
        .then((products) => {
            console.log(`Products: ${products.length}`);
            console.log(`IDs: ${products.map(p => p._id).join(', ')}`);
            response.render('shop/product-list', {
                products: products, title: 'All Products', path: '/products',
                currentPage: +page,
                hasNextPage: ITEMS_PER_PAGE * +page < totItems, hasPreviousPage: +page > 1,
                nextPage: +page+1, previousPage: +page-1,
                lastPage: Math.ceil(totItems/ITEMS_PER_PAGE)
            }); 
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.getProduct = (request, response, next) => {
    console.log("Product by Id Middleware");
    const id = request.params.productId;
    Product.findById(id)
        .then((product) => {
            console.log(`Id: ${product._id}`);
            response.render('shop/product-detail', { product: product, title: `Product ${product.title}`, path: "/products"}); 
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.getIndex = (request, response, next) => {
    console.log("Index Middleware");
    const page = request.query.page || 1;
    let totItems;
    Product.find().countDocuments()
        .then((tot) => {
            totItems = tot;
            return Product.find().skip(ITEMS_PER_PAGE*(page-1)).limit(ITEMS_PER_PAGE);
        })
        .then(products => {
            console.log(`Products: ${products.length}`);
            console.log(`IDs: ${products.map(p => p._id).join(', ')}`);
            response.render('shop/index', {
                products: products, title: 'Shop', path: '/',
                currentPage: +page,
                hasNextPage: ITEMS_PER_PAGE * +page < totItems, hasPreviousPage: +page > 1,
                nextPage: +page+1, previousPage: +page-1,
                lastPage: Math.ceil(totItems/ITEMS_PER_PAGE)
            }); 
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
    
};

module.exports.getCart = (request, response, next) => {
    console.log("Cart Middleware");
    request.user
        .populate('cart.items.productId')
        .then((user) => {
            const items = user.cart.items;
            console.log(`Products in the Cart: ${items.length}`);
            response.render('shop/cart', { title: 'Your cart', path: '/cart', products: items}); 
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.postCart = (request, response, next) => {
    console.log("Add Cart Middleware");
    const id = request.body.productId;
    Product.findById(id)
        .then((product) => {
            return request.user.addToCart(product);
        })
        .then(() => {
            console.log(`Add Product in your Cart, id: ${id}.`);
            response.redirect('/cart');
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.postCartDeleteItem = (request, response, next) => {
    console.log("Delete Cart Middleware");
    const id = request.body.productId;
    request.user.deleteFromCart(id)
        .then(() => {
            console.log(`Delete Product in your Cart, id: ${id}.`);
            response.redirect('/cart');
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.postOrder = (request, response, next) => {
    console.log("Post Order Middleware");
    request.user
        .populate('cart.items.productId')
        .then((user) => {
            const products = user.cart.items.map(i => ({
                quantity: i.quantity,
                product: {...i.productId._doc}
            }));
            const order = new Order ({
                user: {
                    name: request.session.user.name,
                    userId: request.session.user
                },
                products: products
            })
            return order.save()
        })
        .then(() => {
            request.user.clearCart()
        })
        .then(() => {
            response.redirect('/orders');
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.getOrders = (request, response, next) => {
    console.log("Orders Middleware");
    Order.find({'user.userId': request.session.user._id})
        .then((orders) => {
            console.log(`Orders: ${orders.length}`);
            response.render('shop/orders', { title: 'Your orders', path: '/orders', orders: orders}); 
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.getCheckout = (request, response, next) => {
    console.log("Checkout Middleware");
    const linkBase = `${request.protocol}://${request.get('host')}`;
    let products;
    let Total = 0;
    request.user
        .populate('cart.items.productId')
        .then((user) => {
            products = user.cart.items;
            Total = products.reduce((accProd, prod) => accProd + (prod.quantity * prod.productId.price), 0);
            const objLineItems = products.map(p => ({
                quantity: p.quantity,
                price_data: {
                    unit_amount: p.productId.price * 100,
                    currency: 'usd',
                    product_data: {
                        name: p.productId.title,
                        description: p.productId.description
                    }
                }
            }));
            console.log(`Items: ${objLineItems.length}`);
            return stripe.checkout.sessions.create({
                payment_method_types: ['card'],
                line_items: objLineItems,
                mode: "payment",
                success_url: `${linkBase}/checkout/success`,
                cancel_url: `${linkBase}/checkout/cancel`
            });
        })
        .then((session) => {
            response.render('shop/checkout', { title: 'Checkout', path: '/checkout', products: products, totalSum: Total, sessionId: session.id});
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.getInvoice = (request, response, next) => {
    console.log("Invoice Middleware");
    const orderId = request.params.orderId;
    Order.findById(orderId)
        .then((order) => {
            let err = new Error();
            if (!order) {
                err.title = "Database Operation failed, please try again";
                err.message = 'getInvoice() order non trovato';
                throw err;
            } else if (order.user.userId.toString() != request.user._id.toString()) {
                err.title = "Database Operation failed, please try again.";
                err.message = 'getInvoice() user non autorizzato';
                throw err;
            } else {
                const nameFile = `invoice-${orderId}.pdf`;
                const pathFile = path.join('data', 'invoices', nameFile);
                const doc = new PDFDocument();
                doc.pipe(fs.createWriteStream(pathFile));
                doc.pipe(response);

                doc.fontSize(26).text('Invoice', {underline: true});
                
                let tot = 0;
                for (let prod of order.products) {
                    tot += prod.product.price * prod.quantity;
                    doc.fontSize(14).text(`${prod.product.title} - ${prod.quantity} x $${prod.product.price}`)
                }

                doc.moveDown();
                doc.font('Helvetica-Bold').fontSize(14).text(`Total: $${tot}`, {
                    align: 'right', 
                    
                })

                doc.end();
                // fs.readFile(pathFile, (error, data) => {
                //     if (error) {
                //         return next(error);
                //     }
                //     response.setHeader('Content-Type', 'application/pdf');
                //     response.setHeader('Content-Disposition', `inline; filename="${nameFile}"`);
                //     response.send(data);
                // });
                // const file = fs.createReadStream(pathFile);
                // response.setHeader('Content-Type', 'application/pdf');
                // response.setHeader('Content-Disposition', `inline; filename="${nameFile}"`);
                // file.pipe(response);
            }
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            return next(err);
        } );
};