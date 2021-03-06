///<reference path='../_references.d.ts'/>
import _                                                = require('underscore');
import log4js                                           = require('log4js');
import q                                                = require('q');
import moment                                           = require('moment');
import IDao                                             = require('../dao/IDao');
import IDaoFetchOptions                                 = require('../dao/IDaoFetchOptions');
import MysqlDao                                         = require('../dao/MysqlDao');
import Utils                                            = require('../common/Utils');
import BaseModel                                        = require('../models/BaseModel');
import ForeignKey                                       = require('../models/ForeignKey');
import GlobalIdDelegate                                 = require('../delegates/GlobalIDDelegate');
import ForeignKeyType                                   = require('../enums/ForeignKeyType');

class BaseDaoDelegate
{
    logger:log4js.Logger = log4js.getLogger(Utils.getClassName(this));
    dao:IDao;

    /** Can be constructed using just the model in case dao doesn't do anything special
     * e.g. Execute custom queries which IDao doesn't support
     * @param dao
     */
    constructor(dao:typeof BaseModel);
    constructor(dao:IDao);
    constructor(dao:any)
    {
        this.dao = Utils.getObjectType(dao) === 'Object' ? dao : new MysqlDao(dao);
        this.dao.modelClass.DELEGATE = this;
    }

    get(id:any, options:IDaoFetchOptions = {}, foreignKeys:ForeignKey[] = [], transaction?:Object):q.Promise<any>
    {
        options = options || {};
        options.fields = options.fields || this.dao.modelClass.PUBLIC_FIELDS;

        id = [].concat(id);

        if (id.length > 1)
            return this.search({'id': id}, options, foreignKeys, transaction);

        if (id.length === 1)
            return this.find({'id': id}, options, foreignKeys, transaction);
    }

    find(search:Object, options:IDaoFetchOptions = {}, foreignKeys:ForeignKey[] = [], transaction?:Object):q.Promise<any>
    {
        var self:BaseDaoDelegate = this;

        options = options || {};
        options.fields = options.fields || this.dao.modelClass.PUBLIC_FIELDS;

        return this.dao.find(search, options, transaction)
            .then(
            function processForeignKeys(result:BaseModel):any
            {
                if (Utils.isNullOrEmpty(result))
                    return result;

                var foreignKeysToPassOn = _.filter(foreignKeys, function (key:ForeignKey)
                {
                    return self.dao.modelClass['FOREIGN_KEYS'].indexOf(key) == -1;
                });

                foreignKeys = _.filter(foreignKeys, function (key:ForeignKey)
                {
                    return self.dao.modelClass['FOREIGN_KEYS'].indexOf(key) != -1;
                });

                var foreignKeyTasks = _.map(foreignKeys, function (key:ForeignKey)
                {
                    self.logger.debug('Processing find foreign key for %s', key.getSourcePropertyName());
                    var delegate = key.referenced_table.DELEGATE;
                    return delegate.search(Utils.createSimpleObject(key.target_key, result.get(key.src_key)), null, foreignKeysToPassOn);
                });
                return [result, q.all(foreignKeyTasks)];
            })
            .spread(
            function handleIncludesProcessed(result, ...args)
            {
                var results = args[0];

                _.each(results, function (resultSet:any, index)
                {
                    result.set(foreignKeys[index].getSourcePropertyName(), resultSet);
                });
                return result;
            })
            .fail(
            function handleFailure(error:Error)
            {
                self.logger.error('Error occurred while finding %s for criteria: %s, error: %s', self.dao.modelClass.TABLE_NAME, JSON.stringify(search), error.message);
                throw error;
            });
    }

    /*
     * Perform search based on search query
     * Also fetch joint fields
     */
    search(search?:Object, options:IDaoFetchOptions = {}, foreignKeys:ForeignKey[] = [], transaction?:Object):q.Promise<any>
    {
        var self:BaseDaoDelegate = this;

        options = options || {};
        options.fields = options.fields || this.dao.modelClass.PUBLIC_FIELDS;

        return this.dao.search(search, options, transaction)
            .then(
            function processIncludes(baseSearchResults:BaseModel[]):any
            {
                if (Utils.isNullOrEmpty(baseSearchResults))
                    return baseSearchResults;

                var foreignKeysToPassOn = _.filter(foreignKeys, function (key:ForeignKey)
                {
                    return self.dao.modelClass['FOREIGN_KEYS'].indexOf(key) == -1;
                });

                foreignKeys = _.filter(foreignKeys, function (key:ForeignKey)
                {
                    return self.dao.modelClass['FOREIGN_KEYS'].indexOf(key) != -1;
                });

                var foreignKeyTasks = _.map(foreignKeys, function (key:ForeignKey)
                {
                    self.logger.debug('Processing search foreign key for %s', key.getSourcePropertyName());
                    var delegate = key.referenced_table.DELEGATE;
                    return delegate.search(Utils.createSimpleObject(key.target_key, _.uniq(_.pluck(baseSearchResults, key.src_key))), null, foreignKeysToPassOn);
                });

                return [baseSearchResults, q.all(_.compact(foreignKeyTasks))];
            })
            .spread(
            function handleIncludesProcessed(baseSearchResults, ...args)
            {
                var results = args[0];

                _.each(baseSearchResults, function (baseSearchResult:any)
                {
                    _.each(results, function (resultSet:any, index)
                    {
                        baseSearchResult.set(foreignKeys[index].getSourcePropertyName(), resultSet);
                    })
                });
                return baseSearchResults;
            })
            .fail(
            function handleFailure(error:Error)
            {
                self.logger.error('Error occurred while searching %s for criteria: %s, error: %s', self.dao.modelClass.TABLE_NAME, JSON.stringify(search), error.message);
                throw error;
            });
    }

