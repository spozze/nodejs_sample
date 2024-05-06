const express = require('express');
const { check, body } = require('express-validator');
const authController = require('../controllers/auth');

const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);
router.post(
    '/login',
    [
        check('email').isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
        body('password', 'Please enter a valid password with only numbers and text and at least 5 characters.').isLength({min: 5}).isAlphanumeric().trim()
    ],
    authController.postLogin
);

router.get('/signup', authController.getSignup);
router.post(
    '/signup',
    [
        check('email').isEmail().withMessage('Please enter a valid email.')
            .custom((value, {}) => {
                return User.findOne({email: value})
                    .then((userExist) => {
                        if (userExist) {
                            return Promise.reject('Email exists, write a different one.');
                        }
                    });
                
            })
            .normalizeEmail(),
        body('password', 'Please enter a valid password with only numbers and text and at least 5 characters.').isLength({min: 5}).isAlphanumeric().trim(),
        body('confirmPassword').trim()
            .custom((value, {req}) => {
                if (value != req.body.password) {
                    throw new Error('Passwords have to match!');
                } else {
                    return true;
                }
            })
    ],
authController.postSignup);

router.get('/reset', authController.getReset);
router.post('/reset', authController.postReset);

router.post('/logout', authController.postLogout);

router.get('/new-password/:token', authController.getNewPassword);
router.post('/new-password', authController.postNewPassword);

module.exports = router;