$tscCmd = "$psscriptroot/../node_modules/.bin/tsc"
$browserifyCmd = "$psscriptroot/browserify.ps1"

# build and browserify it fully once, before beginning watch mode.
(start-process $tscCmd -PassThru).WaitForExit()
& $browserifyCmd

#do it again, but in watch mode now.
start-process $tscCmd -ArgumentList '--watch'
start-process "pwsh" -ArgumentList @($browserifyCmd, '-watchMode')

start-process "$psscriptroot/../node_modules/.bin/http-server" # serve it up on an HTTP server
start-process "http://localhost:8080" # open system browser