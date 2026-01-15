try {
    const vite = require('vite');
    console.log('Vite version:', require('vite/package.json').version);
    console.log('Vite path:', require.resolve('vite'));
} catch (e) {
    console.error('Failed to load vite:', e);
}
