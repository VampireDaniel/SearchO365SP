var crypto = require('crypto');
var algorithm = 'aes-256-ctr';
var password = 'daniel253578761';


function authorize(datetime, callback) {
    try {
        var cd = encrypt(datetime);
        var cd2 = cd.substring(0, Math.ceil(cd.length / 2));

        var cs = encrypt(password);
        var cs2 = cs.substr(Math.floor(cs.length / 2));

        var cc = encrypt(cd2 + cs2);
        callback(null, cc);
    }
    catch (err) {
        callback(err, false);
    }
}

function encrypt(text) {
    var cipher = crypto.createCipher(algorithm, password)
    var crypted = cipher.update(text, 'utf8', 'hex')
    crypted += cipher.final('hex');
    return crypted;
}

// function decrypt(text) {
//     var decipher = crypto.createDecipher(algorithm, password)
//     var dec = decipher.update(text, 'hex', 'utf8')
//     dec += decipher.final('utf8');
//     return dec;
// }


exports.authorize = authorize;
