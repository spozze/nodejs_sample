module.exports.error404 = (request, response, next) => {
    response.status(404).render('404', {title: "Error 404", path: null}); 
};

module.exports.error500 = (error, request, response, next) => {
    if (!error.title) { error.title = "Generic Error"; }
    if (!error.message) { error.message = "Generic Error"; }
    const isAuth = (request.session && request.session.isLoggedIn) ? request.session.isLoggedIn : undefined;
    response.status(500).render('500', { path: '/500', title: error.title, isAuthenticated: isAuth, message: error.message} );
};