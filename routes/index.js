/*
 * Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */
var express = require('express');
var router = express.Router();
var authHelper = require('../authHelper.js');
var requestUtil = require('../requestUtil.js');
var emailer = require('../emailer.js');
var url = require('url');
var hbs = require('hbs');
var logger = require('../common/logger/logger').logger;
var cipher = require('../common/authorizer/crypter.js');
var moment = require('moment');


/* GET home page. */
router.get('/', function (req, res) {

    res.redirect('search');

    // check for token
    // if (req.cookies.REFRESH_TOKEN_CACHE_KEY === undefined) {
    //     res.redirect('login');
    // } else {
    //     //redirect to search page
    //     res.redirect('search');
    // }
});


router.get('/search', function (req, res) {
    if (req.query.querytext !== undefined) {
        var timeSpan = Date.parse(new Date()).toString();

        cipher.authorize(timeSpan, function (err, cipher) {
            if (err === null) {
                requestUtil.getTokenFromApi(timeSpan, cipher, function (err, token) {
                    if (err === null) {
                        token = JSON.parse(token.replace(/&quot;/g, '"'));
                        var accessToken = token.accessToken;

                        var searchText = req.query.querytext;
                        requestUtil.getSearch(accessToken, searchText, function (err, result) {
                            if (result !== null) {
                                var elapsedTime = result.ElapsedTime;
                                var table = result.PrimaryQueryResult.RelevantResults.Table;

                                res.render(
                                    'search',
                                    {
                                        //strResult: JSON.stringify(table),
                                        result: table,
                                        elapsedTime: elapsedTime
                                    }
                                );
                            }
                            else {
                                renderError(res, err);
                            }
                        });
                    }
                    else {
                        logger.log('error', err);
                    }
                });
            }
            else {
                logger.log('error', err);
            }
        });
    }
    else {
        res.render('search');
    }
});

router.get('/search2', function (req, res) {
    if (req.query.querytext !== undefined) {
        var timeSpan = Date.parse(new Date()).toString();

        cipher.authorize(timeSpan, function (err, cipher) {
            if (err === null) {
                requestUtil.getTokenFromApi(timeSpan, cipher, function (err, token) {
                    if (err === null) {
                        token = JSON.parse(token.replace(/&quot;/g, '"'));
                        var accessToken = token.accessToken;

                        var searchText =req.query.querytext;
                        requestUtil.getSearch(accessToken, searchText, function (err, result) {
                            if (result !== null) {
                                var elapsedTime = result.ElapsedTime;
                                var table = result.PrimaryQueryResult.RelevantResults.Table;

                                res.render(
                                    'search2',
                                    {
                                        //strResult: JSON.stringify(table),
                                        accessToken: accessToken,
                                        result: table,
                                        totalCount: table.Rows.length
                                        //elapsedTime: elapsedTime
                                    }
                                );
                            }
                            else {
                                renderError(res, err);
                            }
                        });
                    }
                    else {
                        logger.log('error', err);
                        renderError(res, err);
                    }
                });
            }
            else {
                logger.log('error', err);
                renderError(res, err);
            }
        });
    }
    else {
        res.render('search2', {
            totalCount: 0
        });
    }
});

function renderSendMail(req, res) {
    requestUtil.getUserData(
        req.cookies.ACCESS_TOKEN_CACHE_KEY,
        function (firstRequestError, firstTryUser) {
            if (firstTryUser !== null) {
                req.session.user = firstTryUser;
                res.render(
                    'sendMail',
                    {
                        display_name: firstTryUser.displayName,
                        user_principal_name: firstTryUser.userPrincipalName
                    }
                );
            } else if (hasAccessTokenExpired(firstRequestError)) {
                // Handle the refresh flow
                authHelper.getTokenFromRefreshToken(
                    req.cookies.REFRESH_TOKEN_CACHE_KEY,
                    function (refreshError, accessToken) {
                        res.cookie(authHelper.ACCESS_TOKEN_CACHE_KEY, accessToken);
                        if (accessToken !== null) {
                            requestUtil.getUserData(
                                req.cookies.ACCESS_TOKEN_CACHE_KEY,
                                function (secondRequestError, secondTryUser) {
                                    if (secondTryUser !== null) {
                                        req.session.user = secondTryUser;
                                        res.render(
                                            'sendMail',
                                            {
                                                display_name: secondTryUser.displayName,
                                                user_principal_name: secondTryUser.userPrincipalName
                                            }
                                        );
                                    } else {
                                        clearCookies(res);
                                        renderError(res, secondRequestError);
                                    }
                                }
                            );
                        } else {
                            renderError(res, refreshError);
                        }
                    });
            } else {
                renderError(res, firstRequestError);
            }
        }
    );
}

