const fs  = require('fs');
const fileOrigin = require('../util/path');

function deleteFile (filePath) {
    fs.unlink (fileOrigin+filePath, (error) => {
        if (error) {
            throw error;
        }
    })
}

module.exports.deleteFile = deleteFile;