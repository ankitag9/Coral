///<reference path='../_references.d.ts'/>
import _                        = require('underscore');
import AbstractDao              = require('./AbstractDao');
import q                        = require('q');
import BaseModel                = require('../models/BaseModel');
import ExpertScheduleRule       = require('../models/ExpertScheduleRule');
import MysqlDelegate            = require('../delegates/MysqlDelegate');
import Utils                    = require('../common/Utils');

class ExpertScheduleRuleDao extends AbstractDao
{
    constructor() { super(ExpertScheduleRule); }

    getRulesByIntegrationMemberId(integrationMemberId:number, startTime?:number, endTime?:number, transaction?:Object):q.Promise<any>
    {
        if (Utils.isNullOrEmpty(startTime) || Utils.isNullOrEmpty(endTime))
            return this.search({'integration_member_id': integrationMemberId});
        else
        {
            var query = 'SELECT * ' +
                'FROM ' + this.modelClass.TABLE_NAME +
                ' WHERE integration_member_id = ? AND id NOT IN ' +
                '   (SELECT id ' +
                '   FROM ' + this.modelClass.TABLE_NAME +
                '   WHERE integration_member_id = ? ' +
                '       AND ((repeat_end != 0 AND repeat_end <= ?) OR repeat_start >= ?))';


            return MysqlDelegate.executeQuery(query, [integrationMemberId, integrationMemberId, startTime, endTime], transaction)
                .then(
                function rulesFetched(rules:any)
                {
                    return _.map(rules, function (rule)
                    {
                        return new ExpertScheduleRule(rule);
                    });
                });
        }
    }

}
export = ExpertScheduleRuleDao