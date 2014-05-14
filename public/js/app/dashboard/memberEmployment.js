$('.datepicker').datepicker({
    format: 'mm-yyyy'
});

$('#AddUserEmploymentModal form').validate({
    rules         : {
        title : { required: true}
    },
    errorPlacement: function(error, element)
    {
        $(element).attr('title', error[0].innerHTML);
        $(element).tooltip('show');
    },
    highlight     : function(element)
    {
        $(element).closest('.form-group').addClass('has-error');
    },
    unhighlight   : function(element)
    {
        $(element).closest('.form-group').removeClass('has-error');
    },
    submitHandler : function()
    {
        $.ajax({
            url : '/rest/user/employment',
            type: 'put',
            data: {
                employment: {
                    title           : $('#AddUserEmploymentModal form #title').val(),
                    start_date      : $('#AddUserEmploymentModal form #start_date').val(),
                    end_date        : $('#AddUserEmploymentModal form #end_date').val(),
                    summary         : $('#AddUserEmploymentModal form #summary').val(),
                    company         : $('#AddUserEmploymentModal form #company').val(),
                    is_current      : $('#AddUserEmploymentModal form #is_current').val()
                },
                profileId           : profileId
            },
            success: function()
            {
                location.reload();
            }
        })
    }
});

$('.editUserEmployment').click(function()
{
    var selectedUserEmployment;
    var userEmploymentId = $(this).data('id');
    for(var i = 0; i<userEmployment.length; i++)
        if(userEmployment[i].id == userEmploymentId)
            selectedUserEmployment = userEmployment[i];
    if (selectedUserEmployment) {
        selectedUserEmployment = unEscapeObject(selectedUserEmployment);
        $('#EditUserEmploymentModal .btn-primary').attr('data-id', selectedUserEmployment.id);
        $('#EditUserEmploymentModal [name="title"]').val(selectedUserEmployment.title);
        $('#EditUserEmploymentModal [name="summary"]').val(selectedUserEmployment.summary);
        $('#EditUserEmploymentModal [name="company"]').val(selectedUserEmployment.company);
        $('#EditUserEmploymentModal #is_current').selectpicker('val', selectedUserEmployment.is_current);
        $('#EditUserEmploymentModal [name="start_date"]').val(selectedUserEmployment.start_date);
        $('#EditUserEmploymentModal [name="end_date"]').val(selectedUserEmployment.end_date);
    }
});

$('#EditUserEmploymentModal form').validate({
    rules         : {
        title : { required: true}
    },
    errorPlacement: function(error, element)
    {
        $(element).attr('title', error[0].innerHTML);
        $(element).tooltip('show');
    },
    highlight     : function(element)
    {
        $(element).closest('.form-group').addClass('has-error');
    },
    unhighlight   : function(element)
    {
        $(element).closest('.form-group').removeClass('has-error');
    },
    submitHandler : function()
    {
        var employmentId = $('#EditUserEmploymentModal form .btn-primary').attr('data-id');
        $.ajax({
            url : '/rest/user/employment/' + employmentId,
            type: 'post',
            data: {
                employment: {
                    title           : $('#EditUserEmploymentModal form #title').val(),
                    start_date      : $('#EditUserEmploymentModal form #start_date').val(),
                    end_date        : $('#EditUserEmploymentModal form #end_date').val(),
                    summary         : $('#EditUserEmploymentModal form #summary').val(),
                    company         : $('#EditUserEmploymentModal form #company').val(),
                    is_current      : $('#EditUserEmploymentModal form #is_current').val()
                }
            },
            success: function()
            {
                location.reload();
            }
        })
    }
});

$('.deleteUserEmployment').click(function()
{
    var memberEmploymentId = $(this).data('id');
    $('#DeleteUserEmploymentModal .btn-primary').attr('data-id', memberEmploymentId);
});

function handleEmploymentDeleteClicked(event)
{
    var employmentId = $(event.currentTarget).attr('data-id');
    $.ajax({
        url    : '/rest/user/employment/' + employmentId,
        type   : 'DELETE',
        data: {
            id              : employmentId,
            profileId           : profileId
        },
        success: function()
        {
            location.reload();
        }
    });
};
