import express                      = require('express');
import _                            = require('underscore');
import ApiConstants                 = require('../enums/ApiConstants');
import ApiUrlDelegate               = require('../delegates/ApiUrlDelegate');
import UserDelegate                 = require('../delegates/UserDelegate');
import UserOAuthDelegate            = require('../delegates/UserOAuthDelegate');
import TransactionDelegate          = require('../delegates/TransactionDelegate');
import AccessControl                = require('../middleware/AccessControl');
import ValidateRequest              = require('../middleware/ValidateRequest');
import UserOauth                    = require('../models/UserOauth');
import User                         = require('../models/User');
import IntegrationMember            = require('../models/IntegrationMember');
import Utils                        = require('../common/Utils');

/**
 Rest Calls for User
 Allow only searchntalk.com
 **/
class UserApi {

    constructor(app)
    {
        var userDelegate = new UserDelegate();
        var userOauthDelegate = new UserOAuthDelegate();

        /** Create user **/
        app.put(ApiUrlDelegate.user(), AccessControl.allowDashboard, function(req:express.Request, res:express.Response)
        {
            var user:User = req.body[ApiConstants.USER];

            if (!Utils.isNullOrEmpty(user.getEmail()) || !Utils.isNullOrEmpty(user.getMobile()))
                userDelegate.create(user)
                    .then(
                    function userCreated(user:User) { res.json(user); },
                    function userCreateError(err) { res.status(500).json(err); }
                );
            else
                res.status(500).json('Invalid data');
        });

        /** Authenticate user **/
        app.get(ApiUrlDelegate.userAuthentication(), AccessControl.allowDashboard, function(req:express.Request, res:express.Response)
        {
            var user:User = req.body[ApiConstants.USER];
            var email = user.getEmail();
            var password = user.getPassword();

            if (email && password)
                userDelegate.authenticate(email, password)
                    .then(
                    function authComplete(user) { res.json(user); },
                    function authError(err) { res.status(401).json(err); }
                );
            else
                res.status(422).json('Username or password missing');
        });

        /** Update settings */
        app.post(ApiUrlDelegate.userById(), AccessControl.allowDashboard, function(req:express.Request, res:express.Response)
        {
            var userId:string = req.params[ApiConstants.USER_ID];
            var user:User = req.body[ApiConstants.USER];

            if (user.isValid())
                userDelegate.update(userId, user)
                    .then(
                    function userUpdated(result) { res.json(result); },
                    function updateFailed(err) { res.status(500).json(err); }
                )
            else
                res.status(422).json('Invalid input');
        });

        /** Generate a password reset token for user **/
        app.get(ApiUrlDelegate.userPasswordResetToken(), AccessControl.allowDashboard, function(req:express.Request, res:express.Response)
        {
            var userId = req.params[ApiConstants.USER_ID];

            userDelegate.createPasswordResetToken(userId)
                .then(
                function passwordResetTokenGenerated(token) { res.json(token); },
                function passwordResetTokenGenerateError(err) { res.status(500).json(err); }
            )
        });

        /* Generate a email verification token for user */
        app.get(ApiUrlDelegate.emailVerificationToken(), AccessControl.allowDashboard, function(req:express.Request, res:express.Response)
        {
            var userId = req.params[ApiConstants.USER_ID];

            userDelegate.createEmailVerificationToken(userId)
                .then(
                function emailVerificationTokenGenerated(token) { res.json(token); },
                function emailVerificationTokenGenerateError(err) { res.status(500).json(err); }
            )
        });

        /* Generate a email verification token for user */
        app.get(ApiUrlDelegate.mobileVerificationToken(), AccessControl.allowDashboard, function(req:express.Request, res:express.Response)
        {
            userDelegate.createMobileVerificationToken()
                .then(
                function mobileVerificationTokenGenerated(token) { res.json(token); },
                function mobileVerificationTokenGenerateError(err) { res.status(500).json(err); }
            )
        });

        /* Get account balance */
        app.get(ApiUrlDelegate.userTransactionBalance(), AccessControl.allowDashboard, function(req:express.Request, res:express.Response)
        {
        });

        /* Generate mobile verification code */
        app.put(ApiUrlDelegate.mobileVerificationToken(), AccessControl.allowDashboard, function(req:express.Request, res:express.Response)
        {
            userDelegate.createMobileVerificationToken()
                .then(
                    function codeCreated(result) { res.send(result); },
                    function codeCreationFailed(error) { res.send(500); }
                )
        });

        /* Search mobile verification code */
        app.get(ApiUrlDelegate.mobileVerificationToken(), AccessControl.allowDashboard, function(req:express.Request, res:express.Response)
        {
            var code:string = req.body['code'];
            var ref:string = req.body['ref'];

            userDelegate.searchMobileVerificationToken(code, ref)
                .then(
                function codeCreated(result) { res.send(result); },
                function codeCreationFailed(error) { res.send(500); }
            )
        });

        /* Update OAuth token */
        app.put(ApiUrlDelegate.userOAuthToken(), AccessControl.allowDashboard, function(req:express.Request, res:express.Response)
        {
            var userOauth:UserOauth = req.body[ApiConstants.OAUTH];
            var user:User = req.body[ApiConstants.USER];

            if (userOauth.isValid())
                userOauthDelegate.addOrUpdateToken(userOauth, user)
                    .then(
                    function tokenAdded(updatedUser:User) { res.json(updatedUser); },
                    function tokenAddError(err) { res.status(500).json(err); }
                );
            else
                res.status(500).json('Invalid input');
        });

        /** Delete OAuth token **/
        app.delete(ApiUrlDelegate.userOAuthToken(), AccessControl.allowDashboard, function(req:express.Request, res:express.Response)
        {
            var userId = req.params[ApiConstants.USER_ID];
            var type = req.params['type'];

            userOauthDelegate.deleteByUser(userId)
                .then(
                function tokenRemoved(result) { res.json(result); },
                function tokenRemoveError(err) { res.status(500).json(err); }
            );
        });

    }
}
export = UserApi