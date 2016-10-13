/*
 * Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */
var OAuth = require('oauth');
var uuid = require('node-uuid');

// The application registration (must match Azure AD config)
var credentials = {
    authority: 'https://login.microsoftonline.com/common',
    authorize_endpoint: '/oauth2/authorize',
    token_endpoint: '/oauth2/token',
    client_id: 'fd449a5c-6e57-429c-8de6-b023864c6139',
    client_secret: 'RBTX7YuMCy0XmUTvSLWRTJAFP3Xr4yLvxQ9y2JIsJJA=',
    redirect_uri: 'http://localhost:3001/login',
    scope: 'User.ReadBasic.All Files.Read Mail.Send offline_access',
    resource: 'https://ebayinc.sharepoint.com/'
};

/**
 * Generate a fully formed uri to use for authentication based on the supplied resource argument
 * @return {string} a fully formed uri with which authentication can be completed
 */
function getAuthUrl() {
    return credentials.authority + credentials.authorize_endpoint +
        '?client_id=' + credentials.client_id +
        '&response_type=code' +
        '&redirect_uri=' + credentials.redirect_uri
}

/**
 * Gets a token for a given resource.
 * @param {string} code An authorization code returned from a client.
 * @param {AcquireTokenCallback} callback The callback function.
 */
function getTokenFromCode(code, callback) {
    var OAuth2 = OAuth.OAuth2;
    var oauth2 = new OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.authority,
        credentials.authorize_endpoint,
        credentials.token_endpoint
    );

    oauth2.getOAuthAccessToken(
        code,
        {
            redirect_uri: credentials.redirect_uri,
            grant_type: 'authorization_code',
            resource: credentials.resource
        },
        function (e, accessToken, refreshToken) {
            callback(e, accessToken, refreshToken);
        }
    );
}


/**
 * Gets a new access token via a previously issued refresh token.
 * @param {string} refreshToken A refresh token returned in a token response
 *                       from a previous result of an authentication flow.
 * @param {AcquireTokenCallback} callback The callback function.
 */
function getTokenFromRefreshToken(refreshToken, callback) {
    var OAuth2 = OAuth.OAuth2;
    var oauth2 = new OAuth2(
        credentials.client_id,
        credentials.client_secret,
        credentials.authority,
        credentials.authorize_endpoint,
        credentials.token_endpoint
    );

    oauth2.getOAuthAccessToken(
        refreshToken,
        {
            grant_type: 'refresh_token',
            redirect_uri: credentials.redirect_uri,
            resource: credentials.resource,
            response_mode: 'form_post',
            nonce: uuid.v4(),
            state: 'abcd'
        },
        function (e, accessToken) {
            callback(e, accessToken);
        }
    );
}

exports.credentials = credentials;
exports.getAuthUrl = getAuthUrl;
exports.getTokenFromCode = getTokenFromCode;
exports.getTokenFromRefreshToken = getTokenFromRefreshToken;
exports.ACCESS_TOKEN_CACHE_KEY = 'ACCESS_TOKEN_CACHE_KEY';
exports.REFRESH_TOKEN_CACHE_KEY = 'REFRESH_TOKEN_CACHE_KEY';
