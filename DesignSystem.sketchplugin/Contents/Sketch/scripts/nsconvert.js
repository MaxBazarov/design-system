var fs = require('fs');

function loadLessVars(fileName1,fileName2){
    //console.log("Read LESS: running...")
    
    var less = require("/usr/local/lib/node_modules/less")   
    var lessVars = {}

    var data = ''
    data = data + fs.readFileSync(fileName1, 'utf8');
    if(fileName2!=undefined){
        data = data + fs.readFileSync(fileName2, 'utf8');
    }

    less.parse(data, function (err, root, imports, options) {
        console.log(err)
        var evalEnv = new less.contexts.Eval(options);
        var evaldRoot = root.eval(evalEnv);
        var ruleset = evaldRoot.rules;
        ruleset.forEach(function (rule) {
            if (rule.variable === true) {
                var name;
                name = rule.name.substr(1);					

                var value = rule.value;
                lessVars[name] = value.toCSS(options);				
            }
        });
	});

    //console.log("Read LESS: done")
    return lessVars
}

function saveData(data,pathToJSON){   
    var json = JSON.stringify(data,null,'    ')

    fs.writeFileSync(pathToJSON, json, 'utf8');

    return true
}


function run(){
    const args = process.argv.slice(2)
    var pathToLess1 = args[0]
    var pathToLess2 = args[1]
    var pathToJSON = args[2]
    
    if(undefined==pathToLess1 || undefined==pathToLess2 ){
        console.log("nsconvert.js PATH_TO_LESS_FILE1 PATH_TO_LESS_FILE2(OPT) PATH_TO_JSON_FILE")
        return false
    }
    if(undefined == pathToJSON){
        pathToJSON = pathToLess2
        pathToLess2 = undefined
    }

    console.log("pathToLess1:" +pathToLess1)
    if(pathToLess2!=undefined)
        console.log("pathToLess2:" +pathToLess2)
    console.log("pathToJSON:" +pathToJSON)

    console.log("Started")

    var less = loadLessVars(pathToLess1,pathToLess2)
    saveData(less,pathToJSON)
    console.log("Completed")
}


run()