import { execSync } from 'child_process';
import path from 'path';

const monorepoRoot = execSync('git rev-parse --show-toplevel').toString().trim();

// then in the config:
storageState: path.join(monorepoRoot, '.auth/user.json'),