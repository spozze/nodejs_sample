const { Types } = require('mongoose');
const { validationResult } = require("express-validator");
const { HostNotFoundError } = require('sequelize');

const fileHelper = require('../util/file');
const Product = require('../models/product');

module.exports.postAddProduct = (request, response, next) => {
    console.log("Post Add Product Middleware");
    const errors = validationResult(request);
    if (!request.file) {
        const errorsArray = errors.array();
        errorsArray.push({path: 'image', msg: 'Attached file is not an image.'})
        return response.status(422).render(
            'admin/add-edit-product',
            {
                path: '/admin/add-product',
                title: 'Add Product',
                errorMessage: errorsArray.map((o) => `${o.path}: ${o.msg}`),
                editing: false,
                hasError: true,
                product: {
                    title: request.body.title,
                    price: request.body.price,
                    description: request.body.description
                },
                validationErrors: errorsArray
            }
        );
    }
    if (!errors.isEmpty()) {
        return response.status(422).render(
            'admin/add-edit-product',
            {
                path: '/admin/add-product',
                title: 'Add Product',
                errorMessage: errors.array().map((o) => `${o.path}: ${o.msg}`),
                editing: false,
                hasError: true,
                product: {
                    title: request.body.title,
                    price: request.body.price,
                    description: request.body.description
                },
                validationErrors: errors.array()
            }
        );
    }
    const product = new Product ({
        title: request.body.title,
        price: request.body.price,
        description: request.body.description,
        url: `/${request.file.path}`,
        userId: request.session.user
    });
    product.save()
        .then((result) => response.redirect('/admin/products'))
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.getAddProduct = (request, response, next) => {
    console.log("Get Add Product Middleware");
    response.render('admin/add-edit-product', { title: "Add Product", path: '/admin/add-product', editing: false, hasError: false, errorMessage: undefined, validationErrors: []});
};

module.exports.postEditProduct = (request, response, next) => {
    console.log("Post Edit Product Middleware");
    const errors = validationResult(request);
    const image = request.file;
    if (!errors.isEmpty()) {
        return response.status(422).render(
            'admin/add-edit-product',
            {
                path: '/admin/edit-product',
                title: 'Edit Product',
                errorMessage: errors.array().map((o) => `${o.path}: ${o.msg}`),
                editing: true,
                hasError: true,
                product: {
                    title: request.body.title,
                    price: request.body.price,
                    description: request.body.description
                },
                validationErrors: errors.array()
            }
        );
    }
    Product.findById(request.body.id)
        .then ((product) => {
            if (product.userId.toString() == request.user._id.toString()) {
                product.title = request.body.title;
                product.price = request.body.price;
                product.description = request.body.description;
                if (image) {
                    fileHelper.deleteFile(product.url);
                    product.url = `/${image.path}`;
                }
                return product.save();
            }
        })
        .then((product) => {
            if (product) {
                console.log(`Editing Product By Id: ${product._id}`);
                response.redirect('/admin/products');
            } else {
                response.redirect('/');
            }
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.getEditProduct = (request, response, next) => {
    console.log("Get Edit Product Middleware");
    const id = request.params.productId;
    const edit = request.query.edit;
    if (!edit) {
        response.redirect('/');
    }
    Product.findById(id)
        .then ((product) => {
            //console.log(product);
            response.render('admin/add-edit-product', { product: product, title: "Edit Product", path: '/admin/products', editing: true, hasError: false, errorMessage: undefined, validationErrors: []});
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.postDeleteProduct = (request, response, next) => {
    console.log("Post Delete Product Middleware");
    const id = request.body.id;
    Product.findOne({_id: id, userId: request.user._id})
        .then((product) => {
            if (product) {
                fileHelper.deleteFile(product.url);
                return Product.deleteOne({_id: id, userId: request.user._id});
            } else {
                throw new Error("Product doesn't Found.");
            }
        })
        .then (() => {
            console.log(`Delete Product By Id: ${id}`);
            response.redirect('/admin/products');
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.deleteProduct = (request, response, next) => {
    console.log("Post Delete Product Middleware");
    const id = request.params.productId;
    Product.findOne({_id: id, userId: request.user._id})
        .then((product) => {
            if (product) {
                fileHelper.deleteFile(product.url);
                return Product.deleteOne({_id: id, userId: request.user._id});
            } else {
                throw new Error("Product doesn't Found.");
            }
        })
        .then (() => {
            console.log(`Delete Product By Id: ${id}`);
            response.status(200).json({message: 'Success!'});
        })
        .catch(error =>  {
            response.status(500).json({message: 'Deleting Product Failed!'});
        } );
};

module.exports.getProducts = (request, response, next) => {
    console.log("Get Products Middleware");
    Product.find({userId: request.user._id})
        .then((products) => {
            console.log(`Products: ${products.length}`);
            console.log(`IDs: ${products.map(p => p._id).join(', ')}`);
            response.render('admin/products', { products: products, title: 'Admin Products', path: '/admin/products'}); 
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};