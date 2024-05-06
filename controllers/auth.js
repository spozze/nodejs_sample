const User = require('../models/user');
const Crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require("express-validator");

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: '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'
    }
}));

module.exports.getLogin = (request, response, next) => {
    console.log("Get Login Middleware");
    let flash = request.flash('error');
    if (flash.length > 0) {
        flash = flash[0];
    } else {
        flash = undefined;
    }
    return response.status(422).render(
        'auth/login',
        {
            path: '/login',
            title: 'Login',
            errorMessage: flash ? [flash] : flash,
            oldInput: {
                email: "",
                password: ""
            },
            validationErrors: []
        }
    );
};

module.exports.getSignup = (request, response, next) => {
    console.log("Get Signup Middleware");
    let flash = request.flash('error');
    if (flash.length > 0) {
        flash = flash[0];
    } else {
        flash = undefined;
    }
    return response.status(422).render(
        'auth/signup',
        {
            path: '/signup',
            title: 'Signup',
            errorMessage: flash ? [flash] : flash,
            oldInput: {
                name: "",
                email: "",
                password: "",
                confirmPassword: ""
            },
            validationErrors: []
        }
    );
};

module.exports.getReset = (request, response, next) => {
    console.log("Get Reset Middleware");
    let flash = request.flash('error');
    if (flash.length > 0) {
        flash = flash[0];
    } else {
        flash = undefined;
    }
    response.render('auth/reset', { path: '/reset', title: 'Reset Password', errorMessage: flash});
};

module.exports.getNewPassword = (request, response, next) => {
    console.log("Get New Password Middleware");
    const token = request.params.token;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}})
        .then(user => {
            let flash = request.flash('error');
            if (flash.length > 0) {
                flash = flash[0];
            } else {
                flash = undefined;
            }
            response.render('auth/new-password', { path: '/new-password', title: 'New Password', errorMessage: flash ? [flash] : flash, userId: user._id.toString(), passwordToken: token});
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.postLogin = (request, response, next) => {
    console.log("Post Login Middleware");
    let userLog;
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        console.log(errors.array());
        return response.status(422).render(
            'auth/login',
            {
                path: '/login',
                title: 'Login',
                errorMessage: errors.array().map((o) => `${o.path}: ${o.msg}`),
                oldInput: {
                    email: request.body.email,
                    password: request.body.password
                },
                validationErrors: errors.array()
            }
        );
    }
    User.findOne({email: request.body.email})
        .then((user) => {
            if (user) {
                userLog = user;
                return bcrypt.compare(request.body.password, user.password);
            } else {
                return false;
            }
        })
        .then((result) => {
            if (result) {
                request.session.user = userLog;
                request.session.isLoggedIn = true;
                request.session.save((error) => {
                    if (error) {
                        console.log(error);
                    }
                    response.redirect('/');
                });
                request.flash('error', 'Ivalid Email or Password.');
                return undefined;
            }
            else {
                request.flash('error', 'Ivalid Email or Password.');
                response.redirect('/login');
            }
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
};

module.exports.postSignup = (request, response, next) => {
    console.log("Post Signup Middleware");
    const name = request.body.name;
    const email = request.body.email;
    const password = request.body.password;
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        //console.log(errors.array());
        return response.status(422).render(
            'auth/signup',
            {
                path: '/signup',
                title: 'Signup',
                errorMessage: errors.array().map((o) => `${o.path}: ${o.msg}`),
                oldInput: {
                    name: name,
                    email: email,
                    password: password,
                    confirmPassword: request.body.confirmPassword
                },
                validationErrors: errors.array()
            }
        );
    }
    bcrypt.hash(password, 12)
        .then((result) => {
            if (result) {
                const user = new User({
                    name: name,
                    email: email,
                    password: result,
                    cart: {items: []}
                });
                return user.save();
            }
        })
        .then((result) => {
            if (result) {
                response.redirect('/login');
            }
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed or Convertion failed, please try again";
            return next(err);
        } );
};

module.exports.postLogout = (request, response, next) => {
    console.log("Post Logout Middleware");
    request.session.destroy(() => {
        response.redirect('/');
    });
};

module.exports.postReset = (request, response, next) => {
    console.log("Post Reset Middleware");
    Crypto.randomBytes(32, (error, buffer) => {
        if (error) {
            console.log(error);
            return response.redirect('/reset');
        } else {
            const token = buffer.toString('hex');
            User.findOne({email: request.body.email})
                .then((userExist) => {
                    if (!userExist) {
                        request.flash('error', 'No account with that email found.');
                        return undefined;
                    } else {
                        userExist.resetToken = token;
                        userExist.resetTokenExpiration = Date.now() + 3600000;
                        return userExist.save();
                    }
                })
                .then((result) => {
                    if (result) {
                        response.redirect(`/new-password/${token}`);
                    } else {
                        response.redirect('/reset');
                    }
                })
                .catch(error =>  {
                    const err = new Error(error);
                    err.httpStatusCode = 500;
                    err.title = "Database Operation failed, please try again";
                    return next(err);
                } );
        }
    })
};

module.exports.postNewPassword = (request, response, next) => {
    const newPassword = request.body.password;
    const userId = request.body.userId;
    const token = request.body.passwordToken;
    let newUser;
    User.findOne({resetToken: token, resetTokenExpiration: {$gt: Date.now()}, _id: userId})
        .then((user) => {
            if (user) {
                newUser = user;
                return bcrypt.hash(newPassword, 12);
            }
        })
        .then((result) => {
            if (result) {
                newUser.password = result;
                newUser.resetToken = undefined;
                newUser.resetTokenExpiration = undefined;
                return newUser.save();
            }
        })
        .then((result) => {
            response.redirect('/');
        })
        .catch(error =>  {
            const err = new Error(error);
            err.httpStatusCode = 500;
            err.title = "Database Operation failed, please try again";
            return next(err);
        } );
}