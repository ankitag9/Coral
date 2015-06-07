var moment_timezone = require('moment-timezone');
var accounting = require('accounting');
var MoneyUnit = require('../enums/MoneyUnit');
var Salutation = require('../enums/Salutation');
var Utils = require('../common/Utils');

var Formatter = (function () {
    function Formatter() {
    }
    Formatter.formatMoney = function (val, moneyUnit) {
        switch (moneyUnit) {
            case 3 /* PERCENT */:
                return accounting.formatMoney(val, {
                    format: '%v %s',
                    precision: 2,
                    symbol: '%'
                });
            case 2 /* USD */:
                return accounting.formatMoney(val, {
                    format: '%s %v'
                });
            case 1 /* INR */:
                return accounting.formatMoney(val, {
                    format: '%s %v',
                    symbol: 'Rs.'
                });
            case 4 /* POINTS */:
                return accounting.formatMoney(val, {
                    format: '%v %s',
                    precision: 2,
                    symbol: 'Points'
                });
        }

        if (Utils.isNullOrEmpty(val))
            return '';
        else
            return val.toString();
    };

    Formatter.formatName = function (firstName, lastName, title) {
        return [Salutation[title], firstName, lastName].join(' ').trim();
    };

    Formatter.formatDate = function (m, format, zone) {
        if (typeof format === "undefined") { format = 'DD/MM/YYYY hh:mm a'; }
        if (typeof zone === "undefined") { zone = 'Asia/Kolkata'; }
        var isNegative = false;
        if (Utils.isNullOrEmpty(m))
            return m;

        var isNegative = Utils.getObjectType(m) == 'Number' && m < 0;

        if (isNegative)
            m = Math.abs(m);

        if (Utils.getObjectType(m) == 'String')
            if (m.search(/^[0-9]+$/) != -1)
                m = parseInt(m);

        return (isNegative ? '-' : '') + moment_timezone(m).tz(zone).format(format).toString();
    };

    Formatter.getNameInitials = function (firstName, lastName) {
        if (typeof firstName === "undefined") { firstName = ' '; }
        if (typeof lastName === "undefined") { lastName = ' '; }
        firstName = firstName || ' ';
        lastName = lastName || ' ';
        return (firstName[0] + lastName[0]).toUpperCase();
    };

    Formatter.formatEmail = function (email, firstName, lastName, title) {
        if (!Utils.isNullOrEmpty(firstName))
            return Formatter.formatName(firstName, lastName, title) + '<' + email + '>';
        return email;
    };

    Formatter.formatTimezone = function (offset) {
        var min = Math.floor(Math.abs(offset) / 60) % 60;
        var gmt_string;

        gmt_string = 'GMT' + (offset > 0 ? ' + ' : ' - ');
        gmt_string += Math.floor(Math.abs(offset) / 3600) + ':';
        gmt_string += min < 10 ? ('0' + min.toString()) : min.toString();

        return gmt_string;
    };

    Formatter.formatCurrency = function (currency) {
        return MoneyUnit[currency];
    };
    return Formatter;
})();
module.exports = Formatter;
//# sourceMappingURL=Formatter.js.map
