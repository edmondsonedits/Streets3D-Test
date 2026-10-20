param([Parameter(Mandatory=$true)][string]$SourceDirectory,[Parameter(Mandatory=$true)][string]$Ffmpeg,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference='Stop'
if(-not(Test-Path -LiteralPath $OutputDirectory)){New-Item -ItemType Directory -Path $OutputDirectory | Out-Null}
foreach($name in @('route-forward.mp4','route-return.mp4')){
  $inputPath=Join-Path $SourceDirectory $name
  $outputPath=Join-Path $OutputDirectory $name
  if(Test-Path -LiteralPath $outputPath){throw "Refusing to overwrite $outputPath. Use a new output directory."}
  & $Ffmpeg -hide_banner -nostdin -n -i $inputPath -an -vf 'scale=3072:1536:flags=lanczos' -c:v libx264 -preset fast -crf 23 -maxrate 5M -bufsize 10M -g 48 -keyint_min 24 -threads 4 -pix_fmt yuv420p -movflags +faststart $outputPath
  if($LASTEXITCODE -ne 0){throw "Encoding failed for $name"}
}