router.post('/', function (req, res) {
    var destinationEmailAddress = req.body.default_email;
    var mailBody = emailer.generateMailBody(
        req.session.user.displayName,
        destinationEmailAddress
    );
    var templateData = {
        display_name: req.session.user.displayName,
        user_principal_name: req.session.user.userPrincipalName,
        actual_recipient: destinationEmailAddress
    };

    requestUtil.postSendMail(
        req.cookies.ACCESS_TOKEN_CACHE_KEY,
        JSON.stringify(mailBody),
        function (firstRequestError) {
            if (!firstRequestError) {
                res.render('sendMail', templateData);
            } else if (hasAccessTokenExpired(firstRequestError)) {
                // Handle the refresh flow
                authHelper.getTokenFromRefreshToken(
                    req.cookies.REFRESH_TOKEN_CACHE_KEY,
                    function (refreshError, accessToken) {
                        res.cookie(authHelper.ACCESS_TOKEN_CACHE_KEY, accessToken);
                        if (accessToken !== null) {
                            requestUtil.postSendMail(
                                req.cookies.ACCESS_TOKEN_CACHE_KEY,
                                JSON.stringify(mailBody),
                                function (secondRequestError) {
                                    if (!secondRequestError) {
                                        res.render('sendMail', templateData);
                                    } else {
                                        clearCookies(res);
                                        renderError(res, secondRequestError);
                                    }
                                }
                            );
                        } else {
                            renderError(res, refreshError);
                        }
                    });
            } else {
                renderError(res, firstRequestError);
            }
        }
    );
});

function hasAccessTokenExpired(e) {
    var expired;
    if (!e.innerError) {
        expired = false;
    } else {
        expired = e.code === 401 &&
            e.innerError.code === 'InvalidAuthenticationToken' &&
            e.innerError.message === 'Access token has expired.';
    }
    return expired;
}

function clearCookies(res) {
    res.clearCookie(authHelper.ACCESS_TOKEN_CACHE_KEY);
    res.clearCookie(authHelper.REFRESH_TOKEN_CACHE_KEY);
}


function renderError(res, e) {
    res.render('error', {
        message: e.message,
        error: e
    });
}

hbs.registerHelper('checkIsWorkId', function (key, value) {
    // console.log(context);

    if (key === 'WorkId') {
        //var href = 'localhost:3001/properties?querytext=%27WorkId%3a%22' + value + '%22%27&refiners=%27ManagedProperties(filter%3d600%2f0%2f*)%27';

        return '<a href="javascrip:void(0);" onclick="getProperties(' + value + ')" >' + value + '</a>';
    }
    else {
        return value;
    }
});


hbs.registerHelper('geneSearchItem', function (rowData) {
    var searchItem = '', Filename = '', LinkingUrl = '', DefaultEncodingURL = '', Description = '';
    var Author = '', CreatedBy = '', Created = '', ModifiedBy = '', LastModifiedTime = '';

    for (var i in rowData) {
        if (rowData[i].Key == 'Filename') {
            Filename = rowData[i].Value;
        }
        if (rowData[i].Key == 'LinkingUrl') {
            LinkingUrl = rowData[i].Value;
        }
        if (rowData[i].Key == 'DefaultEncodingURL') {
            DefaultEncodingURL = rowData[i].Value;
        }
        if (rowData[i].Key == 'Description') {
            if (rowData[i].Value === null || rowData[i].Value == '') {
                Description = 'No Description';
            }
            else {
                Description = rowData[i].Value;
            }
        }

        if (rowData[i].Key == 'Author') {
            Author = rowData[i].Value.split(';')[0];
        }
        if (rowData[i].Key == 'CreatedBy') {
            CreatedBy = rowData[i].Value;
        }
        if (rowData[i].Key == 'Created') {
            Created = moment(rowData[i].Value).format('YYYY-MM-DD HH:mm:ss');
        }
        if (rowData[i].Key == 'ModifiedBy') {
            ModifiedBy = rowData[i].Value;
        }
        if (rowData[i].Key == 'LastModifiedTime') {
            LastModifiedTime = moment(rowData[i].Value).format('YYYY-MM-DD HH:mm:ss');
        }

        //rowData[i].ValueType
    }

    searchItem = '<div>' +
        ((LinkingUrl === null || LinkingUrl == '') ? '<div>' + '<span class="blue_txt h4 list_title">' + Filename + '</span>' + '</div>' : '<div>' + '<a href="' + LinkingUrl + '" target="_blank" class="blue_txt h4 list_title">' + Filename + '</a>' + '</div>' ) +
        '<div class="list_desc h5">' + 'Description: ' + Description + '</div>' +
        '<div class="list_desc">' + 'Author: ' + Author + ' | UploadBy: ' + CreatedBy + ' | UploadDate: ' + Created + '</div>' +
        '<div class="list_desc">' + 'LastModifiedBy: ' + ModifiedBy + ' | LastModifiedTime: ' + LastModifiedTime + '</div>' +
        '</div>';

    return new hbs.SafeString(searchItem);
});


hbs.registerHelper('ifeq', function (v1, v2, options) {
    if (v1 === v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

//
// router.get('/disconnect', function (req, res) {
//     // check for token
//     req.session.destroy();
//     res.clearCookie('nodecookie');
//     clearCookies(res);
//     res.status(200);
//     res.redirect('http://localhost:3001');
// });
//
//
// //
// router.get('/login', function (req, res) {
//     if (req.query.code !== undefined) {
//         authHelper.getTokenFromCode(req.query.code, function (e, accessToken, refreshToken) {
//             if (e === null) {
//                 // cache the refresh token in a cookie and go back to index
//                 res.cookie(authHelper.ACCESS_TOKEN_CACHE_KEY, accessToken);
//                 res.cookie(authHelper.REFRESH_TOKEN_CACHE_KEY, refreshToken);
//                 res.redirect('/');
//             } else {
//                 console.log(JSON.parse(e.data).error_description);
//                 res.status(500);
//                 res.send();
//             }
//         });
//     } else {
//         res.render('login', {auth_url: authHelper.getAuthUrl()});
//     }
// });

module.exports = router;
