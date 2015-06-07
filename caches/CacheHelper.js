///<reference path='../_references.d.ts'/>
var _ = require('underscore');
var q = require('q');
var redis = require('redis');
var Utils = require('../common/Utils');

/*
Base class for all caches
*/
var CacheHelper = (function () {
    function CacheHelper(host, port) {
        // We're going to maintain just one connection to redis since both node and redis are single threaded
        this.connection = redis.createClient(port, host, { connect_timeout: 60000 });
        this.connection.on('error', function (error) {
            console.log(error);
        });
    }
    CacheHelper.prototype.getConnection = function () {
        return this.connection;
    };

    CacheHelper.prototype.set = function (key, value, expiry, overwrite) {
        if (typeof overwrite === "undefined") { overwrite = false; }
        var deferred = q.defer();
        var self = this;

        var args = [key, JSON.stringify(value)];

        if (expiry)
            args.concat(['EX', expiry]);
        if (!overwrite)
            args.push('NX');

        self.getConnection().set(args, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(result);
        });
        return deferred.promise;
    };

    CacheHelper.prototype.mget = function (keys) {
        var deferred = q.defer();

        if (Utils.isNullOrEmpty(keys))
            return q.resolve(keys);

        this.getConnection().mget(keys, function (error, result) {
            if (error)
                return deferred.reject(error);

            if (Utils.isNullOrEmpty(result))
                return deferred.resolve(result);

            deferred.resolve(_.map(result, function (row) {
                return JSON.parse(row);
            }));
        });

        return deferred.promise;
    };

    CacheHelper.prototype.get = function (key) {
        var deferred = q.defer();

        if (Utils.isNullOrEmpty(key))
            return q.resolve(key);

        this.getConnection().get(key, function (error, result) {
            if (error)
                return deferred.reject(error);

            if (Utils.isNullOrEmpty(result))
                return deferred.resolve(result);

            deferred.resolve(JSON.parse(result));
        });

        return deferred.promise;
    };

    CacheHelper.prototype.del = function (key) {
        var deferred = q.defer();
        this.getConnection().del(key, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(result);
        });
        return deferred.promise;
    };

    /* Manipulate hashes */
    CacheHelper.prototype.createHash = function (set, values, keyFieldName, expiry) {
        // Create a clone for addition since we'll be removing from it to keep count
        var self = this;
        var deferred = q.defer();
        var clonedValues = JSON.parse(JSON.stringify(values));
        var row = clonedValues.shift();

        this.addToHash(set, row[keyFieldName], row).then(function (result) {
            if (clonedValues.length == 0) {
                if (expiry > 0)
                    setInterval(function () {
                        self.del(set);
                    }, expiry);
                return deferred.resolve(result);
            } else
                return self.createHash(set, clonedValues, keyFieldName, expiry);
        });
        return deferred.promise;
    };

    CacheHelper.prototype.addToHash = function (set, key, value) {
        var self = this;
        var deferred = q.defer();

        this.delFromHash(set, key).then(function () {
            self.getConnection().hset(set, key, JSON.stringify(value), function (error, result) {
                if (error)
                    deferred.reject(error);
                else
                    deferred.resolve(result);
            });
        });
        return deferred.promise;
    };

    CacheHelper.prototype.getHashValues = function (set) {
        var deferred = q.defer();
        var self = this;

        self.getConnection().hvals(set, function (error, result) {
            if (result) {
                if (Utils.getObjectType(result) == 'Array')
                    deferred.resolve(_.map(result, function (row) {
                        return JSON.parse(row);
                    }));
                else
                    deferred.resolve(JSON.parse(result));
            } else
                deferred.reject(error);
        });
        return deferred.promise;
    };

    CacheHelper.prototype.getHashKeys = function (set) {
        var deferred = q.defer();
        this.getConnection().hkeys(set, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(result);
        });
        return deferred.promise;
    };

    CacheHelper.prototype.getHash = function (set) {
        var self = this;

        return q.all([
            self.getHashKeys(set),
            self.getHashValues(set)
        ]).then(function valuesFetched() {
            var args = [];
            for (var _i = 0; _i < (arguments.length - 0); _i++) {
                args[_i] = arguments[_i + 0];
            }
            var keys = args[0][0];
            var values = args[0][1];
            var indexed = {};
            _.each(keys, function (code, index) {
                indexed[code] = values[index];
            });
            return indexed;
        });
    };

    CacheHelper.prototype.getFromHash = function (set, key) {
        var deferred = q.defer();
        this.getConnection().hget(set, key, function (error, result) {
            if (error)
                deferred.reject(error);
            else if (Utils.getObjectType(result) == 'Array')
                deferred.resolve(_.map(result, function (row) {
                    return JSON.parse(row);
                }));
            else
                deferred.resolve(JSON.parse(result));
        });
        return deferred.promise;
    };

    CacheHelper.prototype.delFromHash = function (set, key) {
        var deferred = q.defer();
        this.getConnection().hdel(set, key, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(result);
        });
        return deferred.promise;
    };

    /* MANIPULATE ORDERED SETS */
    CacheHelper.prototype.addToOrderedSet = function (set, key, value) {
        var deferred = q.defer();
        var self = this;

        this.delFromOrderedSet(set, key).then(function () {
            self.getConnection().hset(set, key, JSON.stringify(value), function (error, result) {
                if (error)
                    deferred.reject(error);
                else
                    deferred.resolve(result);
            });
        });
        return deferred.promise;
    };

    CacheHelper.prototype.addMultipleToOrderedSet = function (set, values, keyFieldName) {
        // Create a clone for addition since we'll be removing from it to keep count
        var self = this;
        var deferred = q.defer();
        var clonedValues = JSON.parse(JSON.stringify(values));
        var row = clonedValues.shift();

        this.addToOrderedSet(set, row[keyFieldName], row).then(function () {
            if (clonedValues.length == 0)
                deferred.resolve(null);
            else
                self.addMultipleToOrderedSet(set, clonedValues, keyFieldName);
        });
        return deferred.promise;
    };

    CacheHelper.prototype.getOrderedSet = function (set) {
        var self = this;
        var deferred = q.defer();

        this.getConnection().zcard(set, function (err, count) {
            self.getConnection().zrange(set, 0, count, function (error, result) {
                if (result)
                    deferred.resolve(result);
                else
                    deferred.reject(error);
            });
        });
        return deferred.promise;
    };

    CacheHelper.prototype.getFromOrderedSet = function (set, key) {
        var deferred = q.defer();
        this.getConnection().zrevrangebyscore(set, key, key, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(result);
        });
        return deferred.promise;
    };

    CacheHelper.prototype.delFromOrderedSet = function (set, key) {
        var deferred = q.defer();

        this.getConnection().zremrangebyscore(set, key, key, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                try  {
                    deferred.resolve(result);
                } catch (e) {
                }
        });

        return deferred.promise;
    };

    CacheHelper.prototype.setExpiry = function (key, expiry) {
        var deferred = q.defer();

        this.getConnection().expire(key, expiry, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(result);
        });

        return deferred.promise;
    };

    CacheHelper.prototype.incrementCounter = function (counterName) {
        var deferred = q.defer();

        this.getConnection().incr(counterName, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(result);
        });

        return deferred.promise;
    };

    CacheHelper.prototype.incrementHashKey = function (hash, counterName, increment) {
        if (typeof increment === "undefined") { increment = 1; }
        var deferred = q.defer();

        this.getConnection().hincrby(hash, counterName, increment, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(result);
        });

        return deferred.promise;
    };

    CacheHelper.prototype.getKeys = function (nameOrPattern) {
        var deferred = q.defer();

        this.getConnection().keys(nameOrPattern, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(result);
        });

        return deferred.promise;
    };

    /* Sets */
    CacheHelper.prototype.addToSet = function (set, key) {
        var deferred = q.defer();

        this.getConnection().sadd(set, key, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(result);
        });

        return deferred.promise;
    };

    CacheHelper.prototype.isMemberOfSet = function (set, key) {
        var deferred = q.defer();

        this.getConnection().sismember(set, key, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(result);
        });

        return deferred.promise;
    };

    CacheHelper.prototype.removeFromSet = function (set, key) {
        var deferred = q.defer();

        this.getConnection().srem(set, key, function (error, result) {
            if (error)
                deferred.reject(error);
            else
                deferred.resolve(result);
        });

        return deferred.promise;
    };
    return CacheHelper;
})();
module.exports = CacheHelper;
//# sourceMappingURL=CacheHelper.js.map
