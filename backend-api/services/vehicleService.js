// services/vehicleService.js
import path from 'node:path';
import fs from 'node:fs';

export function fetchVehicles() {
  try {
    const dataPath = path.join(process.cwd(), 'backend-api', 'inventory.json');
    return JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  } catch (err) {
    return [];
  }
}
