/**
 * Electron main-process bootstrap — loads compiled TypeScript from electron/lib/.
 * Run `npm run build:electron-services` after changing infra sources.
 */
const {
  startDesktopInfrastructure,
  stopDesktopInfrastructure,
  getDesktopInfrastructure,
} = require('../lib/electron-main/infrastructure');

module.exports = {
  startDesktopInfrastructure,
  stopDesktopInfrastructure,
  getDesktopInfrastructure,
};
