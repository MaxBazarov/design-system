var fs = require('fs');

function loadLessVars(fileName){
    //console.log("Read LESS: running...")
    
    var less = require("/usr/local/lib/node_modules/less")   
    var lessVars = {}

    var data = fs.readFileSync(fileName, 'utf8');

    less.parse(data, function (err, root, imports, options) {
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
    const pathToLess = args[0]
    const pathToJSON = args[1]

    if(undefined==pathToLess || undefined==pathToJSON ){
        console.log("nsconvert.js PATH_TO_LESS_FILE PATH_TO_JSON_FILE")
        return false
    }
    console.log("pathToLess:" +pathToLess)
    console.log("pathToJSON:" +pathToJSON)

    console.log("Started")

    var less = loadLessVars(pathToLess)
    saveData(less,pathToJSON)
    console.log("Completed")
}


run()