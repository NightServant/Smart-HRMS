/**
 * Registers the ZKTeco bridge as a Windows Service using node-windows.
 * Run once: node install-windows.js
 * To uninstall: node install-windows.js --uninstall
 */
const path = require('path');
const { Service } = require('node-windows');

const svc = new Service({
    name: 'ZKTeco HRMS Bridge',
    description: 'Syncs ZKTeco biometric attendance logs to Smart HRMS on Railway.',
    script: path.join(__dirname, 'dist', 'index.js'),
    nodeOptions: [],
    workingDirectory: __dirname,
    allowServiceLogon: true,
});

const uninstall = process.argv.includes('--uninstall');

if (uninstall) {
    svc.on('uninstall', () => {
        console.log('Service uninstalled successfully.');
    });
    svc.uninstall();
} else {
    svc.on('install', () => {
        console.log('Service installed. Starting...');
        svc.start();
    });
    svc.on('start', () => {
        console.log('Service started successfully.');
    });
    svc.install();
}
