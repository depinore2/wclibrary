param(
    $BuildNumber = "--buildnumber--",
    [switch] $WithCompat,
    $buildMode = "development"
)

$builds = @( @{ friendlyName = "Default Build"; config = "tsconfig.json"; output = "dist/$buildNumber.js" } )

if($WithCompat) {
    $builds = $builds += @{ friendlyName = "Compatibility Build"; config = "tsconfig-compat.json"; output = "dist/compat_$buildNumber.js" }
}

$buildStagingDirectory = "$psscriptroot/../dist_tsc"

foreach($build in $builds) {
    # commands
    $runTsc = { node "$psscriptroot/../node_modules/typescript/lib/tsc.js" '-p' $build.config '--outDir' $buildStagingDirectory }
    $runBrowserify = {
        param($debug = $false)
        & "$psscriptroot/browserify.ps1" "$buildStagingDirectory/index.js" $build.output $debug
    }
    $runUglify = { node "$psscriptroot/../node_modules/uglify-es/bin/uglifyjs" $build.output -cm -o $build.output }

    write-host "Building $($build.friendlyName)."
    mkdir $buildStagingDirectory -erroraction silentlycontinue | out-null

    # production mode
    if($buildMode -eq "production" -or $buildMode -eq "prod") {
        & $runTsc
        & $runBrowserify
        & $runUglify
    }
    # package mode (for use in NPM, for example)
    elseif($buildMode -eq "package" -or $buildMode -eq "npm" -or $buildMode -eq "pack") {
        & $runTsc
        copy-item $buildStagingDirectory dist -recurse
    }
    # development mode
    else {
        & $runTsc
        & $runBrowserify $true
    }

    remove-item $buildStagingDirectory -recurse -force
}