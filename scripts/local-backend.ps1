param([Parameter(Mandatory)][ValidateSet('start','stop','status')][string]$Action)
$ErrorActionPreference='Stop'
$root=(Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if ((Resolve-Path -LiteralPath ((git -C $root rev-parse --show-toplevel).Trim())).Path -ne $root) {
  throw 'Run against the canonical Stayflow Git repository.'
}
$cli=Join-Path $root 'work/local-tools/supabase/supabase.exe'
if (-not (Test-Path -LiteralPath $cli)) {throw 'Install the verified Supabase CLI 3.2.0 per README.'}
$stack='stayflow-local'
$network='stayflow-local-loopback'
if ($Action -eq 'stop') {
  & $cli --workdir $root --agent no stop
  if ($LASTEXITCODE) { throw 'Could not stop the Stayflow project.' }
  docker image ls --filter 'reference=stayflow-local-rebind/*' -q | ForEach-Object { docker rmi -f $_ | Out-Null }
  return
}
if ($Action -eq 'start') {
  $networks=docker network ls --filter "name=$network" --format '{{.Name}}'
  if ($LASTEXITCODE) { throw 'Start Docker Desktop and verify its Linux engine.' }
  if ($network -notin $networks) {
    docker network create --driver bridge --opt com.docker.network.bridge.host_binding_ipv4=127.0.0.1 --label stayflow.project=$stack $network | Out-Null
    if ($LASTEXITCODE) { throw 'Could not create the Stayflow loopback network.' }
  }
  $details=(docker network inspect $network | ConvertFrom-Json)[0]
  if ($details.Labels.'stayflow.project' -ne $stack -or $details.Options.'com.docker.network.bridge.host_binding_ipv4' -ne '127.0.0.1') {
    throw 'Unexpected Docker network configuration.'
  }
  & $cli --workdir $root --agent no --network-id $network start --exclude studio,storage-api,realtime,edge-runtime,logflare,vector,imgproxy,supavisor,postgres-meta | Out-Null
  if ($LASTEXITCODE) { throw 'The isolated Supabase services did not start.' }
  # The CLI publishes on all interfaces and Docker Desktop ignores the loopback network option.
  node (Join-Path $PSScriptRoot 'rebind-loopback.mjs')
  if ($LASTEXITCODE) { throw 'Could not restrict the Stayflow ports to loopback.' }
}
foreach($service in @('kong','db','inbucket')) {
  $ports = docker port "supabase_${service}_$stack"
  if ($LASTEXITCODE -or -not $ports -or ($ports | Where-Object { $_ -notmatch ' -> 127\.0\.0\.1:' })) {
    throw 'The project published a port outside loopback. Stop it and check its network.'
  }
}
$values=@{}
& $cli --workdir $root --agent no --output env status | ForEach-Object {
  if ($_ -match '^(API_URL|PUBLISHABLE_KEY)="?([^"]+)"?$') {$values[$Matches[1]]=$Matches[2]}
}
if ($LASTEXITCODE -or $values.API_URL -ne 'http://127.0.0.1:44321' -or -not $values.PUBLISHABLE_KEY) {
  throw 'Missing local API URL or publishable key.'
}
if ($Action -eq 'start') {
  $envPath=Join-Path $root '.dev.vars'
  if ((Test-Path $envPath) -and (Get-Item $envPath -Force).LinkType) {
    throw 'Refusing to write environment settings through a link.'
  }
  [IO.File]::WriteAllLines($envPath,@(
    'SUPABASE_URL='+$values.API_URL
    'SUPABASE_PUBLISHABLE_KEY='+$values.PUBLISHABLE_KEY
  ))
}
'Stayflow backend: 127.0.0.1:44321, database: 127.0.0.1:44322, mail: 127.0.0.1:44324'
