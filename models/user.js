const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    resetToken: String,
    resetTokenExpiration: Date,
    cart: {
        items: [{
            productId: {type: Schema.Types.ObjectId, required: true, ref: 'Product'},
            quantity: {type: Number, required: true}
        }]
    }
});

userSchema.methods.addToCart = function (product) {
    const indexProduct = this.cart.items.findIndex((item) => {
        return item.productId.toString() == product._id.toString();
    });
    let q = 1;
    const cart = {items: [...this.cart.items]};
    if (indexProduct > -1) {
        this.cart.items[indexProduct].quantity++;
    } else {
        cart.items.push({productId: product._id, quantity: q});
        this.cart = cart;
    }
    return this.save()
        .then((result) => {
            return result;
        })
        .catch((error) => console.log(error));
};

userSchema.methods.deleteFromCart = function(productId) {
    const newItems = this.cart.items.filter(item => {
        return item.productId.toString() != productId.toString()
    });
    this.cart.items = newItems;
    return this.save();
}

userSchema.methods.clearCart = function () {
    this.cart = {items: []};
    return this.save();
}

module.exports = mongoose.model('User', userSchema);