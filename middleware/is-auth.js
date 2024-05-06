module.exports = (request, response, next) => {
    if (!request.session.isLoggedIn) {
        console.log("Redirect to /login error 401");
        response.status(401).redirect('/login');
    } else {
        next();
    }
}