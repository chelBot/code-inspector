var main = function(){
  // Editor Setup
  var editor = ace.edit("editor");
  editor.setTheme("ace/theme/twilight");
  editor.session.setMode("ace/mode/javascript");
  editor.session.setTabSize(4);

  // Create an object containing the counts of given tokens
  var objCreator = function(list){
    var listObj = {};
    for(var i = 0; i < list.length; i++){
      var word = list[i].trim().toLowerCase();
      if(!(word in listObj)){
        listObj[word] = 1;
      }else{
        listObj[word]++;
      }
    }
    return listObj;
  };

  // I decided to to store whitelisted and blacklisted tokens in an object.
  // This allows for more detailed tests. For example: "Must use two for statements".
  var getTokenCounts = function(testObj, tokenAry){
    var tokenObj = {};
    for(var i = 0; i < tokenAry.length; i++){
      if(tokenAry[i].value in testObj){
        if(tokenAry[i].value in tokenObj){
          tokenObj[tokenAry[i].value]++;
        }else{
          tokenObj[tokenAry[i].value] = 1;
        }
      }
    }
    return tokenObj;
  };

  // This only test for nested, direct descendants. The test criteria is defined as follows: ForStatement, ForStatement, IfStatement --> for{ for{ if{ } } }
  // Each time I push to the stack I check to see if testing criteria has been met.
  var structure = function(ast, structList){
    var stack = [];
    var closestPass = [];
    estraverse.traverse(ast, {
      enter: function (node, parent) {
        //blockstatement was getting in my way, so I don't want to push it to stack.
        if(node.type === "BlockStatement"){
          return;
        }
        stack.push(node.type);
        //if the stack is long enough, check if it matches the test criteria.
        if(stack.length >= structList.length){
          var count = 0;
          var flag = true;
          for(var i = 0; i < structList.length; i++){
            var structNode = structList[i].toLowerCase().trim();
            var stackNode = stack[(stack.length - structList.length) + i].toLowerCase();
            //if element near top of stack doesn't equal associated element in test, we haven't passed the test.
            if(structNode !== stackNode){
              count = 0;
              flag = false;
              break;
            }
            //I want to keep track of the closest we get to passing the test for more useful error messaging.
            else {
              count++;
              if (count > closestPass.length) {
                //repopulating all revelvant values to the closestPass array.
                //*******Why is this loop only going up to i. Mistake starting at 0?***********
                //Not a mistake. As soon as the nodes don't equal we break out of loop. So it is
                //ok to fill up closestPass array up to i.
                for(var j = 0; j <= i; j++){
                  closestPass[j] = structList[j];
                }
              }
            }
          }
          //made it through for loop without failing! Pass.
          if(flag){
            closestPass = ["pass"];
            this.break();
          }
        }
      },
      leave: function (node, parent) {
        if(node.type === "BlockStatement"){
         return;
        }
        stack.pop();
      }
    });
    console.log(closestPass);
    return closestPass;
  };


  //*****************Presentation Layer**********************//

  var whitelistAction = function(){
    var input = editor.getValue();
    var tokenAry = esprima.tokenize(input);
    var whitelistInput = $('#white-list').val().trim();
    if (!whitelistInput) {
      $("#whitelist-results").text("");
      return;
    }
    var whiteListAry = whitelistInput.split(",");
    var testObj = objCreator(whiteListAry);
    var tokenObj = getTokenCounts(testObj, tokenAry);
    var flag = true;
    var keys = "";
    for(var key in testObj){
      if(!(key in tokenObj) || testObj[key] > tokenObj[key]){
        keys += key + " ";
        flag = false;
      }
    }
    if(flag){
      $("#whitelist-results").text("You passed this test!");
    }
    else{
      $("#whitelist-results").text("You are missing these token(s): " + keys);
    }
  }

  var blacklistAction = function(){
    var input = editor.getValue();
    var tokenAry = esprima.tokenize(input);
    blacklistInput = $("#black-list").val().trim();
    if(!blacklistInput){
      $("#blacklist-results").text("");
      return;
    }
    var blackListAry = blacklistInput.split(",");
    var testObj = objCreator(blackListAry);
    var tokenObj = getTokenCounts(testObj, tokenAry);
    if(!(jQuery.isEmptyObject(tokenObj))){
      var keys= "";
      for(key in tokenObj){
        keys += key + " ";
      }
      $("#blacklist-results").text("Do not use these token(s): " + keys);
    }
    else{
      $("#blacklist-results").text("You passed this test!");
    }
  }

  var structureAction = function(){
    var input = editor.getValue();
    var ast;
    try {
      ast = esprima.parse(input);
    } catch (err) {
      $("#structure-results").text("Structure test needs valid javascript.\n" + err);
      return;
    }
    //Basic input validation
    var structInput = $('#structure-list').val().trim();
    if (!structInput) {
      $("#structure-results").text("");
      return;
    }
    var structList = structInput.split(",");
    var structTest = structure(ast, structList);

    if(structTest[0] === "pass"){
      $("#structure-results").text("You passed this test!");
    }
    else{
      var error = "";
      for(var i = 0; i < structList.length; i++){
        if(structTest[i] !== structList[i]){
          error += structList[i] + " ";
        }
      }
      $("#structure-results").text("You failed this test! Please ensure that these nodes types are properly nested: " + error);
    }
  }

  // Event handlers
  $('#white-btn').click(function() {
    whitelistAction();
  });
  $('#black-btn').click(function() {
    blacklistAction();
  });
  $('#structure-btn').click(function(){
    structureAction();
  });
  editor.getSession().on('change', function(e) {
    whitelistAction();
    blacklistAction();
    structureAction();
  });
}
$(document).ready(main);
