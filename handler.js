'use strict';

var request = require('request');
var AWS = require('aws-sdk');
var repoName = 'tamaiItAuditTest';

var codecommit = new AWS.CodeCommit();

var branchDetail = {
  branchName: 'master',
  repositoryName: repoName,
};

module.exports.processing_to_processed = (event, context) => {
  codecommit.getBranch(branchDetail, function(err, data) {
    if (err) {
      console.log(err, err.stack);
    } else {
      var lastCommitId = data.branch.commitId;
    }

    var commitDetail = {
      commitId: lastCommitId,
      repositoryName: repoName,
    };

    codecommit.getCommit(commitDetail, function(err, data) {
      if (err) {
        console.log(err, err.stack);
      } else {
        var lastCommitComment = data.commit.message;
      }

      var targetTicketName = lastCommitComment.match(/DEV-\d{1,5}/)[0];
      var revertComment = lastCommitComment.match(/Revert/g);
      var revertCommentCount = revertComment ? revertComment.length : 0;
      var isReverted = revertCommentCount % 2 == 1;

      if (isReverted) {
        console.log(targetTicketName + "'s head commit was revert commit");
      } else if (!isReverted && lastCommitComment.match(/DEV-\d{1,5}/)) {
        updateTicketStatus(targetTicketName);
      }
    });
  });

  function updateTicketStatus(targetTicketName) {
    var ticketUrl =
      'https://pixta.backlog.jp/api/v2/issues/' +
      targetTicketName +
      '?apiKey=' +
      process.env.BACKLOG_API_KEY;
    var data = {
      url: ticketUrl,
      method: 'PATCH',
      form: {
        statusId: 3,
      },
      headers: {
        Accept: '*/*',
      },
    };
    request(data, function optionalCallback(err, httpResponse, body) {
      console.log('Result in ' + targetTicketName + ':');
      console.log(body);
    });
  }
};