    searchWithIncludes(search?:Object, options:IDaoFetchOptions = {}, includes?:Object[], transaction?:Object):q.Promise<any>
    {
        var self:BaseDaoDelegate = this;

        options = options || {};
        options.fields = options.fields || this.dao.modelClass.PUBLIC_FIELDS;

        return this.dao.search(search, options, transaction)
            .then(function searchComplete(baseSearchResults:BaseModel[]):any
            {
                if (Utils.isNullOrEmpty(baseSearchResults))
                    return baseSearchResults;
                return self.processIncludes(baseSearchResults, search, options, includes, transaction);
            });
    }

    processIncludes(baseSearchResults:BaseModel[], search?:Object, options?:IDaoFetchOptions, includes?:Object[], transaction?:Object):q.Promise<any>
    {
        var self:BaseDaoDelegate = this;
        var foreignKeys:ForeignKey[] = [];

        var foreignKeyTasks = _.map(includes, function (include:any)
        {
            if (typeof include === 'string') //if no nested includes
            {
                var tempForeignKey:ForeignKey = self.dao.modelClass.getForeignKeyForColumn(include);
                if (!Utils.isNullOrEmpty(tempForeignKey))
                {
                    foreignKeys.push(tempForeignKey);
                    self.logger.debug('Processing search foreign key for %s', tempForeignKey.getSourcePropertyName());
                    var delegate = tempForeignKey.referenced_table.DELEGATE;
                    return delegate.searchWithIncludes(Utils.createSimpleObject(tempForeignKey.target_key, _.uniq(_.pluck(baseSearchResults, tempForeignKey.src_key))), {}, null, transaction);
                }
            }
            else // if nested includes then pass on to next call
            {
                var tempForeignKey:ForeignKey = self.dao.modelClass.getForeignKeyForColumn(_.keys(include)[0]);
                if (!Utils.isNullOrEmpty(tempForeignKey))
                {
                    foreignKeys.push(tempForeignKey);
                    self.logger.debug('Processing search foreign key for %s', tempForeignKey.getSourcePropertyName());
                    var delegate = tempForeignKey.referenced_table.DELEGATE;
                    return delegate.searchWithIncludes(Utils.createSimpleObject(tempForeignKey.target_key, _.uniq(_.pluck(baseSearchResults, tempForeignKey.src_key))), {}, _.values(include)[0], transaction);
                }
            }
        });

        return q.all(foreignKeyTasks)
            .then(
            function handleIncludesProcessed(...args)
            {
                var results:any = args[0];

                _.each(baseSearchResults, function (baseSearchResult:any)
                {
                    _.each(results, function (resultSet:any, index)
                    {
                        baseSearchResult.set(foreignKeys[index].getSourcePropertyName(), resultSet);
                    })
                });
                return baseSearchResults;
            })
            .fail(
            function handleFailure(error:Error)
            {
                self.logger.error('Error occurred while searching %s for criteria: %s, error: %s', self.dao.modelClass.TABLE_NAME, JSON.stringify(search), error.message);
                throw error;
            });
    }


    create(object:Object, transaction?:Object):q.Promise<any>;
    create(object:Object[], transaction?:Object):q.Promise<any>;
    create(object:any, transaction?:Object):q.Promise<any>
    {
        if (Utils.isNullOrEmpty(object))
            throw new Error('Invalid data. Trying to create object with null data');

        var self:BaseDaoDelegate = this;

        function prepareData(data:BaseModel)
        {
            var generatedId:number = new GlobalIdDelegate().generate(self.dao.modelClass.TABLE_NAME);
            data[BaseModel.COL_ID] = generatedId;
            data[BaseModel.COL_CREATED] = moment().valueOf();
            data[BaseModel.COL_UPDATED] = moment().valueOf();
            return data;
        };

        var newObject:any = (Utils.getObjectType(object) === 'Array') ? _.map(object, prepareData) : prepareData(object);

        return this.dao.create(newObject, transaction);
    }

    update(criteria:Object, newValues:any, transaction?:Object):q.Promise<any>;
    update(criteria:number, newValues:any, transaction?:Object):q.Promise<any>;
    update(criteria:any, newValues:any, transaction?:Object):q.Promise<any>
    {
        // Compose update statement based on newValues
        newValues[BaseModel.COL_UPDATED] = new Date().getTime();
        delete newValues[BaseModel.COL_CREATED];
        delete newValues[BaseModel.COL_ID];

        return this.dao.update(criteria, newValues, transaction);
    }

    delete(criteria:number, softDelete?:boolean, transaction?:Object):q.Promise<any>;
    delete(criteria:Object, softDelete?:boolean, transaction?:Object):q.Promise<any>;
    delete(criteria:any, softDelete:boolean = true, transaction?:Object):q.Promise<any>
    {
        if (Utils.isNullOrEmpty(criteria))
            throw new Error('Please specify what to delete');

        if (softDelete)
            return this.dao.update(criteria, {'deleted': moment().valueOf()}, transaction);
        else
            return this.dao.delete(criteria, transaction);
    }

    save(object:Object, dbTransaction?:Object):q.Promise<any>
    {
        return Utils.isNullOrEmpty(object[BaseModel.COL_ID]) ? this.create(object, dbTransaction) : this.update(object[BaseModel.COL_ID], object, dbTransaction);
    }
}
export = BaseDaoDelegate