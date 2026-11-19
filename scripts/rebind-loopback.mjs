// Supabase CLI 3.2 publishes its Docker ports on all interfaces and offers no setting for it, and Docker
// Desktop ignores the loopback network option. This recreates only the containers of the local
// "stayflow-local" project with the same configuration but published on 127.0.0.1, then restarts the
// project's other containers so they reconnect. Named volumes (database data) are kept, and a commit
// keeps files the CLI copied in after creation (Kong's TLS files). The committed images are removed by
// `local-backend.ps1 stop`.
import http from 'node:http';

const project = 'stayflow-local';
const socketPath = process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock';

function docker(method, path, body) {
  return new Promise((resolve, reject) => {
    const request = http.request({ socketPath, method, path, headers: { 'Content-Type': 'application/json' } }, response => {
      let text = '';
      response.on('data', chunk => { text += chunk; });
      response.on('end', () => response.statusCode < 300
        ? resolve(text ? JSON.parse(text) : null)
        : reject(new Error(`Docker ${method} ${path.split('?')[0]} failed with ${response.statusCode}`)));
    });
    request.on('error', reject);
    request.end(body === undefined ? undefined : JSON.stringify(body));
  });
}

const filters = encodeURIComponent(JSON.stringify({ label: [`com.supabase.cli.project=${project}`] }));
const listed = await docker('GET', `/containers/json?all=1&filters=${filters}`);
const containers = [];
for (const { Id } of listed) containers.push(await docker('GET', `/containers/${Id}/json`));
// Defence in depth: never touch anything that is not provably this project's container.
const owned = containers.filter(c => c.Config.Labels['com.supabase.cli.project'] === project && c.Name.endsWith(`_${project}`));
if (!owned.length) throw new Error('No Stayflow containers found. Start the backend first.');

let rebound = false;
const exposed = c => Object.values(c.HostConfig.PortBindings ?? {}).flat().some(b => b.HostIp !== '127.0.0.1');
for (const old of owned.filter(exposed)) {
  const name = old.Name.slice(1);
  const PortBindings = Object.fromEntries(Object.entries(old.HostConfig.PortBindings)
    .map(([port, list]) => [port, [{ HostIp: '127.0.0.1', HostPort: list[0].HostPort }]]));
  const [network, endpoint] = Object.entries(old.NetworkSettings.Networks)[0];
  const aliases = endpoint.Aliases.filter(alias => !old.Id.startsWith(alias));
  const { Hostname, ...config } = old.Config;
  const kept = await docker('POST', `/commit?container=${old.Id}&repo=stayflow-local-rebind/${name}`);
  await docker('POST', `/containers/${old.Id}/stop`).catch(() => {});
  await docker('DELETE', `/containers/${old.Id}?v=false`);
  const created = await docker('POST', `/containers/create?name=${name}`, {
    ...config,
    Image: kept.Id,
    HostConfig: { ...old.HostConfig, PortBindings },
    NetworkingConfig: { EndpointsConfig: { [network]: { Aliases: aliases } } }
  });
  await docker('POST', `/containers/${created.Id}/start`);
  rebound = true;
  console.log(`Rebound ${name} to 127.0.0.1`);
}
for (const other of rebound ? owned.filter(c => !exposed(c) && c.State.Running) : []) {
  await docker('POST', `/containers/${other.Id}/restart`);
}
// Wait until the project's health checks pass again.
for (let attempt = 0; attempt < 60; attempt++) {
  const now = await Promise.all(owned.map(c => docker('GET', `/containers/${c.Name.slice(1)}/json`)));
  if (now.every(c => c.State.Running && (!c.State.Health || c.State.Health.Status === 'healthy'))) process.exit(0);
  await new Promise(done => setTimeout(done, 2000));
}
throw new Error('Stayflow containers did not become healthy after rebinding.');
