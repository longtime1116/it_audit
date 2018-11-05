'use strict';
var request = require ('request');
var repo_name = 'tamaiItAuditTest';
var AWS = require('aws-sdk');
var codecommit = new AWS.CodeCommit();

module.exports.processing_to_processed = async (event, context) => {
  var branch_info = {
    branchName: 'master',
    repositoryName: repo_name
  };

  // TODO: 無駄な入れ子をなくす
  codecommit.getBranch(branch_info, function(err, data) {
    if (err) console.log(err, err.stack);
    else     var lastCommitId = data.branch.commitId;

    var commit_info = {
      commitId: lastCommitId,
      repositoryName: repo_name
    }
    codecommit.getCommit(commit_info, function(err, data) {
      if (err) console.log(err, err.stack);
      else     var lastCommitComment = data.commit.message;

      lastCommitComment = "Merge DEV-21163" // 動作確認用
      var targetTicketName = lastCommitComment.match(/DEV-\d{1,5}/)[0];

      if (lastCommitComment.match(/DEV-\d{1,5}/)) updateTicketStatus(targetTicketName);
    })
  });

  function updateTicketStatus(targetTicketName){
    var ticket_url = "https://pixta.backlog.jp/api/v2/issues/" + targetTicketName + "?apiKey=" + process.env.BACKLOG_API_KEY
    var data = {
      url: ticket_url,
      method: 'PATCH',
      form: {
        statusId: 2
      },
      headers: {
          'Accept': '*/*'
      }
    };

    request.patch(data, function(data, callback){
      console.log(callback);
    });
  }
};


// ticket number for test is DEV-21163
