/**
 * Created by lianpan on 08/10/2016.
 */

var https = require('https');

/**
 * Generates a GET request the user endpoint
 * @param {string} accessToken the access token with which the request should be authenticated
 * @param {callback} callback
 */
function getAllUserInfo(accessToken, callback) {
    var options = {
        host: 'graph.microsoft.com',
        path: '/v1.0/users',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer ' + accessToken
        }
    };

    https.get(options, function (response) {
        var body = '';
        response.on('data', function (d) {
            body += d;
            console.log("response:"+body);
        });
        response.on('end', function () {
            var error;
            if (response.statusCode === 200) {
                callback(null, JSON.parse(body));
            } else {
                error = new Error();
                error.code = response.statusCode;
                error.message = response.statusMessage;
                // The error body sometimes includes an empty space
                // before the first character, remove it or it causes an error.
                body = body.trim();
                error.innerError = JSON.parse(body).error;
                callback(error, null);
            }
        });
    }).on('error', function (e) {
        callback(e, null);
    });
}


exports.getAllUserInfo = getAllUserInfo;