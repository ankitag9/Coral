///<reference path='../_references.d.ts'/>
import _                                                = require('underscore');
import express                                          = require('express');
import q                                                = require('q');

class BaseApi
{
    static INCLUDE                                      = 'include';

    constructor(app)
    {
    }

    static getEndpoint(baseUrl?:string):string
    {
        return null;
    }

    static getIdEndpoint(id?:number, baseUrl?:string):string
    {
        return null;
    }

    promiseMiddleware(handler:(...args)=>q.Promise<any>)
    {
        var handlerSignature = handler.toString();
        var handlerArgs = handlerSignature.match(/\((.*)\)/)[1].split(",");
        var handlerArgParsers = _.map(handlerArgs, function(argName:string)
        {
            if (argName.substr(argName.length-2) == 'Id')
                return function(req:express.Request) {
                    return parseInt(req.params[argName] || req.query[argName]);
                };

            if (argName == BaseApi.INCLUDE)
                return function(req:express.Request)
                {
                    try {
                        return JSON.parse(req.query[BaseApi.INCLUDE]);
                    } catch (e) {
                        return [];
                    }
                }
        });

        return function (req:express.Request, res:express.Response)
        {
            var parsedArguments = _.map(handlerArgParsers, function(parser:Function)
            {
                return parser.call(this, req);
            });

            parsedArguments.push(req);
            parsedArguments.push(res);

            handler.apply(this, parsedArguments)
                .then(function resolved(result) { res.json(result) })
                .fail(function handleError(error:Error) { res.send(500, error.message); });
        };
    }
}
export = BaseApi;