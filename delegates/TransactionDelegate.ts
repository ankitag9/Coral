///<reference path='../_references.d.ts'/>
import q                            = require('q');
import _                            = require('underscore');
import BaseDAODelegate              = require('./BaseDaoDelegate');
import MysqlDelegate                = require('./MysqlDelegate');
import TransactionLineDelegate      = require('./TransactionLineDelegate');
import IDao                         = require('../dao/IDao');
import TransactionDAO               = require('../dao/TransactionDao');
import Transaction                  = require('../models/Transaction');
import TransactionLine              = require('../models/TransactionLine');
import PhoneCall                    = require('../models/PhoneCall');

class TransactionDelegate extends BaseDAODelegate
{
    getDao():IDao { return new TransactionDAO(); }

    createPhoneCallTransaction(object:any, phonecall:PhoneCall, transaction?:any):q.Promise<any>
    {
        return this.create(object, transaction)
            .then(
            function transactionCreated(t)
            {
                return new TransactionLineDelegate().createPhoneCallTransactionLines(t.getId(), phonecall, transaction);
            });
    }
}
export = TransactionDelegate