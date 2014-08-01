///<reference path='../_references.d.ts'/>
import _                        = require('underscore');
import AbstractDao              = require('./AbstractDao');
import q                        = require('q');
import BaseModel                = require('../models/BaseModel');
import ScheduleRule             = require('../models/ScheduleRule');
import MysqlDelegate            = require('../delegates/MysqlDelegate');
import Utils                    = require('../common/Utils');

class ScheduleRuleDao extends AbstractDao
{
    constructor() { super(ScheduleRule); }

    getRulesByUser(userId:number, startTime:number, endTime:number, fields?:string[], transaction?:Object):q.Promise<any>
    {
        if (Utils.isNullOrEmpty(startTime) || Utils.isNullOrEmpty(endTime))
            return this.search(Utils.createSimpleObject(ScheduleRule.COL_USER_ID, userId));
        else
        {
            var selectColumns:string = !Utils.isNullOrEmpty(fields) ? fields.join(',') : '*';
            var query = 'SELECT ' + selectColumns + ' ' +
                'FROM ' + this.modelClass.TABLE_NAME + ' ' +
                'WHERE user_id = ? AND id NOT IN ' +
                '   (SELECT id ' +
                '   FROM ' + this.modelClass.TABLE_NAME +
                '   WHERE user_id = ? ' +
                '       AND ((repeat_end != 0 AND repeat_end <= ?) OR repeat_start >= ?))';


            return MysqlDelegate.executeQuery(query, [userId, userId, startTime, endTime], transaction)
                .then(
                function rulesFetched(rules:any)
                {
                    return _.map(rules, function (rule)
                    {
                        return new ScheduleRule(rule);
                    });
                });
        }
    }

}
export = ScheduleRuleDao