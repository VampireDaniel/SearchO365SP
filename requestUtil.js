/*
 * Copyright (c) Microsoft. All rights reserved. Licensed under the MIT license.
 * See LICENSE in the project root for license information.
 */
var https = require('https');
var http = require('http');
var appConfig = require('./appConfig/config.json');
var del = require('del');
var fs = require('fs');

/**
 * Generates a GET request the user endpoint
 * @param {string} accessToken the access token with which the request should be authenticated
 * @param {callback} callback
 */

function getSearch(accessToken, searchText, callback) {

    var options = {
        host: 'ebayinc.sharepoint.com',
        path: '/_api/search/query?querytext=' + searchText + '&selectproperties=\'Author%2cAuthorOWSUSER%2cContentDatabaseId%2cContentExcludeFromSummaries%2cContentModifiedTime%2cContentSource%2cContentType%2cContentTypeId%2cContents%2cCrawledProperties%2cCreated%2cCreatedBy%2cCreatedById%2cCreatedOWSDATE%2cDefaultEncodingURL%2cDescription%2cDetectedLanguage%2cDiscoveredTime%2cDisplayAuthor%2cDocComments%2cDocSubject%2cDocumentSummary%2cDocumentSummarySize%2cEditorOWSUSER%2cExcludeFromSummary%2cFallbackLanguage%2cFileExtension%2cFileType%2cFilename%2cHostingPartition%2cIndexDocId%2cInternalFileType%2cIsContainer%2cIsDocument%2cIsExternalContent%2cLastModifiedTime%2cLinkingUrl%2cListID%2cListItemID%2cMetadataAuthor%2cModifiedBy%2cModifiedById%2cModifiedOWSDATE%2cOriginalPath%2cParentId%2cParentLink%2cPath%2cPeople%2cPrivacyIndicator%2cReplyCount%2cSPContentType%2cSPSiteURL%2cSPVersion%2cSPWebUrl%2cSecondaryFileExtension%2cSecurityId%2cServerRedirectedEmbedURL%2cServerRedirectedPreviewURL%2cServerRedirectedURL%2cSharedWithDetails%2cSharedWithDetailsOWSMTXT%2cSharedWithUsersOWSUSER%2cSiteID%2cSitePath%2cSiteTemplate%2cSiteTemplateId%2cSiteTitle%2cSize%2cSpellingTerms%2cTitle%2cUIVersionStringOWSTEXT%2cUniqueID%2cUrlDepth%2cUserProfile_GUID%2cViewableByAnonymousUsers%2cViewableByExternalUsers%2cWebApplicationId%2cWebId%2cbody%2ccontentclass%2cdocacl%2cencoding%2clanguage%2clanguages%2cowsPeople%2cowstaxIdSPLocationInfo%2cowstaxIdSPLocationList%2cowstaxIdSPLocationSite\'',
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


/**
 * Generates a POST request to the SendMail endpoint
 * @param {string} accessToken the access token with which the request should be authenticated
 * @param {string} data the data which will be 'POST'ed
 * @param {callback} callback
 */
function postSendMail(accessToken, mailBody, callback) {
    var outHeaders = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken,
        'Content-Length': mailBody.length
    };
    var options = {
        host: 'graph.microsoft.com',
        path: '/v1.0/me/microsoft.graph.sendMail',
        method: 'POST',
        headers: outHeaders
    };

    // Set up the request
    var post = https.request(options, function (response) {
        var body = '';
        response.on('data', function (d) {
            body += d;
        });
        response.on('end', function () {
            var error;
            if (response.statusCode === 202) {
                callback(null);
            } else {
                error = new Error();
                error.code = response.statusCode;
                error.message = response.statusMessage;
                // The error body sometimes includes an empty space
                // before the first character, remove it or it causes an error.
                body = body.trim();
                error.innerError = JSON.parse(body).error;
                // Note: If you receive a 500 - Internal Server Error
                // while using a Microsoft account (outlok.com, hotmail.com or live.com),
                // it's possible that your account has not been migrated to support this flow.
                // Check the inner error object for code 'ErrorInternalServerTransientError'.
                // You can try using a newly created Microsoft account or contact support.
                callback(error);
            }
        });
    });

    // write the outbound data to it
    post.write(mailBody);
    // we're done!
    post.end();

    post.on('error', function (e) {
        callback(e);
    });
}


function getTokenFromApi(timeSpan, code, callback) {
    var options = {
        host: appConfig.getTokenApiHost,
        port: appConfig.getTokenApiPort,
        path: appConfig.getTokenApiPath + '?timespan=' + timeSpan + '&code=' + code,
        headers: {
            Accept: 'application/json'
        }
    };

    http.get(options, function (response) {
        var body = '';
        response.on('data', function (d) {
            body += d;
        });

        response.on('end', function () {
            var error;
            if (response.statusCode === 200) {
                callback(null, body);
            }
            else {
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


exports.getSearch = getSearch;
exports.postSendMail = postSendMail;
exports.getTokenFromApi = getTokenFromApi;
