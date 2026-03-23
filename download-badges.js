const https = require('https');
const fs = require('fs');
const path = require('path');

const grades = ['SS', 'S', 'A', 'B', 'C', 'D'];
const baseUrl = 'https://osu.ppy.sh/images/badges/score-ranks-v2019/GradeSmall-';
const badgesOutputDir = path.join(__dirname, 'badges');
const flagsOutputDir = path.join(__dirname, 'flags');

// Common country codes for osu! players
const countryCodes = [
  'US', 'JP', 'KR', 'CN', 'DE', 'RU', 'PL', 'GB', 'CA', 'BR',
  'FR', 'AU', 'CL', 'FI', 'SE', 'ID', 'TW', 'PH', 'NL', 'ES',
  'AR', 'MY', 'TH', 'IT', 'MX', 'NO', 'HK', 'SG', 'BE', 'AT',
  'NZ', 'DK', 'CZ', 'PT', 'TR', 'UA', 'VN', 'RO', 'IL', 'PE',
  'CO', 'HU', 'CH', 'GR', 'SK', 'LT', 'HR', 'BG', 'EE', 'LV',
  'SI', 'IE', 'ZA', 'RS', 'BY', 'UY', 'EC', 'CR', 'VE', 'KZ',
  'IN', 'SA', 'AE', 'EG', 'PK', 'BD', 'LK', 'MA', 'DZ', 'TN'
];

// Create directories if they don't exist
if (!fs.existsSync(badgesOutputDir)) {
  fs.mkdirSync(badgesOutputDir);
}
if (!fs.existsSync(flagsOutputDir)) {
  fs.mkdirSync(flagsOutputDir);
}

function downloadFile(url, outputPath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(outputPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Downloaded: ${path.basename(outputPath)}`);
        resolve();
      });
    }).on('error', reject);
  });
}

async function convertSvgToPng(svgPath, pngPath) {
  try {
    const sharp = require('sharp');
    await sharp(svgPath)
      .resize(64, 64)
      .png()
      .toFile(pngPath);
    console.log(`Converted: ${path.basename(pngPath)}`);
  } catch (error) {
    console.error(`Sharp conversion failed. Install sharp: npm install sharp`);
    throw error;
  }
}

function getFlagUrl(countryCode) {
  const chars = countryCode.split('');
  const hexChars = chars.map(chr => (chr.charCodeAt(0) + 127397).toString(16));
  const fileName = hexChars.join('-');
  return `https://osu.ppy.sh/assets/images/flags/${fileName}.svg`;
}

async function downloadAndConvertBadges() {
  console.log('=== Downloading and converting BADGES ===\n');

  for (const grade of grades) {
    const svgUrl = `${baseUrl}${grade}.svg`;
    const svgPath = path.join(badgesOutputDir, `${grade}.svg`);
    const pngPath = path.join(badgesOutputDir, `${grade}.png`);

    try {
      await downloadFile(svgUrl, svgPath);
      await convertSvgToPng(svgPath, pngPath);
      fs.unlinkSync(svgPath);
    } catch (error) {
      console.error(`Error processing ${grade}:`, error.message);
    }
  }

  console.log('\n=== Downloading and converting FLAGS ===\n');

  for (const countryCode of countryCodes) {
    const svgUrl = getFlagUrl(countryCode);
    const svgPath = path.join(flagsOutputDir, `${countryCode}.svg`);
    const pngPath = path.join(flagsOutputDir, `${countryCode}.png`);

    try {
      await downloadFile(svgUrl, svgPath);
      await convertSvgToPng(svgPath, pngPath);
      fs.unlinkSync(svgPath);
    } catch (error) {
      console.error(`Error processing ${countryCode}:`, error.message);
    }
  }

  console.log('\n=== COMPLETE ===');
  console.log(`Badges: ${badgesOutputDir}`);
  console.log(`Flags: ${flagsOutputDir}`);
  console.log('\nNext step: Copy both folders to your iPhone using Files app');
  console.log('Put them in: iCloud Drive/Scriptable/badges/ and iCloud Drive/Scriptable/flags/');
}

downloadAndConvertBadges();
