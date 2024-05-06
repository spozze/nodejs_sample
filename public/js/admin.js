const deleteProduct = (btn) => {
    const productId = btn.parentNode.querySelector('[name=id]').value;
    const csrf = btn.parentNode.querySelector('[name=_csrf]').value;
    const productElement = btn.closest('article');
    const productManager = productElement.parentNode;

    fetch('/admin/product/' + productId, { method: 'delete', headers: { 'csrf-token': csrf } })
        .then((result) => result.json())
        .then(() => productManager.removeChild(productElement))
        .catch((error) => console.log(error));
}