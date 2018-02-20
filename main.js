var Random = require('random-js')
    marqdown = require('./marqdown.js'),
    fs = require('fs'),
    stackTrace = require('stacktrace-parser')
    ;

var fuzzer =
{
    random : new Random(Random.engines.mt19937().seed(0)),

    seed: function (kernel)
    {
        fuzzer.random = new Random(Random.engines.mt19937().seed(kernel));
    },

    mutate:
    {
        string: function(val)
        {
            // MUTATE IMPLEMENTATION HERE
            var array = val.split('');
            do {
                if( fuzzer.random.bool(0.05) )
                {
                    // REVERSE
                    array = array.reverse();
                }
                // delete random characters
                if( fuzzer.random.bool(0.25) )
                {
                    array.splice(fuzzer.random.integer(0,99),1)
                }

                // add random characters
                if( fuzzer.random.bool(0.25) )
                {
                    array.splice(fuzzer.random.integer(0,99), 0, ...fuzzer.random.string(10))
                }
            } while ( fuzzer.random.bool(0.05) )

            return array.join('');
        }
    }
};

if( process.env.NODE_ENV != "test")
{
    fuzzer.seed(0);
    mutationTesting(['test.md','simple.md'],1000);
}

function mutationTesting(paths,iterations)
{
    var failedTests = [];
    var reducedTests = [];
    var passedTests = 0;

    var markDownA = fs.readFileSync(paths[0],'utf-8');
    var markDownB = fs.readFileSync(paths[1],'utf-8');

    for (var i = 0; i < iterations; i++) {
        let mutuatedString = null;
        if (i%2==0){
          mutuatedString = fuzzer.mutate.string(markDownA);
        }else{
          mutuatedString = fuzzer.mutate.string(markDownB);
        }
        try
        {
            marqdown.render(mutuatedString);
            passedTests++;
        }
        catch(e)
        {
            failedTests.push( {input:mutuatedString, stack: e.stack} );
        }
    }

    reduced = {};
    // RESULTS OF FUZZING
    for( var i =0; i < failedTests.length; i++ )
    {
        var failed = failedTests[i];

        var trace = stackTrace.parse( failed.stack );
        var msg = failed.stack.split("\n")[0];
        console.log( msg, trace[0].methodName, trace[0].lineNumber );

        let key = trace[0].methodName + "." + trace[0].lineNumber;
        if( !reduced.hasOwnProperty( key ) )
        {
          reduced[key] = '$(msg) $(key)';
          reducedTests.push(failed)
        }
    }

    console.log( "passed {0}, failed {1}, reduced {2}".format(passedTests, failedTests.length, reducedTests.length) );

    for( var key in reduced )
    {
        console.log(key)
        // console.log( reduced[key] );
    }

}

exports.mutationTesting = mutationTesting;
exports.fuzzer = fuzzer;

if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) {
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}
