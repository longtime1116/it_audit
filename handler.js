'use strict';
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
      console.log(lastCommitComment);
    })
  });
};


