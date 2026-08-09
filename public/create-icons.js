const fs = require('fs');

// Criar ícones PNG básicos (um pixel azul mínimo para PWA funcionar)
// PNG header + minimal image data + CRC
const createMinimalPNG = (size) => {
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]); // PNG signature
  const ihdr = Buffer.from([
    0, 0, 0, 13, // length
    73, 72, 68, 82, // 'IHDR'
    0, 0, 0, size, 0, 0, 0, size, // width, height (32-bit each)
    8, 2, 0, 0, 0, // bit depth, color type, compression, filter, interlace
    0, 0, 0, 0 // CRC placeholder
  ]);
  
  // Create minimal image data (blue background #1e40af)
  const pixelData = Buffer.alloc(size * size * 3);
  for (let i = 0; i < pixelData.length; i += 3) {
    pixelData[i] = 30;     // R: 1e
    pixelData[i + 1] = 64; // G: 40
    pixelData[i + 2] = 175; // B: af
  }
  
  // Zlib compress (simplified - just store uncompressed for minimal size)
  const zlib = require('zlib');
  const scanlines = Buffer.alloc(size * (size * 3 + 1));
  let pos = 0;
  for (let y = 0; y < size; y++) {
    scanlines[pos++] = 0; // filter type none
    pixelData.copy(scanlines, pos, y * size * 3, (y + 1) * size * 3);
    pos += size * 3;
  }
  
  // This is simplified - for production use a proper PNG library
  // For now, create a minimal valid PNG file
  return Buffer.concat([pngHeader]);
};

// For now, just create placeholder files with minimal PNG data
const minimalPNG = Buffer.from([
  0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  0x00, 0x00, 0x00, 0x0D, // IHDR length
  0x49, 0x48, 0x44, 0x52, // 'IHDR'
  0x00, 0x00, 0x00, 0x01, // width: 1
  0x00, 0x00, 0x00, 0x01, // height: 1
  0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color, compression, filter, interlace
  0x90, 0x77, 0x53, 0xDE, // CRC
  0x00, 0x00, 0x00, 0x0C, // IDAT length
  0x49, 0x44, 0x41, 0x54, // 'IDAT'
  0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0xFE, 0xFF, 0x00, 0x00, 0x00, 0x02, // compressed data
  0x00, 0x01, 0x49, 0xB4, 0xE8, 0xB7, // CRC
  0x00, 0x00, 0x00, 0x00, // IEND length
  0x49, 0x45, 0x4E, 0x44, // 'IEND'
  0xAE, 0x42, 0x60, 0x82 // CRC
]);

fs.writeFileSync('pwa-192x192.png', minimalPNG);
fs.writeFileSync('pwa-512x512.png', minimalPNG);
fs.writeFileSync('pwa-maskable-192x192.png', minimalPNG);
fs.writeFileSync('pwa-maskable-512x512.png', minimalPNG);
fs.writeFileSync('favicon-32x32.png', minimalPNG);
fs.writeFileSync('favicon-16x16.png', minimalPNG);

console.log('PWA icons created');
