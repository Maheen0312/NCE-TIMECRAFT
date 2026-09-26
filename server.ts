import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Check if tsx loader is active
const isTsx = process.execArgv.some(arg => arg.includes('tsx')) || process.env.__BOOTSTRAPPED_TSX__ === '1';

if (!isTsx) {
  const currentFile = fileURLToPath(import.meta.url);
  const child = spawn(
    process.execPath,
    ['--import', 'tsx', currentFile, ...process.argv.slice(2)],
    {
      stdio: 'inherit',
      env: { ...process.env, __BOOTSTRAPPED_TSX__: '1' },
    }
  );

  const forward = (sig: NodeJS.Signals) => {
    try {
      child.kill(sig);
    } catch {
      // ignore
    }
  };

  process.on('SIGTERM', () => forward('SIGTERM'));
  process.on('SIGINT', () => forward('SIGINT'));

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
    } else {
      process.exit(code ?? 0);
    }
  });
} else {
  // Running with tsx: dynamically import server application
  await import('./src/server/serverApp.ts');
}
