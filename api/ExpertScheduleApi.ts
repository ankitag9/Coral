///<reference path='../_references.d.ts'/>
import express                          = require('express');
import ExpertScheduleDelegate           = require('../delegates/ExpertScheduleDelegate');
import ApiUrlDelegate                   = require('../delegates/ApiUrlDelegate');
import ApiConstants                     = require('../enums/ApiConstants');
import ExpertSchedule                   = require('../models/ExpertSchedule');

class ExpertScheduleApi
{
    constructor(app)
    {
        var expertScheduleDelegate = new ExpertScheduleDelegate();

        app.get(ApiUrlDelegate.scheduleByExpert(), function (req:express.Request, res:express.Response)
        {
            var expertId = req.params[ApiConstants.EXPERT_ID];
            var startTime = parseInt(req.query[ApiConstants.START_TIME] || 0);
            var endTime = parseInt(req.query[ApiConstants.END_TIME] || 0);

            if (!startTime || !endTime || startTime >= endTime)
                res.status(400).send("Invalid time interval");

            expertScheduleDelegate.getSchedulesForExpert(expertId, startTime, endTime)
                .then(
                function expertScheduleSearched(schedules) { res.json(schedules); },
                function expertScheduleSearchFailed(error) { res.status(500).json(error); }
            );
        });

        app.get(ApiUrlDelegate.scheduleById(), function (req:express.Request, res:express.Response)
        {
            var scheduleId:string = req.params[ApiConstants.SCHEDULE_ID];
            var includes:string[] = req.query[ApiConstants.INCLUDE];

            expertScheduleDelegate.get(scheduleId, null, includes)
                .then(
                function expertScheduleSearched(schedules) { res.json(schedules); },
                function expertScheduleSearchFailed(error) { res.status(500).json(error); }
            );
        });

        app.put(ApiUrlDelegate.scheduleByExpert(), function (req:express.Request, res:express.Response)
        {
            var schedule:ExpertSchedule = req[ApiConstants.SCHEDULE];
            var expertId = req.params[ApiConstants.EXPERT_ID];
            schedule.setIntegrationMemberId(expertId);

            expertScheduleDelegate.create(schedule)
                .then(
                function expertScheduleCreated(schedule) { res.json(schedule); },
                function expertScheduleCreateFailed(error) { res.status(500).json(error); }
            );
        });

    }

}
export = ExpertScheduleApi